import { useEffect, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, GraduationCap, LayoutDashboard, PieChart as PieIcon, Users } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { downloadCsv, formatDate } from '../../lib/utils.js';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [sections, setSections] = useState(null);
  const [grades, setGrades] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      request({ url: '/analytics/overview' }),
      request({ url: '/analytics/sections' }),
      request({ url: '/analytics/grades' }),
    ])
      .then(([overviewData, sectionsData, gradesData]) => {
        setOverview(overviewData);
        setSections(sectionsData);
        setGrades(gradesData);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!overview || !sections || !grades) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const exportTrend = () =>
    downloadCsv('deis-enrollment-trend.csv', ['Term', 'Code', 'Pending', 'Approved', 'Rejected'], overview.termSeries.map((t) => [t.term, t.code, t.pending, t.approved, t.rejected]));

  const exportPrograms = () =>
    downloadCsv('deis-students-by-program.csv', ['Program ID', 'Students'], overview.programLoad.map((p) => [p.programId, p._count]));

  const exportGrades = () =>
    downloadCsv('deis-grade-distribution.csv', ['Range', 'Count'], grades.distribution.map((d) => [d.label, d.count]));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Registered students" value={overview.totals.students} />
        <Kpi icon={BarChart3} label="Approved enrollments" value={overview.totals.approvedEnrollments} tone="badge-green" />
        <Kpi icon={LayoutDashboard} label="Sections offered" value={sections.length} tone="badge-teal" />
        <Kpi icon={GraduationCap} label="Passing rate" value={grades.passingRate != null ? `${grades.passingRate}%` : '—'} tone="badge-amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Enrollment by term</h3>
            <div className="flex gap-1">
              <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="Export CSV" onClick={exportTrend}>
                <FileSpreadsheet size={15} />
              </button>
              <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="Download" onClick={() => toast.info('Use the CSV export button to download this view.')}>
                <Download size={15} />
              </button>
            </div>
          </div>
          {overview.termSeries.length === 0 ? (
            <p className="text-sm text-slate-400">No enrolled terms yet.</p>
          ) : (
            <div className="overflow-hidden rounded-[15px] border border-slate-100">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>Pending</th>
                    <th>Approved</th>
                    <th>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.termSeries.map((t) => (
                    <tr key={t.code}>
                      <td className="font-medium">{t.term}</td>
                      <td><span className="badge badge-amber">{t.pending}</span></td>
                      <td><span className="badge badge-green">{t.approved}</span></td>
                      <td><span className="badge badge-red">{t.rejected}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Students by program</h3>
            <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="Export CSV" onClick={exportPrograms}>
              <FileSpreadsheet size={15} />
            </button>
          </div>
          <ProgramBars data={overview.programLoad} />
        </section>

        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
              <PieIcon size={14} className="text-primary-600" /> Strand mix
            </h3>
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
              title="Export CSV"
              onClick={() => downloadCsv('deis-strand-mix.csv', ['Strand', 'Students'], overview.strandMix.map((s) => [s.strand ?? 'Unknown', s._count]))}
            >
              <FileSpreadsheet size={15} />
            </button>
          </div>
          {overview.strandMix.length === 0 ? (
            <p className="text-sm text-slate-400">No strand data yet.</p>
          ) : (
            <div className="space-y-3">
              {overview.strandMix.map((s) => {
                const pct = overview.totals.students ? Math.round((s._count / overview.totals.students) * 100) : 0;
                return (
                  <div key={s.strand ?? 'none'}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{s.strand ?? 'None'}</span>
                      <span className="text-slate-400">{s._count} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-start" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Grade distribution</h3>
            <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="Export CSV" onClick={exportGrades}>
              <FileSpreadsheet size={15} />
            </button>
          </div>
          {grades.distribution.length === 0 ? (
            <p className="text-sm text-slate-400">No finalized grades yet.</p>
          ) : (
            <div className="flex h-44 items-end gap-2">
              {grades.distribution.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">{d.count}</span>
                  <div
                    className="w-full rounded-t-[6px] bg-gradient-to-t from-primary-700 to-accent-start"
                    style={{ height: `${Math.max((d.count / maxCount(grades.distribution)) * 100, 3)}%` }}
                  />
                  <span className="w-full text-center text-[9px] text-slate-400">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="text-xs text-slate-400">
        Live snapshot generated {formatDate(new Date())} by {user?.fullName}. Sources: enrollment requests, sections, and finalized grades.
      </p>
    </div>
  );
}

function maxCount(distribution) {
  return Math.max(...distribution.map((d) => d.count), 1);
}

function Kpi({ icon: Icon, label, value, tone = 'badge-blue' }) {
  return (
    <section className="card card-pad">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon size={15} />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
      <span className={`badge mt-1.5 ${tone}`}>{label}</span>
    </section>
  );
}

function ProgramBars({ data }) {
  if (data.length === 0) return <p className="text-sm text-slate-400">No program data yet.</p>;
  const max = Math.max(...data.map((p) => p._count), 1);
  return (
    <div className="space-y-3">
      {data.map((p) => (
        <div key={p.programId}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-mono font-semibold text-primary-700">{p.programId}</span>
            <span className="text-slate-400">{p._count} students</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.round((p._count / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}