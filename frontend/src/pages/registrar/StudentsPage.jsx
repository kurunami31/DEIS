import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { request } from '../../lib/api.js';

export default function StudentsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const load = () =>
    request({
      url: '/students',
      params: { page, pageSize: 20, ...(query ? { search: query } : {}) },
    })
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const runSearch = () => {
    setPage(1);
    setTimeout(load, 0);
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const totalPages = Math.max(1, Math.ceil(data.total / 20));

  return (
    <div className="space-y-5">
      <div className="card card-pad">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or student number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <button className="btn-primary !px-4 !py-2 text-sm" onClick={runSearch}>
            Search
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Users size={15} className="text-primary-600" />
        <span className="font-semibold text-slate-700">{data.total}</span> student{data.total === 1 ? '' : 's'} found
      </div>

      {data.items.length === 0 ? (
        <div className="card card-pad py-14 text-center">
          <Users size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-600">No students match your search</h2>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Program</th>
                  <th>Campus</th>
                  <th>Year</th>
                  <th>Account</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <p className="font-medium">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-slate-400">{s.studentNo}</p>
                    </td>
                    <td className="text-xs">{s.program?.name ?? '—'}</td>
                    <td className="text-xs">{s.campus?.name ?? '—'}</td>
                    <td className="text-xs">Year {s.yearLevel ?? '—'}</td>
                    <td>
                      <span className={`badge ${s.user?.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {s.user?.isActive ? 'Active' : 'No account'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-xs text-slate-400">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}