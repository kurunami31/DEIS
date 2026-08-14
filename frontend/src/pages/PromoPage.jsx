import { ArrowLeft, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';

const PROMO_URL = import.meta.env.VITE_PROMO_VIDEO_URL ?? '';

export default function PromoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12">
      <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white">
        <ArrowLeft size={15} /> Back to sign in
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <Logo size={52} className="rounded-xl bg-white p-1.5" />
        <div className="leading-tight text-white">
          <p className="text-lg font-bold">Davao Oriental State University</p>
          <p className="text-xs text-slate-400">Official Promotional Video 2022</p>
        </div>
      </div>

      {PROMO_URL ? (
        <div className="w-full max-w-4xl overflow-hidden rounded-[20px] border border-white/10 shadow-2xl">
          <video
            className="aspect-video w-full bg-black"
            controls
            autoPlay={false}
            preload="metadata"
            src={PROMO_URL}
          />
        </div>
      ) : (
        <div className="w-full max-w-md rounded-[20px] border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <PlayCircle size={40} className="mx-auto text-primary-300" />
          <h1 className="mt-4 text-base font-semibold text-white">Promo video not configured</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Set <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-primary-200">VITE_PROMO_VIDEO_URL</code> in the
            frontend build to the hosted video URL (e.g. your CDN or YouTube embed fallback), then rebuild.
          </p>
        </div>
      )}

      <p className="mt-8 max-w-xl text-center text-xs leading-relaxed text-slate-500">
        DOrSU is a state university in Mati City, Davao Oriental, Philippines — a university of excellence,
        innovation, and inclusion. Follow us on{' '}
        <a
          href="https://www.facebook.com/dorsuofficial"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white"
        >
          Facebook
        </a>
        .
      </p>
    </div>
  );
}