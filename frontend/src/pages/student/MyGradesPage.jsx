import { useEffect, useMemo, useState } from 'react';
import { Award, GraduationCap } from 'lucide-react';
import { request } from '../../lib/api.js';

const GRADE_TONE = (grade) => {
  if (grade <= 1.5) return 'badge-green';
  if (grade <= 2.5) return 'badge-teal';
  if (grade <= 3.0) return 'badge-blue';
  if (grade <= 4.0) return 'badge-amber';
  return 'badge-red';
};

export default function MyGradesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request({ url: '/students/me' })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const byTerm = useMemo(() => {
    if (!data) return [];
    const grades = data.grades ?? [];
    const map = new Map();
    for (const g of grades) {
      const term = g.section.term;
      if (!map.has(term.id)) map.set(term.id, { term, items: [] });
      map.get(term.id).items.push(g);
    }
    return [...map.values()].map((group) => {
      const avg = group.items.length
        ? group.items.reduce((sum, g) => sum + Number(g.grade ?? 0), 0) / group.items.length
        : null;
      return { ...group, average: avg };
    });
  }, [data]);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const grandTotal = byTerm.reduce((sum, t) => sum + t.items.length, 0);
  const allValues = byTerm.flatMap((t) => t.items).map((g) => Number(g.grade ?? 0));
  const grandAverage = allValues.length ? (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(2) : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card card-pad">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[15px] bg-primary-50 text-primary-600">
              <GraduationCap size={19} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Graded records</p>
              <p className="text-xl font-bold text-slate-800">{grandTotal}</p>
            </div>
          </div>
        </section>
        <section className="card card-pad">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[15px] bg-accent-start/10 text-accent-start">
              <Award size={19} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall average</p>
              <p className="text-xl font-bold text-slate-800">{grandAverage ?? '—'}</p>
            </div>
          </div>
        </section>
      </div>

      {grandTotal === 0 && (
        <div className="card card-pad py-14 text-center">
          <GraduationCap size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-600">No finalized grades yet</h2>
          <p className="mt-1 text-sm text-slate-400">Your faculty will finalize grades after each term ends.</p>
        </div>
      )}

      {byTerm.map((group) => (
        <section key={group.term.id} className="card card-pad">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">{group.term.label}</h2>
            <span className="badge badge-blue">
              Average {group.average != null ? Number(group.average).toFixed(2) : '—'}
            </span>
          </div>
          <div className="overflow-hidden rounded-[15px] border border-slate-100">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const value = Number(item.grade ?? 0);
                  const passing = value > 0 && value <= 3.0;
                  const hasGrade = item.grade != null;
                  return (
                    <tr key={item.id}>
                      <td className="font-medium">{item.section.subject.title}</td>
                      <td className="font-mono text-xs">{item.section.code}</td>
                      <td>
                        {hasGrade ? (
                          <span className={`badge ${GRADE_TONE(value)}`}>{value.toFixed(2)}</span>
                        ) : (
                          <span className="badge badge-gray">Pending</span>
                        )}
                      </td>
                      <td className={`text-xs font-medium ${passing ? 'text-emerald-600' : hasGrade ? 'text-red-500' : 'text-slate-400'}`}>
                        {hasGrade ? (passing ? 'Passed' : 'Failed') : 'Not yet graded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}