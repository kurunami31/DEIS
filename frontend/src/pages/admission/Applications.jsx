import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, ClipboardList } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WAITLISTED', label: 'Waitlisted' },
];

export default function Applications() {
  const toast = useToast();
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', programId: '', incomingYear: 1, previousSchool: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/admission/applications?page=${page}&limit=20` })
      .then((data) => { setApps(data.applications); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ method: 'post', url: '/admission/applications', data: { ...form, incomingYear: Number(form.incomingYear) } });
      toast.success('Application submitted.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleReview = async (app, status) => {
    try {
      await request({ method: 'patch', url: `/admission/applications/${app.id}`, data: { status } });
      toast.success(`Application ${status.toLowerCase()}.`);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/admission/applications/${deleting.id}` });
      toast.success('Application deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = apps.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.firstName.toLowerCase().includes(q) || a.lastName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  const tone = (s) => s === 'APPROVED' ? 'badge-green' : s === 'REJECTED' ? 'badge-red' : s === 'WAITLISTED' ? 'badge-amber' : 'badge-gray';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClipboardList size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> applications
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ firstName: '', lastName: '', email: '', phone: '', programId: '', incomingYear: 1, previousSchool: '' }); setShowForm(true); }}>
          <Plus size={14} /> New application
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Applicant</th><th>Program</th><th>Year</th><th>Status</th><th>Reviewed</th><th>Date</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No applications found.</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-slate-400">{a.email}</p>
                  </td>
                  <td className="text-xs">{a.program?.name ?? '—'}</td>
                  <td className="text-xs">{a.incomingYear}</td>
                  <td><span className={`badge ${tone(a.status)}`}>{a.status}</span></td>
                  <td className="text-xs">{a.reviewedBy?.fullName ?? '—'}</td>
                  <td className="text-xs">{formatDate(a.createdAt)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.status === 'PENDING' && (
                        <>
                          <button className="btn-secondary !px-2 !py-1 text-xs text-emerald-600" onClick={() => handleReview(a, 'APPROVED')}>Approve</button>
                          <button className="btn-secondary !px-2 !py-1 text-xs text-red-600" onClick={() => handleReview(a, 'REJECTED')}>Reject</button>
                          <button className="btn-secondary !px-2 !py-1 text-xs text-amber-600" onClick={() => handleReview(a, 'WAITLISTED')}>Waitlist</button>
                        </>
                      )}
                      <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(a)}><Trash2 size={13} /></button>
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
            <h3 className="text-base font-semibold text-slate-800">New Admission Application</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
                <div><label className="label">Last Name</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
              </div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="label">Incoming Year</label><input className="input" type="number" min="1" max="6" value={form.incomingYear} onChange={(e) => setForm({ ...form, incomingYear: e.target.value })} required /></div>
              </div>
              <div><label className="label">Program ID</label><input className="input" placeholder="UUID" value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })} required /></div>
              <div><label className="label">Previous School</label><input className="input" value={form.previousSchool} onChange={(e) => setForm({ ...form, previousSchool: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={saving}>{saving ? 'Saving…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Delete Application</h3>
            <p className="mt-3 text-sm text-slate-600">Delete application from <strong>{deleting.firstName} {deleting.lastName}</strong>?</p>
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
