import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, ClipboardList } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const ASSESSMENT_TYPES = [
  { value: 'PSYCHOLOGICAL', label: 'Psychological' },
  { value: 'PERSONALITY', label: 'Personality' },
  { value: 'APTITUDE', label: 'Aptitude' },
  { value: 'INTEREST', label: 'Interest' },
];

export default function StudentAssessments() {
  const toast = useToast();
  const [assessments, setAssessments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ studentId: '', type: 'PSYCHOLOGICAL', score: '', result: '', interpretation: '', assessedAt: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    const params = new URLSearchParams({ page, limit: 20 });
    if (filterType) params.set('type', filterType);
    request({ url: `/oscd/assessments?${params}` })
      .then((data) => { setAssessments(data.assessments); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page, filterType]);

  const openCreate = () => {
    setEditing(null);
    setForm({ studentId: '', type: 'PSYCHOLOGICAL', score: '', result: '', interpretation: '', assessedAt: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({ studentId: a.studentId, type: a.type, score: a.score ?? '', result: a.result ?? '', interpretation: a.interpretation ?? '', assessedAt: a.assessedAt.slice(0, 10) });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        score: form.score !== '' ? Number(form.score) : undefined,
        assessedAt: new Date(form.assessedAt),
      };
      if (editing) {
        await request({ method: 'patch', url: `/oscd/assessments/${editing.id}`, data: payload });
        toast.success('Assessment updated.');
      } else {
        await request({ method: 'post', url: '/oscd/assessments', data: payload });
        toast.success('Assessment created.');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/oscd/assessments/${deleting.id}` });
      toast.success('Assessment deleted.');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = assessments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.student.studentNo.toLowerCase().includes(q) || a.student.firstName.toLowerCase().includes(q) || a.student.lastName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClipboardList size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> assessments
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={openCreate}>
          <Plus size={14} /> Add assessment
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-8" placeholder="Search student no. or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CustomSelect value={filterType} onChange={setFilterType} options={[{ value: '', label: 'All types' }, ...ASSESSMENT_TYPES]} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Student</th>
                <th>Assessment Type</th>
                <th>Score</th>
                <th>Result</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No assessments found.</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium">{a.student.firstName} {a.student.lastName}</p>
                    <p className="text-xs text-slate-400">{a.student.studentNo}</p>
                  </td>
                  <td className="text-xs">{ASSESSMENT_TYPES.find((t) => t.value === a.type)?.label}</td>
                  <td className="text-xs font-semibold">{a.score ?? '—'}</td>
                  <td className="text-xs">{a.result ?? '—'}</td>
                  <td className="text-xs">{formatDate(a.assessedAt)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => openEdit(a)}><Pencil size={13} /></button>
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
            <h3 className="text-base font-semibold text-slate-800">{editing ? 'Edit' : 'Add'} Assessment</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {!editing && (
                <div>
                  <label className="label">Student ID</label>
                  <input className="input" placeholder="UUID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="label">Assessment Type</label>
                <CustomSelect value={form.type} onChange={(val) => setForm({ ...form, type: val })} options={ASSESSMENT_TYPES} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Score (0-100)</label>
                  <input className="input" type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
                </div>
                <div>
                  <label className="label">Result</label>
                  <input className="input" placeholder="e.g. Average" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Interpretation</label>
                <textarea className="input" rows={3} value={form.interpretation} onChange={(e) => setForm({ ...form, interpretation: e.target.value })} />
              </div>
              <div>
                <label className="label">Assessment Date</label>
                <input className="input" type="date" value={form.assessedAt} onChange={(e) => setForm({ ...form, assessedAt: e.target.value })} required />
              </div>
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
            <h3 className="text-base font-semibold text-slate-800">Delete Assessment</h3>
            <p className="mt-3 text-sm text-slate-600">Delete assessment for <strong>{deleting.student.firstName} {deleting.student.lastName}</strong>?</p>
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
