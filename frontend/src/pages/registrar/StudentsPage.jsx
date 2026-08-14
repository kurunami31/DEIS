import { useEffect, useRef, useState } from 'react';
import { Search, Users, UserPlus, Upload, Download, Copy, Check } from 'lucide-react';
import { request } from '../../lib/api.js';
import { Modal } from '../../components/ui.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const CSV_TEMPLATE = [
  'studentNo,lastName,firstName,sex,yearLevel,programCode,campusCode,strand',
  '2026-1001,Dela Cruz,Juan,MALE,1,BSIT,MATI,STEM',
  '2026-1002,Santos,Maria,FEMALE,2,BSED,MATI,',
].join('\n');

function ActivationCodeList({ students }) {
  const [copied, setCopied] = useState(null);
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
      <table className="table-base">
        <thead>
          <tr>
            <th>Student number</th>
            <th>Activation code</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentNo}>
              <td className="text-xs">{s.studentNo}</td>
              <td className="font-mono text-sm font-semibold tracking-widest text-primary-700">{s.activationCode}</td>
              <td className="text-right">
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Copy activation code"
                  onClick={async () => {
                    await navigator.clipboard.writeText(s.activationCode);
                    setCopied(s.studentNo);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                >
                  {copied === s.studentNo ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StudentsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // Register (single) modal
  const [regOpen, setRegOpen] = useState(false);
  const [regBusy, setRegBusy] = useState(false);
  const [regForm, setRegForm] = useState({
    studentNo: '',
    firstName: '',
    lastName: '',
    sex: 'MALE',
    yearLevel: '1',
    programCode: '',
    campusCode: '',
    strand: '',
  });
  const [regResult, setRegResult] = useState(null);

  // Import (CSV) modal
  const [impOpen, setImpOpen] = useState(false);
  const [impBusy, setImpBusy] = useState(false);
  const [impCsv, setImpCsv] = useState('');
  const [impResult, setImpResult] = useState(null);
  const fileRef = useRef(null);

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

  const set = (key) => (e) => setRegForm((f) => ({ ...f, [key]: e.target.value }));

  const submitRegister = async (e) => {
    e.preventDefault();
    setRegBusy(true);
    try {
      const result = await request({
        method: 'post',
        url: '/students',
        data: { ...regForm, yearLevel: Number(regForm.yearLevel), strand: regForm.strand || undefined },
      });
      setRegResult(result);
      setRegForm({
        studentNo: '',
        firstName: '',
        lastName: '',
        sex: 'MALE',
        yearLevel: '1',
        programCode: '',
        campusCode: '',
        strand: '',
      });
      load();
    } catch (err) {
      toast.error(err.details?.length ? err.details[0].message : err.message);
    } finally {
      setRegBusy(false);
    }
  };

  const submitImport = async (e) => {
    e.preventDefault();
    setImpBusy(true);
    try {
      const result = await request({ method: 'post', url: '/students/import', data: { csv: impCsv } });
      setImpResult(result);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImpBusy(false);
    }
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  const totalPages = Math.max(1, Math.ceil(data.total / 20));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="card card-pad flex-1">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input !pl-9"
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
        <div className="flex gap-2">
          <button className="btn-secondary !px-4 !py-2 text-sm" onClick={() => { setImpCsv(''); setImpResult(null); setImpOpen(true); }}>
            <Upload size={15} />
            Import CSV
          </button>
          <button className="btn-primary !px-4 !py-2 text-sm" onClick={() => { setRegResult(null); setRegOpen(true); }}>
            <UserPlus size={15} />
            Register student
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

      <Modal
        open={regOpen}
        onClose={() => setRegOpen(false)}
        title="Register a student"
        footer={
          regResult ? (
            <button className="btn-primary" onClick={() => setRegOpen(false)}>Done</button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => setRegOpen(false)}>Cancel</button>
              <button type="submit" form="register-form" disabled={regBusy} className="btn-primary">
                {regBusy ? 'Saving…' : 'Register'}
              </button>
            </>
          )
        }
      >
        {regResult ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Student registered successfully. Give this activation code to the student —
              they use it at <span className="font-semibold">/verify</span> then set their password.
            </div>
            <ActivationCodeList students={[regResult.student && {
              studentNo: regResult.student.studentNo,
              activationCode: regResult.activationCode,
            }]} />
          </div>
        ) : (
          <form id="register-form" onSubmit={submitRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="r-first">First name</label>
                <input id="r-first" className="input" value={regForm.firstName} onChange={set('firstName')} required />
              </div>
              <div>
                <label className="label" htmlFor="r-last">Last name</label>
                <input id="r-last" className="input" value={regForm.lastName} onChange={set('lastName')} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="r-no">Student number</label>
              <input id="r-no" className="input font-mono" placeholder="e.g. 2026-1001" value={regForm.studentNo} onChange={set('studentNo')} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="r-sex">Sex</label>
                <select id="r-sex" className="input" value={regForm.sex} onChange={set('sex')}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="r-year">Year level</label>
                <select id="r-year" className="input" value={regForm.yearLevel} onChange={set('yearLevel')}>
                  {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="r-prog">Program code</label>
                <input id="r-prog" className="input font-mono uppercase" placeholder="e.g. BSIT" value={regForm.programCode} onChange={set('programCode')} required />
              </div>
              <div>
                <label className="label" htmlFor="r-campus">Campus code</label>
                <input id="r-campus" className="input font-mono uppercase" placeholder="e.g. MATI" value={regForm.campusCode} onChange={set('campusCode')} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="r-strand">Strand (optional)</label>
              <input id="r-strand" className="input uppercase" placeholder="e.g. STEM" value={regForm.strand} onChange={set('strand')} />
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={impOpen}
        onClose={() => setImpOpen(false)}
        title="Import students (CSV)"
        wide
        footer={
          impResult ? (
            <button className="btn-primary" onClick={() => setImpOpen(false)}>Done</button>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'students-template.csv';
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                <Download size={14} />
                Template
              </button>
              <button type="submit" form="import-form" disabled={impBusy} className="btn-primary">
                {impBusy ? 'Importing…' : 'Import'}
              </button>
            </>
          )
        }
      >
        {impResult ? (
          <div className="space-y-4">
            <div className={`rounded-lg border px-4 py-3 text-sm ${impResult.createdCount > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {impResult.createdCount} created, {impResult.failedCount} failed.
            </div>
            {impResult.created.length > 0 && <ActivationCodeList students={impResult.created} />}
            {impResult.failed.length > 0 && (
              <div>
                <p className="label">Failed rows</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="table-base">
                    <thead>
                      <tr><th>Row</th><th>Student No</th><th>Reason</th></tr>
                    </thead>
                    <tbody>
                      {impResult.failed.map((f, idx) => (
                        <tr key={idx}>
                          <td className="text-xs">{f.row}</td>
                          <td className="text-xs">{f.studentNo}</td>
                          <td className="text-xs text-red-600">{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setImpCsv(String(reader.result ?? ''));
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
            <button type="button" className="btn-secondary w-full justify-center" onClick={() => fileRef.current?.click()}>
              <Upload size={15} />
              Choose a .csv file
            </button>
            <div className="text-center text-[11px] text-slate-400">
              or paste the CSV below — required columns: studentNo, lastName, firstName, sex, yearLevel, programCode, campusCode
            </div>
            <form id="import-form" onSubmit={submitImport}>
              <textarea
                className="input min-h-40 font-mono text-xs"
                placeholder={CSV_TEMPLATE}
                value={impCsv}
                onChange={(e) => setImpCsv(e.target.value)}
                required
              />
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}