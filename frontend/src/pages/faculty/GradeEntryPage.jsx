import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Save } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function GradeEntryPage() {
  const { sectionId } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const load = () =>
    request({ url: `/sections/${sectionId}/roster` })
      .then((section) => {
        setData(section);
        setEntries(
          section.roster.map((row) => ({
            enrollmentItemId: row.enrollmentItemId,
            studentId: row.student.id,
            name: `${row.student.firstName} ${row.student.lastName}`,
            studentNo: row.student.studentNo,
            prelim: row.grade?.prelim ?? '',
            midterm: row.grade?.midterm ?? '',
            final: row.grade?.final ?? '',
          })),
        );
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const compute = useMemo(() => (row) => {
    const { prelim, midterm, final } = row;
    if (prelim === '' || midterm === '' || final === '') return null;
    return Math.round((prelim * 0.3 + midterm * 0.3 + final * 0.4) * 100) / 100;
  }, []);

  const summary = useMemo(() => {
    if (!entries) return { complete: 0, incomplete: 0, average: null, finalizable: false, finalized: false };
    const complete = entries.filter((e) => e.prelim !== '' && e.midterm !== '' && e.final !== '');
    const values = complete.map(compute).filter((v) => v != null);
    const average = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : null;
    const classified = entries.length > 0 && complete.length === entries.length;
    return {
      complete: complete.length,
      incomplete: entries.length - complete.length,
      average,
      finalizable: classified,
    };
  }, [entries, compute]);

  const setValue = (studentId, field, value) => {
    setEntries((current) => current.map((e) => (e.studentId === studentId ? { ...e, [field]: value === '' ? '' : Number(value) } : e)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await request({
        method: 'put',
        url: `/grades/section/${sectionId}/records`,
        data: {
          records: entries.map((e) => ({
            studentId: e.studentId,
            prelim: e.prelim === '' ? null : e.prelim,
            midterm: e.midterm === '' ? null : e.midterm,
            final: e.final === '' ? null : e.final,
          })),
        },
      });
      toast.success('Grades saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const result = await request({ method: 'post', url: `/grades/section/${sectionId}/finalize` });
      toast.success(`${result.finalized ?? 0} grade record(s) finalized.`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFinalizing(false);
    }
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data || !entries) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const allFinalized = data.roster.length > 0 && data.roster.every((row) => row.grade?.status === 'FINALIZED');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/my-sections" className="btn-secondary !px-3 !py-1.5 text-xs">
          <ArrowLeft size={14} /> Back to my sections
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${allFinalized ? 'badge-green' : 'badge-amber'}`}>
            {allFinalized ? 'Finalized' : 'Draft'}
          </span>
          {!allFinalized && (
            <>
              <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={saving} onClick={handleSave}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                className="btn-primary !px-3 !py-1.5 text-xs"
                disabled={!summary.finalizable || finalizing}
                onClick={handleFinalize}
              >
                <Lock size={13} /> {finalizing ? 'Finalizing…' : 'Finalize grades'}
              </button>
            </>
          )}
        </div>
      </div>

      <section className="card card-pad">
        <h2 className="text-lg font-bold text-slate-800">{data.subject.title}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {data.code} · {data.term.label} · {data.schedule} · {data.room}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="badge badge-blue">{entries.length} students</span>
          <span className="badge badge-amber">{summary.incomplete} incomplete</span>
          <span className="badge badge-green">{summary.complete} complete</span>
          {summary.average && <span className="badge badge-gray">Class average {summary.average}</span>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Prelim (30%)</th>
                <th>Midterm (30%)</th>
                <th>Final (40%)</th>
                <th>Computed</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const computed = compute(entry);
                const passing = computed != null && computed <= 3.0;
                return (
                  <tr key={entry.studentId} className={computed != null && passing ? 'bg-emerald-50/40' : ''}>
                    <td className="text-xs text-slate-400">{index + 1}</td>
                    <td>
                      <p className="font-medium">{entry.name}</p>
                      <p className="text-xs text-slate-400">{entry.studentNo}</p>
                    </td>
                    {(['prelim', 'midterm', 'final']).map((field) => (
                      <td key={field} className="w-24">
                        <input
                          type="number"
                          className="input w-20 px-2 py-1 text-center text-xs"
                          min="1"
                          max="5"
                          step="0.01"
                          value={entry[field]}
                          disabled={allFinalized}
                          onChange={(e) => setValue(entry.studentId, field, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="text-center">
                      {computed != null ? (
                        <span className={`badge ${passing ? 'badge-green' : 'badge-red'}`}>{computed.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="text-xs">
                      {computed != null && (
                        <span className={passing ? 'font-medium text-emerald-600' : 'font-medium text-red-500'}>
                          {passing ? 'Passed' : 'Failed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {allFinalized && <p className="text-xs text-slate-500">This section's grades are finalized and locked.</p>}
      {!allFinalized && summary.incomplete > 0 && (
        <p className="text-xs text-slate-500">Finalize is enabled once all students have prelim, midterm, and final values.</p>
      )}
    </div>
  );
}