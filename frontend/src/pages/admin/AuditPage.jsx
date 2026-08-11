import { useEffect, useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { request } from '../../lib/api.js';
import { formatDateTime } from '../../lib/utils.js';

const ACTION_TONE = {
  USER_LOGIN: 'badge-green',
  STUDENT_ACTIVATED: 'badge-teal',
  PASSWORD_CHANGED: 'badge-blue',
  USER_CREATED: 'badge-purple',
  ENROLLMENT_SUBMITTED: 'badge-blue',
  ENROLLMENT_APPROVED: 'badge-green',
  ENROLLMENT_REJECTED: 'badge-red',
  ENROLLMENT_WITHDRAWN: 'badge-gray',
  SECTION_CREATED: 'badge-teal',
  GRADES_ENCODED: 'badge-amber',
  SECTION_FINALIZED: 'badge-purple',
  TERM_UPDATED: 'badge-orange',
};

const FILTERS = ['USER_LOGIN', 'ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'SECTION_FINALIZED', 'USER_CREATED'];

export default function AuditPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    request({ url: '/admin/audit' })
      .then(setEvents)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!events) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const visible = filter ? events.filter((e) => e.actionKey === filter) : events;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{events.length}</span> audit events
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('')}
            className={`badge cursor-pointer px-3 py-1.5 ${filter === '' ? 'badge-blue' : 'border border-slate-200 bg-white text-slate-500'}`}
          >
            All
          </button>
          {FILTER_LABELS.map((action) => (
            <button
              key={action.key}
              onClick={() => setFilter(action.key)}
              className={`badge cursor-pointer px-3 py-1.5 ${filter === action.key ? 'badge-blue' : 'border border-slate-200 bg-white text-slate-500'}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card card-pad py-14 text-center">
          <Activity size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-600">No events recorded</h2>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(event.createdAt)}</td>
                    <td className="text-xs">{event.actor?.fullName ?? 'System'}</td>
                    <td><span className={`badge ${ACTION_TONE[event.actionKey] ?? 'badge-gray'}`}>{event.actionKey}</span></td>
                    <td className="text-xs">{event.entityType} {event.entityId ? `#${event.entityId.slice(0, 8)}` : ''}</td>
                    <td className="max-w-md truncate text-xs text-slate-500">{event.meta ? JSON.stringify(event.meta) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

const FILTER_LABELS = FILTERS.map((key) => ({ key, label: key.replace(/_/g, ' ') }));

