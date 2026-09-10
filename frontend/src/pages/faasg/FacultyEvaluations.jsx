import { useEffect, useState } from 'react';
import { Plus, Trash2, Star, Search, ClipboardCheck } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const CATEGORIES = [
  { value: 'TEACHING', label: 'Teaching' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'EXTENSION', label: 'Extension' },
];

export default function FacultyEvaluations() {
  const toast = useToast();
  const [evaluations, setEvaluations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ facultyId: '', studentId: '', termId: '', rating: 3, comments: '', category: 'TEACHING' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/faasg/evaluations?page=${page}&limit=20` })
      .then((data) => { setEvaluations(data.evaluations); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ method: 'post', url: '/faasg/evaluations', data: { ...form, rating: Number(form.rating), studentId: form.studentId || undefined } });
      toast.success('Evaluation recorded.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/faasg/evaluations/${deleting.id}` });
      toast.success('Evaluation deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = evaluations.filter((e) => {
    if (!search) return true;
    return e.faculty.fullName.toLowerCase().includes(search.toLowerCase());
  });

  const renderStars = (n) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClipboardCheck size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> evaluations
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ facultyId: '', studentId: '', termId: '', rating: 3, comments: '', category: 'TEACHING' }); setShowForm(true); }}>
          <Plus size={14} /> Add evaluation
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search faculty name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Faculty</th><th>Category</th><th>Rating</th><th>Term</th><th>Date</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No evaluations found.</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id}>
                  <td className="font-medium">{e.faculty.fullName}</td>
                  <td className="text-xs">{CATEGORIES.find((c) => c.value === e.category)?.label}</td>
                  <td>{renderStars(e.rating)}</td>
                  <td className="text-xs">{e.term.label}</td>
                  <td className="text-xs">{formatDate(e.evaluatedAt)}</td>
                  <td className="text-right">
                    <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(e)}><Trash2 size={13} /></button>
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
            <h3 className="text-base font-semibold text-slate-800">Add Faculty Evaluation</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div><label className="label">Faculty ID</label><input className="input" placeholder="UUID" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} required /></div>
              <div><label className="label">Student ID (optional)</label><input className="input" placeholder="UUID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /></div>
              <div><label className="label">Term ID</label><input className="input" placeholder="UUID" value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} required /></div>
              <div><label className="label">Category</label><CustomSelect value={form.category} onChange={(val) => setForm({ ...form, category: val })} options={CATEGORIES} /></div>
              <div><label className="label">Rating (1-5)</label><input className="input" type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} required /></div>
              <div><label className="label">Comments</label><textarea className="input" rows={3} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></div>
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
            <h3 className="text-base font-semibold text-slate-800">Delete Evaluation</h3>
            <p className="mt-3 text-sm text-slate-600">Delete evaluation for <strong>{deleting.faculty.fullName}</strong>?</p>
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
