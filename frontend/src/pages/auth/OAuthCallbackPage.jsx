import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { request } from '../../lib/api.js';
import { Logo } from '../../components/Logo.jsx';

export default function OAuthCallbackPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The backend already minted the session cookie; rehydrate the user here.
    request({ url: '/auth/me' })
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setUser, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-[20px] border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/60">
        {error ? (
          <>
            <p className="text-base font-bold text-slate-800">Sign-in did not complete</p>
            <p className="mt-1 text-sm text-slate-500">
              Your Google account was verified, but no portal session could be created.
            </p>
            <Link to="/login" className="btn-primary mt-6 w-full justify-center">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Logo size={48} className="mx-auto rounded-xl bg-white p-1 shadow" />
            <p className="mt-4 text-sm font-semibold text-slate-700">Completing your sign-in…</p>
            <span className="mx-auto mt-4 block size-7 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </>
        )}
      </div>
    </div>
  );
}