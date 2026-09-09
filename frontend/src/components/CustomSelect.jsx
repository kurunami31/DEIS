import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input flex items-center justify-between text-left cursor-pointer"
      >
        <span>{selected?.label || 'Select…'}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
          {options.map((o) => (
            <li
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer rounded-lg mx-1 my-0.5 ${
                o.value === value
                  ? 'bg-primary-600 text-white font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
