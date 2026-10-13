import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Edit3,
  ExternalLink,
  Loader2,
  Map,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/workspace';
import { apiFetch } from '../lib/api';

const ROADMAP_KEY = 'skillify_roadmap';

type Course = {
  title: string;
  provider: string;
  url: string;
  rating?: number;
};

type Milestone = {
  id: string;
  title: string;
  startWeek: number;
  endWeek: number;
  objective: string;
  skills: string[];
  tasks: string[];
  project?: string | null;
  completionCriteria: string;
  resources: Course[];
  completed: boolean;
};

type Roadmap = {
  id: string;
  title: string;
  summary: string;
  targetRole: string;
  weeklyHours: number;
  durationWeeks: number;
  skillGaps: string[];
  milestones: Milestone[];
};

export default function PersonalizedRoadmap() {
  const { targetRole: workspaceRole, setTargetRole: saveWorkspaceRole } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(ROADMAP_KEY) || 'null') as Roadmap | null;
    } catch {
      return null;
    }
  });
  const [targetRole, setTargetRole] = useState(
    searchParams.get('role')
      || searchParams.get('career')
      || workspaceRole
      || activeRoadmap?.targetRole
      || '',
  );
  const [skills, setSkills] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('entry');
  const [weeklyHours, setWeeklyHours] = useState(8);
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [goals, setGoals] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showBuilder, setShowBuilder] = useState(!activeRoadmap);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(
    activeRoadmap?.milestones.find((item) => !item.completed)?.id
      || activeRoadmap?.milestones[0]?.id
      || null,
  );
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeRoadmap) return;

    localStorage.setItem(ROADMAP_KEY, JSON.stringify(activeRoadmap));
    setExpandedMilestoneId((current) => (
      current && activeRoadmap.milestones.some((item) => item.id === current)
        ? current
        : activeRoadmap.milestones.find((item) => !item.completed)?.id
          || activeRoadmap.milestones[0]?.id
          || null
    ));
  }, [activeRoadmap]);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const data = await apiFetch<{ roadmap: Roadmap }>('/api/roadmaps/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetRole,
          weeklyHours,
          durationWeeks,
          goals,
          profile: {
            targetRole,
            experienceLevel,
            skills: skills.split(',').map((item) => item.trim()).filter(Boolean),
          },
        }),
      });
      setActiveRoadmap(data.roadmap);
      setExpandedMilestoneId(
        data.roadmap.milestones.find((item) => !item.completed)?.id
          || data.roadmap.milestones[0]?.id
          || null,
      );
      setShowBuilder(false);
      saveWorkspaceRole(targetRole);
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleMilestone = (milestone: Milestone) => {
    const willComplete = !milestone.completed;
    setActiveRoadmap((current) => {
      if (!current) return current;
      return {
        ...current,
        milestones: current.milestones.map((item) => (
          item.id === milestone.id ? { ...item, completed: willComplete } : item
        )),
      };
    });

    if (willComplete && activeRoadmap) {
      const nextMilestone = activeRoadmap.milestones.find(
        (item) => item.id !== milestone.id && !item.completed,
      );
      if (nextMilestone) setExpandedMilestoneId(nextMilestone.id);
    }
  };

  const resetRoadmap = () => {
    localStorage.removeItem(ROADMAP_KEY);
    setActiveRoadmap(null);
    setExpandedMilestoneId(null);
    setShowBuilder(true);
  };

  const openMilestone = (milestone: Milestone) => {
    setExpandedMilestoneId(milestone.id);
    window.setTimeout(() => {
      document.getElementById(`roadmap-${milestone.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  };

  const completedCount = activeRoadmap?.milestones.filter((item) => item.completed).length || 0;
  const progress = activeRoadmap?.milestones.length
    ? Math.round((completedCount / activeRoadmap.milestones.length) * 100)
    : 0;

  return (
    <div className="tool-shell">
      <section className="tool-intro">
        <div>
          <span className="eyebrow"><Map className="h-4 w-4" /> Action plan</span>
          <h1>Turn a target role into a plan you can actually finish.</h1>
          <p>
            Build a focused weekly roadmap with projects, completion criteria, and matching
            learning resources. Progress stays in this browser, with no account required.
          </p>
        </div>
        <div className="tool-intro-note">
          <Check className="h-5 w-5" />
          <span>Private by default. Saved only on this device.</span>
        </div>
      </section>

      <section className="studio-panel mt-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="icon-tile bg-sk-lime"><Sparkles className="h-5 w-5" /></span>
            <div>
              <p className="eyebrow-text">Roadmap builder</p>
              <h2 className="text-xl font-extrabold">
                {activeRoadmap ? activeRoadmap.targetRole : 'Set your direction'}
              </h2>
            </div>
          </div>
          {activeRoadmap && (
            <button
              type="button"
              onClick={() => setShowBuilder((current) => !current)}
              className="secondary-button"
              aria-expanded={showBuilder}
            >
              <Edit3 className="h-4 w-4" />
              {showBuilder ? 'Hide settings' : 'Edit plan settings'}
            </button>
          )}
        </div>

        {(showBuilder || !activeRoadmap) && (
          <form onSubmit={generate} className="border-t border-slate-200 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
              <FormField label="Target role" className="xl:col-span-5">
                <input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  required
                  className="form-input"
                  placeholder="Backend Developer"
                />
              </FormField>
              <FormField label="Experience level" className="xl:col-span-3">
                <select
                  value={experienceLevel}
                  onChange={(event) => setExperienceLevel(event.target.value)}
                  className="form-input"
                >
                  <option value="entry">Entry</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid-level</option>
                  <option value="senior">Senior</option>
                </select>
              </FormField>
              <FormField label="Hours/week" className="xl:col-span-2">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={weeklyHours}
                  onChange={(event) => setWeeklyHours(Number(event.target.value))}
                  className="form-input"
                />
              </FormField>
              <FormField label="Weeks" className="xl:col-span-2">
                <input
                  type="number"
                  min={4}
                  max={52}
                  value={durationWeeks}
                  onChange={(event) => setDurationWeeks(Number(event.target.value))}
                  className="form-input"
                />
              </FormField>
              <FormField label="Current skills" className="xl:col-span-6">
                <textarea
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  className="form-input min-h-20"
                  placeholder="Python, SQL, Git"
                />
              </FormField>
              <FormField label="What success looks like" className="xl:col-span-6">
                <textarea
                  value={goals}
                  onChange={(event) => setGoals(event.target.value)}
                  className="form-input min-h-20"
                  placeholder="Become ready for junior backend interviews"
                />
              </FormField>
            </div>
            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Usually ready in under 20 seconds.</p>
              <button disabled={generating} className="primary-button w-full sm:w-auto">
                {generating && <Loader2 className="h-5 w-5 animate-spin" />}
                {generating
                  ? 'Building your plan...'
                  : activeRoadmap
                    ? 'Generate updated roadmap'
                    : 'Build my roadmap'}
              </button>
            </div>
          </form>
        )}
      </section>

      {!activeRoadmap ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['01', 'Choose a role', 'Tell us where you want to go.'],
            ['02', 'Set your pace', 'Choose hours and total weeks.'],
            ['03', 'Work one milestone', 'Open only the step you need now.'],
          ].map(([step, title, description]) => (
            <div key={step} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="step-number">{step}</span>
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
          ))}
        </section>
      ) : (
        <section ref={resultsRef} className="mt-6 scroll-mt-24">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-[2rem] bg-sk-ink p-6 text-white shadow-xl sm:p-7">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-sk-lime/20" />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="eyebrow text-sk-lime">
                    <Clock3 className="h-4 w-4" />
                    {activeRoadmap.durationWeeks} weeks / {activeRoadmap.weeklyHours} hours weekly
                  </span>
                  <button
                    type="button"
                    onClick={resetRoadmap}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
                  >
                    <RotateCcw className="h-4 w-4" /> Start over
                  </button>
                </div>
                <h2 className="mt-4 max-w-3xl text-3xl font-black">{activeRoadmap.title}</h2>
                <p className="mt-3 max-w-3xl leading-7 text-slate-300">{activeRoadmap.summary}</p>
                <div className="mt-6 flex items-end gap-5">
                  <span className="text-5xl font-black text-sk-lime">{progress}%</span>
                  <div className="flex-1 pb-2">
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full bg-sk-lime transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {completedCount} of {activeRoadmap.milestones.length} milestones complete
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {activeRoadmap.milestones.map((milestone, index) => (
                    <button
                      key={milestone.id}
                      type="button"
                      onClick={() => openMilestone(milestone)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${
                        expandedMilestoneId === milestone.id
                          ? 'border-sk-lime bg-sk-lime text-sk-ink'
                          : 'border-white/20 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {milestone.completed && <Check className="h-3.5 w-3.5" />}
                      {String(index + 1).padStart(2, '0')} / Week {milestone.startWeek}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeRoadmap.milestones.map((milestone, index) => {
              const isExpanded = expandedMilestoneId === milestone.id;
              return (
                <article
                  id={`roadmap-${milestone.id}`}
                  key={milestone.id}
                  className={`studio-panel scroll-mt-28 overflow-hidden transition ${
                    milestone.completed ? 'ring-2 ring-emerald-300' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => toggleMilestone(milestone)}
                      className="shrink-0 text-emerald-600"
                      aria-label={`Mark ${milestone.title} ${milestone.completed ? 'incomplete' : 'complete'}`}
                    >
                      {milestone.completed
                        ? <CheckCircle2 className="h-7 w-7" />
                        : <Circle className="h-7 w-7 text-slate-300" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedMilestoneId(isExpanded ? null : milestone.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-expanded={isExpanded}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-3">
                          <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                          <span className="eyebrow-text">
                            Weeks {milestone.startWeek}-{milestone.endWeek}
                          </span>
                        </span>
                        <span className="mt-2 block truncate text-lg font-black sm:text-xl">
                          {milestone.title}
                        </span>
                      </span>
                      {isExpanded
                        ? <ChevronDown className="h-5 w-5 shrink-0" />
                        : <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 px-5 pb-6 pt-5 sm:pl-[4.75rem] sm:pr-6">
                      <p className="leading-7 text-slate-600">{milestone.objective}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {milestone.skills.map((skill) => (
                          <span key={skill} className="skill-chip">{skill}</span>
                        ))}
                      </div>
                      <ul className="mt-5 grid gap-2 text-slate-700">
                        {milestone.tasks.map((task) => (
                          <li key={task} className="flex gap-2">
                            <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                      {milestone.project && (
                        <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6">
                          <strong>Portfolio proof:</strong> {milestone.project}
                        </p>
                      )}
                      <p className="mt-4 text-sm text-slate-500">
                        <strong>Complete when:</strong> {milestone.completionCriteria}
                      </p>
                      {!!milestone.resources.length && (
                        <div className="mt-5 border-t border-slate-200 pt-5">
                          <p className="font-bold">Resources for this milestone</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {milestone.resources.map((course) => (
                              <a
                                key={`${course.title}-${course.provider}`}
                                href={course.url}
                                target="_blank"
                                rel="noreferrer"
                                className="resource-link"
                              >
                                <span>
                                  <strong className="block text-slate-900">{course.title}</strong>
                                  <span className="text-sm text-slate-500">{course.provider}</span>
                                </span>
                                <ExternalLink className="h-4 w-4 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
function FormField({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
