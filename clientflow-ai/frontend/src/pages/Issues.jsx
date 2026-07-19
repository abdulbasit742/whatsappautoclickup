import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Filter, Clock } from 'lucide-react';
import api from '../utils/api';

const PRIORITIES = ['low','medium','high','critical'];
const STATUSES   = ['open','in_progress','resolved','closed'];
const P_COLORS   = { low: 'bg-gray-500/20 text-gray-400', medium: 'bg-yellow-500/20 text-yellow-400', high: 'bg-orange-500/20 text-orange-400', critical: 'bg-red-500/20 text-red-400' };
const S_COLORS   = { open: 'text-red-400', in_progress: 'text-yellow-400', resolved: 'text-emerald-400', closed: 'text-gray-400' };

export default function Issues() {
  const [issues, setIssues]     = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShow]   = useState(false);
  const [form, setForm]         = useState({ title: '', description: '', priority: 'medium', sla_hours: 24 });
  const [filter, setFilter]     = useState({ status: '', priority: '' });

  const load = async () => {
    const params = new URLSearchParams(filter).toString();
    const [iss, st] = await Promise.all([
      api.get(`/issues?${params}`).then(r => r.data),
      api.get('/issues/sla/stats').then(r => r.data),
    ]);
    setIssues(iss);
    setStats(st);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [filter]);

  const createIssue = async () => {
    await api.post('/issues', form);
    setShow(false);
    setForm({ title: '', description: '', priority: 'medium', sla_hours: 24 });
    await load();
  };

  const updateStatus = async (id, status) => {
    await api.put(`/issues/${id}`, { status });
    setIssues(i => i.map(x => x.id === id ? { ...x, status } : x));
  };

  if (loading) return <div className="text-gray-400">Loading issues...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><AlertTriangle size={20} className="text-red-400" /> Issues & SLA</h2>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} /> New Issue
        </button>
      </div>

      {/* SLA Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open', value: stats.open_count, color: 'text-red-400' },
          { label: 'Breached', value: stats.breached_count, color: 'text-orange-400' },
          { label: 'Due Soon', value: stats.approaching_breach, color: 'text-yellow-400' },
          { label: 'Resolved', value: stats.resolved_count, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-sm px-3 py-1.5 rounded-lg outline-none">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-sm px-3 py-1.5 rounded-lg outline-none">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p} className="bg-[#1a1a1a]">{p}</option>)}
        </select>
      </div>

      {/* Issues list */}
      <div className="space-y-3">
        {issues.map(issue => {
          const breached = issue.sla_deadline && new Date(issue.sla_deadline) < new Date() && issue.status === 'open';
          return (
            <div key={issue.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${breached ? 'border-red-500/40' : 'border-[#2a2a2a]'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${P_COLORS[issue.priority]}`}>{issue.priority}</span>
                    {breached && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">SLA Breached</span>}
                    <span className="text-white font-medium text-sm">{issue.title}</span>
                  </div>
                  <p className="text-xs text-gray-500">{issue.description}</p>
                  {issue.client_name && <p className="text-xs text-gray-600 mt-1">Client: {issue.client_name}</p>}
                  {issue.sla_deadline && (
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <Clock size={10} /> SLA: {new Date(issue.sla_deadline).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <select value={issue.status} onChange={e => updateStatus(issue.id, e.target.value)}
                    className={`text-xs bg-transparent border-0 outline-none cursor-pointer ${S_COLORS[issue.status]}`}>
                    {STATUSES.map(s => <option key={s} value={s} className="bg-[#1a1a1a] text-white">{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
        {issues.length === 0 && <div className="text-center text-gray-500 py-10">No issues found.</div>}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-4">New Issue</h3>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Description" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none" />
              <div className="flex gap-3">
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="number" value={form.sla_hours} onChange={e => setForm(f => ({ ...f, sla_hours: +e.target.value }))} placeholder="SLA hours" className="w-28 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShow(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={createIssue} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
