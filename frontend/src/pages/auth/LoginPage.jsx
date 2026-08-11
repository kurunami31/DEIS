import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, GraduationCap, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Logo } from '../../components/Logo.jsx';
import { extractError } from '../../lib/api.js';

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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — mirrors the DOrSU Student Portal identity panel */}
      <div className="relative hidden overflow-hidden bg-primary-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-start via-primary-800 to-primary-900 opacity-95" />
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-32 -right-20 size-[28rem] rounded-full bg-accent-end/30 blur-3xl" />

        <div className="relative z-10 flex items-center gap-4">
          <Logo size={64} className="rounded-2xl bg-white p-2 shadow-lg" />
          <div className="leading-tight text-white">
            <p className="text-2xl font-bold tracking-wide">Davao Oriental State University</p>
            <p className="mt-1 text-sm font-medium text-primary-100">DOrSU Enrollment Information System</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg text-white">
          <h2 className="text-3xl font-semibold leading-snug">
            A university of <span className="text-primary-200">excellence</span>,{' '}
            <span className="text-primary-200">innovation</span>, and{' '}
            <span className="text-primary-200">inclusion</span>.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-100">
            DEIS connects students, faculty, and the Registrar through a single enrollment cycle —
            from verification and credential activation to subject loading, approval, grading, and analytics.
          </p>
        </div>

        <div className="relative z-10 text-xs text-primary-200">
          Main Campus · Mati City, Davao Oriental · est. 1981
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={48} className="rounded-xl bg-white p-1.5 shadow" />
            <div className="leading-tight">
              <p className="text-base font-bold text-primary-700">Davao Oriental State University</p>
              <p className="text-xs text-slate-500">DOrSU Enrollment Information System</p>
            </div>
          </div>

          <div className="card card-pad">
            <div className="mb-5">
              <h1 className="text-xl font-semibold">Sign in</h1>
              <p className="mt-1 text-sm text-slate-500">Use your official DOrSU credentials.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="identifier">Email or Student Number</label>
                <input
                  id="identifier"
                  className="input"
                  placeholder="e.g. registrar@dorsu.edu.ph"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
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
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                <LogIn size={16} />
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-[15px] border border-primary-100 bg-primary-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-700">
              <GraduationCap size={17} />
              New student?
            </div>
            <p className="mt-1 text-xs leading-relaxed text-primary-700/80">
              First-time enrollees activate their credentials through the portal onboarding flow.
            </p>
            <Link to="/verify" className="btn-secondary mt-3 w-full">
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