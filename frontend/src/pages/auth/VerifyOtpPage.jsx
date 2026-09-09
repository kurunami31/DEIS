import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Logo } from '../../components/Logo.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { request, extractError } from '../../lib/api.js';

export default function VerifyOtpPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const purpose = searchParams.get('purpose') || 'PASSWORD_RESET';
  const identifier = searchParams.get('identifier') || '';

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // New password fields (for PASSWORD_RESET)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await request({
        method: 'post',
        url: '/otp/verify',
        data: { identifier, code, purpose },
      });
      if (purpose === 'PASSWORD_RESET' && data.resetToken) {
        setResetToken(data.resetToken);
        setVerified(true);
      } else {
        toast.success('Verification successful!');
        navigate('/login');
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setCanResend(false);
    setResendTimer(60);
    try {
      await request({
        method: 'post',
        url: '/otp/send',
        data: { identifier, purpose },
      });
      toast.success('New verification code sent!');
    } catch (err) {
      setError(extractError(err));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    setResetBusy(true);
    try {
      await request({
        method: 'post',
        url: '/auth/reset-password-otp',
        data: { resetToken, newPassword },
      });
      setResetDone(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setResetBusy(false);
    }
  };

  if (resetDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="w-full max-w-md text-center">
          <Logo className="mx-auto mb-6 h-12" />
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <CheckCircle2 className="mx-auto mb-4 size-16 text-green-500" />
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Password Reset!</h1>
            <p className="mb-6 text-slate-600">Your password has been successfully changed.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (verified && purpose === 'PASSWORD_RESET') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="w-full max-w-md">
          <Logo className="mx-auto mb-6 h-12" />
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Set New Password</h1>
            <p className="mb-6 text-slate-600">Enter your new password below.</p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-10 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Min 12 characters"
                    required
                    minLength={12}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Re-enter password"
                  required
                  minLength={12}
                />
              </div>

              <button
                type="submit"
                disabled={resetBusy}
                className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition"
              >
                {resetBusy ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        <Logo className="mx-auto mb-6 h-12" />
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <button
            onClick={() => navigate('/login')}
            className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> Back to login
          </button>

          <div className="mb-6 text-center">
            <KeyRound className="mx-auto mb-3 size-12 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">Verification Code</h1>
            <p className="mt-1 text-slate-600">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          <div className="mt-4 text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <RotateCcw size={14} /> Resend Code
              </button>
            ) : (
              <p className="text-sm text-slate-500">
                Resend code in {resendTimer}s
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
