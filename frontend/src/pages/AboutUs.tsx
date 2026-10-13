import { ArrowRight, BarChart3, BrainCircuit, Database, Mic2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const stack = [
  {
    icon: BrainCircuit,
    title: 'Career direction',
    copy: 'A Scikit-learn classifier compares five interest signals with the project career dataset.',
  },
  {
    icon: BarChart3,
    title: 'Market evidence',
    copy: 'Current public job listings are analyzed for role demand, skills, locations, and seniority.',
  },
  {
    icon: Mic2,
    title: 'Interview practice',
    copy: 'Deepgram handles speech transcription while the configured AI provider scores and coaches answers.',
  },
  {
    icon: Database,
    title: 'Minimal persistence',
    copy: 'Roadmap progress stays in the browser. The backend stores only active anonymous interview sessions and provider diagnostics.',
  },
];

export default function AboutUs() {
  return (
    <div>
      <section className="relative overflow-hidden bg-sk-ink text-white">
        <div className="hero-grid-dark absolute inset-0" />
        <div className="container relative mx-auto px-4 py-20 lg:px-6 lg:py-28">
          <span className="eyebrow text-sk-lime"><ShieldCheck className="h-4 w-4" /> Built for useful clarity</span>
          <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Career guidance should explain the next move, not create another dependency.
          </h1>
          <p className="mt-7 max-w-3xl text-xl leading-9 text-slate-400">
            Skillify is an account-free project that combines machine
            learning, live job data, learning resources, and voice-based interview coaching
            into one practical workflow.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 lg:px-6 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="eyebrow-text">Product principles</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">
              Fewer promises. Better decisions.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              The platform is designed around three ideas: give value before asking for
              anything, show where evidence comes from, and make every result lead to a
              useful next action.
            </p>
            <Link to="/studio" className="primary-button mt-7">
              Explore the Studio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {stack.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="studio-panel p-6">
                  <span className="icon-tile bg-sk-lime"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-white">
        <div className="container mx-auto grid gap-8 px-4 py-14 md:grid-cols-3 lg:px-6">
          <Principle number="01" title="No signup wall" copy="Use every core tool without creating an identity or password." />
          <Principle number="02" title="Transparent evidence" copy="Market analysis labels its source, sample size, and coverage limits." />
          <Principle number="03" title="Human judgment remains" copy="Recommendations and scores are guidance to evaluate, not guaranteed outcomes." />
        </div>
      </section>
    </div>
  );
}

function Principle({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <article>
      <span className="font-mono text-sm font-black text-sk-orange">{number}</span>
      <h3 className="mt-3 text-2xl font-black">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{copy}</p>
    </article>
  );
}
