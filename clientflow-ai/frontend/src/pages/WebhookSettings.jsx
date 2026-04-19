import { useEffect, useState } from 'react';
import { Webhook, Plus, Trash2, Play, FileText } from 'lucide-react';
import api from '../utils/api';

const EVENTS = ['contact.created','message.received','campaign.completed','issue.created','payment.received'];

export default function WebhookSettings() {
  const [webhooks, setWh]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShow] = useState(false);
  const [logs, setLogs]       = useState(null);
  const [form, setForm]       = useState({ name: '', url: '', events: [] });
  const [testing, setTesting] = useState('');

  const load = () => api.get('/webhook-engine').then(r => setWh(r.data));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const create = async () => {
    await api.post('/webhook-engine', form);
    setShow(false);
    setForm({ name: '', url: '', events: [] });
    await load();
  };

  const del = async (id) => { await api.delete(`/webhook-engine/${id}`); setWh(w => w.filter(x => x.id !== id)); };

  const test = async (id) => {
    setTesting(id);
    await api.post(`/webhook-engine/${id}/test`).catch(() => {});
    setTesting('');
  };

  const loadLogs = async (id) => {
    const r = await api.get(`/webhook-engine/${id}/logs`);
    setLogs({ id, items: r.data });
  };

  const toggleEvent = (ev) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  if (loading) return <div className="text-gray-400">Loading webhooks...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">⚡ Webhook Engine</h2>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} /> New Webhook
        </button>
      </div>

      <div className="space-y-4">
        {webhooks.map(wh => (
          <div key={wh.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{wh.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${wh.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>{wh.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{wh.url}</p>
                <div className="flex gap-1 flex-wrap mt-2">
                  {wh.events?.map(e => <span key={e} className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{e}</span>)}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => test(wh.id)} disabled={testing === wh.id} className="text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-2 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                  <Play size={10}/> Test
                </button>
                <button onClick={() => loadLogs(wh.id)} className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-1.5 rounded-lg flex items-center gap-1 hover:text-white">
                  <FileText size={10}/> Logs
                </button>
                <button onClick={() => del(wh.id)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={13}/></button>
              </div>
            </div>
          </div>
        ))}
        {webhooks.length === 0 && <div className="text-center text-gray-500 py-12">No webhooks configured.</div>}
      </div>

      {/* Logs panel */}
      {logs && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-white">Webhook Logs</h3>
            <button onClick={() => setLogs(null)} className="text-xs text-gray-500">✕ Close</button>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-[#2a2a2a]">{['Event','Status','HTTP','Attempt','Time'].map(h => <th key={h} className="text-left px-3 py-2 text-gray-400">{h}</th>)}</tr></thead>
              <tbody>
                {logs.items.map(l => (
                  <tr key={l.id} className="border-b border-[#1e1e1e]">
                    <td className="px-3 py-2 text-gray-300">{l.event}</td>
                    <td className={`px-3 py-2 ${l.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{l.status}</td>
                    <td className="px-3 py-2 text-gray-400">{l.response_status || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{l.attempt}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!logs.items.length && <div className="text-center text-gray-500 py-6">No logs.</div>}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-4">New Webhook</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Webhook name" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://your-endpoint.com/webhook" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none" />
              <div>
                <p className="text-xs text-gray-500 mb-2">Subscribe to events:</p>
                <div className="flex flex-wrap gap-2">
                  {EVENTS.map(ev => (
                    <button key={ev} onClick={() => toggleEvent(ev)}
                      className={`text-xs px-2 py-1 rounded-lg ${form.events.includes(ev) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#2a2a2a] text-gray-400'}`}>
                      {ev}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShow(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
