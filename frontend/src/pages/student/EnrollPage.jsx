import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, Info, Send } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';

export default function EnrollPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [term, setTerm] = useState(null);
  const [sections, setSections] = useState([]);
  const [spfCompleted, setSpfCompleted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    request({ url: '/enrollments/available-sections' })
      .then((data) => {
        setTerm(data.term);
        setSections(data.sections);
      })
      .catch((err) => setError(err.message));
    request({ url: '/students/me' })
      .then((me) => setSpfCompleted(Boolean(me.spfCompletedAt)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (section) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[section.id]) delete next[section.id];
      else next[section.id] = section;
      return next;
    });
  };

  const summary = useMemo(() => {
    const list = Object.values(selected);
    return {
      count: list.length,
      units: list.reduce((sum, s) => sum + s.subject.units, 0),
      conflict: list.some((s, i) =>
        list.slice(i + 1).some((other) => other.schedule === s.schedule),
      ),
    };
  }, [selected]);

  const handleSubmit = async () => {
    if (summary.count === 0 || summary.conflict) return;
    setSubmitting(true);
    setLastResult(null);
    try {
      const result = await request({
        method: 'post',
        url: '/enrollments/submit',
        data: { sections: Object.keys(selected) },
      });
      setLastResult(result);
      toast.success('Enrollment request submitted for review.');
      setSelected({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-5">
      {!spfCompleted && (
        <section className="rounded-[15px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Complete your Student Profile Form first</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Your Student Profile Form (FM-DOrSU-ODI-05) must be submitted before you can enroll. It only takes a few minutes.
                </p>
              </div>
            </div>
            <button className="btn-primary" onClick={() => navigate('/profile?tab=spf')}>
              Complete profile form
            </button>
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="bg-gradient-to-br from-accent-start via-primary-800 to-primary-900 px-6 py-5 text-white">
          <h2 className="text-lg font-bold">Enrollment for {term ? term.label : 'the current term'}</h2>
          {term && (
            <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-primary-100">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} />
                {formatDate(term.startDate)} – {formatDate(term.endDate)}
              </span>
              <span className={`badge ${term.enrollmentOpen ? 'badge-green' : 'badge-red'}`}>
                {term.enrollmentOpen ? 'Open' : 'Closed'}
              </span>
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card card-pad lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
              <Info size={15} className="text-primary-600" /> Available sections
            </h3>
            <span className="badge badge-blue">{sections.length} offered</span>
          </div>

          {sections.length === 0 ? (
            <p className="rounded-[15px] border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              No sections are open for your program right now. Please check back when the Registrar publishes the next term.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {sections.map((section) => {
                const isSelected = Boolean(selected[section.id]);
                const full = section.seatsLeft <= 0;
                const unitLabel = section.subject.units > 1 ? 'units' : 'unit';
                return (
                  <li
                    key={section.id}
                    className={`flex items-center gap-3 rounded-[15px] border p-3 transition-colors ${
                      isSelected ? 'border-primary-600 bg-primary-50' : full ? 'border-slate-100 opacity-60' : 'border-slate-100 hover:border-primary-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-[#14437B]"
                      checked={isSelected}
                      disabled={full || !term?.enrollmentOpen}
                      onChange={() => toggle(section)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {section.subject.title}
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">{section.subject.code}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {section.code} · {section.schedule} · {section.room} · {section.faculty?.fullName ?? 'TBA'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-700">{section.subject.units} {unitLabel}</p>
                      <p className={`mt-0.5 text-[11px] font-medium ${full ? 'text-red-500' : 'text-emerald-600'}`}>
                        {full ? 'Full' : `${section.seatsLeft} seat${section.seatsLeft === 1 ? '' : 's'} left`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card card-pad">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">My selection</h3>
            <div className="mt-3 space-y-2">
              {summary.count === 0 ? (
                <p className="text-sm text-slate-400">No sections selected yet.</p>
              ) : (
                Object.values(selected).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-slate-700">{s.subject.title}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">{s.subject.units}u</span>
                  </div>
                ))
              )}
            </div>

            {summary.conflict && (
              <p className="mt-3 flex items-start gap-2 rounded-[15px] border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                Two selected sections have the same schedule.
              </p>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-500">
                {summary.count} section{summary.count === 1 ? '' : 's'}
              </span>
              <span className="text-lg font-bold text-primary-700">{summary.units} units</span>
            </div>

            <button
              className="btn-primary mt-4 w-full"
              disabled={summary.count === 0 || summary.conflict || submitting || !term?.enrollmentOpen || !spfCompleted}
              onClick={handleSubmit}
            >
              <Send size={15} />
              {submitting ? 'Submitting…' : spfCompleted ? 'Submit request' : 'Complete SPF first'}
            </button>
            {!term?.enrollmentOpen && (
              <p className="mt-2 text-center text-[11px] text-slate-400">Enrollment is currently closed.</p>
            )}
          </section>

          {lastResult && (
            <section className="rounded-[15px] border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 size={16} />
                Request #{lastResult.id} submitted
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                {lastResult.items?.length ?? 0} sections queued. The Registrar will review your request.
              </p>
            </section>
          )}
        </aside>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock size={13} />
        Seats are held for submitted requests. Duplicate subjects, schedule conflicts, and unmet prerequisites are flagged automatically.
      </p>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="h-24 animate-pulse rounded-[15px] bg-slate-100 lg:col-span-3" />
      <div className="h-96 animate-pulse rounded-[15px] bg-slate-100 lg:col-span-2" />
      <div className="h-96 animate-pulse rounded-[15px] bg-slate-100" />
    </div>
  );
}

function ErrorBox({ message }) {
  return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>;
}