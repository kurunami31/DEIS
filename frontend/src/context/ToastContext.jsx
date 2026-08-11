import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    const id = ++counter.current;
    setToasts((current) => [...current, { id, type, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const success = useCallback((message) => push('success', message), [push]);
  const error = useCallback((message) => push('error', message), [push]);
  const info = useCallback((message) => push('info', message), [push]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-[15px] border bg-white px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success' ? 'border-emerald-200' : toast.type === 'error' ? 'border-red-200' : 'border-primary-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />}
            {toast.type === 'error' && <XCircle size={17} className="mt-0.5 shrink-0 text-red-600" />}
            {toast.type === 'info' && <Info size={17} className="mt-0.5 shrink-0 text-primary-600" />}
            <span className="text-slate-700">{toast.message}</span>
            <button className="ml-auto text-slate-300 hover:text-slate-500" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <XCircle size={14} className="rotate-45" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}