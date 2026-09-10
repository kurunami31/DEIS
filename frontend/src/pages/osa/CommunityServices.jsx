import { useEffect, useState } from 'react';
import { Plus, Search, ShieldCheck } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function CommunityServices() {
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: '', title: '', hours: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);
  const [statusMenu, setStatusMenu] = useState(null);

  const load = () => {
    request({ url: `/osa/services?page=${page}&limit=20` })
      .then((data) => { setServices(data.services); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ method: 'post', url: '/osa/services', data: { ...form, hours: Number(form.hours), date: new Date(form.date) } });
      toast.success('Community service logged.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleStatus = async (svc, status) => {
    try {
      await request({ method: 'patch', url: `/osa/services/${svc.id}`, data: { status, verifiedBy: 'System' } });
      toast.success(`Service ${status.toLowerCase()}.`);
      setStatusMenu(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = services.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.student.studentNo.toLowerCase().includes(q) || s.student.firstName.toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
  });

  const tone = (s) => s === 'APPROVED' ? 'badge-green' : s === 'REJECTED' ? 'badge-red' : 'badge-amber';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> services
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ studentId: '', title: '', hours: '', date: new Date().toISOString().slice(0, 10), notes: '' }); setShowForm(true); }}>
          <Plus size={14} /> Log service
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search student or title…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Student</th><th>Title</th><th>Hours</th><th>Date</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No services found.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-medium">{s.student.firstName} {s.student.lastName}</p>
                    <p className="text-xs text-slate-400">{s.student.studentNo}</p>
                  </td>
                  <td className="text-xs">{s.title}</td>
                  <td className="text-xs font-semibold">{s.hours}h</td>
                  <td className="text-xs">{formatDate(s.date)}</td>
                  <td className="relative">
                    <button className={`badge cursor-pointer ${tone(s.status)}`} onClick={() => setStatusMenu(statusMenu === s.id ? null : s.id)}>{s.status}</button>
                    {statusMenu === s.id && (
                      <div className="absolute z-20 mt-1 rounded-[10px] border bg-white py-1 shadow-lg">
                        {STATUSES.map((st) => (
                          <button key={st.value} className="block w-full px-4 py-1.5 text-left text-xs hover:bg-slate-50" onClick={() => handleStatus(s, st.value)}>{st.label}</button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="text-right text-xs text-slate-400">Verified: {s.verifiedBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary !px-3 !py-1 text-xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="px-3 py-1 text-xs text-slate-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button className="btn-secondary !px-3 !py-1 text-xs" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Log Community Service</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div><label className="label">Student ID</label><input className="input" placeholder="UUID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required /></div>
              <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Hours</label><input className="input" type="number" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} required /></div>
                <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              </div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
