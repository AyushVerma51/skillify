from collections import Counter
from datetime import datetime, timezone
from html import unescape
import os
import re
import threading
import time

import requests

from career_roles import normalize_market_role


ARBEITNOW_API_URL = os.getenv(
    "JOB_MARKET_API_URL",
    "https://www.arbeitnow.com/api/job-board-api",
)
REMOTIVE_API_URL = os.getenv(
    "REMOTIVE_API_URL",
    "https://remotive.com/api/remote-jobs",
)
THE_MUSE_API_URL = os.getenv(
    "THE_MUSE_API_URL",
    "https://www.themuse.com/api/public/jobs",
)
THE_MUSE_API_KEY = os.getenv("THE_MUSE_API_KEY", "").strip()
JOB_MARKET_CACHE_SECONDS = int(os.getenv("JOB_MARKET_CACHE_SECONDS", "900"))
REMOTIVE_CACHE_SECONDS = int(os.getenv("REMOTIVE_CACHE_SECONDS", "21600"))
THE_MUSE_CACHE_SECONDS = int(os.getenv("THE_MUSE_CACHE_SECONDS", "3600"))
JOB_MARKET_PAGES = max(1, min(int(os.getenv("JOB_MARKET_PAGES", "3")), 5))
THE_MUSE_PAGES = max(1, min(int(os.getenv("THE_MUSE_PAGES", "5")), 10))

_SOURCE_CACHE = {
    "arbeitnow": {"jobs": [], "expires_at": 0.0, "fetched_at": None},
    "remotive": {"jobs": [], "expires_at": 0.0, "fetched_at": None},
    "themuse": {"jobs": [], "expires_at": 0.0, "fetched_at": None},
}
_CACHE_LOCK = threading.Lock()

SOURCE_DETAILS = {
    "Arbeitnow": "https://www.arbeitnow.com/",
    "Remotive": "https://remotive.com/",
    "The Muse": "https://www.themuse.com/jobs",
}

SKILL_ALIASES = {
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
    "Machine Learning": ("machine learning", "ml engineer", "scikit-learn"),
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
    "SAP": ("sap",),
    "SEO": ("seo", "search engine optimization"),
}

QUERY_STOP_WORDS = {
    "a",
    "an",
    "and",
    "bachelor",
    "degree",
    "for",
    "in",
    "of",
    "role",
    "the",
}


class JobMarketError(RuntimeError):
    pass


def _plain_text(value):
    text = re.sub(r"<[^>]+>", " ", str(value or ""))
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _utc_iso(timestamp):
    try:
        return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _iso_date(value):
    cleaned = str(value or "").strip()
    if not cleaned:
        return None
    try:
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.isoformat()
    except ValueError:
        return None


def _normalize_arbeitnow(job):
    return {
        "id": f"arbeitnow:{job.get('slug') or job.get('url') or ''}",
        "title": _plain_text(job.get("title")),
        "company": _plain_text(job.get("company_name")) or "Company not listed",
        "description": _plain_text(job.get("description")),
        "location": _plain_text(job.get("location")) or "Location not listed",
        "remote": bool(job.get("remote")),
        "url": str(job.get("url") or ""),
        "tags": _clean_list(job.get("tags"), 8),
        "jobTypes": _clean_list(job.get("job_types"), 5),
        "postedAt": _utc_iso(job.get("created_at")),
        "source": "Arbeitnow",
    }


def _normalize_remotive(job):
    tags = _clean_list(job.get("tags"), 8)
    category = _plain_text(job.get("category"))
    if category and category not in tags:
        tags.insert(0, category)
    job_type = _plain_text(job.get("job_type"))
    return {
        "id": f"remotive:{job.get('id') or job.get('url') or ''}",
        "title": _plain_text(job.get("title")),
        "company": _plain_text(job.get("company_name")) or "Company not listed",
        "description": _plain_text(job.get("description")),
        "location": (
            _plain_text(job.get("candidate_required_location"))
            or "Worldwide / location restrictions may apply"
        ),
        "remote": True,
        "url": str(job.get("url") or ""),
        "tags": tags[:8],
        "jobTypes": [job_type] if job_type else [],
        "postedAt": _iso_date(job.get("publication_date")),
        "source": "Remotive",
    }


def _normalize_themuse(job):
    locations = _clean_list(
        [item.get("name") for item in job.get("locations", []) if isinstance(item, dict)],
        4,
    )
    categories = _clean_list(
        [item.get("name") for item in job.get("categories", []) if isinstance(item, dict)],
        5,
    )
    levels = _clean_list(
        [item.get("name") for item in job.get("levels", []) if isinstance(item, dict)],
        4,
    )
    location = ", ".join(locations) or "Location not listed"
    location_text = location.lower()
    return {
        "id": f"themuse:{job.get('id') or job.get('short_name') or ''}",
        "title": _plain_text(job.get("name")),
        "company": _plain_text((job.get("company") or {}).get("name"))
        or "Company not listed",
        "description": _plain_text(job.get("contents")),
        "location": location,
        "remote": any(
            marker in location_text
            for marker in ("remote", "flexible", "anywhere", "worldwide")
        ),
        "url": str((job.get("refs") or {}).get("landing_page") or ""),
        "tags": categories,
        "jobTypes": levels,
        "postedAt": _iso_date(job.get("publication_date")),
        "source": "The Muse",
    }


def _clean_list(values, limit):
    if not isinstance(values, list):
        return []
    cleaned = [_plain_text(value) for value in values]
    return [value for value in cleaned if value][:limit]


def _fetch_arbeitnow():
    jobs = []
    for page in range(1, JOB_MARKET_PAGES + 1):
        response = requests.get(
            ARBEITNOW_API_URL,
            params={"page": page},
            timeout=20,
            headers={"User-Agent": "Skillify/1.0 job-market-analysis"},
        )
        response.raise_for_status()
        payload = response.json()
        jobs.extend(_normalize_arbeitnow(job) for job in payload.get("data", []))
    return jobs


def _fetch_remotive():
    response = requests.get(
        REMOTIVE_API_URL,
        params={"limit": 500},
        timeout=20,
        headers={"User-Agent": "Skillify/1.0 job-market-analysis"},
    )
    response.raise_for_status()
    payload = response.json()
    return [_normalize_remotive(job) for job in payload.get("jobs", [])]


def _fetch_themuse():
    jobs = []
    for page in range(THE_MUSE_PAGES):
        params = {"page": page}
        if THE_MUSE_API_KEY:
            params["api_key"] = THE_MUSE_API_KEY
        response = requests.get(
            THE_MUSE_API_URL,
            params=params,
            timeout=20,
            headers={"User-Agent": "Skillify/1.0 job-market-analysis"},
        )
        response.raise_for_status()
        payload = response.json()
        jobs.extend(_normalize_themuse(job) for job in payload.get("results", []))
    return jobs


def _source_jobs(cache_key, fetcher, cache_seconds, force_refresh=False):
    cache = _SOURCE_CACHE[cache_key]
    now = time.time()
    if not force_refresh and cache["jobs"] and cache["expires_at"] > now:
        return list(cache["jobs"]), cache["fetched_at"], None

    try:
        jobs = [job for job in fetcher() if job["title"] and job["url"]]
        fetched_at = datetime.now(timezone.utc).isoformat()
        cache.update({
            "jobs": jobs,
            "expires_at": now + cache_seconds,
            "fetched_at": fetched_at,
        })
        return list(jobs), fetched_at, None
    except (requests.RequestException, ValueError, TypeError) as exc:
        if cache["jobs"]:
            return (
                list(cache["jobs"]),
                cache["fetched_at"],
                f"{cache_key.title()} is temporarily unavailable; cached data is shown.",
            )
        return [], None, f"{cache_key.title()} is temporarily unavailable: {exc}"


def fetch_latest_jobs(force_refresh=False):
    with _CACHE_LOCK:
        arbeitnow_jobs, arbeitnow_fetched, arbeitnow_warning = _source_jobs(
            "arbeitnow",
            _fetch_arbeitnow,
            JOB_MARKET_CACHE_SECONDS,
            force_refresh,
        )
        remotive_jobs, remotive_fetched, remotive_warning = _source_jobs(
            "remotive",
            _fetch_remotive,
            REMOTIVE_CACHE_SECONDS,
            force_refresh,
        )
        themuse_jobs, themuse_fetched, themuse_warning = _source_jobs(
            "themuse",
            _fetch_themuse,
            THE_MUSE_CACHE_SECONDS,
            force_refresh,
        )

    jobs = arbeitnow_jobs + remotive_jobs + themuse_jobs
    if not jobs:
        warnings = [
            warning
            for warning in (arbeitnow_warning, remotive_warning, themuse_warning)
            if warning
        ]
        raise JobMarketError(
            "Live job listings are temporarily unavailable. "
            + " ".join(warnings)
        )

    deduplicated = {}
    for job in jobs:
        key = (
            re.sub(r"\W+", "", job["company"].lower()),
            re.sub(r"\W+", "", job["title"].lower()),
        )
        deduplicated.setdefault(key, job)

    sources = []
    if arbeitnow_jobs:
        sources.append({
            "name": "Arbeitnow",
            "url": SOURCE_DETAILS["Arbeitnow"],
            "listings": len(arbeitnow_jobs),
            "fetchedAt": arbeitnow_fetched,
        })
    if remotive_jobs:
        sources.append({
            "name": "Remotive",
            "url": SOURCE_DETAILS["Remotive"],
            "listings": len(remotive_jobs),
            "fetchedAt": remotive_fetched,
        })
    if themuse_jobs:
        sources.append({
            "name": "The Muse",
            "url": SOURCE_DETAILS["The Muse"],
            "listings": len(themuse_jobs),
            "fetchedAt": themuse_fetched,
        })

    warnings = [
        warning
        for warning in (arbeitnow_warning, remotive_warning, themuse_warning)
        if warning
    ]
    fetched_times = [
        fetched_at
        for fetched_at in (arbeitnow_fetched, remotive_fetched, themuse_fetched)
        if fetched_at
    ]
    fetched_at = max(fetched_times) if fetched_times else None
    return list(deduplicated.values()), fetched_at, sources, warnings


def _job_search_text(job):
    return " ".join([
        job["title"],
        job["company"],
        job["description"],
        job["location"],
        " ".join(job["tags"]),
        " ".join(job["jobTypes"]),
    ]).lower()


def _query_tokens(role):
    return [
        token
        for token in re.findall(r"[a-z0-9+#.]+", role.lower())
        if len(token) > 1 and token not in QUERY_STOP_WORDS
    ]


def _match_score(job, role, tokens):
    title = job["title"].lower()
    text = _job_search_text(job)
    exact_role = role.lower() in title
    matched_tokens = sum(token in text for token in tokens)
    title_tokens = sum(token in title for token in tokens)
    required_tokens = len(tokens) if len(tokens) <= 2 else len(tokens) - 1
    if (
        not exact_role
        and tokens
        and (matched_tokens < max(1, required_tokens) or title_tokens == 0)
    ):
        return 0
    return (10 if exact_role else 0) + (title_tokens * 4) + matched_tokens


def _seniority(title):
    normalized = title.lower()
    if any(word in normalized for word in ("head", "director", "principal", "lead", "manager")):
        return "Lead / Manager"
    if any(word in normalized for word in ("senior", "sr.", "staff")):
        return "Senior"
    if any(word in normalized for word in ("junior", "jr.", "entry", "graduate", "intern", "trainee")):
        return "Entry / Junior"
    return "Mid / Unspecified"


def _skill_counts(jobs):
    counts = Counter()
    for job in jobs:
        text = _job_search_text(job)
        for skill, aliases in SKILL_ALIASES.items():
            if any(_contains_alias(text, alias) for alias in aliases):
                counts[skill] += 1
    return [{"name": name, "count": count} for name, count in counts.most_common(12)]


def _contains_alias(text, alias):
    if re.fullmatch(r"[a-z0-9 ]+", alias):
        return bool(re.search(rf"\b{re.escape(alias)}\b", text))
    return alias in text


def _ranked_counter(values, limit=6):
    return [
        {"name": name, "count": count}
        for name, count in Counter(value for value in values if value).most_common(limit)
    ]


def _market_insights(role, matches, remote_share, top_skills, seniority):
    if not matches:
        return [
            f"No strong matches for {role} appeared in the latest listings sample.",
            "Try a broader title such as Software Engineer, Data Analyst, or Product Manager.",
        ]

    insights = [
        f"{len(matches)} relevant openings were identified across the current public-listing sample.",
        (
            f"Remote-friendly roles account for {remote_share}% of matches."
            if remote_share
            else "The current matches are primarily location-based rather than fully remote."
        ),
    ]
    if top_skills:
        insights.append(
            "The most repeated skill signals are "
            + ", ".join(skill["name"] for skill in top_skills[:4])
            + "."
        )
    dominant_seniority = max(seniority, key=seniority.get)
    insights.append(
        f"{dominant_seniority} positions form the largest seniority group in this sample."
    )
    return insights


def analyze_job_market(role, location="", remote_only=False):
    requested_role = re.sub(r"\s+", " ", str(role or "")).strip()
    search_role = normalize_market_role(requested_role)
    location = re.sub(r"\s+", " ", str(location or "")).strip()
    if len(search_role) < 2:
        raise ValueError("Enter a role containing at least 2 characters.")
    if len(search_role) > 100 or len(location) > 100:
        raise ValueError("Role and location must be 100 characters or fewer.")

    jobs, fetched_at, sources, warnings = fetch_latest_jobs()
    tokens = _query_tokens(search_role)
    scored = []
    for job in jobs:
        if remote_only and not job["remote"]:
            continue
        if location:
            location_text = job["location"].lower()
            requested_location = location.lower()
            if requested_location not in location_text and "worldwide" not in location_text:
                continue
        score = _match_score(job, search_role, tokens)
        if score:
            scored.append((score, job))

    scored.sort(
        key=lambda item: (item[0], item[1]["postedAt"] or ""),
        reverse=True,
    )
    matches = [job for _, job in scored]
    remote_count = sum(job["remote"] for job in matches)
    remote_share = round((remote_count / len(matches)) * 100) if matches else 0
    seniority = Counter(_seniority(job["title"]) for job in matches)
    seniority_data = {
        label: seniority.get(label, 0)
        for label in ("Entry / Junior", "Mid / Unspecified", "Senior", "Lead / Manager")
    }
    top_skills = _skill_counts(matches)

    if len(matches) >= 20:
        demand_level = "High activity"
    elif len(matches) >= 8:
        demand_level = "Moderate activity"
    elif matches:
        demand_level = "Focused activity"
    else:
        demand_level = "No sample match"

    source_names = [source["name"] for source in sources]
    return {
        "query": {
            "role": requested_role,
            "searchRole": search_role,
            "wasNormalized": requested_role != search_role,
            "location": location,
            "remoteOnly": remote_only,
        },
        "metrics": {
            "listingsAnalyzed": len(matches),
            "remoteListings": remote_count,
            "remoteShare": remote_share,
            "companiesHiring": len({job["company"] for job in matches}),
            "demandLevel": demand_level,
        },
        "topSkills": top_skills,
        "topLocations": _ranked_counter(job["location"] for job in matches),
        "topCompanies": _ranked_counter(job["company"] for job in matches),
        "seniority": seniority_data,
        "insights": _market_insights(
            search_role,
            matches,
            remote_share,
            top_skills,
            seniority_data,
        ),
        "jobs": matches[:12],
        "coverage": {
            "source": " + ".join(source_names),
            "sourceUrl": sources[0]["url"],
            "sources": sources,
            "fetchedAt": fetched_at,
            "scannedListings": len(jobs),
            "status": "partial" if warnings else "live",
            "warnings": warnings,
            "note": (
                "Analysis combines recent European, international remote, and broader "
                "company listings. "
                "Public feeds are samples, not a complete count of every open role."
            ),
        },
    }
