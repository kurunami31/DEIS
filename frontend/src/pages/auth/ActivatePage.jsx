import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck, ChevronDown } from 'lucide-react';
import { request, extractError } from '../../lib/api.js';
import { Logo } from '../../components/Logo.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { DPA_NOTICE, DPA_NOTICE_VERSION } from '../../lib/dpaNotice.js';

export default function ActivatePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [studentNo, setStudentNo] = useState(location.state?.studentNo ?? '');
  const [activationCode, setActivationCode] = useState(location.state?.activationCode ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password needs an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('You must accept the Data Privacy notice to activate your account.');
      return;
    }

    setSubmitting(true);
    try {
      await request({
        method: 'post',
        url: '/auth/activate',
        data: { studentNo, activationCode, password, dpaVersion: DPA_NOTICE_VERSION },
      });
      toast.success('Account activated! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary-900 p-6">
      <img
        src="/graduation-background.png"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-accent-start/45 via-primary-900/85 to-primary-950" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Logo size={52} className="rounded-2xl bg-white p-1.5" />
          <div className="leading-tight text-white">
            <p className="text-lg font-bold">Davao Oriental State University</p>
            <p className="text-xs text-primary-200">Create your login credentials</p>
          </div>
        </div>

        <div className="card card-pad">
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-primary-700">Activate your account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Set a password to secure your DEIS student account.
            </p>
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="studentNo">Student number</label>
              <input
                id="studentNo"
                className="input font-mono"
                value={studentNo}
                onChange={(e) => setStudentNo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="activationCode">Activation code</label>
              <div className="relative">
                <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="activationCode"
                  className="input !pl-9 font-mono uppercase tracking-[0.3em]"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input !pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
<div>
                <label className="label" htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="rounded-lg border border-primary-200 bg-primary-50/50">
                <button
                  type="button"
                  onClick={() => setShowNotice((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-primary-800"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} />
                    Data Privacy Consent (RA 10173)
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${showNotice ? 'rotate-180' : ''}`} />
                </button>
                {showNotice && (
                  <div className="max-h-44 space-y-2 overflow-y-auto border-t border-primary-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                    <p className="font-semibold text-slate-800">{DPA_NOTICE.title}</p>
                    <p>{DPA_NOTICE.intro}</p>
                    {DPA_NOTICE.sections.map((section) => (
                      <div key={section.heading}>
                        <p className="font-semibold text-slate-800">{section.heading}</p>
                        <p>{section.body}</p>
                        <ul className="list-inside list-disc pl-2">
                          {section.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <p>{DPA_NOTICE.closing}</p>
                  </div>
                )}
                <label className="flex cursor-pointer items-start gap-2.5 border-t border-primary-100 px-3 py-2.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-primary-300 text-primary-700 focus:ring-primary-500"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>
                    I have read and understood the Data Privacy notice above, and I agree to the collection and
                    processing of my personal data as described.
                  </span>
                </label>
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                <ShieldCheck size={16} />
                {submitting ? 'Activating…' : 'Activate account'}
              </button>
          </form>
        </div>

        <button onClick={() => navigate('/verify')} className="mx-auto mt-4 flex items-center gap-1.5 text-sm text-primary-100 hover:text-white">
          <ArrowLeft size={15} />
          Re-verify a student number
        </button>
      </div>
    </div>
  );
}