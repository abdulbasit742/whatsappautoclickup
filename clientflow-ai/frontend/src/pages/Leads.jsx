import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Target, Plus, Edit2, Trash2, ChevronRight, TrendingUp, Star, UserCheck } from 'lucide-react';

const STAGE_COLORS = {
  new: 'text-gray-400 bg-gray-400/10',
  contacted: 'text-blue-400 bg-blue-400/10',
  qualified: 'text-cyan-400 bg-cyan-400/10',
  proposal: 'text-yellow-400 bg-yellow-400/10',
  negotiation: 'text-orange-400 bg-orange-400/10',
  won: 'text-emerald-400 bg-emerald-400/10',
  lost: 'text-red-400 bg-red-400/10',
};

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ client_id: '', title: '', source: 'manual', stage: 'new', value_pkr: '', assigned_to: '', notes: '' });
  const [aiScoring, setAiScoring] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchStats();
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
    api.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, [filter, search]);

  async function fetchLeads() {
    try {
      const params = {};
      if (filter) params.stage = filter;
      if (search) params.search = search;
      const r = await api.get('/leads', { params });
      setLeads(r.data);
    } catch {}
  }

  async function fetchStats() {
    try { const r = await api.get('/leads/stats/summary'); setStats(r.data); } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/leads/${editing.id}`, form);
      } else {
        await api.post('/leads', form);
      }
      setShowForm(false); setEditing(null);
      setForm({ client_id: '', title: '', source: 'manual', stage: 'new', value_pkr: '', assigned_to: '', notes: '' });
      fetchLeads(); fetchStats();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  }

  async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return;
    await api.delete(`/leads/${id}`);
    fetchLeads(); fetchStats();
  }

  async function scoreWithAI(lead) {
    setAiScoring(lead.id);
    try {
      const r = await api.post('/ai/score-lead', { clientId: lead.client_id, leadId: lead.id });
      alert(`Lead Score: ${r.data.score}/100\nReason: ${r.data.reason}\nNext Action: ${r.data.next_action}`);
      fetchLeads();
    } catch {}
    finally { setAiScoring(null); }
  }

  function startEdit(lead) {
    setEditing(lead);
    setForm({ client_id: lead.client_id, title: lead.title || '', source: lead.source || 'manual', stage: lead.stage, value_pkr: lead.value_pkr || '', assigned_to: lead.assigned_to || '', follow_up_status: lead.follow_up_status, payment_status: lead.payment_status, issue_status: lead.issue_status, notes: lead.notes || '' });
    setShowForm(true);
  }

  const totalValue = leads.reduce((s, l) => s + (parseFloat(l.value_pkr) || 0), 0);
  const wonLeads = leads.filter(l => l.stage === 'won').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="text-emerald-400" size={22} />
          <h1 className="text-xl font-bold">Leads</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus size={16} /> New Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-white">{leads.length}</div>
          <div className="text-gray-400 text-sm">Total Leads</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-emerald-400">{wonLeads}</div>
          <div className="text-gray-400 text-sm">Won</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-yellow-400">PKR {(totalValue / 1000).toFixed(0)}K</div>
          <div className="text-gray-400 text-sm">Pipeline Value</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-blue-400">{leads.length ? Math.round(wonLeads / leads.length * 100) : 0}%</div>
          <div className="text-gray-400 text-sm">Win Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 flex-1" />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-emerald-500/30 mb-6">
          <h3 className="font-semibold mb-4">{editing ? 'Edit Lead' : 'New Lead'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Client</label>
              <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Lead Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Website Design Project"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Source</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                {['whatsapp', 'website', 'referral', 'manual', 'campaign', 'social'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Stage</label>
              <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Value (PKR)</label>
              <input value={form.value_pkr} onChange={e => setForm({ ...form, value_pkr: e.target.value })} type="number"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Assigned To</label>
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 rounded-lg border border-[#333] text-sm hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-semibold">
                {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-400">
              <th className="text-left p-4">Lead</th>
              <th className="text-left p-4">Stage</th>
              <th className="text-left p-4">Value</th>
              <th className="text-left p-4">Score</th>
              <th className="text-left p-4">Assigned</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                <td className="p-4">
                  <div className="font-medium">{l.title || 'Untitled Lead'}</div>
                  <div className="text-gray-500 text-xs">{l.client_name || l.whatsapp_number}</div>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STAGE_COLORS[l.stage]}`}>
                    {l.stage}
                  </span>
                </td>
                <td className="p-4 text-gray-300">
                  {l.value_pkr ? `PKR ${Number(l.value_pkr).toLocaleString()}` : '—'}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${l.lead_score || 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{l.lead_score || 0}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-400 text-xs">{l.assigned_name || '—'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => scoreWithAI(l)} disabled={aiScoring === l.id}
                      className="p-1.5 hover:text-yellow-400 text-gray-500" title="AI Score">
                      {aiScoring === l.id ? '...' : <Star size={14} />}
                    </button>
                    <button onClick={() => startEdit(l)} className="p-1.5 hover:text-emerald-400 text-gray-500">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteLead(l.id)} className="p-1.5 hover:text-red-400 text-gray-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!leads.length && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No leads found. Add your first lead.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
