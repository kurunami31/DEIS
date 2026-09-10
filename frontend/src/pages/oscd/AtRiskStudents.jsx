import { useEffect, useState } from 'react';
import { AlertTriangle, HeartHandshake } from 'lucide-react';
import { request } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

export default function AtRiskStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    request({ url: '/oscd/at-risk' })
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.student.studentNo.toLowerCase().includes(q) || a.student.firstName.toLowerCase().includes(q) || a.student.lastName.toLowerCase().includes(q);
  });

  if (loading) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <AlertTriangle size={15} className="text-red-500" />
          <span className="font-semibold text-slate-700">{filtered.length}</span> at-risk students
        </div>
        <input className="input !py-1.5 text-xs max-w-xs" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <HeartHandshake size={36} className="mb-3 text-emerald-400" />
          <p className="text-sm text-slate-500">No at-risk students identified.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <section key={a.id} className="card card-pad space-y-3 border-l-4 border-red-400">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{a.student.firstName} {a.student.lastName}</p>
                  <p className="text-xs text-slate-400">{a.student.studentNo}</p>
                </div>
                <span className="badge badge-red">At Risk</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p><span className="font-medium">Assessment:</span> {a.type}</p>
                {a.result && <p><span className="font-medium">Result:</span> {a.result}</p>}
                {a.interpretation && <p className="italic text-slate-500">{a.interpretation}</p>}
              </div>
              <p className="text-xs text-slate-400">Assessed: {formatDate(a.assessedAt)}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
