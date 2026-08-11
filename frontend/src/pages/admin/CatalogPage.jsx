import { useEffect, useState } from 'react';
import { BookOpen, Building2, Database, GraduationCap } from 'lucide-react';
import { request } from '../../lib/api.js';

const TABS = [
  { value: 'programs', label: 'Programs', icon: GraduationCap },
  { value: 'subjects', label: 'Subjects', icon: BookOpen },
  { value: 'campuses', label: 'Campuses', icon: Building2 },
];

export default function CatalogPage() {
  const [tab, setTab] = useState('programs');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () =>
    Promise.all([
      request({ url: '/catalog/programs' }),
      request({ url: '/catalog/subjects' }),
      request({ url: '/catalog/campuses' }),
    ])
      .then(([programs, subjects, campuses]) => setData({ programs, subjects, campuses }))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-[15px] border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-1.5 rounded-[11px] px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.value ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-primary-600'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Database size={14} className="text-primary-600" />
          Catalog reference · managed by the system
        </div>
      </div>

      {tab === 'programs' && <ProgramsTable programs={data.programs} />}
      {tab === 'subjects' && <SubjectsTable subjects={data.subjects} />}
      {tab === 'campuses' && <CampusesTable campuses={data.campuses} />}
    </div>
  );
}

function ProgramsTable({ programs }) {
  if (programs.length === 0) return <Empty text="No programs in the catalog yet." />;
  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Code</th><th>Program</th><th>Level</th><th>Subjects</th></tr></thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs font-semibold text-primary-700">{p.code}</td>
                <td className="font-medium">{p.name}</td>
                <td className="text-xs">{p.level ?? 'Undergraduate'}</td>
                <td><span className="badge badge-blue">{p._count?.subjects ?? 0}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubjectsTable({ subjects }) {
  if (subjects.length === 0) return <Empty text="No subjects in the catalog yet." />;
  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Code</th><th>Title</th><th>Units</th><th>Year</th><th>Semester</th></tr></thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs font-semibold text-primary-700">{s.code}</td>
                <td className="font-medium">{s.title}</td>
                <td><span className="badge badge-blue">{s.units} units</span></td>
                <td className="text-xs">Year {s.yearLevel}</td>
                <td className="text-xs">Sem {s.semester}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CampusesTable({ campuses }) {
  if (campuses.length === 0) return <Empty text="No campuses defined yet." />;
  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Code</th><th>Campus</th><th>Main</th></tr></thead>
          <tbody>
            {campuses.map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-xs font-semibold text-primary-700">{c.code}</td>
                <td className="font-medium">{c.name}</td>
                <td>
                  <span className={`badge ${c.isMain ? 'badge-green' : 'badge-gray'}`}>
                    {c.isMain ? 'Main campus' : 'Satellite'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Empty({ text }) {
  return <div className="card card-pad py-14 text-center text-sm text-slate-400">{text}</div>;
}