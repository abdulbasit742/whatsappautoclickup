import { useEffect, useState } from 'react';
import { Shield, Users, CheckCircle, XCircle, Plus } from 'lucide-react';
import api from '../utils/api';

const ROLES      = ['super_admin', 'admin', 'manager', 'agent', 'viewer'];
const FEATURES   = ['clients', 'payments', 'analytics', 'broadcasts', 'templates', 'settings', 'permissions', 'provisioning', 'gdpr', 'monitoring', 'ai', 'segments', 'campaigns'];
const ACTIONS    = ['read', 'write', 'delete', 'export'];
const ROLE_COLORS = { super_admin: 'text-red-400', admin: 'text-orange-400', manager: 'text-yellow-400', agent: 'text-blue-400', viewer: 'text-gray-400' };

export default function Permissions() {
  const [data, setData]           = useState({ roles: [], users: [] });
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('matrix');
  const [assignForm, setAssignForm] = useState({ userId: '', role: 'agent' });
  const [selectedRole, setSelectedRole] = useState('admin');

  useEffect(() => {
    api.get('/permissions').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const assignRole = async () => {
    if (!assignForm.userId) return alert('User ID required');
    await api.post('/permissions/assign', assignForm);
    alert('Role assigned!');
    const r = await api.get('/permissions');
    setData(r.data);
  };

  const roleData = data.roles.find(r => r.role === selectedRole);

  if (loading) return <div className="text-emerald-400 animate-pulse">Loading permissions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield size={20} className="text-emerald-400" /> Permission Management</h2>
        <div className="flex gap-2">
          {['matrix', 'users', 'assign'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'matrix' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-4">
            <span className="text-sm text-gray-400">Role:</span>
            <div className="flex gap-2">
              {ROLES.map(role => (
                <button key={role} onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize ${selectedRole === role ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>
                  {role.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-gray-400">Feature</th>
                  {ACTIONS.map(a => <th key={a} className="px-4 py-3 text-gray-400 capitalize">{a}</th>)}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(feature => (
                  <tr key={feature} className="border-b border-[#1f1f1f] hover:bg-white/5">
                    <td className="px-4 py-3 text-white capitalize">{feature}</td>
                    {ACTIONS.map(action => {
                      const allowed = roleData?.permissions?.[feature]?.includes(action);
                      return (
                        <td key={action} className="px-4 py-3 text-center">
                          {allowed
                            ? <CheckCircle size={14} className="text-emerald-400 mx-auto" />
                            : <XCircle    size={14} className="text-gray-600 mx-auto" />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h3 className="font-semibold text-white flex items-center gap-2"><Users size={16} className="text-emerald-400" /> Users &amp; Roles ({data.users.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-gray-400">Name</th>
                <th className="text-left px-4 py-3 text-gray-400">Email</th>
                <th className="text-left px-4 py-3 text-gray-400">Role</th>
                <th className="text-left px-4 py-3 text-gray-400">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id} className="border-b border-[#1f1f1f] hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${ROLE_COLORS[u.role] || 'text-gray-400'}`}>{(u.role || 'unassigned').replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.assigned_at ? new Date(u.assigned_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-md">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Plus size={16} className="text-emerald-400" /> Assign Role</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">User ID</label>
              <input value={assignForm.userId} onChange={e => setAssignForm(p => ({ ...p, userId: e.target.value }))}
                placeholder="UUID of user"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Role</label>
              <select value={assignForm.role} onChange={e => setAssignForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
            <button onClick={assignRole} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
              Assign Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
