import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const OFFENSE_TYPES = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'MAJOR', label: 'Major' },
];

export default function DisciplinaryRecords() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: '', offense: 'MINOR', description: '', action: '', dateIssued: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/osa/disciplinary?page=${page}&limit=20` })
      .then((data) => { setRecords(data.records); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ method: 'post', url: '/osa/disciplinary', data: { ...form, dateIssued: new Date(form.dateIssued) } });
      toast.success('Record created.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleResolve = async (rec) => {
    try {
      await request({ method: 'patch', url: `/osa/disciplinary/${rec.id}`, data: { isResolved: true, resolvedAt: new Date().toISOString() } });
      toast.success('Record resolved.');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/osa/disciplinary/${deleting.id}` });
      toast.success('Record deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.student.studentNo.toLowerCase().includes(q) || r.student.firstName.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  const offenseBadge = (o) => o === 'MAJOR' ? 'badge-red' : o === 'MODERATE' ? 'badge-amber' : 'badge-gray';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <AlertTriangle size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> records
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ studentId: '', offense: 'MINOR', description: '', action: '', dateIssued: new Date().toISOString().slice(0, 10) }); setShowForm(true); }}>
          <Plus size={14} /> New record
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search student or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Student</th><th>Offense</th><th>Description</th><th>Action</th><th>Date</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No records found.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-medium">{r.student.firstName} {r.student.lastName}</p>
                    <p className="text-xs text-slate-400">{r.student.studentNo}</p>
                  </td>
                  <td><span className={`badge ${offenseBadge(r.offense)}`}>{r.offense}</span></td>
                  <td className="max-w-[200px] truncate text-xs">{r.description}</td>
                  <td className="max-w-[150px] truncate text-xs">{r.action}</td>
                  <td className="text-xs">{formatDate(r.dateIssued)}</td>
                  <td><span className={`badge ${r.isResolved ? 'badge-green' : 'badge-red'}`}>{r.isResolved ? 'Resolved' : 'Open'}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!r.isResolved && <button className="btn-secondary !px-2 !py-1 text-xs text-emerald-600" onClick={() => handleResolve(r)}>Resolve</button>}
                      <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(r)}><Trash2 size={13} /></button>
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
            <h3 className="text-base font-semibold text-slate-800">New Disciplinary Record</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div><label className="label">Student ID</label><input className="input" placeholder="UUID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required /></div>
              <div><label className="label">Offense Level</label><CustomSelect value={form.offense} onChange={(val) => setForm({ ...form, offense: val })} options={OFFENSE_TYPES} /></div>
              <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
              <div><label className="label">Action Taken</label><input className="input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} required /></div>
              <div><label className="label">Date Issued</label><input className="input" type="date" value={form.dateIssued} onChange={(e) => setForm({ ...form, dateIssued: e.target.value })} required /></div>
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
            <h3 className="text-base font-semibold text-slate-800">Delete Record</h3>
            <p className="mt-3 text-sm text-slate-600">Delete disciplinary record for <strong>{deleting.student.firstName} {deleting.student.lastName}</strong>?</p>
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
