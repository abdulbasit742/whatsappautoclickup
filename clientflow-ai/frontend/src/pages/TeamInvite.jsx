import { useState, useEffect } from 'react';
import { Mail, UserPlus, RotateCcw, Trash2, Copy, Check, Shield, Users } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const ROLES = ['admin', 'manager', 'member', 'viewer'];
const ROLE_COLORS = { admin: 'text-purple-400', manager: 'text-blue-400', member: 'text-emerald-400', viewer: 'text-gray-400' };
const ORG_ID = 'demo-org'; // In production, from auth context

export default function TeamInvite() {
  const { showToast } = useToast();
  const [invites, setInvites] = useState([]);
  const [members, setMembers] = useState([]);
  const [seats, setSeats] = useState({});
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  async function load() {
    try {
      const [inv, mem, s] = await Promise.all([
        api.get(`/orgs/${ORG_ID}/invites`).then(r => r.data),
        api.get(`/orgs/${ORG_ID}/members`).then(r => r.data),
        api.get(`/orgs/${ORG_ID}/seats`).then(r => r.data),
      ]);
      setInvites(inv);
      setMembers(mem);
      setSeats(s);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function sendInvite(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await api.post(`/orgs/${ORG_ID}/invites`, { email, role });
      showToast('Invite sent!', 'success');
      setEmail('');
      load();
      copyLink(res.data.invite_link);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send invite', 'error');
    }
    setLoading(false);
  }

  async function resend(id) {
    try {
      const res = await api.post(`/orgs/${ORG_ID}/invites/${id}/resend`);
      showToast('Invite resent!', 'success');
      copyLink(res.data.invite_link);
      load();
    } catch { showToast('Failed to resend', 'error'); }
  }

  async function revoke(id) {
    try {
      await api.delete(`/orgs/${ORG_ID}/invites/${id}`);
      showToast('Invite revoked', 'success');
      load();
    } catch { showToast('Failed to revoke', 'error'); }
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(link);
    setTimeout(() => setCopied(null), 2000);
  }

  const statusColor = { pending: 'text-yellow-400 bg-yellow-500/10', accepted: 'text-emerald-400 bg-emerald-500/10', revoked: 'text-red-400 bg-red-500/10', expired: 'text-gray-500 bg-gray-500/10' };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Team & Invites</h1>

      {/* Seat usage bar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Seat Usage — <span className="text-white">{seats.plan_name}</span> plan</span>
          <span className="text-sm font-medium text-white">{seats.used} / {seats.total} used</span>
        </div>
        {seats.total !== 'unlimited' && (
          <div className="w-full bg-[#2a2a2a] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${seats.at_limit ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, ((seats.used + seats.pending) / seats.total) * 100)}%` }}
            />
          </div>
        )}
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span><span className="text-white">{seats.used}</span> members</span>
          <span><span className="text-yellow-400">{seats.pending}</span> pending</span>
          <span><span className="text-emerald-400">{seats.available}</span> available</span>
        </div>
        {seats.at_limit && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 flex items-center gap-2">
            <Shield size={14} />
            Seat limit reached. <a href="/billing" className="underline hover:text-amber-300">Upgrade plan</a> to invite more team members.
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><UserPlus size={16} /> Invite by Email</h2>
        <form onSubmit={sendInvite} className="flex gap-3 flex-wrap">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 min-w-[220px] bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            required
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
          <button
            type="submit"
            disabled={loading || seats.at_limit}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Mail size={14} /> {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Pending invites */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Pending Invites ({invites.filter(i=>i.status==='pending').length})</h2>
        {invites.length === 0 ? (
          <p className="text-gray-500 text-sm">No invites sent yet.</p>
        ) : (
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between bg-[#222] border border-[#2a2a2a] rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs text-gray-400">
                    {inv.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-white">{inv.email}</div>
                    <div className={`text-xs font-medium ${ROLE_COLORS[inv.role]}`}>{inv.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[inv.status] || 'text-gray-400'}`}>
                    {inv.status}
                  </span>
                  {inv.status === 'pending' && (
                    <>
                      <button onClick={() => resend(inv.id)} className="text-gray-400 hover:text-white transition-colors" title="Resend">
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => copyLink(`${window.location.origin}/invite/${inv.token}`)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Copy invite link"
                      >
                        {copied === `${window.location.origin}/invite/${inv.token}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                      <button onClick={() => revoke(inv.id)} className="text-gray-400 hover:text-red-400 transition-colors" title="Revoke">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current members */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Users size={16} /> Members ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm">No members found.</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-[#222] border border-[#2a2a2a] rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">
                    {(m.full_name || m.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-white">{m.full_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </div>
                </div>
                <span className={`text-xs font-medium ${ROLE_COLORS[m.role]}`}>{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
