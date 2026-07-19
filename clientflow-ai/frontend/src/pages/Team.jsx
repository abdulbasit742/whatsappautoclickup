import { useEffect, useState } from 'react';
import { Users, UserPlus, Shield, Activity, MoreVertical, X, Check, Clock } from 'lucide-react';
import api from '../utils/api';

const ROLES = ['super_admin','org_admin','manager','agent','support','viewer'];
const ROLE_COLORS = {
  super_admin: 'bg-purple-500/20 text-purple-400',
  org_admin:   'bg-blue-500/20 text-blue-400',
  manager:     'bg-emerald-500/20 text-emerald-400',
  agent:       'bg-yellow-500/20 text-yellow-400',
  support:     'bg-orange-500/20 text-orange-400',
  viewer:      'bg-gray-500/20 text-gray-400',
};

export default function Team() {
  const [members, setMembers]       = useState([]);
  const [performance, setPerf]      = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite]         = useState({ email: '', name: '', role: 'agent' });
  const [inviteLink, setInviteLink] = useState('');
  const [activeTab, setActiveTab]   = useState('members');

  const load = async () => {
    const [m, p] = await Promise.all([
      api.get('/team').then(r => r.data),
      api.get('/team/performance').then(r => r.data),
    ]);
    setMembers(m);
    setPerf(p);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const sendInvite = async () => {
    try {
      const r = await api.post('/team/invite', invite);
      setInviteLink(r.data.invite_link);
      await load();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const updateRole = async (id, role) => {
    await api.put(`/team/${id}/role`, { role });
    setMembers(m => m.map(x => x.id === id ? { ...x, role } : x));
  };

  const toggleStatus = async (id, status) => {
    await api.put(`/team/${id}/status`, { status });
    setMembers(m => m.map(x => x.id === id ? { ...x, status } : x));
  };

  const resetPassword = async (id) => {
    const r = await api.post(`/team/${id}/reset-password`);
    alert('Reset link: ' + r.data.reset_link);
  };

  if (loading) return <div className="text-gray-400">Loading team...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Team Management</h2>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <UserPlus size={15} /> Invite Member
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['members','performance'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${activeTab === t ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Member','Role','Status','Last Active','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-xs">
                        {(m.name || m.email)?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{m.name || '—'}</div>
                        <div className="text-gray-500 text-xs">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={m.role}
                      onChange={e => updateRole(m.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${ROLE_COLORS[m.role] || 'bg-gray-500/20 text-gray-400'}`}
                    >
                      {ROLES.map(r => <option key={r} value={r} className="bg-[#1a1a1a] text-white">{r.replace('_',' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : m.status === 'invited' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleStatus(m.id, m.status === 'active' ? 'inactive' : 'active')}
                        className={`text-xs px-2 py-1 rounded-lg ${m.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {m.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => resetPassword(m.id)} className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400">Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {performance.map(p => (
            <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  {(p.name || p.email)?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{p.name || p.email}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[p.role]}`}>{p.role?.replace('_',' ')}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#111] rounded-lg p-2 text-center">
                  <div className="text-emerald-400 font-bold text-lg">{p.issues_resolved || 0}</div>
                  <div className="text-gray-500 text-xs">Resolved</div>
                </div>
                <div className="bg-[#111] rounded-lg p-2 text-center">
                  <div className="text-yellow-400 font-bold text-lg">{p.issues_open || 0}</div>
                  <div className="text-gray-500 text-xs">Open Issues</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Invite Team Member</h3>
              <button onClick={() => { setShowInvite(false); setInviteLink(''); }} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            {!inviteLink ? (
              <div className="space-y-3">
                <input value={invite.email} onChange={e => setInvite(v => ({ ...v, email: e.target.value }))}
                  placeholder="Email address" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
                <input value={invite.name} onChange={e => setInvite(v => ({ ...v, name: e.target.value }))}
                  placeholder="Full name (optional)" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
                <select value={invite.role} onChange={e => setInvite(v => ({ ...v, role: e.target.value }))}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
                <button onClick={sendInvite} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">
                  Send Invite
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Check size={40} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-medium mb-2">Invite sent!</p>
                <div className="bg-[#111] rounded-lg p-3 text-xs text-gray-400 break-all">{window.location.origin}{inviteLink}</div>
                <button onClick={() => { setShowInvite(false); setInviteLink(''); }} className="mt-4 w-full bg-[#2a2a2a] text-white py-2 rounded-lg text-sm">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
