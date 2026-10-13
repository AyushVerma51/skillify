import { ArrowUpRight, Orbit } from 'lucide-react';
import { Link } from 'react-router-dom';

const studioLinks = [
  ['Discover direction', 'discover'],
  ['Read the market', 'market'],
  ['Review my resume', 'review'],
  ['Build a roadmap', 'roadmap'],
  ['Find courses', 'learn'],
  ['Practice interviews', 'practice'],
];

export default function Footer() {
  return (
    <footer className="mt-16 bg-sk-ink text-white">
      <div className="container mx-auto px-4 py-12 lg:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sk-lime text-sk-ink">
                <Orbit className="h-6 w-6" />
              </span>
              <span className="text-xl font-black">Skillify</span>
            </div>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
              A focused, account-free workspace for choosing a direction, validating it with
              evidence, building a plan, and practicing for the opportunity.
            </p>
          </div>

          <div>
            <p className="eyebrow-text text-slate-500">Career Studio</p>
            <ul className="mt-4 space-y-3">
              {studioLinks.map(([label, tool]) => (
                <li key={tool}>
                  <Link
                    to={`/studio?tool=${tool}`}
                    className="inline-flex items-center gap-2 font-bold text-slate-300 hover:text-sk-lime"
                  >
                    {label} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow-text text-slate-500">Principles</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <li>No signup or personal account required.</li>
              <li>Roadmap progress stays in your browser.</li>
              <li>Career guidance is informational and does not guarantee employment.</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Skillify.</p>
          <div className="flex gap-5">
            <Link to="/" className="hover:text-white">Home</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/studio" className="hover:text-white">Studio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
