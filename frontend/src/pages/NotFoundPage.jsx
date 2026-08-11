import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Logo } from '../components/Logo.jsx';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6 text-center">
      <Logo size={64} />
      <div className="mt-6 flex items-center gap-2 text-primary-600">
        <Compass size={20} />
        <span className="text-sm font-semibold uppercase tracking-widest">404 · Page not found</span>
      </div>
      <h1 className="mt-3 text-2xl font-bold text-slate-800">This page drifted off the map</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The address you entered doesn't match any page in the enrollment system.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}