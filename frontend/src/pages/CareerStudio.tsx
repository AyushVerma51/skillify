import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  FileText,
  Map,
  Mic2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { type ComponentType, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/workspace';
import CareerAssessment from './CareerAssessment';
import JobMarketAnalysis from './JobMarketAnalysis';
import MockInterview from './MockInterview';
import OnlineCourses from './OnlineCourses';
import PersonalizedRoadmap from './PersonalizedRoadmap';
import ResumeReview from './ResumeReview';

const tools = [
  {
    id: 'discover',
    step: '01',
    label: 'Discover',
    title: 'Find your direction',
    description: 'Turn interests into a career signal.',
    icon: Compass,
    color: 'bg-sk-lime',
  },
  {
    id: 'market',
    step: '02',
    label: 'Validate',
    title: 'Read the market',
    description: 'Check demand, skills, and open roles.',
    icon: BarChart3,
    color: 'bg-sk-blue text-white',
  },
  {
    id: 'review',
    step: '03',
    label: 'Review',
    title: 'Review your resume',
    description: 'Score it against the role and fix the gaps.',
    icon: FileText,
    color: 'bg-violet-500 text-white',
  },
  {
    id: 'roadmap',
    step: '04',
    label: 'Plan',
    title: 'Build your roadmap',
    description: 'Create a realistic weekly action plan.',
    icon: Map,
    color: 'bg-sk-orange text-white',
  },
  {
    id: 'learn',
    step: '05',
    label: 'Learn',
    title: 'Close skill gaps',
    description: 'Find the courses that support the plan.',
    icon: BookOpen,
    color: 'bg-sk-yellow',
  },
  {
    id: 'practice',
    step: '06',
    label: 'Practice',
    title: 'Test your interview',
    description: 'Speak, transcribe, score, and improve.',
    icon: Mic2,
    color: 'bg-emerald-400',
  },
] as const;

type ToolId = typeof tools[number]['id'];

const toolComponents: Record<ToolId, ComponentType> = {
  discover: CareerAssessment,
  market: JobMarketAnalysis,
  review: ResumeReview,
  roadmap: PersonalizedRoadmap,
  learn: OnlineCourses,
  practice: MockInterview,
};

export default function CareerStudio() {
  const toolContentRef = useRef<HTMLElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTool = searchParams.get('tool') as ToolId | null;
  const activeTool = tools.some((tool) => tool.id === requestedTool)
    ? requestedTool as ToolId
    : 'discover';
  const { targetRole, resetDirection } = useWorkspace();
  const activeIndex = tools.findIndex((tool) => tool.id === activeTool);
  const active = tools[activeIndex];
  const ActiveToolComponent = toolComponents[activeTool];

  const selectTool = (tool: ToolId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tool', tool);
    setSearchParams(nextParams);
    window.requestAnimationFrame(() => {
      toolContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const startNewDirection = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tool', 'discover');
    nextParams.delete('role');
    nextParams.delete('career');
    nextParams.delete('skills');

    resetDirection();
    setWorkspaceRevision((current) => current + 1);
    setConfirmingReset(false);
    setSearchParams(nextParams, { replace: true });
    window.requestAnimationFrame(() => {
      toolContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="career-studio">
      <section className="studio-masthead">
        <div className="container mx-auto px-4 py-9 lg:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow"><Sparkles className="h-4 w-4" /> Career Studio</span>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                One workspace for the whole career journey.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Move from uncertainty to evidence, then action. No account, no dashboard,
                and no bouncing between disconnected pages.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-slate-900/10 bg-white/70 px-5 py-4 shadow-sm backdrop-blur sm:w-auto sm:min-w-[280px]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Current direction
              </p>
              <p className="mt-1 max-w-xs text-lg font-black text-sk-ink">
                {targetRole || 'Not chosen yet'}
              </p>
              {targetRole && !confirmingReset && (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-black text-sk-blue hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Change direction
                </button>
              )}
              {targetRole && confirmingReset && (
                <div className="mt-3 border-t border-slate-200 pt-3" aria-live="polite">
                  <p className="max-w-xs text-xs leading-5 text-slate-600">
                    This removes the saved roadmap for this role and starts a fresh assessment.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(false)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-white"
                    >
                      Keep current
                    </button>
                    <button
                      type="button"
                      onClick={startNewDirection}
                      className="rounded-full bg-sk-ink px-3 py-1.5 text-xs font-black text-white hover:bg-sk-blue"
                    >
                      Start fresh
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 lg:hidden">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => selectTool(tool.id)}
                  className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-black ${
                    activeTool === tool.id
                      ? 'border-sk-ink bg-sk-ink text-white'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {tool.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container mx-auto grid gap-7 px-4 py-8 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-6">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[2rem] border border-slate-900/10 bg-white p-4 shadow-lg">
            <p className="px-3 pb-3 pt-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Your journey
            </p>
            <nav className="space-y-2" aria-label="Career Studio tools">
              {tools.map((tool, index) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                const isPassed = index < activeIndex;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => selectTool(tool.id)}
                    className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                      isActive ? 'bg-sk-ink text-white' : 'hover:bg-[#f4f1e8]'
                    }`}
                  >
                    <span className={`icon-tile shrink-0 ${isActive ? tool.color : 'bg-slate-100'}`}>
                      {isPassed && !isActive ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[11px] font-black uppercase tracking-[0.16em] ${isActive ? 'text-sk-lime' : 'text-slate-400'}`}>
                        {tool.step} / {tool.label}
                      </span>
                      <span className="mt-0.5 block font-extrabold">{tool.title}</span>
                      <span className={`mt-0.5 block text-xs leading-5 ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                        {tool.description}
                      </span>
                    </span>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? 'text-sk-lime' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
        <div ref={toolContentRef} className="min-w-0 scroll-mt-24">
          <main className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
            <div>
              <p className="eyebrow-text">{active.step} / {active.label}</p>
              <h2 className="text-xl font-black">{active.title}</h2>
            </div>
            {activeIndex < tools.length - 1 && (
              <button
                type="button"
                onClick={() => selectTool(tools[activeIndex + 1].id)}
                className="secondary-button"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <ActiveToolComponent key={`${activeTool}-${workspaceRevision}`} />
          </main>
        </div>
      </div>
    </div>
  );
}
