import { useEffect, useState } from 'react';
import { BookOpen, Users, ClipboardCheck, TrendingUp } from 'lucide-react';
import { request } from '../../lib/api.js';
import { Link } from 'react-router-dom';

export default function FacultyDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/sections/dashboard' })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!stats) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const cards = [
    { label: 'Assigned Sections', value: stats.totalSections, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Grades Encoded', value: stats.gradedCount, icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Passed Students', value: stats.passedCount, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Faculty Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <section key={c.label} className="card card-pad flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] ${c.bg}`}>
              <c.icon size={22} className={c.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{c.value}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">My Sections</h2>
          <Link to="/sections" className="text-xs text-primary-600 hover:underline">View all</Link>
        </div>
        {stats.sections.length === 0 ? (
          <p className="text-sm text-slate-400">No sections assigned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Code</th><th>Subject</th><th>Schedule</th><th>Students</th><th>Term</th></tr>
              </thead>
              <tbody>
                {stats.sections.map((s) => (
                  <tr key={s.id}>
                    <td className="text-xs font-medium">{s.code}</td>
                    <td className="text-xs">{s.subject.name}</td>
                    <td className="text-xs">{s.schedule}</td>
                    <td className="text-xs">{s._count.items}</td>
                    <td className="text-xs">{s.term.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
