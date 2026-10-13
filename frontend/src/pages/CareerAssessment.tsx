import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Check, Compass, Route } from 'lucide-react';
import { useWorkspace } from '../context/workspace';
import { apiFetch } from '../lib/api';

const FALLBACK_INTERESTS = [
  'Coding',
  'Research',
  'Mathematics',
  'Physics',
  'Economics',
  'Accounting',
  'Designing',
  'Content Writing',
  'Teaching',
  'Photography',
];

type Recommendation = {
  career: string;
  marketRole: string;
  algorithm: string;
  accuracy: number;
  courses: Array<{ title: string; provider: string; url: string }>;
};

export default function CareerAssessment() {
  const { setTargetRole } = useWorkspace();
  const [availableInterests, setAvailableInterests] = useState(FALLBACK_INTERESTS);
  const [interests, setInterests] = useState(['', '', '', '', '']);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ interests: string[] }>('/api/career/options')
      .then((data) => {
        setAvailableInterests(data.interests);
      })
      .catch(() => {
        // The local fallback keeps the form usable while the backend starts.
      });
  }, []);

  const updateInterest = (index: number, value: string) => {
    setInterests((current) => current.map((interest, itemIndex) => (
      itemIndex === index ? value : interest
    )));
    setResult(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedInterests = interests.filter(Boolean);
    if (selectedInterests.length !== 5) {
      setError('Select all five interests before generating a career recommendation.');
      return;
    }
    if (new Set(selectedInterests).size !== selectedInterests.length) {
      setError('Choose five different interests for a more useful prediction.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<Recommendation>('/api/career/recommend', {
        method: 'POST',
        body: JSON.stringify({ interests: selectedInterests, algorithm: 'RandomForest' }),
      });
      setResult(data);
      setTargetRole(data.marketRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create recommendation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-shell">
      <section className="tool-intro">
        <div>
          <span className="eyebrow"><Compass className="h-4 w-4" /> Direction finder</span>
          <h1>Start with what naturally keeps your attention.</h1>
          <p>
            Choose five different interests. Skillify compares the pattern with its
            trained career dataset and gives you a practical direction to investigate next.
          </p>
        </div>
        <div className="tool-intro-note">
          <BrainCircuit className="h-5 w-5" />
          <span>One recommendation, without technical model choices.</span>
        </div>
      </section>

      <form onSubmit={submit} className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
        <section className="studio-panel p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-text">Your signals</p>
              <h2 className="mt-1 text-2xl font-black">Choose five interests</h2>
            </div>
            <span className="rounded-full bg-sk-lime px-4 py-2 text-sm font-black text-sk-ink">
              {interests.filter(Boolean).length}/5 complete
            </span>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {interests.map((interest, index) => (
              <label key={`interest-${index + 1}`} className={index === 4 ? 'md:col-span-2' : ''}>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Interest {index + 1}
                </span>
                <select
                  value={interest}
                  onChange={(event) => updateInterest(index, event.target.value)}
                  required
                  className="form-input"
                >
                  <option value="">Select an interest</option>
                  {availableInterests.map((option) => {
                    const selectedElsewhere = interests.some((
                      selectedInterest,
                      selectedIndex,
                    ) => selectedIndex !== index && selectedInterest === option);
                    return (
                      <option key={option} value={option} disabled={selectedElsewhere}>
                        {option}
                      </option>
                    );
                  })}
                </select>
              </label>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-[2rem] bg-sk-ink p-7 text-white shadow-xl">
          <Route className="h-9 w-9 text-sk-lime" />
          <p className="mt-5 eyebrow-text text-sk-lime">What happens next</p>
          <h2 className="mt-2 text-2xl font-black">Turn signals into direction</h2>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
            <li className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-sk-lime" /> We identify the strongest career pattern.</li>
            <li className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-sk-lime" /> Your result becomes the shared target across the Studio.</li>
            <li className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-sk-lime" /> You can validate it with live market data and a roadmap.</li>
          </ul>
          {error && <p className="mt-5 rounded-xl bg-red-950/60 p-4 text-sm text-red-200">{error}</p>}
          <button
            disabled={loading}
            className="primary-button mt-6 w-full bg-sk-lime text-sk-ink hover:bg-white disabled:bg-slate-600"
          >
            {loading ? 'Finding your direction...' : 'Find my direction'}
          </button>
        </aside>
      </form>

      {result && (
        <section className="result-banner mt-8">
          <div>
            <p className="eyebrow-text text-[#a5c928]">Recommended study path</p>
            <h2 className="mt-2 text-4xl font-black">{result.career}</h2>
            <p className="mt-3 inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-black text-sk-ink">
              Market role: {result.marketRole}
            </p>
            <p className="mt-4 max-w-3xl text-slate-600">
              Treat this as a direction to test, not a permanent label. Check the market,
              inspect the skills, and build a short roadmap before committing.
            </p>
          </div>
          <Link
            to={`/studio?tool=market&role=${encodeURIComponent(result.marketRole)}`}
            className="primary-button shrink-0"
          >
            Validate this direction <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
}
