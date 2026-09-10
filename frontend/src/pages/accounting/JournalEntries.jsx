import { useEffect, useState } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';
import CustomSelect from '../../components/CustomSelect.jsx';

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' },
];

export default function JournalEntries() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [acctForm, setAcctForm] = useState({ code: '', name: '', type: 'ASSET' });
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', reference: '', lines: [{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }] });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/accounting/journals?page=${page}&limit=20` }).then((d) => { setEntries(d.entries); setTotal(d.total); }).catch((err) => toast.error(err.message));
    request({ url: '/accounting/accounts?limit=100' }).then((d) => setAccounts(d.accounts)).catch(() => {});
  };

  useEffect(() => { load(); }, [page]);

  const addLine = () => setForm({ ...form, lines: [...form.lines, { accountId: '', debit: 0, credit: 0 }] });
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i, field, val) => {
    const lines = [...form.lines];
    lines[i] = { ...lines[i], [field]: field === 'accountId' ? val : Number(val) };
    setForm({ ...form, lines });
  };

  const totalDebit = form.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = form.lines.reduce((s, l) => s + l.credit, 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (Math.abs(totalDebit - totalCredit) > 0.01) { toast.error('Debits and credits must balance.'); return; }
    setSaving(true);
    try {
      await request({ method: 'post', url: '/accounting/journals', data: { ...form, date: new Date(form.date) } });
      toast.success('Journal entry created.');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await request({ method: 'post', url: '/accounting/accounts', data: acctForm });
      toast.success('Account created.');
      setShowAccounts(false);
      setAcctForm({ code: '', name: '', type: 'ASSET' });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/accounting/journals/${deleting.id}` });
      toast.success('Journal entry deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const acctName = (id) => accounts.find((a) => a.id === id)?.code ?? '—';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <FileText size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> journal entries
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowAccounts(true)}>Manage Accounts</button>
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => { setForm({ date: new Date().toISOString().slice(0, 10), description: '', reference: '', lines: [{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }] }); setShowForm(true); }}>
            <Plus size={14} /> New entry
          </button>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Date</th><th>Description</th><th>Reference</th><th>Debit</th><th>Credit</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No journal entries.</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs">{formatDate(e.date)}</td>
                  <td className="text-xs font-medium">{e.description}</td>
                  <td className="text-xs">{e.reference ?? '—'}</td>
                  <td className="text-xs font-semibold text-emerald-700">{fmt(e.lines.reduce((s, l) => s + Number(l.debit), 0))}</td>
                  <td className="text-xs font-semibold text-red-600">{fmt(e.lines.reduce((s, l) => s + Number(l.credit), 0))}</td>
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
          <div className="w-full max-w-lg rounded-[15px] bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">New Journal Entry</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
                <div><label className="label">Reference</label><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              </div>
              <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>

              <div>
                <div className="flex items-center justify-between"><label className="label mb-0">Lines</label><button type="button" className="text-xs text-primary-600 hover:underline" onClick={addLine}>+ Add line</button></div>
                <div className="mt-2 grid grid-cols-[1fr_100px_100px_30px] gap-2 text-xs font-medium text-slate-500"><span>Account</span><span>Debit</span><span>Credit</span><span></span></div>
                {form.lines.map((line, i) => (
                  <div key={i} className="mt-1 grid grid-cols-[1fr_100px_100px_30px] gap-2">
                    <select className="input !text-xs" value={line.accountId} onChange={(e) => updateLine(i, 'accountId', e.target.value)} required>
                      <option value="">Select…</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                    <input className="input !text-xs" type="number" min="0" step="0.01" value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)} />
                    <input className="input !text-xs" type="number" min="0" step="0.01" value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)} />
                    {form.lines.length > 2 && <button type="button" className="text-red-500 text-xs" onClick={() => removeLine(i)}>✕</button>}
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-[1fr_100px_100px_30px] gap-2 text-xs font-semibold">
                  <span className="text-right">Total:</span>
                  <span className={totalDebit === totalCredit ? 'text-emerald-600' : 'text-red-600'}>{fmt(totalDebit)}</span>
                  <span className={totalDebit === totalCredit ? 'text-emerald-600' : 'text-red-600'}>{fmt(totalCredit)}</span>
                  <span></span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAccounts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowAccounts(false)}>
          <div className="w-full max-w-md rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Chart of Accounts</h3>
            <div className="mt-3 max-h-60 overflow-y-auto">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b py-2 text-xs">
                  <span><strong>{a.code}</strong> — {a.name}</span>
                  <span className="badge badge-gray">{a.type}</span>
                </div>
              ))}
              {accounts.length === 0 && <p className="text-xs text-slate-400">No accounts yet.</p>}
            </div>
            <form onSubmit={handleCreateAccount} className="mt-4 space-y-3 border-t pt-4">
              <p className="text-xs font-medium text-slate-600">Add Account</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Code (e.g. 1010)" value={acctForm.code} onChange={(e) => setAcctForm({ ...acctForm, code: e.target.value })} required />
                <CustomSelect value={acctForm.type} onChange={(val) => setAcctForm({ ...acctForm, type: val })} options={ACCOUNT_TYPES} />
              </div>
              <input className="input" placeholder="Account name" value={acctForm.name} onChange={(e) => setAcctForm({ ...acctForm, name: e.target.value })} required />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowAccounts(false)}>Close</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Delete Entry</h3>
            <p className="mt-3 text-sm text-slate-600">Delete journal entry <strong>{deleting.description}</strong>?</p>
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
