import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn, GraduationCap, Eye, EyeOff, UserPlus, ShieldCheck, ClipboardList,
  BarChart3, BadgeCheck, Mail, LockKeyhole, Sparkles, ShieldEllipsis, KeyRound, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Logo } from '../../components/Logo.jsx';
import { request, extractError } from '../../lib/api.js';

const FEATURES = [
  { icon: ShieldCheck, label: 'Verify & activate' },
  { icon: ClipboardList, label: 'Online enrollment' },
  { icon: GraduationCap, label: 'Grades & records' },
  { icon: BadgeCheck, label: 'Clearance tracking' },
  { icon: BarChart3, label: 'Institution analytics' },
];

const OAUTH_ERRORS = {
  not_configured: 'Google sign-in is not configured on this portal yet.',
  invalid_state: 'The Google sign-in session expired. Please try again.',
  missing_code: 'Google did not return an authorization code. Please try again.',
  token_exchange: 'Google rejected the authorization. Please try again.',
  token_invalid: 'The Google sign-in could not be verified. Please try again.',
  not_registered: 'This Google account is not linked to any DOrSU portal account.',
};

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.45c-.29 1.48-1.15 2.73-2.44 3.58v3h3.94c2.31-2.13 3.55-5.27 3.55-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.94-3c-1.09.73-2.49 1.17-4.01 1.17-3.06 0-5.66-2.07-6.59-4.86H1.3v3.09C3.29 21.31 7.35 24 12 24z" />
      <path fill="#FBBC05" d="M5.41 14.4a7.2 7.2 0 0 1 0-4.8V6.51H1.3a12 12 0 0 0 0 10.98l4.11-3.09z" />
      <path fill="#EA4335" d="M12 4.79c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.35 0 3.29 2.69 1.3 6.51l4.11 3.09c.93-2.79 3.53-4.81 6.59-4.81z" />
    </svg>
  );
}

export default function LoginPage() {
  const { login, loginTotp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') !== 'error') return null;
    window.history.replaceState({}, '', window.location.pathname);
    return OAUTH_ERRORS[params.get('reason')] ?? 'Google sign-in failed. Please try again.';
  });

  // Two-factor step
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);

  // Forgot-password (security questions) step
  const [resetStep, setResetStep] = useState(null); // null | 'identifier' | 'answers'
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetQuestions, setResetQuestions] = useState([]);
  const [resetToken, setResetToken] = useState('');
  const [resetAnswers, setResetAnswers] = useState([]);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const startReset = async (e) => {
    e.preventDefault();
    setError(null);
    setResetBusy(true);
    try {
      const data = await request({ method: 'post', url: '/auth/forgot-password', data: { identifier: resetIdentifier } });
      setResetToken(data.resetToken);
      setResetQuestions(data.questions);
      setResetAnswers(data.questions.map((q) => ({ questionId: q.questionId, answer: '' })));
      setResetStep('answers');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setResetBusy(false);
    }
  };

  const finishReset = async (e) => {
    e.preventDefault();
    setError(null);
    setResetBusy(true);
    try {
      await request({
        method: 'post',
        url: '/auth/reset-password',
        data: { resetToken, answers: resetAnswers, newPassword: resetNewPassword },
      });
      setResetDone(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setResetBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(identifier, password);
      if (result?.totpRequired) {
        setChallenge(result);
        return;
      }
      toast.success(`Welcome back, ${result.fullName.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCodeSubmitting(true);
    try {
      const user = await loginTotp(challenge.challengeToken, code.trim());
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      setChallenge(null);
      navigate('/dashboard');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setCodeSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-primary-900 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <img
          src="/graduation-background.png"
          alt=""
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-accent-start/40 via-primary-900/80 to-primary-950" />
        <div className="absolute -left-32 -top-32 size-[26rem] rounded-full bg-accent-end/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-white/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 75%, #fff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative z-10 flex items-center gap-4">
          <Logo size={72} className="rounded-2xl bg-white p-2 shadow-xl" />
          <div className="leading-tight">
            <p className="text-xl font-bold tracking-wide text-white">Davao Oriental State University</p>
            <p className="mt-1 text-sm font-medium text-primary-200">DOrSU Enrollment Information System</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg text-white">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary-100 backdrop-blur">
            <Sparkles size={12} /> DEIS Portal
          </span>
          <h2 className="text-3xl font-semibold leading-snug">
            A university of <span className="text-accent-end">excellence</span>,{' '}
            <span className="text-accent-end">innovation</span>, and{' '}
            <span className="text-accent-end">inclusion</span>.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-100">
            One portal for the entire enrollment cycle — from student verification and credential
            activation to subject loading, approvals, grading, clearance, and reporting.
          </p>
        </div>

        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
              >
                <f.icon size={13} className="text-primary-200" />
                {f.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-primary-200">
            Main Campus · Mati City, Davao Oriental ·{' '}
            <a
              href="https://www.facebook.com/dorsuofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white"
            >
              Official Facebook
            </a>
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={52} className="rounded-xl bg-white p-1.5 shadow" />
            <div className="leading-tight">
              <p className="text-base font-bold text-primary-700">Davao Oriental State University</p>
              <p className="text-xs text-slate-500">DOrSU Enrollment Information System</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <div className="border-b border-slate-100 bg-gradient-to-r from-primary-50 to-transparent px-6 py-5">
              <h1 className="text-xl font-bold text-primary-700">Sign in</h1>
              <p className="mt-1 text-sm text-slate-500">Use your official DOrSU credentials to continue.</p>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              {resetDone ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50">
                    <BadgeCheck size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Password reset successfully</p>
                    <p className="mt-1 text-xs text-slate-500">
                      You can now sign in with your new password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetDone(false);
                      setResetStep(null);
                      setPassword('');
                    }}
                    className="btn-primary w-full justify-center"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : resetStep === 'answers' ? (
                <form onSubmit={finishReset} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setResetStep('identifier')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary-700"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Answer security questions</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Answer the questions you set up to verify your identity.
                    </p>
                  </div>
                  {resetQuestions.map((q, i) => (
                    <div key={q.questionId}>
                      <label className="label" htmlFor={`sq-${q.questionId}`}>{q.questionLabel}</label>
                      <input
                        id={`sq-${q.questionId}`}
                        className="input"
                        value={resetAnswers[i]?.answer ?? ''}
                        onChange={(e) => {
                          const next = [...resetAnswers];
                          next[i] = { ...next[i], answer: e.target.value };
                          setResetAnswers(next);
                        }}
                        required
                      />
                    </div>
                  ))}
                  <div>
                    <label className="label" htmlFor="resetNewPassword">New password</label>
                    <input
                      id="resetNewPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="At least 12 characters"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={resetBusy} className="btn-primary w-full justify-center">
                    <ShieldCheck size={15} />
                    {resetBusy ? 'Resetting…' : 'Reset password'}
                  </button>
                </form>
              ) : resetStep === 'identifier' ? (
                <form onSubmit={startReset} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setResetStep(null)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary-700"
                  >
                    <ArrowLeft size={13} /> Back to sign in
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Reset your password</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter your email or student number. You&apos;ll verify your identity with
                      security questions set up on your account.
                    </p>
                  </div>
                  <div>
                    <label className="label" htmlFor="resetIdentifier">Email or Student Number</label>
                    <input
                      id="resetIdentifier"
                      className="input"
                      placeholder="e.g. registrar@dorsu.edu.ph"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={resetBusy} className="btn-primary w-full justify-center">
                    <KeyRound size={15} />
                    {resetBusy ? 'Checking…' : 'Continue'}
                  </button>
                </form>
              ) : challenge ? (
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
                    <ShieldEllipsis size={20} className="shrink-0 text-primary-700" />
                    <div>
                      <p className="text-sm font-semibold text-primary-800">Two-factor verification</p>
                      <p className="text-xs text-primary-700/80">
                        Password verified. Enter the 6-digit code from your authenticator app.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="totpCode">Authenticator code</label>
                    <input
                      id="totpCode"
                      className="input text-center font-mono !text-lg tracking-[0.5em]"
                      placeholder="• • • • • •"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                    />
                  </div>
                  <button type="submit" disabled={codeSubmitting || code.length !== 6} className="btn-primary w-full justify-center !py-2.5">
                    <ShieldCheck size={16} />
                    {codeSubmitting ? 'Verifying…' : 'Verify & sign in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChallenge(null);
                      setCode('');
                    }}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
                  >
                    Back to sign in
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/api/auth/google'; }}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <GoogleIcon />
                    Sign in with Google
                  </button>

                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />
                    or use your DOrSU credentials
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div>
                    <label className="label" htmlFor="identifier">Email or Student Number</label>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="identifier"
                        className="input !pl-9"
                        placeholder="e.g. registrar@dorsu.edu.ph"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="password">Password</label>
                    <div className="relative">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="input !pl-9 !pr-10"
                        placeholder="••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
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

                  <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !py-2.5">
                    <LogIn size={16} />
                    {submitting ? 'Signing in…' : 'Sign in'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setResetStep('identifier');
                    }}
                    className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 transition hover:text-primary-700"
                  >
                    <KeyRound size={14} />
                    Forgot password?
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-primary-100 bg-primary-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-700">
              <GraduationCap size={17} />
              New student?
            </div>
            <p className="mt-1 text-xs leading-relaxed text-primary-700/80">
              First-time enrollees activate their credentials through the portal onboarding flow.
            </p>
            <Link to="/verify" className="btn-secondary mt-3 w-full justify-center">
              <UserPlus size={15} />
              Verify student number
            </Link>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            For authorized DOrSU personnel and students only. Access is monitored.
          </p>
        </div>
      </div>
    </div>
  );
}