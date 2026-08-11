import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn, GraduationCap, Eye, EyeOff, UserPlus, ShieldCheck, ClipboardList,
  BarChart3, BadgeCheck, Mail, LockKeyhole, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Logo } from '../../components/Logo.jsx';
import { extractError } from '../../lib/api.js';

const FEATURES = [
  { icon: ShieldCheck, label: 'Verify & activate' },
  { icon: ClipboardList, label: 'Online enrollment' },
  { icon: GraduationCap, label: 'Grades & records' },
  { icon: BadgeCheck, label: 'Clearance tracking' },
  { icon: BarChart3, label: 'Institution analytics' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-primary-900 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-start/25 via-primary-800 to-primary-950" />
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
          <p className="text-xs text-primary-200">Main Campus · Mati City, Davao Oriental · est. 1981</p>
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

              <form onSubmit={handleSubmit} className="space-y-4">
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
              </form>
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