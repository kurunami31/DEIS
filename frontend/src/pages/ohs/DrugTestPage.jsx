import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, TestTube } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const RESULTS = [
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CONDITIONAL', label: 'Conditional' },
];

const resultTone = (r) => {
  switch (r) {
    case 'PASSED': return 'badge-green';
    case 'FAILED': return 'badge-red';
    case 'CONDITIONAL': return 'badge-amber';
    default: return 'badge-gray';
  }
};

export default function DrugTestPage() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ studentId: '', result: 'PASSED', testedAt: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    const params = new URLSearchParams({ type: 'DRUG_TEST', limit: 100 });
    if (filterResult) params.set('result', filterResult);
    request({ url: `/ohs/records?${params}` })
      .then((data) => { setRecords(data.records); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [filterResult]);

  const openCreate = () => {
    setEditing(null);
    setForm({ studentId: '', result: 'PASSED', testedAt: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ studentId: r.studentId, result: r.result, testedAt: r.testedAt.slice(0, 10) });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, type: 'DRUG_TEST', testedAt: new Date(form.testedAt) };
      if (editing) {
        await request({ method: 'patch', url: `/ohs/records/${editing.id}`, data: payload });
        toast.success('Record updated.');
      } else {
        await request({ method: 'post', url: '/ohs/records', data: payload });
        toast.success('Record created.');
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
      await request({ method: 'delete', url: `/ohs/records/${deleting.id}` });
      toast.success('Record deleted.');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.student.studentNo.toLowerCase().includes(q) || r.student.firstName.toLowerCase().includes(q) || r.student.lastName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <TestTube size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> drug test records
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={openCreate}>
          <Plus size={14} /> Add record
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-8" placeholder="Search student no. or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CustomSelect value={filterResult} onChange={setFilterResult} options={[{ value: '', label: 'All results' }, ...RESULTS]} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Student</th>
                <th>Result</th>
                <th>Date</th>
                <th>Recorded By</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No drug test records found.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-medium">{r.student.firstName} {r.student.lastName}</p>
                    <p className="text-xs text-slate-400">{r.student.studentNo}</p>
                  </td>
                  <td><span className={`badge ${resultTone(r.result)}`}>{r.result}</span></td>
                  <td className="text-xs">{formatDate(r.testedAt)}</td>
                  <td className="text-xs">{r.testedBy}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                      <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(r)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">{editing ? 'Edit' : 'Add'} Drug Test Record</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {!editing && (
                <div>
                  <label className="label">Student ID</label>
                  <input className="input" placeholder="UUID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="label">Result</label>
                <CustomSelect value={form.result} onChange={(val) => setForm({ ...form, result: val })} options={RESULTS} />
              </div>
              <div>
                <label className="label">Test Date</label>
                <input className="input" type="date" value={form.testedAt} onChange={(e) => setForm({ ...form, testedAt: e.target.value })} required />
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
            <h3 className="text-base font-semibold text-slate-800">Delete Drug Test Record</h3>
            <p className="mt-3 text-sm text-slate-600">Delete drug test for <strong>{deleting.student.firstName} {deleting.student.lastName}</strong>?</p>
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
