import { useEffect, useState } from 'react';
import { ShieldCheck, UserCog, UserPlus, KeyRound } from 'lucide-react';
import { request } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../lib/utils.js';

const ROLES = [
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'ACCOUNTING', label: 'Accounting' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'OSA', label: 'OSA' },
  { value: 'OHS', label: 'Health Services' },
  { value: 'CASHIERING', label: 'Cashiering' },
  { value: 'OSCD', label: 'Guidance & Counseling' },
  { value: 'FAASG', label: 'Financial Aids & Scholarships' },
];

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'FACULTY' });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  const load = () => request({ url: '/admin/users' }).then(setUsers).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const adminExists = Array.isArray(users) && users.some((u) => u.role === 'ADMIN');
  const creatableRoles = ROLES.filter((r) => r.value !== 'ADMIN' || !adminExists);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const data = await request({ method: 'post', url: '/admin/users', data: form });
      setCreated({ ...data.user, temporaryPassword: data.temporaryPassword });
      toast.success(`Account created for ${form.fullName}.`);
      setShowCreate(false);
      setForm({ fullName: '', email: '', role: 'FACULTY' });
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

      {created && (
        <div className="rounded-[15px] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <KeyRound size={16} />
            Account created - share the one-time password with {created.fullName}
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-800">{created.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-800">{created.role}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">One-time password</dt><dd className="font-mono font-bold text-primary-700">{created.temporaryPassword}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-emerald-700">
            The password is generated automatically and shown only once. The user must change it on first
            login. Save it before closing this notice.
          </p>
          <button className="btn-primary mt-3 !px-3 !py-1.5 text-xs" onClick={() => setCreated(null)}>Got it</button>
        </div>
      )}

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
                {form.role === 'FACULTY' && (
                  <p className="mt-1 text-xs text-slate-400">Faculty uses their school email, e.g. jose.santos@dorsu.edu.ph</p>
                )}
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {creatableRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  A secure one-time password is generated automatically and shown after creation.
                </p>
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
    case 'ACCOUNTING':
    case 'CASHIERING':
    case 'FAASG': return 'badge-orange';
    case 'ADMISSION': return 'badge-blue';
    case 'OSA':
    case 'OSCD': return 'badge-purple';
    case 'OHS': return 'badge-amber';
    default: return 'badge-gray';
  }
}