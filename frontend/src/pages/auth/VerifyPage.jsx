import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Search, ShieldCheck } from 'lucide-react';
import { request, extractError } from '../../lib/api.js';
import { Logo } from '../../components/Logo.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function VerifyPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [studentNo, setStudentNo] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const data = await request({ method: 'post', url: '/auth/verify-student', data: { studentNo } });
      setResult(data);
    } catch (err) {
      setError(extractError(err));
      setResult(null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent-start via-primary-800 to-primary-900 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Logo size={52} className="rounded-2xl bg-white p-1.5" />
          <div className="leading-tight text-white">
            <p className="text-lg font-bold">Davao Oriental State University</p>
            <p className="text-xs text-primary-200">Student account verification</p>
          </div>
        </div>

        <div className="card card-pad">
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-primary-700">Verify your student number</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter the student number printed on your official admission documents.
            </p>
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="label" htmlFor="studentNo">Student number</label>
              <input
                id="studentNo"
                className="input font-mono"
                placeholder="e.g. D-2025-0001"
                value={studentNo}
                onChange={(e) => setStudentNo(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <button type="submit" disabled={checking} className="btn-primary w-full">
              <Search size={16} />
              {checking ? 'Checking…' : 'Verify'}
            </button>
          </form>

          {result && (
            <div className="mt-5 rounded-[15px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <BadgeCheck size={17} />
                Record found
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-800">{result.fullName}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Program</dt><dd className="font-medium text-slate-800">{result.programName}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Student no.</dt><dd className="font-mono font-medium text-slate-800">{result.studentNo}</dd></div>
              </dl>

              {result.alreadyActivated ? (
                <p className="mt-3 text-xs text-emerald-700">
                  This student number is already activated. Please sign in on the login page.
                </p>
              ) : (
                <>
                  <div className="mt-4 rounded-lg border border-dashed border-emerald-300 bg-white p-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Activation code</p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-[0.35em] text-primary-700">{result.activationCode}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Demo environment: the code is displayed here; in production it is delivered privately.
                    </p>
                  </div>
                  <button className="btn-primary mt-4 w-full" onClick={() => navigate('/activate', { state: { studentNo: result.studentNo, activationCode: result.activationCode } })}>
                    <ShieldCheck size={16} />
                    Create login credentials
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <Link to="/login" className="mt-4 flex items-center justify-center gap-1.5 text-sm text-primary-100 hover:text-white">
          <ArrowLeft size={15} />
          Back to sign in
        </Link>
        {result && !result.alreadyActivated && (
          <p className="mt-2 text-center text-xs text-primary-200">You may return here anytime to view the code again.</p>
        )}
        {result && (
          <button className="mt-2 w-full text-center text-xs text-primary-200 hover:text-white" onClick={() => toast.info('Keep your student number and code handy.')}>
            Tip: activation codes are single-use.
          </button>
        )}
      </div>
    </div>
  );
}