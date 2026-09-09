import { useEffect, useState } from 'react';
import { CalendarDays, CalendarPlus, Check, Clock, Pencil, Trash2 } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';

export default function TermsPage() {
  const toast = useToast();
  const [terms, setTerms] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', startDate: '', endDate: '', activate: false });
  const [creating, setCreating] = useState(false);

  const [editingTerm, setEditingTerm] = useState(null);
  const [editForm, setEditForm] = useState({ code: '', label: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  const [deletingTerm, setDeletingTerm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    request({ url: '/catalog/terms' })
      .then((res) => setTerms(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await request({
        method: 'post',
        url: '/catalog/terms',
        data: {
          ...form,
          startDate: `${form.startDate}T00:00:00.000Z`,
          endDate: `${form.endDate}T23:59:59.000Z`,
          isActive: false,
          enrollmentOpen: false,
          activate: form.activate,
        },
      });
      toast.success(`Term "${form.label}" created.`);
      setShowCreate(false);
      setForm({ code: '', label: '', startDate: '', endDate: '', activate: false });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const setActive = async (term) => {
    try {
      await request({ method: 'patch', url: `/catalog/terms/${term.id}`, data: { isActive: true } });
      toast.success(`${term.label} is now the active term.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setEnrollment = async (term, enrollmentOpen) => {
    try {
      await request({ method: 'patch', url: `/catalog/terms/${term.id}`, data: { enrollmentOpen } });
      toast.success(`Enrollment ${enrollmentOpen ? 'opened' : 'closed'} for ${term.label}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEdit = (term) => {
    setEditingTerm(term);
    setEditForm({
      code: term.code,
      label: term.label,
      startDate: term.startDate ? new Date(term.startDate).toISOString().split('T')[0] : '',
      endDate: term.endDate ? new Date(term.endDate).toISOString().split('T')[0] : '',
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request({
        method: 'patch',
        url: `/catalog/terms/${editingTerm.id}`,
        data: {
          code: editForm.code,
          label: editForm.label,
          startDate: `${editForm.startDate}T00:00:00.000Z`,
          endDate: `${editForm.endDate}T23:59:59.000Z`,
        },
      });
      toast.success(`Term "${editForm.label}" updated.`);
      setEditingTerm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTerm) return;
    setDeleting(true);
    try {
      await request({ method: 'delete', url: `/catalog/terms/${deletingTerm.id}` });
      toast.success(`Term "${deletingTerm.label}" deleted.`);
      setDeletingTerm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!terms) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{terms.length}</span> terms
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setShowCreate(true)}>
          <CalendarPlus size={14} /> New term
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {terms.map((term) => (
          <section key={term.id} className={`card card-pad ${term.isActive ? 'ring-2 ring-accent-start/60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800">{term.label}</h3>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{term.code}</p>
              </div>
              <span className={`badge ${term.isActive ? 'badge-green' : 'badge-gray'}`}>
                {term.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays size={12} />
              {formatDate(term.startDate)} → {formatDate(term.endDate)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={12} />
              Enrollment {term.enrollmentOpen ? 'open' : 'closed'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {!term.isActive && (
                <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => setActive(term)}>
                  <Check size={12} /> Set active
                </button>
              )}
              <button
                className={`${term.enrollmentOpen ? 'btn-secondary' : 'btn-primary'} !px-3 !py-1 text-xs`}
                onClick={() => setEnrollment(term, !term.enrollmentOpen)}
              >
                {term.enrollmentOpen ? 'Close enrollment' : 'Open enrollment'}
              </button>
              <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => openEdit(term)}>
                <Pencil size={12} /> Edit
              </button>
              <button className="btn-secondary !px-3 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeletingTerm(term)}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </section>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Create academic term</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Code</label>
                  <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="AY-2026-2027-1S" required />
                </div>
                <div>
                  <label className="label">Label</label>
                  <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="AY 2026-2027 · 1st Sem" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start date</label>
                  <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="label">End date</label>
                  <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="size-4 accent-[#14437B]" checked={form.activate} onChange={(e) => setForm({ ...form, activate: e.target.checked })} />
                Activate this term immediately
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={creating}>
                  {creating ? 'Creating…' : 'Create term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setEditingTerm(null)}>
          <div className="w-full max-w-md rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Edit academic term</h3>
            <form onSubmit={handleEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Code</label>
                  <input className="input" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Label</label>
                  <input className="input" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start date</label>
                  <input className="input" type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="label">End date</label>
                  <input className="input" type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setEditingTerm(null)}>Cancel</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDeletingTerm(null)}>
          <div className="w-full max-w-sm rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Delete term</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong>{deletingTerm.label}</strong>? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setDeletingTerm(null)}>Cancel</button>
              <button className="btn-primary !px-3 !py-1.5 text-xs bg-red-600 hover:bg-red-700" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
