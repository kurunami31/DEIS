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

const glassCard =
  'overflow-hidden rounded-[24px] border border-white/20 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur-2xl';
const glassInput =
  'w-full rounded-[10px] border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-primary-200 outline-none transition focus:border-white/60 focus-visible:!shadow-[0_0_0_3px_rgba(255,255,255,0.18)]';
const glassLabel = 'mb-1 block text-xs font-semibold text-primary-100';
const glassLink = 'text-primary-100 transition hover:text-white';

export default function LoginPage() {
  const { login, loginTotp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
    <div className="relative grid min-h-screen overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 lg:grid-cols-[1.1fr_1fr]">
      {/* Glass scene backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <img src="/graduation-background.png" alt="" className="absolute inset-0 size-full object-cover opacity-15" />
        <div className="absolute -left-32 -top-32 size-[26rem] rounded-full bg-accent-start/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-accent-mid/20 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 size-[22rem] rounded-full bg-primary-300/15 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 size-72 rounded-full bg-accent-end/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 75%, #fff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      {/* Brand panel */}
      <div className="relative z-10 hidden lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="flex items-center gap-4">
          <Logo size={72} className="rounded-2xl bg-white p-2 shadow-xl" />
          <div className="leading-tight">
            <p className="text-xl font-bold tracking-wide text-white">Davao Oriental State University</p>
            <p className="mt-1 text-sm font-medium text-primary-200">DOrSU Enrollment Information System</p>
          </div>
        </div>

        <div className="max-w-lg text-white">
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

        <div>
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
      <div className="relative z-10 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={52} className="rounded-xl bg-white p-1.5 shadow" />
            <div className="leading-tight">
              <p className="text-base font-bold text-white">Davao Oriental State University</p>
              <p className="text-xs text-primary-200">DOrSU Enrollment Information System</p>
            </div>
          </div>

          <div className={glassCard}>
            <div className="border-b border-white/15 px-6 py-5">
              <h1 className="text-xl font-bold text-white">Sign in</h1>
              <p className="mt-1 text-sm text-primary-200">Use your official DOrSU credentials to continue.</p>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</div>
              )}

              {resetDone ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-400/20">
                    <BadgeCheck size={24} className="text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Password reset successfully</p>
                    <p className="mt-1 text-xs text-primary-200">
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
                    className={`inline-flex items-center gap-1 text-xs font-medium ${glassLink}`}
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-white">Answer security questions</p>
                    <p className="mt-1 text-xs text-primary-200">
                      Answer the questions you set up to verify your identity.
                    </p>
                  </div>
                  {resetQuestions.map((q, i) => (
                    <div key={q.questionId}>
                      <label className={glassLabel} htmlFor={`sq-${q.questionId}`}>{q.questionLabel}</label>
                      <input
                        id={`sq-${q.questionId}`}
                        className={glassInput}
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
                    <label className={glassLabel} htmlFor="resetNewPassword">New password</label>
                    <input
                      id="resetNewPassword"
                      type={showPassword ? 'text' : 'password'}
                      className={glassInput}
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
                    className={`inline-flex items-center gap-1 text-xs font-medium ${glassLink}`}
                  >
                    <ArrowLeft size={13} /> Back to sign in
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-white">Reset your password</p>
                    <p className="mt-1 text-xs text-primary-200">
                      Enter your email or student number. You&apos;ll verify your identity with
                      security questions set up on your account.
                    </p>
                  </div>
                  <div>
                    <label className={glassLabel} htmlFor="resetIdentifier">Email or Student Number</label>
                    <input
                      id="resetIdentifier"
                      className={glassInput}
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
                  <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                    <ShieldEllipsis size={20} className="shrink-0 text-primary-100" />
                    <div>
                      <p className="text-sm font-semibold text-white">Two-factor verification</p>
                      <p className="text-xs text-primary-200">
                        Password verified. Enter the 6-digit code from your authenticator app.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className={glassLabel} htmlFor="totpCode">Authenticator code</label>
                    <input
                      id="totpCode"
                      className={`${glassInput} text-center font-mono text-lg tracking-[0.5em]`}
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
                    className={`w-full text-center text-sm ${glassLink}`}
                  >
                    Back to sign in
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={glassLabel} htmlFor="identifier">Email or Student Number</label>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary-200" />
                      <input
                        id="identifier"
                        className={`${glassInput} pl-9`}
                        placeholder="e.g. registrar@dorsu.edu.ph"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={glassLabel} htmlFor="password">Password</label>
                    <div className="relative">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary-200" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`${glassInput} pl-9 pr-10`}
                        placeholder="••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-200 hover:text-white"
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
                    className={`flex w-full items-center justify-center gap-1.5 text-sm ${glassLink}`}
                  >
                    <KeyRound size={14} />
                    Forgot password?
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <GraduationCap size={17} className="text-primary-100" />
              New student?
            </div>
            <p className="mt-1 text-xs leading-relaxed text-primary-200">
              First-time enrollees activate their credentials through the portal onboarding flow.
            </p>
            <Link
              to="/verify"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              <UserPlus size={15} />
              Verify student number
            </Link>
          </div>

          <p className="mt-6 text-center text-[11px] text-primary-200">
            For authorized DOrSU personnel and students only. Access is monitored.
          </p>
          <p className="mt-3 text-center text-[11px] text-primary-200">
            Developed by{' '}
            <a
              href="https://kurunami31.github.io/Portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-2 hover:text-accent-mid"
            >
              Christopher Lyod B. Mercado
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
