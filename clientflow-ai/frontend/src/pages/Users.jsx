import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Users as UsersIcon, Plus, Edit2, Trash2, Key, Shield, UserCheck } from 'lucide-react';

const ROLE_COLORS = { admin: 'text-red-400 bg-red-400/10', agent: 'text-emerald-400 bg-emerald-400/10', viewer: 'text-blue-400 bg-blue-400/10' };

const ICON_COLORS = {
  admin: 'text-red-400',
  agent: 'text-emerald-400',
  viewer: 'text-blue-400',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'agent' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try { const r = await api.get('/users'); setUsers(r.data); } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, { name: form.name, role: form.role, is_active: true });
      } else {
        await api.post('/users', form);
      }
      setShowForm(false); setEditing(null);
      setForm({ email: '', name: '', password: '', role: 'agent' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    } finally { setLoading(false); }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  }

  async function resetPassword(id) {
    const pw = prompt('Enter new password:');
    if (!pw) return;
    await api.post(`/users/${id}/reset-password`, { password: pw });
    alert('Password reset!');
  }

  function startEdit(u) {
    setEditing(u);
    setForm({ email: u.email, name: u.name, password: '', role: u.role });
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="text-emerald-400" size={22} />
          <h1 className="text-xl font-bold">Users & Roles</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ email: '', name: '', password: '', role: 'agent' }); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-sm font-semibold transition">
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {['admin', 'agent', 'viewer'].map(role => (
          <div key={role} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <div className={`text-2xl font-bold ${ROLE_COLORS[role].split(' ')[0]}`}>
              {users.filter(u => u.role === role).length}
            </div>
            <div className="text-gray-400 text-sm capitalize mt-1">{role}s</div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-emerald-500/30 mb-6">
          <h3 className="font-semibold mb-4">{editing ? 'Edit User' : 'New User'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={!!editing} required type="email"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            {!editing && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Password</label>
                <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  required type="password" minLength={8}
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 rounded-lg border border-[#333] text-sm hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-semibold">
                {loading ? 'Saving...' : editing ? 'Update' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-400">
              <th className="text-left p-4">User</th>
              <th className="text-left p-4">Role</th>
              <th className="text-left p-4">Last Login</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{u.name || '—'}</div>
                      <div className="text-gray-500 text-xs">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => resetPassword(u.id)} className="p-1.5 hover:text-yellow-400 text-gray-500" title="Reset Password">
                      <Key size={14} />
                    </button>
                    <button onClick={() => startEdit(u)} className="p-1.5 hover:text-emerald-400 text-gray-500">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="p-1.5 hover:text-red-400 text-gray-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No users found. Add team members above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Role permissions info */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { role: 'Admin', icon: Shield, colorKey: 'admin', perms: ['Full access', 'User management', 'Settings', 'Billing', 'Delete records'] },
          { role: 'Agent', icon: UserCheck, colorKey: 'agent', perms: ['Clients & Leads', 'Inbox & Messages', 'Follow-ups', 'Campaigns', 'Analytics (view)'] },
          { role: 'Viewer', icon: UsersIcon, colorKey: 'viewer', perms: ['Read-only access', 'Dashboard', 'Analytics', 'Reports', 'No edits'] },
        ].map(({ role, icon: Icon, colorKey, perms }) => (
          <div key={role} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <div className={`flex items-center gap-2 mb-3 ${ICON_COLORS[colorKey]}`}>
              <Icon size={16} />
              <span className="font-semibold text-sm">{role}</span>
            </div>
            <ul className="space-y-1">
              {perms.map(p => <li key={p} className="text-xs text-gray-400">• {p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
