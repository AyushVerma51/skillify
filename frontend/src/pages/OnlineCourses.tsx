import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Search, Star } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/workspace';
import { apiFetch } from '../lib/api';

type Course = {
  title: string;
  provider: string;
  difficulty: string;
  rating: number | null;
  url: string;
  description: string;
  skills: string;
  matchScore: number;
};

export default function OnlineCourses() {
  const { targetRole } = useWorkspace();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('skills') || targetRole || 'software development';
  const [query, setQuery] = useState(initialQuery);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (searchQuery = query) => {
    const cleaned = searchQuery.trim();
    if (!cleaned) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ courses: Course[] }>(
        `/api/courses?q=${encodeURIComponent(cleaned)}&limit=12`,
      );
      setCourses(data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch<{ courses: Course[] }>(
      `/api/courses?q=${encodeURIComponent(initialQuery)}&limit=12`,
    )
      .then((data) => setCourses(data.courses))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load courses.'));
  }, [initialQuery]);

  return (
    <div className="tool-shell">
      <section className="relative overflow-hidden rounded-[2.25rem] bg-sk-ink p-8 text-white shadow-xl lg:p-10">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[32px] border-sk-blue/30" />
        <BookOpen className="relative h-11 w-11 text-sk-lime" />
        <h1 className="relative mt-5 max-w-3xl text-4xl font-black lg:text-5xl">Learn only what moves the plan forward.</h1>
        <p className="relative mt-3 max-w-3xl text-lg leading-8 text-slate-300">
          Search the Skillify catalogue by role, technology, or skill. Results are ranked
          by relevance so you can avoid random course collecting.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
          className="relative mt-7 flex max-w-2xl gap-3 rounded-2xl bg-white p-2"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 rounded-xl px-4 py-3 text-slate-900 outline-none"
            placeholder="Python APIs, product design, data analysis..."
          />
          <button className="inline-flex items-center gap-2 rounded-xl bg-sk-lime px-5 py-3 font-black text-slate-950 hover:bg-white">
            <Search className="h-5 w-5" /> Search
          </button>
        </form>
      </section>

      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {loading && <p className="mt-8 text-center font-semibold text-blue-700">Ranking matching courses...</p>}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <article key={`${course.title}-${course.provider}`} className="studio-panel flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                {course.difficulty || 'All levels'}
              </span>
              {course.rating != null && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                  <Star className="h-4 w-4 fill-current" /> {course.rating.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-950">{course.title}</h2>
            <p className="mt-2 font-medium text-blue-700">{course.provider}</p>
            <p className="mt-4 line-clamp-4 flex-1 text-sm leading-6 text-slate-600">
              {course.description || course.skills}
            </p>
            <a
              href={course.url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-sk-ink px-5 py-3 font-bold text-white hover:bg-sk-orange"
            >
              Open course <ExternalLink className="h-4 w-4" />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
