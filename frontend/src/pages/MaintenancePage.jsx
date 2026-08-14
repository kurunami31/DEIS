import { Wrench } from 'lucide-react';

export default function MaintenancePage({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="card card-pad w-full max-w-md text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Wrench size={28} />
        </span>
        <h1 className="mt-4 text-lg font-bold text-slate-800">System Under Maintenance</h1>
        <p className="mt-2 text-sm text-slate-500">
          {message || 'The system is currently under maintenance. Please check back shortly.'}
        </p>
        <p className="mt-4 text-xs text-slate-400">
          This page refreshes automatically — you will be signed back in as soon as services resume.
        </p>
      </div>
    </div>
  );
}