import { useEffect, useState } from 'react';
import { GraduationCap, BookOpen, ClipboardCheck, Award, FileText } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/students/dashboard' })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!stats) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const fmt = (n) => n != null ? Number(n).toFixed(2) : '—';

  const cards = [
    { label: 'Enrolled Terms', value: stats.totalEnrolled, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Total Grades', value: stats.totalGrades, icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Average Grade', value: fmt(stats.avgGrade), icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <GraduationCap size={24} className="text-primary-600" />
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Welcome, {stats.student.firstName}!</h1>
          <p className="text-xs text-slate-500">{stats.student.studentNo} · {stats.student.program?.name ?? '—'} · Year {stats.student.yearLevel ?? '—'}</p>
        </div>
      </div>

      {!stats.spfCompleted && (
        <div className="rounded-[15px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <strong>Complete your Student Profile Form</strong> to unlock enrollment.{' '}
          <Link to="/profile?tab=spf" className="underline">Fill out SPF →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {stats.activeEnrollment && (
        <section className="card card-pad">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Current Enrollment</h2>
          <p className="text-xs text-slate-600">Status: <span className={`badge ${stats.activeEnrollment.status === 'APPROVED' ? 'badge-green' : 'badge-amber'}`}>{stats.activeEnrollment.status}</span></p>
          {stats.activeEnrollment.term && <p className="text-xs text-slate-500 mt-1">Term: {stats.activeEnrollment.term.label}</p>}
        </section>
      )}

      <section className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Recent Grades</h2>
          <Link to="/my-grades" className="text-xs text-primary-600 hover:underline">View all</Link>
        </div>
        {stats.recentGrades.length === 0 ? (
          <p className="text-sm text-slate-400">No grades yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Subject</th><th>Grade</th><th>Status</th></tr>
              </thead>
              <tbody>
                {stats.recentGrades.map((g) => (
                  <tr key={g.id}>
                    <td className="text-xs">{g.section?.subject?.name ?? '—'}</td>
                    <td className="text-xs font-semibold">{fmt(g.grade)}</td>
                    <td className="text-xs"><span className={`badge ${g.status === 'PASSED' ? 'badge-green' : g.status === 'FAILED' ? 'badge-red' : 'badge-gray'}`}>{g.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Quick Links</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/enroll" className="flex flex-col items-center gap-2 rounded-[15px] border p-4 text-center hover:bg-slate-50 transition">
            <BookOpen size={20} className="text-primary-600" />
            <span className="text-xs font-medium">Enroll</span>
          </Link>
          <Link to="/my-requests" className="flex flex-col items-center gap-2 rounded-[15px] border p-4 text-center hover:bg-slate-50 transition">
            <FileText size={20} className="text-primary-600" />
            <span className="text-xs font-medium">My Requests</span>
          </Link>
          <Link to="/my-grades" className="flex flex-col items-center gap-2 rounded-[15px] border p-4 text-center hover:bg-slate-50 transition">
            <ClipboardCheck size={20} className="text-primary-600" />
            <span className="text-xs font-medium">My Grades</span>
          </Link>
          <Link to="/clearance" className="flex flex-col items-center gap-2 rounded-[15px] border p-4 text-center hover:bg-slate-50 transition">
            <Award size={20} className="text-primary-600" />
            <span className="text-xs font-medium">Clearance</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
