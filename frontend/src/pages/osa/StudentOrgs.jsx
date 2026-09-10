import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function StudentOrgs() {
  const toast = useToast();
  const [orgs, setOrgs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', adviser: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    request({ url: `/osa/orgs?page=${page}&limit=20` })
      .then((data) => { setOrgs(data.orgs); setTotal(data.total); })
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => { load(); }, [page]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', adviser: '' }); setShowForm(true); };
  const openEdit = (o) => { setEditing(o); setForm({ name: o.name, description: o.description ?? '', adviser: o.adviser ?? '' }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await request({ method: 'patch', url: `/osa/orgs/${editing.id}`, data: form });
        toast.success('Organization updated.');
      } else {
        await request({ method: 'post', url: '/osa/orgs', data: form });
        toast.success('Organization created.');
      }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await request({ method: 'delete', url: `/osa/orgs/${deleting.id}` });
      toast.success('Organization deleted.');
      setDeleting(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = orgs.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{total}</span> organizations
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={openCreate}><Plus size={14} /> New org</button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-8" placeholder="Search organization…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Organization</th><th>Adviser</th><th>Members</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No organizations found.</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <p className="font-medium">{o.name}</p>
                    {o.description && <p className="text-xs text-slate-400 max-w-[200px] truncate">{o.description}</p>}
                  </td>
                  <td className="text-xs">{o.adviser ?? '—'}</td>
                  <td className="text-xs font-semibold">{o._count.members}</td>
                  <td><span className={`badge ${o.isActive ? 'badge-green' : 'badge-gray'}`}>{o.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => openEdit(o)}><Pencil size={13} /></button>
                      <button className="btn-secondary !px-2 !py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => setDeleting(o)}><Trash2 size={13} /></button>
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
            <h3 className="text-base font-semibold text-slate-800">{editing ? 'Edit' : 'New'} Organization</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><label className="label">Adviser</label><input className="input" value={form.adviser} onChange={(e) => setForm({ ...form, adviser: e.target.value })} /></div>
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
            <h3 className="text-base font-semibold text-slate-800">Delete Organization</h3>
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
