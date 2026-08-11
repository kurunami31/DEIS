import { useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDateTime, initials } from '../../lib/utils.js';

const FILTERS = [
  { value: 'PENDING', label: 'Pending', cls: 'badge-amber' },
  { value: 'APPROVED', label: 'Approved', cls: 'badge-green' },
  { value: 'REJECTED', label: 'Rejected', cls: 'badge-red' },
  { value: 'WITHDRAWN', label: 'Withdrawn', cls: 'badge-gray' },
];

export default function RequestsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState('PENDING');
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (status = filter) =>
    request({ url: `/enrollments?status=${status}` }).then(setRequests).catch((err) => setError(err.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openReview = (req) => {
    setReviewTarget(req);
    setNote('');
  };

  const decide = async (action) => {
    setBusy(true);
    try {
      const result = await request({
        method: 'post',
        url: `/enrollments/${reviewTarget.id}/review`,
        data: { action, reviewNotes: note || undefined },
      });
      toast.success(result.reviewNotes ? 'Request reviewed.' : `Request ${action}d.`);
      setReviewTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!requests) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const summary = requests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0, WITHDRAWN: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`badge cursor-pointer px-3.5 py-1.5 transition-opacity hover:opacity-80 ${
              filter === f.value ? f.cls : 'border border-slate-200 bg-white text-slate-500'
            }`}
          >
            {f.label} · {summary[f.value] ?? 0}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="card card-pad py-14 text-center">
          <Inbox size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-600">Nothing here</h2>
          <p className="mt-1 text-sm text-slate-400">No requests match the “{filter.toLowerCase()}” filter.</p>
        </div>
      ) : (
        requests.map((req) => {
          const units = req.items.reduce((sum, item) => sum + item.section.subject.units, 0);
          return (
            <section key={req.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-[15px] bg-primary-50 text-sm font-bold text-primary-700">
                    {initials(`${req.student.firstName} ${req.student.lastName}`)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{req.student.firstName} {req.student.lastName}</p>
                    <p className="text-xs text-slate-400">
                      {req.student.studentNo} · {req.student.program?.name} · {req.term.label}
                    </p>
                  </div>
                </div>
                <span className={`badge ${FILTERS.find((f) => f.value === req.status)?.cls ?? 'badge-gray'}`}>
                  {req.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="badge badge-blue">{req.items.length} subjects</span>
                <span className="badge badge-blue">{units} units</span>
                <span className="ml-auto">submitted {formatDateTime(req.submittedAt)}</span>
              </div>

              {req.reviewNotes && (
                <p className="mt-2 rounded-[15px] border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> {req.reviewNotes}
                </p>
              )}

              <div className="mt-3 overflow-hidden rounded-[15px] border border-slate-100">
                <table className="table-base">
                  <thead>
                    <tr><th>Subject</th><th>Section</th><th>Schedule</th><th>Units</th></tr>
                  </thead>
                  <tbody>
                    {req.items.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">{item.section.subject.title}</td>
                        <td className="font-mono text-xs">{item.section.code}</td>
                        <td className="text-xs">{item.section.schedule}</td>
                        <td className="text-xs font-semibold">{item.section.subject.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {req.status === 'PENDING' && (
                <div className="mt-3 flex justify-end gap-2">
                  <button className="btn-danger !px-3 !py-1.5 text-xs" onClick={() => openReview(req)}>
                    <X size={13} /> Reject
                  </button>
                  <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => openReview(req)}>
                    <Check size={13} /> Approve
                  </button>
                </div>
              )}
            </section>
          );
        })
      )}

      {reviewTarget && (
        <ReviewModal
          req={reviewTarget}
          note={note}
          setNote={setNote}
          busy={busy}
          onClose={() => setReviewTarget(null)}
          onDecide={decide}
        />
      )}
    </div>
  );
}

function ReviewModal({ req, note, setNote, busy, onClose, onDecide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-800">
          {req.student.firstName} {req.student.lastName} — {req.term.label}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {req.items.length} subjects · {req.items.reduce((sum, item) => sum + item.section.subject.units, 0)} units
        </p>
        <textarea
          className="input mt-4 min-h-24"
          placeholder="Review note for the student (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-danger !px-3 !py-1.5 text-xs" onClick={() => onDecide('reject')} disabled={busy}>
            <X size={13} /> {busy ? '…' : 'Reject'}
          </button>
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => onDecide('approve')} disabled={busy}>
            <Check size={13} /> {busy ? '…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}