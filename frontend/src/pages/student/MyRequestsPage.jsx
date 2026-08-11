import { useEffect, useState } from 'react';
import { FileText, Undo2 } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDateTime } from '../../lib/utils.js';

const STATUS_META = {
  PENDING: { label: 'Pending', cls: 'badge-amber' },
  APPROVED: { label: 'Approved', cls: 'badge-green' },
  REJECTED: { label: 'Rejected', cls: 'badge-red' },
  WITHDRAWN: { label: 'Withdrawn', cls: 'badge-gray' },
};

export default function MyRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = () => request({ url: '/enrollments/my' }).then(setRequests).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const handleWithdraw = async (id) => {
    try {
      await request({ method: 'post', url: `/enrollments/${id}/withdraw` });
      toast.success('Request withdrawn.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!requests) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  if (requests.length === 0) {
    return (
      <div className="card card-pad py-14 text-center">
        <FileText size={36} className="mx-auto text-slate-300" />
        <h2 className="mt-3 text-sm font-semibold text-slate-600">No enrollment requests yet</h2>
        <p className="mt-1 text-sm text-slate-400">When you enroll, your requests and their review status will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => {
        const meta = STATUS_META[req.status] ?? { label: req.status, cls: 'badge-gray' };
        const units = req.items.reduce((sum, item) => sum + item.section.subject.units, 0);
        const isOpen = expanded === req.id;
        return (
          <section key={req.id} className="card card-pad">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-[15px] bg-primary-50 text-primary-600">
                  <FileText size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {req.term.label} <span className="font-mono text-xs font-normal text-slate-400">#{req.id}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {req.items.length} sections · {units} units · submitted {formatDateTime(req.submittedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${meta.cls}`}>{meta.label}</span>
                {req.status === 'PENDING' && (
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => handleWithdraw(req.id)}>
                    <Undo2 size={13} /> Withdraw
                  </button>
                )}
              </div>
            </div>

            {req.reviewNotes && (
              <p className="mt-3 rounded-[15px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                <span className="font-semibold">Reviewer note:</span> {req.reviewNotes}
              </p>
            )}

            <button
              className="mt-3 text-xs font-semibold text-primary-600 hover:underline"
              onClick={() => setExpanded(isOpen ? null : req.id)}
            >
              {isOpen ? 'Hide subjects' : `View ${req.items.length} subjects`}
            </button>

            {isOpen && (
              <div className="mt-3 overflow-hidden rounded-[15px] border border-slate-100">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Section</th>
                      <th>Schedule</th>
                      <th>Units</th>
                    </tr>
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
            )}
          </section>
        );
      })}
    </div>
  );
}