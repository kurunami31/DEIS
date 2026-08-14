import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { request } from '../../lib/api.js';

function statusMeta(status) {
  return status === 'CLEARED' ? { label: 'Cleared', cls: 'text-emerald-700' } : { label: 'Pending', cls: 'text-amber-600' };
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ClearancePrintPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([request({ url: '/clearances/my' }), request({ url: '/students/me' })])
      .then(([clearance, student]) => setData({ clearance, student }))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const { clearance, student } = data;
  const { term, signoffs } = clearance;
  if (!clearance) return <div className="card p-6 text-sm text-slate-400">No clearance found for the current term.</div>;

  const clearedCount = signoffs.filter((s) => s.status === 'CLEARED').length;
  const pct = signoffs.length ? Math.round((clearedCount / signoffs.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate('/clearance')} className="btn-secondary !px-3 !py-2 text-xs">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => window.print()} className="btn-primary !px-4 !py-2 text-xs">
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="card card-pad bg-white">
        <header className="border-b-2 border-slate-800 pb-4 text-center">
          <p className="text-lg font-bold tracking-wide">Davao Oriental State University</p>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Enrollment Information System</p>
          <h1 className="mt-3 text-xl font-bold">Certificate of Clearance</h1>
          <p className="text-sm text-slate-500">{term?.label}</p>
        </header>

        <section className="mt-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <p><span className="font-semibold">Student:</span> {student?.firstName} {student?.lastName}{student?.nameSuffix ? ` ${student.nameSuffix}` : ''}</p>
            <p><span className="font-semibold">Student no.:</span> {student?.studentNo}</p>
            <p><span className="font-semibold">Program:</span> {student?.program?.code ?? '—'}</p>
            <p><span className="font-semibold">Year level:</span> {student?.yearLevel ? `Year ${student.yearLevel}` : '—'}</p>
          </div>
        </section>

        <table className="mt-5 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="py-2 pr-2 font-semibold">Office / Requirement</th>
              <th className="py-2 pr-2 font-semibold">Status</th>
              <th className="py-2 pr-2 font-semibold">Reviewed by</th>
              <th className="py-2 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {signoffs.map((s) => {
              const meta = statusMeta(s.status);
              return (
                <tr key={s.id} className="border-b border-slate-200">
                  <td className="py-2 pr-2">{s.template?.label}</td>
                  <td className={`py-2 pr-2 font-medium ${meta.cls}`}>{meta.label}</td>
                  <td className="py-2 pr-2">{s.reviewedBy?.fullName ?? '—'}</td>
                  <td className="py-2">{formatDate(s.reviewedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-4 text-sm text-slate-600">
          {clearedCount} of {signoffs.length} requirements cleared · <span className="font-semibold">{pct}%</span> · overall status:{' '}
          <span className="font-semibold">{clearance.status === 'CLEARED' ? 'CLEARED' : 'IN PROGRESS'}</span>
        </p>

        <footer className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <p className="border-t border-slate-400 pt-1 font-medium">{student?.firstName} {student?.lastName}</p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
          <div>
            <p className="border-t border-slate-400 pt-1 font-medium">Office of the Registrar</p>
            <p className="text-xs text-slate-500">Registrar</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
