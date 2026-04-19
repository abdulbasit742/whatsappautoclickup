import { useEffect, useState } from 'react';
import {
  AlertOctagon, Plus, X, Loader2, CheckCircle2, AlertTriangle,
  Clock, User, MessageSquare, Filter,
} from 'lucide-react';
import api from '../utils/api';

const SEVERITY = {
  low:      { label: 'Low',      color: 'bg-gray-500/20 text-gray-400' },
  medium:   { label: 'Medium',   color: 'bg-yellow-500/20 text-yellow-400' },
  high:     { label: 'High',     color: 'bg-orange-500/20 text-orange-400' },
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400' },
};

const STATUS = {
  open:       { label: 'Open',       color: 'bg-blue-500/20 text-blue-400' },
  in_progress:{ label: 'In Progress',color: 'bg-yellow-500/20 text-yellow-400' },
  resolved:   { label: 'Resolved',   color: 'bg-emerald-500/20 text-emerald-400' },
  closed:     { label: 'Closed',     color: 'bg-gray-500/20 text-gray-400' },
};

const empty = { title: '', description: '', severity: 'medium', status: 'open', client_id: '' };

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = () =>
    Promise.all([
      api.get('/issues').then((r) => setIssues(r.data)).catch(() => {}),
      api.get('/clients').then((r) => setClients(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/issues/${form.id}`, form);
      } else {
        await api.post('/issues', form);
      }
      await load();
      setShowForm(false);
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (id) => {
    await api.put(`/issues/${id}`, { status: 'resolved' });
    load();
  };

  const filtered =
    filterStatus === 'all' ? issues : issues.filter((i) => i.status === filterStatus);

  const openCount = issues.filter((i) => i.status === 'open').length;
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertOctagon size={22} className="text-red-400" />
          <h2 className="text-xl font-bold text-white">Issues & Tickets</h2>
          {openCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {openCount} open
            </span>
          )}
        </div>
        <button
          onClick={() => { setForm(empty); setShowForm(true); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> New Issue
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS).map(([key, s]) => {
          const count = issues.filter((i) => i.status === key).length;
          return (
            <div key={key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{count}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', ...Object.keys(STATUS)].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterStatus === s
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a] hover:text-white'
            }`}
          >
            {s === 'all' ? 'All' : STATUS[s]?.label}
          </button>
        ))}
      </div>

      {/* Issues Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <AlertOctagon size={36} className="mb-3 opacity-30" />
          <p>No issues found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((issue) => {
            const sev = SEVERITY[issue.severity] || SEVERITY.medium;
            const stat = STATUS[issue.status] || STATUS.open;
            return (
              <div
                key={issue.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 hover:border-[#3a3a3a] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{issue.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sev.color}`}>{sev.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${stat.color}`}>{stat.label}</span>
                    </div>
                    {issue.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{issue.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      {issue.client_name && (
                        <span className="flex items-center gap-1">
                          <User size={10} /> {issue.client_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {issue.status !== 'resolved' && issue.status !== 'closed' && (
                    <button
                      onClick={() => resolve(issue.id)}
                      className="shrink-0 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Create Issue</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Severity</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {Object.keys(SEVERITY).map((k) => (
                      <option key={k} value={k}>{SEVERITY[k].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Client</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2.5 rounded-xl text-sm">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !form.title}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
