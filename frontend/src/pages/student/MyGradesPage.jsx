import { useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, GraduationCap, Info, Scale } from 'lucide-react';
import { request } from '../../lib/api.js';

const GRADE_TONE = (grade) => {
  if (grade <= 1.5) return 'badge-green';
  if (grade <= 2.5) return 'badge-teal';
  if (grade <= 3.0) return 'badge-blue';
  if (grade <= 4.0) return 'badge-amber';
  return 'badge-red';
};

const SEMESTER_OPTIONS = ['1st Sem', '2nd Sem', 'Summer'];

const EQUIVALENTS = [
  ['1.00–1.25', 'EXCELLENT'],
  ['1.50–1.75', 'VERY GOOD'],
  ['2.00–2.25', 'GOOD'],
  ['2.50–2.75', 'SATISFACTORY'],
  ['3.00', 'PASSING'],
  ['4.00', 'CONDITIONAL FAILURE'],
  ['5.00', 'FAILURE'],
  ['INC', 'INCOMPLETE'],
];

function termYear(term) {
  const m = (term?.label ?? '').match(/\b\d{4}\s*-\s*\d{4}\b/);
  if (m) return m[0].replace(/\s+/g, '');
  const y = term?.startDate ? new Date(term.startDate).getFullYear() : null;
  return y ? `${y}-${y + 1}` : '—';
}

function termSemester(term) {
  const label = term?.label ?? '';
  if (/summer/i.test(label)) return 'Summer';
  if (/\b1st\b|\bfirst\b/i.test(label)) return '1st Sem';
  if (/\b2nd\b|\bsecond\b/i.test(label)) return '2nd Sem';
  if (/\b3rd\b|\bthird\b/i.test(label)) return '3rd Sem';
  return '—';
}

function equivalentOf(grade) {
  if (grade <= 1.25) return 'EXCELLENT';
  if (grade <= 1.75) return 'VERY GOOD';
  if (grade <= 2.25) return 'GOOD';
  if (grade <= 2.75) return 'SATISFACTORY';
  if (grade <= 3.0) return 'PASSING';
  if (grade <= 4.0) return 'CONDITIONAL FAILURE';
  return 'FAILURE';
}

function compiledGradeOf(item) {
  const parts = [item.prelim, item.midterm, item.final].filter((v) => v != null);
  if (parts.length === 3) return parts.reduce((a, b) => a + Number(b), 0) / 3;
  return item.grade != null ? Number(item.grade) : null;
}

export default function MyGradesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(null);
  const [sem, setSem] = useState(null);

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
    return [...map.values()];
  }, [data]);

  const years = useMemo(
    () => [...new Set(byTerm.map((g) => termYear(g.term)))].filter((y) => y !== '—').sort((a, b) => b.localeCompare(a)),
    [byTerm],
  );

  const filtered = useMemo(
    () =>
      byTerm.filter(
        (g) => (!year || termYear(g.term) === year) && (!sem || termSemester(g.term) === sem),
      ),
    [byTerm, year, sem],
  );

  // Latest-term-first history of grade records per subject, used to tell
  // "still needs to be completed" (1) from "re-enrolled" (2) failures.
  const subjectHistory = useMemo(() => {
    const map = new Map();
    for (const g of data?.grades ?? []) {
      const sid = g.section.subject.id;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(g);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.section.term.startDate) - new Date(a.section.term.startDate));
    }
    return map;
  }, [data]);

  const markerFor = (item) => {
    const value = Number(item.grade ?? 0);
    if (item.grade == null || value <= 3.0) return null;
    const list = subjectHistory.get(item.section.subject.id) ?? [];
    const reEnrolled = list.some(
      (g) => g.id !== item.id && new Date(g.section.term.startDate) > new Date(item.section.term.startDate),
    );
    return reEnrolled ? 2 : 1;
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const grandTotal = byTerm.reduce((sum, t) => sum + t.items.length, 0);
  const allValues = byTerm.flatMap((t) => t.items).map((g) => Number(g.grade ?? 0));
  const grandAverage = allValues.length ? (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(2) : null;
  const rows = filtered.flatMap((g) => g.items);

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

      <section className="card card-pad">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <CalendarDays size={15} className="text-primary-600" /> Academic Year &amp; Semester
        </h3>
          <div className="mt-3 flex flex-wrap gap-4">
            <div className="min-w-44">
              <label className="label">Academic Year</label>
              <select className="input" value={year ?? ''} onChange={(e) => setYear(e.target.value || null)}>
                <option value="">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-44">
              <label className="label">Semester</label>
              <select className="input" value={sem ?? ''} onChange={(e) => setSem(e.target.value || null)}>
                <option value="">All semesters</option>
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
      </section>

      <section className="card card-pad">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <GraduationCap size={15} className="text-primary-600" /> Grade Record
        </h3>
          {year && sem ? (
            rows.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-[15px] border border-slate-100">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Subjects</th>
                      <th>Units</th>
                      <th>Grade</th>
                      <th>Compiled Grade</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const value = Number(item.grade ?? 0);
                      const hasGrade = item.grade != null;
                      const compiled = compiledGradeOf(item);
                      const marker = markerFor(item);
                      return (
                        <tr key={item.id}>
                          <td className="font-medium">
                            {item.section.subject.title}
                            {marker && (
                              <span
                                className={`ml-1.5 inline-flex size-4 items-center justify-center rounded align-middle text-[10px] font-bold text-white ${
                                  marker === 1 ? 'bg-orange-500' : 'bg-red-600'
                                }`}
                              >
                                {marker}
                              </span>
                            )}
                          </td>
                          <td className="font-mono text-xs">0</td>
                          <td>
                            {hasGrade ? (
                              <span className={`badge ${GRADE_TONE(value)}`}>{value.toFixed(2)}</span>
                            ) : (
                              <span className="badge badge-gray">Pending</span>
                            )}
                          </td>
                          <td className="font-mono text-xs font-semibold">
                            {compiled != null ? compiled.toFixed(2) : '—'}
                          </td>
                          <td className={`text-xs font-medium ${hasGrade ? (value <= 3.0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-400'}`}>
                            {hasGrade ? equivalentOf(value) : 'Not yet graded'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-slate-400">No records to display.</p>
            )
          ) : (
            <p className="mt-4 text-center text-sm text-slate-400">No records to display.</p>
          )}
      </section>

      <section className="card card-pad">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <Scale size={15} className="text-primary-600" /> Approximate Equivalents
        </h3>
          <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
            {EQUIVALENTS.map(([range, label]) => (
              <li key={range} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="font-mono text-xs">{range}</span>
                <span className="font-medium">{label}</span>
              </li>
            ))}
          </ul>
      </section>

      {grandTotal === 0 && (
        <div className="card card-pad py-14 text-center">
          <GraduationCap size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-600">No finalized grades yet</h2>
          <p className="mt-1 text-sm text-slate-400">Your faculty will finalize grades after each term ends.</p>
        </div>
      )}

      <section className="card card-pad">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <Info size={15} className="text-primary-600" /> Legend
        </h3>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded bg-orange-500 text-[11px] font-bold text-white">1</span>
            <p>Subjects that need to be completed within one year; otherwise, your grade will automatically be a 5.00.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded bg-red-600 text-[11px] font-bold text-white">2</span>
            <p>Re-enrolled for the next available offering of the subject.</p>
          </div>
        </div>
      </section>
    </div>
  );
}