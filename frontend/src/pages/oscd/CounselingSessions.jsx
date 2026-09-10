import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, HeartHandshake } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDateTime } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const TYPES = [
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'CAREER', label: 'Career' },
  { value: 'GROUP', label: 'Group' },
];

const STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

const statusTone = (s) => {
  switch (s) {
    case 'SCHEDULED': return 'badge-amber';
    case 'COMPLETED': return 'badge-green';
    case 'CANCELLED': return 'badge-gray';
    case 'NO_SHOW': return 'badge-red';
    default: return 'badge-gray';
  }
};

export default function CounselingSessions() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ studentId: '', type: 'ACADEMIC', concern: '', scheduledAt: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    const params = new URLSearchParams({ page, limit: 20 });
    if (filterStatus) params.set('status', filterStatus);
    if (filterType) params.set('type', filterType);
    request({ url: `/oscd/sessions?${params}` })
      .then((data) => { setSessions(data.sessions); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page, filterStatus, filterType]);

  const openCreate = () => {
    setEditing(null);
    setForm({ studentId: '', type: 'ACADEMIC', concern: '', scheduledAt: '' });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ studentId: s.studentId, type: s.type, concern: s.concern, scheduledAt: s.scheduledAt.slice(0, 16) });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, scheduledAt: new Date(form.scheduledAt) };
      if (editing) {
        await request({ method: 'patch', url: `/oscd/sessions/${editing.id}`, data: { status: 'COMPLETED', completedAt: new Date() } });
        toast.success('Session completed.');
      } else {
        await request({ method: 'post', url: '/oscd/sessions', data: payload });
        toast.success('Session scheduled.');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (session, status) => {
    try {
      const data = { status };
      if (status === 'COMPLETED') data.completedAt = new Date().toISOString();
      await request({ method: 'patch', url: `/oscd/sessions/${session.id}`, data });
      toast.success(`Session marked as ${status.toLowerCase()}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/oscd/sessions/${deleting.id}` });
      toast.success('Session deleted.');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.student.studentNo.toLowerCase().includes(q) || s.student.firstName.toLowerCase().includes(q) || s.student.lastName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <HeartHandshake size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> sessions
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={openCreate}>
          <Plus size={14} /> New session
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-8" placeholder="Search student no. or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CustomSelect value={filterStatus} onChange={setFilterStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES]} />
        <CustomSelect value={filterType} onChange={setFilterType} options={[{ value: '', label: 'All types' }, ...TYPES]} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Student</th>
                <th>Type</th>
                <th>Concern</th>
                <th>Counselor</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No sessions found.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-medium">{s.student.firstName} {s.student.lastName}</p>
                    <p className="text-xs text-slate-400">{s.student.studentNo}</p>
                  </td>
                  <td className="text-xs">{TYPES.find((t) => t.value === s.type)?.label}</td>
                  <td className="max-w-[200px] truncate text-xs">{s.concern}</td>
                  <td className="text-xs">{s.counselor.fullName}</td>
                  <td className="text-xs">{formatDateTime(s.scheduledAt)}</td>
                  <td><span className={`badge ${statusTone(s.status)}`}>{s.status}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {s.status === 'SCHEDULED' && (
                        <button className="btn-secondary !px-2 !py-1 text-xs text-emerald-600" onClick={() => handleStatus(s, 'COMPLETED')}>Complete</button>
                      )}
                      <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)}><Trash2 size={13} /></button>
                    </div>
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
            <h3 className="text-base font-semibold text-slate-800">Schedule Counseling Session</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="label">Student ID</label>
                <input className="input" placeholder="UUID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
              </div>
              <div>
                <label className="label">Type</label>
                <CustomSelect value={form.type} onChange={(val) => setForm({ ...form, type: val })} options={TYPES} />
              </div>
              <div>
                <label className="label">Concern</label>
                <textarea className="input" rows={3} value={form.concern} onChange={(e) => setForm({ ...form, concern: e.target.value })} required />
              </div>
              <div>
                <label className="label">Scheduled Date & Time</label>
                <input className="input" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={saving}>{saving ? 'Saving…' : 'Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Delete Session</h3>
            <p className="mt-3 text-sm text-slate-600">Delete session for <strong>{deleting.student.firstName} {deleting.student.lastName}</strong>?</p>
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
