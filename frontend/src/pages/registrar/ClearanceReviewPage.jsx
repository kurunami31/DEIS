import { useEffect, useState } from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const OFFICE_ROLES = ['ACCOUNTING', 'ADMISSION', 'OSA', 'OHS', 'CASHIERING', 'OSCD', 'FAASG'];

function statusMeta(status) {
  return status === 'CLEARED'
    ? { label: 'Cleared', cls: 'badge-green' }
    : { label: 'In progress', cls: 'badge-amber' };
}

export default function ClearanceReviewPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isOffice = OFFICE_ROLES.includes(user?.role);
  const [term, setTerm] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    request({ url: '/clearances', params: { search: search || undefined } })
      .then((data) => {
        setItems(data.items);
        setTerm(data.term);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search]);

  const patchSignoff = (clearance, signoff, status) => {
    setBusyId(signoff.id);
    request({ method: 'patch', url: `/clearances/${clearance.id}/signoff`, data: { templateId: signoff.templateId, status } })
      .then((data) => {
        setItems((prev) => prev.map((it) => (it.id === data.id ? data : it)));
        toast.success(status === 'CLEARED' ? 'Cleared item.' : 'Reopened item.');
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary-700">Clearance Review</h1>
          <p className="text-sm text-slate-500">{term?.label ?? '—'} · click an office to clear or reopen it</p>
        </div>
        <input
          className="input !w-64"
          placeholder="Search student or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card p-6 text-sm text-slate-400">Loading clearances…</div>
      ) : items.length === 0 ? (
        <div className="card p-6 text-sm text-slate-400">No clearance records for {term?.label}.</div>
      ) : (
        items.map((c) => {
          const meta = statusMeta(c.status);
          const cleared = c.signoffs.filter((s) => s.status === 'CLEARED').length;
          return (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-700">
                    {c.student.lastName}, {c.student.firstName}
                    <span className="ml-2 font-mono text-xs font-normal text-slate-400">{c.student.studentNo}</span>
                  </p>
                  <p className="text-xs text-slate-400">{c.student.program?.name ?? '—'} · {cleared}/{c.signoffs.length} cleared</p>
                </div>
                <span className={`badge ${meta.cls}`}>{meta.label}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {c.signoffs
                  .filter((s) => !isOffice || s.template.ownerRole === user?.role)
                  .map((s) => (
                  <button
                    key={s.id}
                    disabled={busyId === s.id}
                    onClick={() => patchSignoff(c, s, s.status === 'CLEARED' ? 'PENDING' : 'CLEARED')}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      s.status === 'CLEARED'
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary-600 hover:text-primary-700'
                    }`}
                    title={s.reviewedBy?.fullName ? `Reviewed by ${s.reviewedBy.fullName}` : 'Click to clear'}
                  >
                    {s.status === 'CLEARED' ? <ShieldCheck size={13} /> : <RotateCcw size={13} />}
                    {s.template.label}
                  </button>
                ))}
              </div>
              {c.status === 'CLEARED' && (
                <p className="mt-2 text-xs text-slate-400">Fully cleared · last updated {new Date(c.updatedAt).toLocaleString()}</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}