import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, GraduationCap } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const STATUSES = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function TrainingRecords() {
  const toast = useToast();
  const [trainings, setTrainings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ facultyId: '', title: '', provider: '', hours: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/faasg/trainings?page=${page}&limit=20` })
      .then((data) => { setTrainings(data.trainings); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ method: 'post', url: '/faasg/trainings', data: { ...form, hours: Number(form.hours), date: new Date(form.date) } });
      toast.success('Training record created.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleStatus = async (t, status) => {
    try {
      await request({ method: 'patch', url: `/faasg/trainings/${t.id}`, data: { status } });
      toast.success(`Training marked as ${status.toLowerCase()}.`);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/faasg/trainings/${deleting.id}` });
      toast.success('Training deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = trainings.filter((t) => !search || t.faculty.fullName.toLowerCase().includes(search.toLowerCase()) || t.title.toLowerCase().includes(search.toLowerCase()));

  const tone = (s) => s === 'COMPLETED' ? 'badge-green' : s === 'CANCELLED' ? 'badge-red' : 'badge-amber';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <GraduationCap size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> trainings
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ facultyId: '', title: '', provider: '', hours: '', date: new Date().toISOString().slice(0, 10), notes: '' }); setShowForm(true); }}>
          <Plus size={14} /> Add training
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search faculty or title…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Faculty</th><th>Title</th><th>Provider</th><th>Hours</th><th>Date</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No training records found.</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.faculty.fullName}</td>
                  <td className="text-xs">{t.title}</td>
                  <td className="text-xs">{t.provider ?? '—'}</td>
                  <td className="text-xs font-semibold">{t.hours}h</td>
                  <td className="text-xs">{formatDate(t.date)}</td>
                  <td>
                    <div className="flex gap-1">
                      {STATUSES.map((st) => (
                        <button key={st.value} className={`badge cursor-pointer ${t.status === st.value ? tone(st.value) : 'badge-gray opacity-40'}`} onClick={() => t.status !== st.value && handleStatus(t, st.value)}>{st.label}</button>
                      ))}
                    </div>
                  </td>
                  <td className="text-right">
                    <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(t)}><Trash2 size={13} /></button>
                  </td>
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
            <h3 className="text-base font-semibold text-slate-800">Add Training Record</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div><label className="label">Faculty ID</label><input className="input" placeholder="UUID" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} required /></div>
              <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div><label className="label">Provider</label><input className="input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
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

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Delete Training</h3>
            <p className="mt-3 text-sm text-slate-600">Delete training <strong>{deleting.title}</strong>?</p>
            <div className="flex justify-end gap-2 pt-4">
              <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn-primary !px-3 !py-1.5 text-xs bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
