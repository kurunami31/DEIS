import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Banknote } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function FeeStructures() {
  const toast = useToast();
  const [fees, setFees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', termId: '', lineItems: [] });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/cashiering/fees?page=${page}&limit=20` })
      .then((data) => { setFees(data.fees); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const addLine = () => setForm({ ...form, lineItems: [...form.lineItems, { description: '', amount: 0 }] });
  const removeLine = (i) => setForm({ ...form, lineItems: form.lineItems.filter((_, idx) => idx !== i) });
  const updateLine = (i, field, val) => {
    const lines = [...form.lineItems];
    lines[i] = { ...lines[i], [field]: field === 'amount' ? Number(val) : val };
    setForm({ ...form, lineItems: lines });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ method: 'post', url: '/cashiering/fees', data: { name: form.name, amount: Number(form.amount), termId: form.termId || undefined, lineItems: form.lineItems.length ? form.lineItems : undefined } });
      toast.success('Fee structure created.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/cashiering/fees/${deleting.id}` });
      toast.success('Fee structure deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = fees.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Banknote size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> fee structures
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ name: '', amount: '', termId: '', lineItems: [] }); setShowForm(true); }}>
          <Plus size={14} /> Add fee
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search fee name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Name</th><th>Amount</th><th>Line Items</th><th>Term</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No fee structures found.</td></tr>
              ) : filtered.map((f) => (
                <tr key={f.id}>
                  <td className="font-medium">{f.name}</td>
                  <td className="text-sm font-semibold text-emerald-700">{fmt(f.amount)}</td>
                  <td className="text-xs">{f.lineItems.length} items</td>
                  <td className="text-xs">{f.term?.label ?? 'All terms'}</td>
                  <td className="text-right">
                    <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(f)}><Trash2 size={13} /></button>
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
          <div className="w-full max-w-lg rounded-[15px] bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Add Fee Structure</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Total Amount (₱)</label><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                <div><label className="label">Term ID (optional)</label><input className="input" placeholder="UUID" value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} /></div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Line Items</label>
                  <button type="button" className="text-xs text-primary-600 hover:underline" onClick={addLine}>+ Add item</button>
                </div>
                {form.lineItems.map((line, i) => (
                  <div key={i} className="mt-2 flex gap-2">
                    <input className="input flex-1" placeholder="Description" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} required />
                    <input className="input w-28" type="number" min="0" step="0.01" value={line.amount} onChange={(e) => updateLine(i, 'amount', e.target.value)} required />
                    <button type="button" className="btn-secondary !px-2 text-red-500" onClick={() => removeLine(i)}>✕</button>
                  </div>
                ))}
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
            <h3 className="text-base font-semibold text-slate-800">Delete Fee Structure</h3>
            <p className="mt-3 text-sm text-slate-600">Delete <strong>{deleting.name}</strong>?</p>
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
