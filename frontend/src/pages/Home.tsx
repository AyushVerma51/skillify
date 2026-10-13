import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Compass,
  FileText,
  Map,
  Mic2,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../context/workspace';

const journey = [
  {
    step: '01',
    title: 'Discover',
    copy: 'Use your interests to find a direction worth investigating.',
    icon: Compass,
    tool: 'discover',
    color: 'bg-sk-lime',
  },
  {
    step: '02',
    title: 'Validate',
    copy: 'Read current hiring signals, skill demand, and open roles.',
    icon: BarChart3,
    tool: 'market',
    color: 'bg-sk-blue text-white',
  },
  {
    step: '03',
    title: 'Review',
    copy: 'Score your resume against the role and see exactly what to fix.',
    icon: FileText,
    tool: 'review',
    color: 'bg-violet-500 text-white',
  },
  {
    step: '04',
    title: 'Plan',
    copy: 'Turn the goal into weekly milestones and portfolio proof.',
    icon: Map,
    tool: 'roadmap',
    color: 'bg-sk-orange text-white',
  },
  {
    step: '05',
    title: 'Learn',
    copy: 'Find relevant courses for the gaps inside your plan.',
    icon: BookOpen,
    tool: 'learn',
    color: 'bg-sk-yellow',
  },
  {
    step: '06',
    title: 'Practice',
    copy: 'Answer interview questions aloud and get focused coaching.',
    icon: Mic2,
    tool: 'practice',
    color: 'bg-emerald-400',
  },
];

export default function Home() {
  const { targetRole } = useWorkspace();

  return (
    <div className="overflow-hidden">
      <section className="relative">
        <div className="hero-grid absolute inset-0 opacity-60" />
        <div className="container relative mx-auto grid min-h-[690px] items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-6 lg:py-20">
          <div className="reveal-up">
            <span className="eyebrow"><Sparkles className="h-4 w-4" /> Career clarity without the account wall</span>
            <h1 className="mt-6 max-w-4xl text-6xl font-black leading-[0.92] tracking-[-0.065em] text-sk-ink sm:text-7xl lg:text-[5.7rem]">
              Stop browsing.
              <span className="block text-sk-blue">Start moving.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-slate-600 sm:text-xl">
              Skillify connects direction, real market evidence, a personalized plan,
              learning resources, and interview practice inside one focused workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/studio" className="primary-button px-6 py-4 text-base">
                Open Career Studio <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/about" className="secondary-button px-6 py-4 text-base">
                See how it works
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-600">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> No signup</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Browser-local progress</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> One connected workflow</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] reveal-up-delayed">
            <div className="absolute -left-6 top-16 h-24 w-24 rotate-12 rounded-[2rem] bg-sk-orange" />
            <div className="absolute -right-8 bottom-16 h-32 w-32 rounded-full border-[20px] border-sk-blue/20" />
            <div className="relative rotate-[-2deg] rounded-[2.5rem] border-2 border-sk-ink bg-white p-5 shadow-[14px_14px_0_#101827]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="eyebrow-text">Career workspace</p>
                  <h2 className="mt-1 text-2xl font-black">{targetRole || 'Choose your direction'}</h2>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sk-lime">
                  <Target className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {journey.slice(0, 3).map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className={`flex items-center gap-4 rounded-2xl border p-4 ${
                        index === 0 ? 'border-sk-ink bg-[#f4f1e8]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className={`icon-tile ${item.color}`}><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.step} / {item.title}</p>
                        <p className="mt-1 font-extrabold text-sk-ink">{item.copy}</p>
                      </div>
                      {index === 0 ? <ArrowRight className="h-5 w-5" /> : <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat value="6" label="connected tools" />
                <Stat value="1" label="shared direction" />
                <Stat value="0" label="accounts needed" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sk-ink py-16 text-white lg:py-20">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_0.65fr]">
            <div>
              <p className="eyebrow-text text-sk-lime">The connected journey</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Every tool answers the next question.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-slate-400">
              Instead of presenting a menu of unrelated features, Skillify guides you
              through a sequence that turns uncertainty into evidence and action.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {journey.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.step}
                  to={`/studio?tool=${item.tool}`}
                  className="group rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-sk-lime/60 hover:bg-white/[0.08]"
                >
                  <div className="flex items-center justify-between">
                    <span className={`icon-tile ${item.color}`}><Icon className="h-5 w-5" /></span>
                    <span className="font-mono text-xs font-bold text-slate-600">{item.step}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.copy}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-sk-lime">
                    Open tool <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 lg:px-6 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-3">
          <ValueCard
            icon={<Zap className="h-6 w-6" />}
            label="Less friction"
            title="No account before value"
            copy="Open the Studio and start immediately. Your roadmap progress stays in the browser you are already using."
            color="bg-sk-lime"
          />
          <ValueCard
            icon={<ShieldCheck className="h-6 w-6" />}
            label="More honesty"
            title="Evidence over promises"
            copy="Market insights show their source and sample coverage. Career recommendations are directions to validate, not guarantees."
            color="bg-sk-blue text-white"
          />
          <ValueCard
            icon={<Target className="h-6 w-6" />}
            label="Better focus"
            title="One role across every tool"
            copy="Your chosen direction follows you into market analysis, roadmaps, courses, interview practice, and coaching."
            color="bg-sk-orange text-white"
          />
        </div>
      </section>

      <section className="container mx-auto px-4 pb-10 lg:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-sk-ink bg-sk-yellow p-8 shadow-[10px_10px_0_#101827] sm:p-12">
          <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[34px] border-sk-orange/30" />
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div>
              <p className="eyebrow-text">Ready when you are</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Your next career move needs a system, not another tab.
              </h2>
            </div>
            <Link to="/studio" className="primary-button shrink-0 px-6 py-4 text-base">
              Start in the Studio <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-sk-ink p-3 text-white">
      <p className="text-2xl font-black text-sk-lime">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function ValueCard({
  icon,
  label,
  title,
  copy,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  copy: string;
  color: string;
}) {
  return (
    <article className="studio-panel p-7">
      <span className={`icon-tile ${color}`}>{icon}</span>
      <p className="mt-6 eyebrow-text">{label}</p>
      <h3 className="mt-2 text-2xl font-black">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{copy}</p>
    </article>
  );
}
