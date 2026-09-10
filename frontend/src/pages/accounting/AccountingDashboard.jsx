import { useEffect, useState } from 'react';
import { BookOpen, FileText, ArrowLeftRight, Scale } from 'lucide-react';
import { request } from '../../lib/api.js';

export default function AccountingDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/accounting/dashboard' })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!stats) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const fmt = (n) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const cards = [
    { label: 'Chart of Accounts', value: stats.totalAccounts, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Journal Entries', value: stats.totalEntries, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Debits', value: fmt(stats.totalDebits), icon: ArrowLeftRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Credits', value: fmt(stats.totalCredits), icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Accounting Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
