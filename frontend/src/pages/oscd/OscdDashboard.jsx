import { useEffect, useState } from 'react';
import { HeartHandshake, Calendar, CheckCircle2, ClipboardList, AlertTriangle } from 'lucide-react';
import { request } from '../../lib/api.js';

export default function OscdDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/oscd/dashboard' })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!stats) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const cards = [
    { label: 'Total Sessions', value: stats.totalSessions, icon: HeartHandshake, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Scheduled', value: stats.scheduledSessions, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed (Month)', value: stats.completedThisMonth, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Assessments', value: stats.totalAssessments, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'At-Risk Students', value: stats.atRiskStudents, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Guidance & Counseling Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
