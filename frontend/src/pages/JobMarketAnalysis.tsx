import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  Globe2,
  Loader2,
  MapPin,
  Radar,
  RefreshCw,
  Search,
  Users,
  Wifi,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/workspace';
import { apiFetch } from '../lib/api';

type RankedItem = {
  name: string;
  count: number;
};

type MarketJob = {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  remote: boolean;
  url: string;
  tags: string[];
  jobTypes: string[];
  postedAt: string | null;
  source: string;
};

type MarketAnalysis = {
  query: {
    role: string;
    searchRole: string;
    wasNormalized: boolean;
    location: string;
    remoteOnly: boolean;
  };
  metrics: {
    listingsAnalyzed: number;
    remoteListings: number;
    remoteShare: number;
    companiesHiring: number;
    demandLevel: string;
  };
  topSkills: RankedItem[];
  topLocations: RankedItem[];
  topCompanies: RankedItem[];
  seniority: Record<string, number>;
  insights: string[];
  jobs: MarketJob[];
  coverage: {
    source: string;
    sourceUrl: string;
    sources: Array<{
      name: string;
      url: string;
      listings: number;
      fetchedAt: string | null;
    }>;
    fetchedAt: string;
    scannedListings: number;
    status: 'live' | 'partial';
    warnings: string[];
    note: string;
  };
};

const defaultRole = 'Software Engineer';

export default function JobMarketAnalysis() {
  const { targetRole, setTargetRole } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [initialRole] = useState(() => searchParams.get('role') || targetRole || defaultRole);
  const [role, setRole] = useState(initialRole);
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runAnalysis = async (
    selectedRole = role,
    selectedLocation = location,
    remote = remoteOnly,
  ) => {
    const cleanedRole = selectedRole.trim();
    if (!cleanedRole) {
      setError('Enter a role to analyze.');
      return;
    }

    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      role: cleanedRole,
      location: selectedLocation.trim(),
      remote: String(remote),
    });
    try {
      const data = await apiFetch<MarketAnalysis>(`/api/job-market?${params}`);
      setAnalysis(data);
      setRole(data.query.searchRole);
      setTargetRole(data.query.searchRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze the job market.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      role: initialRole,
      location: '',
      remote: 'false',
    });
    apiFetch<MarketAnalysis>(`/api/job-market?${params}`)
      .then((data) => {
        if (active) {
          setAnalysis(data);
          setRole(data.query.searchRole);
          setTargetRole(data.query.searchRole);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not analyze the job market.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialRole, setTargetRole]);

  const maxSeniority = analysis
    ? Math.max(...Object.values(analysis.seniority), 1)
    : 1;

  return (
    <div className="tool-shell text-slate-950">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-slate-900/10 bg-[#d7f264]">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[36px] border-slate-950/10" />
        <div className="absolute bottom-0 left-[45%] h-24 w-24 translate-y-1/2 rotate-12 bg-[#ff6b4a]" />
        <div className="relative px-6 py-12 lg:px-10 lg:py-16">
          <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-950/20 bg-white/50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
                <Radar className="h-4 w-4" /> Live opportunity radar
              </span>
              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                Read the market before you plan your next move.
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-800">
                Search a role to see current hiring activity, recurring skills, seniority,
                locations, and real openings from the latest public job listings.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runAnalysis();
              }}
              className="rounded-[2rem] border-2 border-slate-950 bg-white p-5 shadow-[10px_10px_0_#0f172a]"
            >
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Target role
                </span>
                <input
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 w-full border-b-2 border-slate-300 px-1 py-3 text-xl font-bold outline-none transition focus:border-slate-950"
                  placeholder="Data Analyst"
                  maxLength={100}
                />
              </label>
              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Location, optional
                </span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="mt-2 w-full border-b-2 border-slate-300 px-1 py-3 text-lg font-semibold outline-none transition focus:border-slate-950"
                  placeholder="Berlin, Germany"
                  maxLength={100}
                />
              </label>
              <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
                <span className="flex items-center gap-2 font-bold">
                  <Wifi className="h-5 w-5" /> Remote roles only
                </span>
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(event) => setRemoteOnly(event.target.checked)}
                  className="h-5 w-5 accent-slate-950"
                />
              </label>
              <button
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-[#ff6b4a] disabled:cursor-wait disabled:bg-slate-500"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                {loading ? 'Reading the market...' : 'Analyze this market'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <main className="py-9">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">The live market feeds could not be loaded.</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
            <button type="button" onClick={() => void runAnalysis()} className="secondary-button border-red-300">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}

        {loading && !analysis && !error && (
          <div className="studio-panel grid min-h-80 place-items-center p-10 text-center">
            <div>
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-sk-blue" />
              <h2 className="mt-4 text-2xl font-black">Collecting current job signals</h2>
              <p className="mt-2 text-slate-600">Checking European and international remote listings...</p>
            </div>
          </div>
        )}

        {analysis && (
          <>
            {analysis.query.wasNormalized && (
              <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Market searches need job titles, so <strong>{analysis.query.role}</strong> was
                analyzed as <strong>{analysis.query.searchRole}</strong>.
              </div>
            )}
            {!!analysis.coverage.warnings.length && (
              <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                {analysis.coverage.warnings.join(' ')}
              </div>
            )}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<Briefcase className="h-6 w-6" />}
                label="Matching listings"
                value={String(analysis.metrics.listingsAnalyzed)}
                accent="bg-[#ff6b4a]"
              />
              <MetricCard
                icon={<Building2 className="h-6 w-6" />}
                label="Companies hiring"
                value={String(analysis.metrics.companiesHiring)}
                accent="bg-[#84ccff]"
              />
              <MetricCard
                icon={<Globe2 className="h-6 w-6" />}
                label="Remote share"
                value={`${analysis.metrics.remoteShare}%`}
                accent="bg-[#d7f264]"
              />
              <MetricCard
                icon={<BarChart3 className="h-6 w-6" />}
                label="Demand signal"
                value={analysis.metrics.demandLevel}
                accent="bg-[#ffd166]"
                compact
              />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d7f264]">
                  Market brief
                </p>
                <h2 className="mt-3 text-3xl font-black">
                  Signals for {analysis.query.searchRole}
                </h2>
                <div className="mt-6 space-y-4">
                  {analysis.insights.map((insight) => (
                    <div key={insight} className="flex gap-3 text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d7f264]" />
                      <p className="leading-7">{insight}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to={`/studio?tool=roadmap&career=${encodeURIComponent(analysis.query.searchRole)}`}
                    className="rounded-xl bg-[#d7f264] px-5 py-3 font-black text-slate-950 hover:bg-white"
                  >
                    Build a roadmap
                  </Link>
                  <Link
                    to={`/studio?tool=learn&skills=${encodeURIComponent(analysis.query.searchRole)}`}
                    className="rounded-xl border border-white/30 px-5 py-3 font-bold text-white hover:bg-white/10"
                  >
                    Find matching courses
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-900/10 bg-white p-7 shadow-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-[#ff6b4a]" />
                  <h2 className="text-2xl font-black">Seniority mix</h2>
                </div>
                <div className="mt-6 space-y-5">
                  {Object.entries(analysis.seniority).map(([level, count]) => (
                    <div key={level}>
                      <div className="mb-2 flex justify-between text-sm font-bold">
                        <span>{level}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#ff6b4a]"
                          style={{ width: `${(count / maxSeniority) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-3">
              <RankedList title="Skills employers repeat" items={analysis.topSkills} color="bg-[#d7f264]" />
              <RankedList title="Hiring locations" items={analysis.topLocations} color="bg-[#84ccff]" />
              <RankedList title="Companies in the sample" items={analysis.topCompanies} color="bg-[#ffd166]" />
            </section>

            <section className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e24a2b]">
                    Current openings
                  </p>
                  <h2 className="mt-2 text-4xl font-black tracking-tight">Roles behind the numbers</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-600">
                  Openings link directly to the source. Always confirm requirements and
                  availability with the employer before applying.
                </p>
              </div>

              {analysis.jobs.length ? (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {analysis.jobs.map((job) => (
                    <article
                      key={job.id}
                      className="group flex flex-col rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-wider text-[#e24a2b]">
                            {job.company}
                          </p>
                          <h3 className="mt-2 text-2xl font-black leading-tight">{job.title}</h3>
                        </div>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${job.title}`}
                          className="rounded-full bg-slate-950 p-3 text-white transition group-hover:bg-[#ff6b4a]"
                        >
                          <ArrowUpRight className="h-5 w-5" />
                        </a>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          <MapPin className="h-4 w-4" /> {job.location}
                        </span>
                        {job.remote && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-800">
                            <Wifi className="h-4 w-4" /> Remote
                          </span>
                        )}
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                          Source: {job.source}
                        </span>
                      </div>
                      {!!job.tags.length && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {job.tags.slice(0, 5).map((tag) => (
                            <span key={tag} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-5 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                        {job.description}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[2rem] border-2 border-dashed border-slate-300 bg-white p-10 text-center">
                  <Search className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-4 text-2xl font-black">No strong matches in this sample</h3>
                  <p className="mt-2 text-slate-600">
                    Remove the location filter or try a broader role title.
                  </p>
                </div>
              )}
            </section>

            <section className="mt-10 rounded-2xl border border-slate-900/10 bg-white/60 p-5 text-sm text-slate-600">
              <strong className="text-slate-900">Data coverage:</strong>{' '}
              {analysis.coverage.note} {analysis.coverage.scannedListings} listings were
              scanned for this analysis.
              <span className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {analysis.coverage.sources.map((source) => (
                  <a
                    key={source.name}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-700 underline"
                  >
                    {source.name}: {source.listings} listings
                  </a>
                ))}
              </span>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  compact?: boolean;
}) {
  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-slate-900/10 bg-white p-6 shadow-md">
      <div className={`absolute right-0 top-0 h-16 w-16 rounded-bl-[2rem] ${accent}`} />
      <div className="relative">
        {icon}
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className={`mt-2 font-black tracking-tight ${compact ? 'text-2xl' : 'text-4xl'}`}>{value}</p>
      </div>
    </article>
  );
}

function RankedList({
  title,
  items,
  color,
}: {
  title: string;
  items: RankedItem[];
  color: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <article className="rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-lg">
      <h2 className="text-xl font-black">{title}</h2>
      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.slice(0, 6).map((item) => (
            <div key={item.name}>
              <div className="mb-1 flex justify-between gap-3 text-sm font-bold">
                <span>{item.name}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Not enough matching data yet.</p>
      )}
    </article>
  );
}
