import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, CreditCard, Receipt } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDateTime } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'CHECK', label: 'Check' },
];

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: '', termId: '', amount: '', method: 'CASH', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/cashiering/payments?page=${page}&limit=20` })
      .then((data) => { setPayments(data.payments); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ method: 'post', url: '/cashiering/payments', data: { ...form, amount: Number(form.amount), studentId: form.studentId, termId: form.termId || undefined } });
      toast.success('Payment recorded.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/cashiering/payments/${deleting.id}` });
      toast.success('Payment deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.student.studentNo.toLowerCase().includes(q) || p.student.firstName.toLowerCase().includes(q) || p.student.lastName.toLowerCase().includes(q);
  });

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CreditCard size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> payments
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ studentId: '', termId: '', amount: '', method: 'CASH', reference: '', notes: '' }); setShowForm(true); }}>
          <Plus size={14} /> Record payment
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Student</th><th>Amount</th><th>Method</th><th>Reference</th><th>Date</th><th>Receipt</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No payments found.</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium">{p.student.firstName} {p.student.lastName}</p>
                    <p className="text-xs text-slate-400">{p.student.studentNo}</p>
                  </td>
                  <td className="text-sm font-semibold text-emerald-700">{fmt(p.amount)}</td>
                  <td className="text-xs">{METHODS.find((m) => m.value === p.method)?.label}</td>
                  <td className="text-xs">{p.reference ?? '—'}</td>
                  <td className="text-xs">{formatDateTime(p.paidAt)}</td>
                  <td className="text-xs">{p.receipt ? <span className="badge badge-green"><Receipt size={10} className="mr-1" />{p.receipt.number}</span> : '—'}</td>
                  <td className="text-right">
                    <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(p)}><Trash2 size={13} /></button>
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
            <h3 className="text-base font-semibold text-slate-800">Record Payment</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div><label className="label">Student ID</label><input className="input" placeholder="UUID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required /></div>
              <div><label className="label">Term ID (optional)</label><input className="input" placeholder="UUID" value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Amount (₱)</label><input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                <div><label className="label">Method</label><CustomSelect value={form.method} onChange={(val) => setForm({ ...form, method: val })} options={METHODS} /></div>
              </div>
              <div><label className="label">Reference No.</label><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
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
            <h3 className="text-base font-semibold text-slate-800">Delete Payment</h3>
            <p className="mt-3 text-sm text-slate-600">Delete payment of <strong>{fmt(deleting.amount)}</strong> from <strong>{deleting.student.firstName} {deleting.student.lastName}</strong>?</p>
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
