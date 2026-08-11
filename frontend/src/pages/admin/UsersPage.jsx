import { useEffect, useState } from 'react';
import { ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';

const ROLES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'ADMIN', label: 'Administrator' },
];

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'FACULTY', defaultPassword: '' });
  const [creating, setCreating] = useState(false);

  const load = () => request({ url: '/admin/users' }).then(setUsers).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await request({ method: 'post', url: '/admin/users', data: form });
      toast.success(`Account created for ${form.fullName}.`);
      setShowCreate(false);
      setForm({ fullName: '', email: '', role: 'FACULTY', defaultPassword: '' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (user) => {
    try {
      await request({ method: 'patch', url: `/admin/users/${user.id}/status`, data: { isActive: !user.isActive } });
      toast.success(`${user.fullName} ${user.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (error) return <div className="rounded-[15px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!users) return <div className="h-64 animate-pulse rounded-[15px] bg-slate-100" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck size={15} className="text-primary-600" />
          <span className="font-semibold text-slate-700">{users.length}</span> accounts
        </div>
        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setShowCreate(true)}>
          <UserPlus size={14} /> New user
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td>
                    <span className={`badge ${roleTone(u.role)}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-xs">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                  <td className="text-xs">{formatDate(u.createdAt)}</td>
                  <td className="text-right">
                    {u.role !== 'ADMIN' && (
                      <button className="btn-secondary !px-3 !py-1 text-xs" onClick={() => toggleStatus(u)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-[15px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <UserCog size={17} className="text-primary-600" /> Create user account
            </h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.filter((r) => r.value !== 'STUDENT').map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Temp password</label>
                  <input
                    className="input"
                    type="text"
                    value={form.defaultPassword}
                    onChange={(e) => setForm({ ...form, defaultPassword: e.target.value })}
                    placeholder="min 10 chars"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={creating}>
                  {creating ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function roleTone(role) {
  switch (role) {
    case 'ADMIN': return 'badge-purple';
    case 'REGISTRAR': return 'badge-orange';
    case 'FACULTY': return 'badge-blue';
    default: return 'badge-gray';
  }
}