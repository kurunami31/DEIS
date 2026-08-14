import { useEffect, useState } from 'react';
import { FlaskConical, RotateCcw, Save } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const FIELDS = [
  { key: 'MAX_UNITS_PER_TERM', label: 'Maximum units per term', hint: 'Hard cap for any student.', type: 'number' },
  { key: 'MAX_UNITS_WITH_BACKLOG', label: 'Maximum units with backlogs', hint: 'Hard cap for students carrying at least one failing grade.', type: 'number' },
  { key: 'GWA_CAP_STAR', label: 'GWA cap for star load', hint: 'Students at or above this GWA get the highest load.', type: 'number', step: '0.01', placeholder: 'e.g. 2.00' },
  { key: 'GWA_CAP_GOOD', label: 'GWA cap for good standing', hint: 'Students at or above this GWA keep full load.', type: 'number', step: '0.01', placeholder: 'e.g. 2.50' },
  { key: 'UNITS_AT_GOOD_GWA', label: 'Units allowed at good GWA', hint: 'Load granted between the good and star caps.', type: 'number' },
  { key: 'UNITS_AT_LOW_GWA', label: 'Units allowed at low GWA', hint: 'Reduced load for students below the good cap.', type: 'number' },
  { key: 'ENFORCE_YEAR_LEVEL', label: 'Enforce year level', hint: 'Block subjects outside the student year level (retakers exempt).', type: 'bool' },
  { key: 'ENFORCE_BACKLOG_RETAKE', label: 'Require backlog retakes', hint: 'Subjects offered again this term must be included in the request.', type: 'bool' },
  { key: 'REQUIRE_PAYMENT_BEFORE_APPROVAL', label: 'Require payment before approval', hint: 'Registrar cannot approve a request until a payment stub is recorded.', type: 'bool' },
];

export default function PolicyPage() {
  const toast = useToast();
  const [defaults, setDefaults] = useState(null);
  const [values, setValues] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    request({ url: '/admin/enrollment-policy' })
      .then(({ policy, defaults: defs }) => {
        setDefaults(defs);
        setValues({ ...defs, ...policy });
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const setValue = (key, raw) => {
    setValues((prev) => {
      const field = FIELDS.find((f) => f.key === key);
      if (field?.type === 'bool') return { ...prev, [key]: raw ? 'true' : 'false' };
      if (field?.type === 'number') return { ...prev, [key]: raw === '' ? '' : String(raw) };
      return { ...prev, [key]: raw };
    });
  };

  const changedKeys = () => (values && defaults ? FIELDS.map((f) => f.key).filter((key) => String(values[key]) !== String(defaults[key])) : []);

  const save = async (entries) => {
    setSaving(true);
    try {
      const res = await request({
        method: 'put',
        url: '/admin/enrollment-policy',
        data: entries.map(({ key, value }) => ({ key, value })),
      });
      setValues(res.policy);
      toast.success('Enrollment policy updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const key = changedKeys()[0];
    if (key && values[key] === '') {
      toast.error('Each changed value must be filled in.');
      return;
    }
    save(FIELDS.filter((f) => changedKeys().includes(f.key)).map((f) => ({ key: f.key, value: values[f.key] })));
  };

  const handleReset = () => {
    save(FIELDS.map((f) => ({ key: f.key, value: defaults[f.key] })));
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!values) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const isDirty = changedKeys().length > 0;

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-accent-start via-primary-800 to-primary-900 px-6 py-5 text-white">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <FlaskConical size={18} /> Enrollment evaluation rules
          </h2>
          <p className="mt-1 text-xs text-primary-100">
            These rules drive the load calculator and the available-section warnings students see. Changes apply immediately.
          </p>
        </div>
      </div>

      <section className="card card-pad">
        <ul className="divide-y divide-slate-100">
          {FIELDS.map((field) => {
            const current = values[field.key];
            const changed = String(current) !== String(defaults[field.key]);
            const isBool = field.type === 'bool';
            return (
              <li key={field.key} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {field.label}
                    {changed && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">changed</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{field.hint}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-300">{field.key}</p>
                </div>
                {isBool ? (
                  <button
                    onClick={() => setValue(field.key, current !== 'true')}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${current === 'true' ? 'bg-primary-600' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${current === 'true' ? 'left-[22px]' : 'left-0.5'}`}
                    />
                  </button>
                ) : (
                  <input
                    className="input w-32 shrink-0 text-right font-mono"
                    type="number"
                    step={field.step ?? '1'}
                    min="0"
                    placeholder={field.placeholder ?? '0'}
                    value={current}
                    onChange={(e) => setValue(field.key, e.target.value)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button className="btn-secondary" onClick={handleReset} disabled={saving || !isDirty}>
          <RotateCcw size={15} /> Reset to defaults
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !isDirty}>
          <Save size={15} /> {saving ? 'Saving…' : `Save ${changedKeys().length} change${changedKeys().length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}