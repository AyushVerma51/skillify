import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Loader2,
  MinusCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { useWorkspace } from '../context/workspace';
import { apiFetch } from '../lib/api';

const REVIEW_KEY = 'skillify_resume_review';

type Subscores = {
  structure: number;
  keyword: number | null;
  experience: number;
  depth: number;
  hygiene: number;
};

type ResumeReview = {
  compatibilityScore: number;
  subscores: Subscores;
  keywordMeasured: boolean;
  sections: Record<string, boolean>;
  missingSections: string[];
  detectedSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  keywordCoverage: { matchedTerms: number; totalTerms: number; terms: string[] };
  formattingIssues: string[];
  wordCount: number;
  bulletCount: number;
  quantifiedBulletCount: number;
  projectCount: number;
  targetRole: string;
  marketListingsAnalyzed: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  degraded: boolean;
  analyzerVersion: string;
};

const SECTION_ROWS: Array<[string, string]> = [
  ['contact', 'Contact details'],
  ['skills', 'Skills'],
  ['experience', 'Experience'],
  ['education', 'Education'],
  ['projects', 'Projects'],
];

const SUBSCORE_ROWS: Array<[keyof Subscores, string, string]> = [
  ['structure', 'Structure', 'Are the sections a reviewer expects present?'],
  ['keyword', 'Role keywords', 'How closely your wording matches the role.'],
  ['experience', 'Evidence', 'Do your bullets prove outcomes, not duties?'],
  ['depth', 'Skill depth', 'How much of the role skill set the resume evidences.'],
  ['hygiene', 'Length and parsing', 'Is it a sensible length and does it read cleanly?'],
];

function readStoredReview(): ResumeReview | null {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY) || 'null') as ResumeReview | null;
  } catch {
    return null;
  }
}

export default function ResumeReview() {
  const { targetRole: workspaceRole, setTargetRole: saveWorkspaceRole } = useWorkspace();
  const [resume, setResume] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState(workspaceRole || '');
  const [review, setReview] = useState<ResumeReview | null>(readStoredReview);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!review) return;
    localStorage.setItem(REVIEW_KEY, JSON.stringify(review));
  }, [review]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resume) {
      setError('Choose a PDF, DOCX, or TXT file to review.');
      return;
    }

    setError('');
    setReviewing(true);
    try {
      const body = new FormData();
      body.append('resume', resume);
      if (targetRole.trim()) body.append('targetRole', targetRole.trim());

      const data = await apiFetch<{ review: ResumeReview }>('/api/resume/review', {
        method: 'POST',
        body,
      });
      setReview(data.review);
      if (data.review.targetRole) saveWorkspaceRole(data.review.targetRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review that resume.');
    } finally {
      setReviewing(false);
    }
  };

  const startOver = () => {
    localStorage.removeItem(REVIEW_KEY);
    setReview(null);
    setResume(null);
    setError('');
  };

  return (
    <div className="tool-shell">
      <section className="tool-intro">
        <div>
          <span className="eyebrow"><FileText className="h-4 w-4" /> Resume review</span>
          <h1>Find out what your resume says before a recruiter does.</h1>
          <p>
            Upload your resume and the review scores its structure, wording, evidence, and
            length against the role you are targeting, then tells you exactly what to fix.
          </p>
        </div>
        <div className="tool-intro-note">
          <ShieldAlert className="h-5 w-5" />
          <span>
            An estimated analytical score from your own text, not a real company's ATS result.
          </span>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="studio-panel h-fit p-6 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="icon-tile bg-sk-lime"><FileText className="h-5 w-5" /></span>
            <div>
              <p className="eyebrow-text">Step 1</p>
              <h2 className="text-xl font-black">Upload and target</h2>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6">
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="resume-file">
              Resume file
            </label>
            <input
              id="resume-file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(event) => setResume(event.target.files?.[0] || null)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              PDF, DOCX, or TXT up to 16MB. Text-based files review best; a scanned image
              has no readable text.
            </p>

            <label className="mb-2 mt-5 block text-sm font-bold text-slate-700" htmlFor="resume-role">
              Target role
            </label>
            <input
              id="resume-role"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder="Backend Developer, Data Analyst..."
              className="form-input"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Adding a role unlocks keyword and skill-gap scoring against what real postings
              for it ask for.
            </p>

            <button
              type="submit"
              disabled={reviewing}
              className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {reviewing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {reviewing ? 'Reviewing your resume...' : 'Review my resume'}
            </button>

            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <ShieldAlert className="h-3.5 w-3.5" />
              The result stays in this browser.
            </p>

            {review && (
              <button
                type="button"
                onClick={startOver}
                className="secondary-button mt-4 w-full"
              >
                <RotateCcw className="h-4 w-4" /> Start over
              </button>
            )}
          </form>
        </section>

        <section className="min-w-0 lg:col-span-2">
          {!review ? (
            <div className="studio-empty">
              <span className="empty-orbit"><Target className="h-8 w-8" /></span>
              <h2>Your review will appear here</h2>
              <p>
                Add a resume on the left, optionally set the role you are aiming at, and the
                scores plus a fix list will show up here.
              </p>
            </div>
          ) : (
            <ReviewResult review={review} />
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewResult({ review }: { review: ResumeReview }) {
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-sk-ink p-6 text-white shadow-xl sm:p-7">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-sk-lime/20" />
        <div className="relative">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <span className="eyebrow text-sk-lime">
                <BadgeCheck className="h-4 w-4" /> Estimated compatibility
              </span>
              <p className="mt-3 text-6xl font-black leading-none text-sk-lime">
                {review.compatibilityScore}
                <span className="text-2xl text-slate-400">/100</span>
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Computed from the text in your resume using a fixed rubric. It is not a real
                company's applicant tracking system result and does not predict a hiring
                decision.
              </p>
            </div>
            <div className="text-sm">
              <p className="eyebrow-text text-slate-500">Reviewed against</p>
              <p className="mt-1 max-w-[16rem] text-lg font-black">
                {review.targetRole || 'No target role set'}
              </p>
            </div>
          </div>

          {review.degraded && (
            <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white/5 p-3 text-xs leading-5 text-slate-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sk-lime" />
              The AI narrative was unavailable, so these are the rule-based findings. The
              scores are unaffected.
            </p>
          )}
        </div>
      </div>

      <section className="studio-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">How the score is built</h2>
          <p className="text-xs font-bold text-slate-500">
            {review.wordCount} words / {review.bulletCount} bullets / {review.projectCount} projects
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {SUBSCORE_ROWS.map(([key, label, hint]) => (
            <ScoreBar key={key} label={label} hint={hint} value={review.subscores[key]} />
          ))}
        </div>

        {!review.keywordMeasured && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            Role keywords were not measured for this review, so the remaining components carry
            the score and the wording is not penalised. Set a target role, or retry once the
            live market data service is reachable, to include it.
          </p>
        )}
      </section>

      <section className="studio-panel p-6">
        <h2 className="text-xl font-black">Sections detected</h2>
        <p className="mt-1 text-sm text-slate-600">
          Reviewers and parsers both look for these headings.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SECTION_ROWS.map(([key, label]) => {
            const present = Boolean(review.sections[key]);
            return (
              <li
                key={key}
                className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                  present
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {present
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <XCircle className="h-4 w-4 shrink-0" />}
                {label}
                {!present && <span className="font-medium text-amber-700">not detected</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="studio-panel p-6">
        <h2 className="text-xl font-black">Skills</h2>
        <div className="mt-4 space-y-5">
          <ChipList
            title="Matched to the role"
            items={review.matchedSkills}
            emptyText="No overlap with the role skill set was detected yet."
            tone="matched"
          />
          <ChipList
            title="Mentioned often in current postings, not in your resume"
            items={review.missingSkills}
            emptyText="Every skill the postings mention often is already evidenced."
            tone="missing"
          />
          {!!review.detectedSkills.length && (
            <ChipList
              title="Everything detected in your resume"
              items={review.detectedSkills}
              emptyText="No known skills were detected."
              tone="neutral"
            />
          )}
        </div>
        {review.keywordMeasured && (
          <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            <p>
              Compared against {review.marketListingsAnalyzed} current{' '}
              {review.targetRole} postings. {review.keywordCoverage.matchedTerms} of{' '}
              {review.keywordCoverage.totalTerms} role terms also appear in your resume.
            </p>
            <p>
              Skill names are matched anywhere inside a posting, so a small sample carries
              noise. Treat these as a list to investigate, not as requirements.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeedbackList title="Strengths" items={review.strengths} tone="positive" />
        <FeedbackList title="What is holding it back" items={review.weaknesses} tone="negative" />
        <FeedbackList title="Fix these next" items={review.recommendations} tone="action" />
      </section>

      {!!review.formattingIssues.length && (
        <section className="studio-panel p-6">
          <h2 className="text-xl font-black">Formatting problems we could see</h2>
          <ul className="mt-4 grid gap-2">
            {review.formattingIssues.map((issue) => (
              <li key={issue} className="flex gap-2 text-sm leading-6 text-slate-700">
                <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="px-1 text-xs text-slate-500">
        Deterministic rubric v{review.analyzerVersion}. The same resume always produces the
        same scores, so you can re-upload after editing to measure real progress.
      </p>
    </div>
  );
}

function ScoreBar({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: number | null;
}) {
  const measured = value !== null;
  const tone = !measured
    ? 'bg-slate-300'
    : value >= 70
      ? 'bg-emerald-500'
      : value >= 45
        ? 'bg-sk-yellow'
        : 'bg-sk-orange';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-black text-slate-800">{label}</p>
        <p className="font-mono text-sm font-bold text-slate-500">
          {measured ? value : 'n/a'}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={measured ? value : undefined}
      >
        <div
          className={`h-full transition-all ${tone}`}
          style={{ width: `${measured ? value : 0}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function ChipList({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: 'matched' | 'missing' | 'neutral';
}) {
  const chipTone =
    tone === 'matched'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : tone === 'missing'
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : 'bg-slate-100 text-slate-700 ring-slate-200';

  return (
    <div>
      <p className="eyebrow-text">{title}</p>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${chipTone}`}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'positive' | 'negative' | 'action';
}) {
  const icon =
    tone === 'positive'
      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      : tone === 'negative'
        ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-sk-orange" />
        : <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sk-blue" />;

  return (
    <article className="studio-panel flex h-full flex-col p-5">
      <h3 className="text-base font-black">{title}</h3>
      {items.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
              {icon}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <MinusCircle className="h-4 w-4" /> Nothing to report here.
        </p>
      )}
    </article>
  );
}
