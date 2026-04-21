import { useEffect, useState } from 'react';
import { Plus, X, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const SEVERITY_COLORS = {
  low:      'bg-blue-500/20 text-blue-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  high:     'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const STATUS_COLORS = {
  investigating: 'bg-red-500/20 text-red-400',
  identified:    'bg-orange-500/20 text-orange-400',
  monitoring:    'bg-yellow-500/20 text-yellow-400',
  resolved:      'bg-emerald-500/20 text-emerald-400',
};

const emptyForm = { title: '', severity: 'medium', description: '', affected_components: '' };

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [expanded, setExpanded]   = useState(null);
  const [timeline, setTimeline]   = useState({});
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [loading, setLoading]     = useState(true);

  const load = () => api.get('/incidents').then(r => setIncidents(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const create = async () => {
    if (!form.title.trim()) return alert('Title required');
    try {
      const r = await api.post('/incidents', form);
      setIncidents(i => [r.data, ...i]);
      setForm(emptyForm); setModal(false);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const expand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const r = await api.get(`/incidents/${id}`);
    setTimeline(t => ({ ...t, [id]: r.data.timeline }));
  };

  const addUpdate = async (id) => {
    if (!updateMsg.trim()) return;
    const r = await api.post(`/incidents/${id}/update`, { message: updateMsg, status: updateStatus || undefined });
    setTimeline(t => ({ ...t, [id]: [...(t[id] || []), r.data] }));
    if (updateStatus) setIncidents(i => i.map(x => x.id === id ? { ...x, status: updateStatus } : x));
    setUpdateMsg(''); setUpdateStatus('');
  };

  const resolve = async (id) => {
    if (!confirm('Mark as resolved?')) return;
    const r = await api.put(`/incidents/${id}/resolve`);
    setIncidents(i => i.map(x => x.id === id ? r.data : x));
  };

  if (loading) return <div className="text-gray-400">Loading incidents...</div>;

  const open = incidents.filter(i => i.status !== 'resolved');
  const resolved = incidents.filter(i => i.status === 'resolved');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Incident Management</h2>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm">
          <Plus size={16} /> New Incident
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Active Incidents</p>
          <p className="text-2xl font-bold text-red-400">{open.length}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-orange-400">{open.filter(i => i.severity === 'critical').length}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Resolved (total)</p>
          <p className="text-2xl font-bold text-emerald-400">{resolved.length}</p>
        </div>
      </div>

      {/* Active */}
      {open.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Active Incidents ({open.length})
          </h3>
          <div className="space-y-3">
            {open.map(i => <IncidentCard key={i.id} incident={i} expanded={expanded === i.id} timeline={timeline[i.id] || []} onExpand={() => expand(i.id)} onResolve={resolve} updateMsg={updateMsg} setUpdateMsg={setUpdateMsg} updateStatus={updateStatus} setUpdateStatus={setUpdateStatus} onAddUpdate={addUpdate} />)}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle size={14} /> Resolved ({resolved.length})
          </h3>
          <div className="space-y-3">
            {resolved.slice(0, 10).map(i => <IncidentCard key={i.id} incident={i} expanded={expanded === i.id} timeline={timeline[i.id] || []} onExpand={() => expand(i.id)} onResolve={resolve} updateMsg={updateMsg} setUpdateMsg={setUpdateMsg} updateStatus={updateStatus} setUpdateStatus={setUpdateStatus} onAddUpdate={addUpdate} />)}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">New Incident</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. API downtime"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Severity</label>
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is happening?" rows={3}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Affected Components</label>
                <input value={form.affected_components} onChange={e => setForm(f => ({ ...f, affected_components: e.target.value }))}
                  placeholder="e.g. API, Database"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={create} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium">Create Incident</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentCard({ incident: i, expanded, timeline, onExpand, onResolve, updateMsg, setUpdateMsg, updateStatus, setUpdateStatus, onAddUpdate }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white">{i.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[i.severity] || 'bg-gray-500/20 text-gray-400'}`}>{i.severity}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status] || 'bg-gray-500/20 text-gray-400'}`}>{i.status}</span>
          </div>
          {i.description && <p className="text-xs text-gray-400 mb-1">{i.description}</p>}
          {i.affected_components && <p className="text-xs text-gray-500">Affected: {i.affected_components}</p>}
          <p className="text-xs text-gray-600 mt-1">{format(new Date(i.created_at), 'dd MMM yyyy HH:mm')}</p>
        </div>
        <div className="flex gap-2 ml-3 shrink-0">
          {i.status !== 'resolved' && (
            <button onClick={() => onResolve(i.id)} className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded-lg">Resolve</button>
          )}
          <button onClick={onExpand} className="text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
          <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase flex items-center gap-1"><Clock size={11} /> Timeline</h4>
          <div className="space-y-2 mb-3">
            {timeline.length === 0 && <p className="text-xs text-gray-500">No updates yet.</p>}
            {timeline.map(u => (
              <div key={u.id} className="flex gap-2 text-xs">
                <span className="text-gray-600 shrink-0">{format(new Date(u.created_at), 'HH:mm')}</span>
                {u.status && <span className={`px-1.5 rounded ${STATUS_COLORS[u.status] || ''} shrink-0`}>{u.status}</span>}
                <span className="text-gray-300">{u.message}</span>
              </div>
            ))}
          </div>
          {i.status !== 'resolved' && (
            <div className="flex gap-2">
              <input value={updateMsg} onChange={e => setUpdateMsg(e.target.value)} placeholder="Add update..."
                className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"/>
              <select value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                <option value="">Status...</option>
                <option value="investigating">Investigating</option>
                <option value="identified">Identified</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
              <button onClick={() => onAddUpdate(i.id)} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg">Post</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
