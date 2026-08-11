import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function FacultySectionsPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/sections/my' })
      .then(setSections)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!sections) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const totalStudents = sections.reduce((sum, s) => sum + (s._count?.items ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card card-pad">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[15px] bg-primary-50 text-primary-600">
              <BookOpen size={19} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned sections</p>
              <p className="text-xl font-bold text-slate-800">{sections.length}</p>
            </div>
          </div>
        </section>
        <section className="card card-pad">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[15px] bg-primary-50 text-primary-600">
              <Users size={19} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students this term</p>
              <p className="text-xl font-bold text-slate-800">{totalStudents}</p>
            </div>
          </div>
        </section>
      </div>

      {sections.length === 0 ? (
        <div className="card card-pad py-14 text-center">
          <BookOpen size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-600">No sections assigned</h2>
          <p className="mt-1 text-sm text-slate-400">The Registrar hasn't assigned any sections to you yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <Link key={section.id} to={`/sections/${section.id}/grades`} className="card card-pad block transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{section.subject.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{section.code} · {section.term.label}</p>
                </div>
                <span className="badge badge-blue">{section._count?.items ?? 0} students</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {section.schedule} · {section.room}
              </p>
              <p className="mt-3 text-xs font-semibold text-primary-600">Open grade sheet →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}