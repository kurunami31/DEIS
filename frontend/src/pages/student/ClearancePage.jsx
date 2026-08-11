import { useEffect, useState } from 'react';
import { ShieldCheck, Clock3 } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const CATEGORY_LABEL = {
  LIBRARY: 'Library',
  FINANCE: 'Finance & Accounting',
  DEPARTMENT: 'Department / College',
  GUIDANCE: 'Guidance Office',
  REGISTRAR: 'Registrar',
};

function statusMeta(status) {
  return status === 'CLEARED'
    ? { label: 'Cleared', cls: 'badge-green' }
    : { label: 'Pending', cls: 'badge-amber' };
}

export default function ClearancePage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request({ url: '/clearances/my' })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;
  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  const { clearance, term, templates, subjects } = data;
  if (!clearance) return <div className="card p-6 text-sm text-slate-400">No clearance found for the current term.</div>;

  const signoffs = clearance.signoffs;
  const clearedCount = signoffs.filter((s) => s.status === 'CLEARED').length;
  const pct = templates.length ? Math.round((clearedCount / templates.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary-700">Student Clearance</h1>
          <p className="text-sm text-slate-500">{term.label} · {clearance.status === 'CLEARED' ? 'Fully cleared' : 'In progress'}</p>
        </div>
        <span className={`badge ${clearance.status === 'CLEARED' ? 'badge-green' : 'badge-amber'}`}>
          {clearance.status === 'CLEARED' ? 'CLEARED' : 'IN PROGRESS'}
        </span>
      </div>

      {subjects.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Cleared for</h2>
          <p className="mt-1 text-sm text-slate-500">{subjects.join(' · ')}</p>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Progress</h2>
          <span className="badge badge-green">{pct}% complete</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-400">{clearedCount} of {templates.length} requirements cleared</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => {
          const signoff = signoffs.find((s) => s.templateId === t.id);
          const meta = statusMeta(signoff?.status ?? 'PENDING');
          return (
            <div key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-700">{t.label}</p>
                  <p className="text-xs text-slate-400">{CATEGORY_LABEL[t.category] ?? t.category}</p>
                </div>
                <span className={`badge ${meta.cls}`}>{meta.label}</span>
              </div>
              {signoff?.cleared ? (
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <ShieldCheck size={14} className="text-green-600" /> Reviewed by {signoff.reviewedBy?.fullName ?? 'staff'}
                </p>
              ) : (
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <Clock3 size={14} className="text-amber-500" /> Awaiting sign-off
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}