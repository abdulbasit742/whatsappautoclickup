import { useEffect, useState } from 'react';
import { Users, MessageSquare, CheckCircle, TrendingUp, Clock, RefreshCw, Plus, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const TOOLTIP_STYLE = { contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 } };

export default function TeamPerformance() {
  const [members, setMembers]   = useState([]);
  const [perf, setPerf]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [days, setDays]         = useState(30);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', role: 'agent', skills: '', max_load: 20 });

  const load = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([
        api.get('/team'),
        api.get('/team/performance', { params: { days } }),
      ]);
      setMembers(m.data);
      setPerf(p.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  const addMember = async () => {
    if (!form.name || !form.email) return;
    await api.post('/team', { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) });
    setAdding(false);
    setForm({ name: '', email: '', role: 'agent', skills: '', max_load: 20 });
    load();
  };

  const totals = perf.reduce((acc, m) => ({
    messages: acc.messages + Number(m.messages_handled || 0),
    resolved: acc.resolved + Number(m.resolved_issues || 0),
    deals:    acc.deals    + Number(m.closed_deals    || 0),
  }), { messages: 0, resolved: 0, deals: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Team Performance</h2>
        <div className="flex gap-2">
          <select
            value={days} onChange={e => setDays(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setAdding(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <Plus size={14} /> Add Member
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Team Members"    value={members.length}    icon={Users}          color="emerald" />
        <StatCard title="Messages Handled" value={totals.messages}  icon={MessageSquare}  color="blue" />
        <StatCard title="Issues Resolved" value={totals.resolved}   icon={CheckCircle}    color="yellow" />
        <StatCard title="Deals Closed"    value={totals.deals}      icon={TrendingUp}     color="purple" />
      </div>

      {/* Chart */}
      {perf.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Messages Handled by Agent</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={perf}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="messages_handled" fill="#10b981" radius={[4, 4, 0, 0]} name="Messages" />
              <Bar dataKey="resolved_issues" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Agent', 'Role', 'Messages', 'Avg Resp.', 'Resolved', 'Deals', 'Follow-ups'].map(h => (
                <th key={h} className="text-left text-xs text-gray-500 px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : perf.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">No team members yet. Add members to track performance.</td></tr>
            ) : perf.map(m => (
              <tr key={m.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                      {m.name[0].toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">{m.role}</td>
                <td className="px-4 py-3 text-white font-medium">{m.messages_handled || 0}</td>
                <td className="px-4 py-3 text-gray-400">{m.avg_response_time ? `${Math.round(m.avg_response_time)}s` : '—'}</td>
                <td className="px-4 py-3 text-white">{m.resolved_issues || 0}</td>
                <td className="px-4 py-3 text-emerald-400 font-medium">{m.closed_deals || 0}</td>
                <td className="px-4 py-3 text-gray-400">{m.followups_done || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add member modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Add Team Member</h3>
              <button onClick={() => setAdding(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {[['Name', 'name', 'text'], ['Email', 'email', 'email']].map(([label, field, type]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Skills (comma-separated)</label>
                <input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                  placeholder="sales, support, billing"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addMember} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Add</button>
              <button onClick={() => setAdding(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
