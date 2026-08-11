import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { request } from '../../lib/api.js';

export default function SectionsPage() {
  const [sections, setSections] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/sections' })
      .then(setSections)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!sections) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const totalSeats = sections.reduce((sum, s) => sum + s.capacity, 0);
  const totalEnrolled = sections.reduce((sum, s) => sum + s.seatsTaken, 0);

  return (
    <div className="space-y-5">
      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <LayoutGrid size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{sections.length}</span> sections ·{' '}
          <span className="font-semibold text-slate-700">{totalEnrolled}/{totalSeats}</span> seats filled
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="card card-pad py-14 text-center">
          <LayoutGrid size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-600">No sections found</h2>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject</th>
                  <th>Term</th>
                  <th>Faculty</th>
                  <th>Schedule</th>
                  <th>Room</th>
                  <th>Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => {
                  const pct = s.capacity ? Math.round((s.seatsTaken / s.capacity) * 100) : 0;
                  const tone = pct >= 100 ? 'badge-red' : pct >= 75 ? 'badge-amber' : 'badge-green';
                  return (
                    <tr key={s.id}>
                      <td className="font-mono text-xs font-semibold text-primary-700">{s.code}</td>
                      <td>
                        <p className="font-medium">{s.subject.title}</p>
                        <p className="text-xs text-slate-400">{s.subject.code}</p>
                      </td>
                      <td className="text-xs">{s.term.label}</td>
                      <td className="text-xs">{s.faculty?.fullName ?? 'Unassigned'}</td>
                      <td className="text-xs">{s.schedule}</td>
                      <td className="text-xs">{s.room}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`badge ${tone}`}>{s.seatsTaken}/{s.capacity}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}