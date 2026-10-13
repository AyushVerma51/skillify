import { ArrowUpRight, Menu, Orbit, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Home' },
  { to: '/studio', label: 'Career Studio' },
  { to: '/about', label: 'About' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-[#f4f1e8]/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-6">
        <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-sk-ink bg-sk-lime shadow-[3px_3px_0_#101827] transition group-hover:-translate-y-0.5">
            <Orbit className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-black leading-none tracking-[-0.03em]">Skillify</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Direction to action
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (
                `rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  isActive ? 'bg-sk-ink text-white' : 'text-slate-600 hover:bg-white hover:text-sk-ink'
                }`
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link to="/studio" className="primary-button hidden md:inline-flex">
          Open Studio <ArrowUpRight className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-900/15 bg-white md:hidden"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-900/10 bg-[#f4f1e8] px-4 pb-5 pt-3 md:hidden">
          <nav className="grid gap-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) => (
                  `rounded-2xl px-4 py-3 font-extrabold ${
                    isActive ? 'bg-sk-ink text-white' : 'bg-white text-slate-700'
                  }`
                )}
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/studio" onClick={() => setOpen(false)} className="primary-button mt-2 w-full">
              Open Career Studio <ArrowUpRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
