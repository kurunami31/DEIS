import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Logo } from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { request, extractError } from '../lib/api.js';
import { DPA_NOTICE, DPA_NOTICE_VERSION } from '../lib/dpaNotice.js';

export default function DpaConsentGate() {
  const { setUser, logout } = useAuth();
  const toast = useToast();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAgree = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await request({ method: 'post', url: '/auth/consent', data: { version: DPA_NOTICE_VERSION } });
      const me = await request({ url: '/auth/me' });
      setUser(me);
      toast.success('Consent recorded. Welcome!');
    } catch (err) {
      setError(extractError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-primary-800 px-6 py-5">
          <div className="flex items-center gap-4">
            <Logo size={52} />
            <div>
              <h1 className="text-lg font-bold text-white">{DPA_NOTICE.title}</h1>
              <p className="text-sm text-primary-200">Davao Oriental State University</p>
            </div>
          </div>
        </div>

        <div className="max-h-[45vh] space-y-4 overflow-y-auto p-6 text-sm leading-relaxed text-slate-700">
          <p>{DPA_NOTICE.intro}</p>
          {DPA_NOTICE.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="mb-1 font-semibold text-slate-900">{section.heading}</h2>
              <p>{section.body}</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
          <p>{DPA_NOTICE.closing}</p>
        </div>

        <div className="border-t border-slate-200 p-6">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <label className="flex cursor-pointer items-start gap-3 pb-4 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={submitting}
            />
            <span>
              I have read and understood the Data Privacy notice above, and I agree to the collection
              and processing of my personal data as described.
            </span>
          </label>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              disabled={submitting}
            >
              Decline · Sign out
            </button>
            <button
              type="button"
              onClick={handleAgree}
              disabled={!accepted || submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {submitting ? 'Recording…' : 'I Agree'}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            Republic Act No. 10173 · Data Privacy Act of 2012
          </p>
        </div>
      </div>
    </div>
  );
}