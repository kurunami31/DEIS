import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, MapPin, User, Clock3 } from 'lucide-react';
import { request } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const TYPE_BADGE = {
  ACADEMIC: 'badge-blue',
  ADMINISTRATIVE: 'badge-gray',
  CULTURAL: 'badge-purple',
  SPORTS: 'badge-green',
  OTHER: 'badge-amber',
};

const TYPE_LABEL = { ACADEMIC: 'Academic', ADMINISTRATIVE: 'Administrative', CULTURAL: 'Cultural', SPORTS: 'Sports', OTHER: 'Other' };

function fmt(d) {
  return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function CalendarPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'ADMIN' || user?.role === 'REGISTRAR';
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', startsAt: '', endsAt: '', location: '', type: 'ACADEMIC', audience: 'ALL', description: '' });

  const load = () => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59);
    request({ url: '/calendar', params: { from: from.toISOString(), to: to.toISOString() } }).then(setItems).catch(() => setItems([]));
  };

  useEffect(load, [cursor]);

  const monthLabel = cursor.toLocaleString([], { month: 'long', year: 'numeric' });

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startsAt) return toast.error('Title and start date are required.');
    request({
      method: 'post',
      url: '/calendar',
      data: {
        ...form,
        title: form.title.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        location: form.location || undefined,
        description: form.description || undefined,
      },
    })
      .then(() => {
        toast.success('Activity added to calendar.');
        setShowForm(false);
        setForm({ title: '', startsAt: '', endsAt: '', location: '', type: 'ACADEMIC', audience: 'ALL', description: '' });
        load();
      })
      .catch((err) => toast.error(err.message));
  };

  const remove = (id) => {
    request({ method: 'delete', url: `/calendar/${id}` })
      .then(() => {
        toast.success('Activity removed.');
        load();
      })
      .catch((err) => toast.error(err.message));
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary-700">Calendar of Activities</h1>
          <p className="text-sm text-slate-500">University-wide activities and events</p>
        </div>
        {canManage && (
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setShowForm((s) => !s)}>
            <CalendarPlus size={14} className="mr-1 inline" /> Add activity
          </button>
        )}
      </div>

      {showForm && (
        <form className="card grid gap-3 p-4 md:grid-cols-2" onSubmit={submit}>
          <input className="input md:col-span-2" placeholder="Activity title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label className="label">
            Starts
            <input className="input" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </label>
          <label className="label">
            Ends
            <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </label>
          <input className="input" placeholder="Venue / location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="flex gap-3">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="ALL">Everyone</option>
              <option value="STUDENTS">Students</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Admin only</option>
            </select>
          </div>
          <textarea className="input md:col-span-2" placeholder="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary !px-3 !py-1.5 text-xs">Save</button>
          </div>
        </form>
      )}

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button className="btn-secondary !px-2 !py-1" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-bold text-slate-700">{monthLabel}</h2>
          <button className="btn-secondary !px-2 !py-1" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {daysOfWeek.map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const dayItems = items.filter((a) => isSameDay(new Date(a.startsAt), d));
            return (
              <div key={d.toISOString()} className={`min-h-[72px] rounded-lg border p-1 ${inMonth ? 'border-slate-100 bg-white' : 'border-slate-50 bg-slate-50'} ${isSameDay(d, today) ? 'ring-2 ring-primary-600' : ''}`}>
                <p className={`text-[11px] font-semibold ${inMonth ? 'text-slate-600' : 'text-slate-300'}`}>{d.getDate()}</p>
                <div className="space-y-0.5">
                  {dayItems.map((a) => (
                    <div key={a.id} className="group relative rounded bg-primary-50 px-1 py-0.5 text-[10px] text-primary-700" title={a.description ?? a.title}>
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="flex items-center gap-0.5 text-[9px] text-primary-400">
                        <Clock3 size={8} /> {fmt(a.startsAt).split(',')[1]}
                      </p>
                      {canManage && (
                        <button
                          className="absolute inset-0 hidden items-center justify-center rounded bg-red-50 text-[9px] font-semibold text-red-600 group-hover:flex"
                          onClick={() => remove(a.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-2 text-sm font-bold text-slate-700">Upcoming in {monthLabel}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No activities this month.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className={`badge ${TYPE_BADGE[a.type] ?? 'badge-gray'}`}>{TYPE_LABEL[a.type] ?? a.type}</span>
                <span className="font-medium text-slate-700">{a.title}</span>
                <span className="text-slate-400">{fmt(a.startsAt)}</span>
                {a.location && <span className="flex items-center gap-1 text-slate-400"><MapPin size={12} />{a.location}</span>}
                {a.description && <span className="ml-auto hidden max-w-xs truncate text-slate-400 md:block" title={a.description}>{a.description}</span>}
              </li>
            ))}
          </ul>
        )}
        {canManage && <p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><User size={12} /> Others can also add activities from this page.</p>}
      </div>
    </div>
  );
}