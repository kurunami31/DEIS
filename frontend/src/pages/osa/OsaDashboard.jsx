import { useEffect, useState } from 'react';
import { Users, BookOpen, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { request } from '../../lib/api.js';

export default function OsaDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/osa/dashboard' })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!stats) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const cards = [
    { label: 'Total Organizations', value: stats.totalOrgs, icon: Users, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Active Organizations', value: stats.activeOrgs, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Services', value: stats.pendingServices, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Services', value: stats.totalServices, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open Disciplinary', value: stats.openDisciplinary, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Student Affairs Dashboard</h1>
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
