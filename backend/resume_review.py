"""Deterministic resume review.

This module is pure Python: no network calls, no AI provider, no third-party
dependency. The same resume text always produces the same scores, which is what
makes the result explainable to a student, available even when every AI provider
is down, and testable without credentials.

The scores are ESTIMATED ANALYTICAL values computed from the text a student
uploads. They are not the output of any real company's applicant tracking
system, and every response and screen built on this module must say so.

An AI provider may be asked to add a short narrative on top of these findings,
but it never produces the findings themselves and never changes a score.
"""

import re

ANALYZER_VERSION = "1.0.0"

# Sections a reviewer expects to find, and how much each one matters. Contact
# details carry less weight than substance, but a resume without them is
# unusable to a recruiter.
SECTION_WEIGHTS = {
    "contact": 0.2,
    "skills": 0.25,
    "experience": 0.25,
    "education": 0.2,
    "projects": 0.1,
}

SECTION_LABELS = {
    "contact": "contact details",
    "skills": "skills",
    "experience": "experience",
    "education": "education",
    "projects": "projects",
}

# Phrases that identify a section heading. Matching is done on a normalized
# line, so casing, punctuation and trailing colons do not matter.
SECTION_HEADINGS = {
    "contact": {
        "contact",
        "contact details",
        "contact information",
        "personal details",
        "personal information",
    },
    "skills": {
        "skills",
        "skill",
        "technical skills",
        "core skills",
        "key skills",
        "skills and tools",
        "skills tools",
        "technologies",
        "tech stack",
        "tools and technologies",
    },
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "work history",
        "employment",
        "employment history",
        "internships",
        "internship experience",
    },
    "education": {
        "education",
        "academics",
        "academic background",
        "academic qualifications",
        "qualifications",
    },
    "projects": {
        "projects",
        "project",
        "personal projects",
        "academic projects",
        "selected projects",
        "key projects",
    },
}

# Reverse lookup: normalized heading phrase -> section key.
HEADING_LOOKUP = {
    phrase: key for key, phrases in SECTION_HEADINGS.items() for phrase in phrases
}

# Rubric weights. They are normalized before use, so a change here that does not
# sum to 1 still produces a score on a 0-100 scale instead of silently
# truncating the result.
DEFAULT_WEIGHTS = {
    "structure": 0.25,
    "keyword": 0.3,
    "experience": 0.25,
    "depth": 0.15,
    "hygiene": 0.05,
}

# Bullets opening with one of these verbs read as accomplishments rather than
# as a list of duties.
ACTION_VERBS = frozenset(
    {
        "achieved", "analysed", "analyzed", "architected", "automated", "built",
        "collaborated", "configured", "contributed", "converted", "coordinated",
        "created", "debugged", "delivered", "deployed", "designed", "developed",
        "documented", "drove", "engineered", "established", "evaluated", "expanded",
        "implemented", "improved", "increased", "initiated", "integrated",
        "introduced", "launched", "led", "maintained", "managed", "mentored",
        "migrated", "modelled", "modeled", "negotiated", "optimized", "optimised",
        "organized", "organised", "owned", "partnered", "performed", "planned",
        "presented", "prioritized", "produced", "programmed", "prototyped",
        "reduced", "refactored", "released", "researched", "resolved", "restructured",
        "reviewed", "scaled", "shipped", "simplified", "solved", "standardized",
        "streamlined", "supported", "tested", "trained", "translated", "validated",
    }
)

# Common English words that carry no signal about a resume's content.
STOP_WORDS = frozenset(
    """
    a about above after again against all am an and any are as at be because been
    before being below between both but by can cannot could did do does doing down
    during each few for from further had has have having he her here hers herself
    him himself his how i if in into is it its itself me more most my myself no nor
    not of off on once only or other ought our ours ourselves out over own same she
    should so some such than that the their theirs them themselves then there these
    they this those through to too under until up very was we were what when where
    which while who whom why with would you your yours yourself yourselves also
    using used use etc within across per via well
    """.split()
)

# Fallback vocabulary so the module is useful on its own. Callers that already
# own a skill vocabulary (the job-market module does) should pass theirs so
# resume detection and market analysis agree on the same names.
DEFAULT_SKILL_TERMS = {
    "Python": ("python",),
    "JavaScript": ("javascript", "typescript", "node.js", "nodejs"),
    "React": ("react", "react.js", "reactjs"),
    "Java": ("java", "spring boot", "spring"),
    "C# / .NET": ("c#", ".net", "dotnet"),
    "C / C++": ("c++", "embedded c"),
    "SQL": ("sql", "postgresql", "mysql", "database"),
    "AWS": ("aws", "amazon web services"),
    "Azure": ("azure",),
    "Google Cloud": ("google cloud", "gcp"),
    "Docker": ("docker", "containerization"),
    "Kubernetes": ("kubernetes", "k8s"),
    "Git": ("git", "github", "gitlab"),
    "Linux": ("linux", "unix"),
    "REST APIs": ("rest api", "restful", "api development"),
    "GraphQL": ("graphql",),
    "Machine Learning": ("machine learning", "scikit-learn"),
    "Generative AI": ("generative ai", "large language model", "llm", "rag"),
    "Data Analysis": ("data analysis", "data analytics", "analytics"),
    "Power BI": ("power bi", "powerbi"),
    "Tableau": ("tableau",),
    "Excel": ("excel", "spreadsheets"),
    "Product Management": ("product management", "product strategy"),
    "Project Management": ("project management", "project manager"),
    "Agile / Scrum": ("agile", "scrum", "kanban"),
    "Communication": ("communication skills", "stakeholder management"),
    "Figma": ("figma",),
    "UX Research": ("ux research", "user research"),
    "Salesforce": ("salesforce",),
    "SEO": ("seo", "search engine optimization"),
}

# Feedback rules only speak up when a component crosses one of these lines.
THRESHOLDS = {
    "keyword_good": 70,
    "keyword_weak": 45,
    "experience_good": 70,
    "quantified_good": 0.4,
    "depth_good": 60,
    "depth_weak": 35,
    "hygiene_good": 80,
}

MAX_FEEDBACK_ITEMS = 6
IDEAL_MIN_WORDS = 300
IDEAL_MAX_WORDS = 900
MIN_REVIEWABLE_WORDS = 20

BULLET_PATTERN = re.compile(r"^([-*\u2022\u2023\u2013\u2014]\s+|\d+[.)]\s+)", re.UNICODE)
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"\+?\d[\d\s().-]{7,}\d")
LINKEDIN_PATTERN = re.compile(r"linkedin\.com/", re.IGNORECASE)
WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9+#./'-]*")
QUANTIFIER_PATTERN = re.compile(
    r"\d|\b(hundred|thousand|million|billion|daily|weekly|monthly|quarterly|annual)\b",
    re.IGNORECASE,
)


def _clamp(value, minimum, maximum):
    return max(minimum, min(value, maximum))


def _to_score(ratio):
    """Convert a 0-1 ratio into the 0-100 integer shown to students."""
    return int(round(_clamp(ratio, 0.0, 1.0) * 100))


def _tokenize(text):
    """Lowercase word tokens with stop words and pure noise removed."""
    tokens = []
    for raw in WORD_PATTERN.findall(text or ""):
        token = raw.strip(".-'/").lower()
        if len(token) < 2 or token in STOP_WORDS:
            continue
        tokens.append(token)
    return tokens


def _contains_alias(haystack, alias):
    """Word-boundary match where possible, substring match for symbol aliases."""
    if re.fullmatch(r"[a-z0-9 ]+", alias):
        return bool(re.search(r"\b" + re.escape(alias) + r"\b", haystack))
    return alias in haystack


def _normalize_heading(line):
    """Reduce a line to a comparable heading phrase, or None when it is not one."""
    cleaned = line.strip().strip(":").rstrip(".").strip().lower()
    cleaned = re.sub(r"[^a-z0-9 ]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned or len(cleaned) > 40:
        return None
    return HEADING_LOOKUP.get(cleaned)


def _has_contact_details(text):
    """Contact details are usually written at the top without a heading.

    An email address, phone number or LinkedIn URL is stronger evidence than a
    heading, so either satisfies the section.
    """
    return bool(
        EMAIL_PATTERN.search(text)
        or PHONE_PATTERN.search(text)
        or LINKEDIN_PATTERN.search(text)
    )


def find_sections(text):
    """Locate the expected sections and return the body lines of each.

    Returns a tuple of (flags, bodies, lines): which sections were detected,
    the lines belonging to each detected section, and every line in order.
    """
    lines = (text or "").splitlines()
    headings = []
    seen = set()
    for index, line in enumerate(lines):
        key = _normalize_heading(line)
        if key and key not in seen:
            seen.add(key)
            headings.append((index, key))

    bodies = {}
    for position, (index, key) in enumerate(headings):
        end = headings[position + 1][0] if position + 1 < len(headings) else len(lines)
        bodies[key] = lines[index + 1:end]

    flags = {key: key in seen for key in SECTION_WEIGHTS}
    if not flags["contact"] and _has_contact_details(text):
        flags["contact"] = True

    return flags, bodies, lines


def _is_bullet(line):
    return bool(BULLET_PATTERN.match(line.strip()))


def _strip_bullet_marker(line):
    return BULLET_PATTERN.sub("", line.strip(), count=1).strip()


def is_quantified_bullet(bullet):
    """True when a bullet contains a measurable outcome or scale word."""
    return bool(QUANTIFIER_PATTERN.search(bullet or ""))


def starts_with_action_verb(bullet):
    """True when a bullet leads with a strong opening verb."""
    stripped = _strip_bullet_marker(bullet)
    if not stripped:
        return False
    first = re.split(r"[\s,]+", stripped.lower())[0]
    first = re.sub(r"[^a-z]", "", first)
    return first in ACTION_VERBS


def find_formatting_issues(text, lines):
    """Problems that will hurt a resume when a human or a parser reads it."""
    issues = []
    content = [line.strip() for line in lines if line.strip()]
    if not content:
        return ["The uploaded document contained no readable text."]

    longest = max(len(line) for line in content)
    if longest > 220:
        issues.append(
            "Some lines run to "
            f"{longest} characters, which suggests the text is one unbroken block "
            "rather than a document that can be skimmed."
        )

    markers = {match.group(1).strip() for match in (BULLET_PATTERN.match(line) for line in content) if match}
    if len(markers) > 1:
        issues.append(
            "Bullet points use more than one marker character, which makes the "
            "list look inconsistent to a reader."
        )

    if "\t" in (text or ""):
        issues.append(
            "Tab characters were found. They usually mean the layout came from a "
            "table, which many parsers read out of order."
        )

    if "\ufffd" in (text or ""):
        issues.append(
            "Some characters could not be decoded, so the extracted text may be "
            "incomplete."
        )

    if len(content) <= 2 and len(text or "") > 400:
        issues.append(
            "The whole resume arrived on very few lines, so section headings, "
            "dates and job titles are hard to detect."
        )

    return issues


def detect_skills(text, skill_terms=None):
    """Which known skills the resume actually evidences.

    The canonical name is matched as well as its aliases, because resumes list
    bare skill names ("Communication", "Docker") far more often than the longer
    phrases a job description uses.
    """
    terms = skill_terms or DEFAULT_SKILL_TERMS
    lowered = (text or "").lower()
    detected = []
    for name, aliases in terms.items():
        candidates = (name.lower(),) + tuple(aliases)
        if any(_contains_alias(lowered, alias) for alias in candidates):
            detected.append(name)
    return detected


def score_structure(sections):
    """How completely the resume is structured, 0-1.

    Sections are weighted rather than merely counted, so a resume missing its
    experience section cannot score as well as one missing only projects.
    """
    total = sum(
        weight for key, weight in SECTION_WEIGHTS.items() if sections.get(key)
    )
    # Summing decimal weights accumulates binary rounding error (all sections
    # present would otherwise yield 0.9999999999999999).
    return _clamp(round(total, 6), 0.0, 1.0)


def _role_term_groups(target_role, role_skills, skill_terms=None):
    """Each thing the role expects, as one group of acceptable spellings.

    A posting does not ask for the literal string "javascript" on top of
    "typescript"; it asks for the skill, and either spelling evidences it.
    Grouping the known spellings of a single skill means a resume that writes
    "TypeScript" is credited for the same expectation as one that writes
    "JavaScript", instead of being marked down for choosing a valid alternative.

    The role title contributes its own tokens, so "Backend Developer" is not
    treated as satisfied by "Developer" alone.
    """
    vocabulary = skill_terms or DEFAULT_SKILL_TERMS
    groups = []
    for skill in role_skills:
        variants = [skill.lower()]
        variants.extend(str(alias).lower() for alias in vocabulary.get(skill, ()))
        groups.append((skill, list(dict.fromkeys(variants))))
    for token in _tokenize(target_role):
        groups.append((token, [token]))
    return groups


def score_keywords(resume_text, role_term_groups):
    """How much of what the role expects the resume evidences, 0-1.

    Returns (ratio, matched_labels). Coverage rather than an overlap coefficient,
    so the number reads exactly like the keywordCoverage the review reports: "the
    resume evidences 4 of the 8 things these postings ask for" is both the
    explanation and the score. An overlap coefficient additionally punishes a long
    resume for being long, which makes the subscore impossible to act on.

    Limitation, stated because it matters: term presence can be padded. Filling a
    resume with role vocabulary raises this component and the depth component, and
    no term-matching rubric can tell real evidence from a keyword dump. What the
    review can do is make the gap visible; substantiating it is the student's job.
    """
    if not role_term_groups:
        return 0.0, []

    haystack = (resume_text or "").lower()
    matched = [
        label
        for label, variants in role_term_groups
        if any(_contains_alias(haystack, variant) for variant in variants)
    ]
    return len(matched) / len(role_term_groups), matched


def score_experience(bullet_count, quantified_bullet_count, action_verb_bullet_count, project_count):
    """Evidence quality of the experience and project sections, 0-1.

    Rewards quantified outcomes most (a bullet containing a number proves
    impact), then strong action verbs, then a reasonable number of projects. A
    resume of vague "responsible for" lines scores poorly however long it is.
    """
    if bullet_count <= 0:
        return 0.0

    quantified_ratio = quantified_bullet_count / bullet_count
    action_ratio = action_verb_bullet_count / bullet_count
    project_score = _clamp(project_count / 3, 0.0, 1.0)

    return _clamp(
        quantified_ratio * 0.5 + action_ratio * 0.3 + project_score * 0.2, 0.0, 1.0
    )


def score_depth(detected_skills, target_role_skills):
    """How much of the role's skill set the resume evidences, 0-1.

    Coverage of the target role dominates, because listing many unrelated
    skills is not the same as matching the role.
    """
    breadth = _clamp(len(detected_skills) / 12, 0.0, 1.0)
    if not target_role_skills:
        return breadth

    lowered = {skill.lower() for skill in detected_skills}
    covered = sum(1 for skill in target_role_skills if skill.lower() in lowered)
    coverage = covered / len(target_role_skills)

    return _clamp(coverage * 0.7 + breadth * 0.3, 0.0, 1.0)


def score_hygiene(word_count, formatting_issue_count):
    """Is the resume a sensible length, and does it parse cleanly, 0-1.

    Ideal resumes run roughly 300-900 words. Far too short suggests missing
    substance; far too long suggests it will not be read.
    """
    if word_count >= IDEAL_MIN_WORDS and word_count <= IDEAL_MAX_WORDS:
        length_score = 1.0
    elif word_count < IDEAL_MIN_WORDS:
        length_score = word_count / IDEAL_MIN_WORDS
    else:
        length_score = _clamp(
            1 - (word_count - IDEAL_MAX_WORDS) / (IDEAL_MAX_WORDS * 1.333), 0.0, 1.0
        )

    issue_penalty = min(formatting_issue_count * 0.1, 0.5)
    return _clamp(length_score - issue_penalty, 0.0, 1.0)


def compute_resume_score(
    sections,
    word_count,
    bullet_count,
    quantified_bullet_count,
    action_verb_bullet_count,
    project_count,
    detected_skills,
    target_role_skills,
    keyword_ratio,
    keyword_measured,
    formatting_issue_count,
    weights=None,
):
    """Compute the weighted compatibility breakdown.

    A component is dropped from the weighted sum, rather than scored as zero,
    whenever the data needed to measure it is missing. Scoring an unmeasurable
    component as zero would punish a student for something the review could not
    see.
    """
    weights = weights or DEFAULT_WEIGHTS

    structure = score_structure(sections)
    experience = score_experience(
        bullet_count,
        quantified_bullet_count,
        action_verb_bullet_count,
        project_count,
    )
    depth = score_depth(detected_skills, target_role_skills)
    hygiene = score_hygiene(word_count, formatting_issue_count)

    keyword = keyword_ratio if keyword_measured else 0.0

    components = [
        ("structure", structure, weights.get("structure", 0)),
        ("experience", experience, weights.get("experience", 0)),
        ("depth", depth, weights.get("depth", 0)),
        ("hygiene", hygiene, weights.get("hygiene", 0)),
    ]
    if keyword_measured:
        components.append(("keyword", keyword, weights.get("keyword", 0)))

    total_weight = sum(weight for _, _, weight in components)
    weighted = sum(value * weight for _, value, weight in components)
    ratio = weighted / total_weight if total_weight > 0 else 0.0

    return {
        "compatibilityScore": _to_score(ratio),
        "subscores": {
            "structure": _to_score(structure),
            "keyword": _to_score(keyword) if keyword_measured else None,
            "experience": _to_score(experience),
            "depth": _to_score(depth),
            "hygiene": _to_score(hygiene),
        },
        "keywordMeasured": keyword_measured,
    }


def _format_list(items):
    """Join items as "a, b and c" so sentences read naturally."""
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return "{} and {}".format(", ".join(items[:-1]), items[-1])


def _dedupe_trim(items):
    seen = []
    for item in items:
        if item not in seen:
            seen.append(item)
    return seen[:MAX_FEEDBACK_ITEMS]


def build_resume_feedback(
    subscores,
    sections,
    target_role,
    keyword_measured,
    matched_skills,
    missing_skills,
    bullet_count,
    quantified_bullet_count,
    formatting_issues,
    word_count,
):
    """Turn the numeric subscores into concrete, actionable advice.

    This is deliberately not an AI provider. The findings have to be
    reproducible, auditable, and available even when every provider is down.
    """
    strengths = []
    weaknesses = []
    recommendations = []

    # Structure
    missing_sections = [
        SECTION_LABELS[key] for key in SECTION_WEIGHTS if not sections.get(key)
    ]
    if not missing_sections:
        strengths.append("All the sections a reviewer expects to find are present.")
    else:
        weaknesses.append(
            "No clear {} section was detected.".format(_format_list(missing_sections))
        )
        recommendations.append(
            "Add clearly labelled {} section{} with a conventional heading so both "
            "recruiters and parsers can find them.".format(
                _format_list(missing_sections),
                "s" if len(missing_sections) > 1 else "",
            )
        )

    # Keyword alignment
    if not target_role:
        weaknesses.append(
            "No target role is set, so keyword alignment could not be measured."
        )
        recommendations.append(
            "Set a target role to unlock keyword and skill-gap analysis against "
            "that role."
        )
    elif not keyword_measured:
        weaknesses.append(
            "The skills {} roles expect could not be read from market data, so "
            "keyword alignment was not measured.".format(target_role)
        )
        recommendations.append(
            "Try the review again when the market data service is reachable to "
            "score your wording against real postings for {}.".format(target_role)
        )
    elif subscores["keyword"] >= THRESHOLDS["keyword_good"]:
        strengths.append(
            "Your wording aligns well with how {} roles are described.".format(
                target_role
            )
        )
    elif subscores["keyword"] <= THRESHOLDS["keyword_weak"]:
        weaknesses.append(
            "Your resume shares little of the wording used in current {} "
            "postings.".format(target_role)
        )
        recommendations.append(
            "Mirror the language used in {} postings where it genuinely describes "
            "work you have done. This is what keyword-matching screens look "
            "for.".format(target_role)
        )

    # Experience evidence
    quantified_ratio = (
        quantified_bullet_count / bullet_count if bullet_count else 0.0
    )
    if subscores["experience"] >= THRESHOLDS["experience_good"]:
        strengths.append(
            "Your experience bullets show measurable outcomes rather than duties."
        )
    elif bullet_count == 0:
        weaknesses.append(
            "No bullet points were detected in your experience or project sections."
        )
        recommendations.append(
            "Rewrite your experience and projects as bullet points, each "
            "describing something you did and the result it produced."
        )
    elif quantified_ratio < THRESHOLDS["quantified_good"]:
        weaknesses.append(
            "Only {}% of your bullets include a measurable result.".format(
                int(round(quantified_ratio * 100))
            )
        )
        recommendations.append(
            "Add numbers to your bullets where you can: users served, time saved, "
            "score improved, percentage faster. Quantified bullets are far more "
            "persuasive than descriptions of duties."
        )

    # Technical depth
    if subscores["depth"] >= THRESHOLDS["depth_good"]:
        strengths.append(
            "Your resume evidences a good share of the skills this role expects."
        )
    elif subscores["depth"] <= THRESHOLDS["depth_weak"] and target_role:
        weaknesses.append(
            "Your resume evidences few of the skills current {} postings ask "
            "for.".format(target_role)
        )

    if matched_skills:
        strengths.append(
            "Matched {} relevant skill{}, including {}.".format(
                len(matched_skills),
                "s" if len(matched_skills) > 1 else "",
                _format_list(matched_skills[:4]),
            )
        )

    if missing_skills:
        # Worded as what postings mention, not as a requirement: the skill list
        # comes from a small live sample and is a prompt to investigate, not a
        # verdict on what the role demands.
        recommendations.append(
            "Current postings mention these often and your resume does not "
            "evidence them: {}. Investigate each one and add a project that uses "
            "it, rather than listing it without backing.".format(
                _format_list(missing_skills[:6])
            )
        )

    # Hygiene
    if subscores["hygiene"] >= THRESHOLDS["hygiene_good"]:
        strengths.append("Your resume is a sensible length and parses cleanly.")
    elif word_count < IDEAL_MIN_WORDS:
        weaknesses.append(
            "Your resume contains about {} words, which is short enough to look "
            "thin against other applicants.".format(word_count)
        )
        recommendations.append(
            "Add detail to your existing bullets: what you built, who used it, and "
            "what changed because of it. Aim for roughly {} to {} words in "
            "total.".format(IDEAL_MIN_WORDS, IDEAL_MAX_WORDS)
        )
    elif word_count > IDEAL_MAX_WORDS:
        weaknesses.append(
            "Your resume runs to about {} words, which is long enough that a "
            "reviewer may skip parts of it.".format(word_count)
        )
        recommendations.append(
            "Cut the least relevant bullets first and keep the resume between "
            "roughly {} and {} words.".format(IDEAL_MIN_WORDS, IDEAL_MAX_WORDS)
        )

    for issue in formatting_issues:
        weaknesses.append(issue)

    if formatting_issues:
        recommendations.append(
            "Rebuild the document with plain single-column text and standard "
            "bullet points, then export it as a simple PDF or DOCX."
        )

    if not strengths:
        strengths.append(
            "There is a usable base here: the review could read your text and "
            "measure it against a role."
        )

    return {
        "strengths": _dedupe_trim(strengths),
        "weaknesses": _dedupe_trim(weaknesses),
        "recommendations": _dedupe_trim(recommendations),
    }


def _skill_names(values):
    """Accept either ["Docker"] or [{"name": "Docker"}] from a caller."""
    names = []
    for value in values or []:
        if isinstance(value, dict):
            name = value.get("name")
        else:
            name = value
        if isinstance(name, str) and name.strip():
            names.append(name.strip())
    return names


def _count_projects(project_lines):
    """Project entries are the non-bullet lines in the projects section."""
    count = 0
    for line in project_lines or []:
        stripped = line.strip()
        if stripped and not _is_bullet(stripped):
            count += 1
    return min(count, 12)


def analyze_resume_text(
    text,
    target_role="",
    target_role_skills=None,
    skill_terms=None,
    weights=None,
):
    """Run the full deterministic review over extracted resume text.

    Returns every number the caller needs plus the findings, so the API layer
    only has to add an optional narrative on top.
    """
    text = text or ""
    all_tokens = _tokenize(text)
    if len(all_tokens) < MIN_REVIEWABLE_WORDS:
        raise ValueError(
            "The uploaded resume contained too little readable text to review. "
            "Upload a text-based PDF, DOCX, or TXT file."
        )

    sections, bodies, lines = find_sections(text)
    project_lines = bodies.get("projects", [])
    experience_lines = bodies.get("experience", [])

    # Bullets are counted inside the experience and project sections when those
    # headings exist. A resume without headings still gets measured, using the
    # whole document, rather than being scored as if it had no evidence at all.
    scoped_lines = experience_lines + project_lines
    if not any(_is_bullet(line) for line in scoped_lines):
        scoped_lines = lines
        project_lines = []

    bullets = [
        line for line in scoped_lines if line.strip() and _is_bullet(line)
    ]
    bullet_count = len(bullets)
    quantified_bullet_count = sum(1 for bullet in bullets if is_quantified_bullet(bullet))
    action_verb_bullet_count = sum(
        1 for bullet in bullets if starts_with_action_verb(bullet)
    )
    project_count = _count_projects(project_lines)

    word_count = len(WORD_PATTERN.findall(text))
    formatting_issues = find_formatting_issues(text, lines)

    detected_skills = detect_skills(text, skill_terms)

    role_skills = _skill_names(target_role_skills)
    lowered_detected = {skill.lower() for skill in detected_skills}
    matched_skills = [skill for skill in role_skills if skill.lower() in lowered_detected]
    missing_skills = [
        skill for skill in role_skills if skill.lower() not in lowered_detected
    ]

    # What the wording is aligned against: the skills current postings for the
    # role ask for, plus the role title itself. Alignment is only *measured*
    # when those skills are known, because a bare job title is too thin a target
    # to score a resume's wording against.
    role_term_groups = _role_term_groups(target_role, role_skills, skill_terms)
    keyword_ratio, matched_terms = score_keywords(text, role_term_groups)
    keyword_measured = bool(role_skills)

    breakdown = compute_resume_score(
        sections=sections,
        word_count=word_count,
        bullet_count=bullet_count,
        quantified_bullet_count=quantified_bullet_count,
        action_verb_bullet_count=action_verb_bullet_count,
        project_count=project_count,
        detected_skills=detected_skills,
        target_role_skills=role_skills,
        keyword_ratio=keyword_ratio,
        keyword_measured=keyword_measured,
        formatting_issue_count=len(formatting_issues),
        weights=weights,
    )

    feedback = build_resume_feedback(
        subscores=breakdown["subscores"],
        sections=sections,
        target_role=target_role,
        keyword_measured=breakdown["keywordMeasured"],
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        bullet_count=bullet_count,
        quantified_bullet_count=quantified_bullet_count,
        formatting_issues=formatting_issues,
        word_count=word_count,
    )

    missing_sections = [SECTION_LABELS[key] for key in SECTION_WEIGHTS if not sections[key]]

    return {
        "compatibilityScore": breakdown["compatibilityScore"],
        "subscores": breakdown["subscores"],
        "keywordMeasured": breakdown["keywordMeasured"],
        "sections": sections,
        "missingSections": missing_sections,
        "detectedSkills": detected_skills,
        "matchedSkills": matched_skills,
        "missingSkills": missing_skills,
        "keywordCoverage": {
            "matchedTerms": len(matched_terms) if keyword_measured else 0,
            "totalTerms": len(role_term_groups) if keyword_measured else 0,
            "terms": matched_terms[:30] if keyword_measured else [],
        },
        "formattingIssues": formatting_issues,
        "wordCount": word_count,
        "bulletCount": bullet_count,
        "quantifiedBulletCount": quantified_bullet_count,
        "projectCount": project_count,
        "targetRole": target_role,
        "strengths": feedback["strengths"],
        "weaknesses": feedback["weaknesses"],
        "recommendations": feedback["recommendations"],
        "analyzerVersion": ANALYZER_VERSION,
    }
