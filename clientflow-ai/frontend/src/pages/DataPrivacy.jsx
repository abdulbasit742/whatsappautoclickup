import { useEffect, useState } from 'react';
import { Shield, FileText, Trash2, Download, RefreshCw, Plus, X, CheckCircle } from 'lucide-react';
import api from '../utils/api';

export default function DataPrivacy() {
  const [logs, setLogs]         = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab]           = useState('logs');
  const [adding, setAdding]     = useState(false);
  const [clients, setClients]   = useState([]);
  const [form, setForm]         = useState({ client_id: '', reason: '' });
  const [exportData, setExportData] = useState(null);
  const [exporting, setExporting]   = useState(null);

  const load = async () => {
    const [l, r, c] = await Promise.all([
      api.get('/privacy/access-logs'),
      api.get('/privacy/deletion-requests'),
      api.get('/clients'),
    ]);
    setLogs(l.data);
    setRequests(r.data);
    setClients(c.data);
  };

  useEffect(() => { load(); }, []);

  const submitRequest = async () => {
    await api.post('/privacy/deletion-requests', form);
    setAdding(false); setForm({ client_id: '', reason: '' });
    load();
  };

  const updateRequest = async (id, status) => {
    await api.patch(`/privacy/deletion-requests/${id}`, { status });
    load();
  };

  const exportClientData = async (clientId) => {
    setExporting(clientId);
    try {
      const r = await api.get(`/privacy/export/${clientId}`);
      setExportData(r.data);
    } finally { setExporting(null); }
  };

  const STATUS_COLORS = {
    pending:   'bg-yellow-500/20 text-yellow-400',
    approved:  'bg-blue-500/20 text-blue-400',
    rejected:  'bg-red-500/20 text-red-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Data Privacy & Compliance</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load}><RefreshCw size={14} className="text-gray-500 hover:text-gray-300" /></button>
          <button onClick={() => setAdding(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <Plus size={14} /> Deletion Request
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {[['logs', 'Access Logs'], ['requests', 'Deletion Requests'], ['export', 'Data Export']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Access logs */}
      {tab === 'logs' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['User', 'Action', 'Entity', 'IP', 'Time'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No access logs yet</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="px-4 py-3 text-white text-xs">{l.user_email || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{l.action}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{l.entity_type} {l.entity_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{l.ip_address}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deletion requests */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No deletion requests</div>
          ) : requests.map(r => (
            <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{r.client_name || r.whatsapp_number || r.client_id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                  </div>
                  {r.reason && <p className="text-xs text-gray-400">{r.reason}</p>}
                  <p className="text-xs text-gray-600 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => updateRequest(r.id, 'completed')}
                      className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30">
                      Approve & Anonymize
                    </button>
                    <button onClick={() => updateRequest(r.id, 'rejected')}
                      className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data export for specific client */}
      {tab === 'export' && (
        <div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">Export Client Data (GDPR)</h3>
            <p className="text-xs text-gray-500 mb-4">Export all data associated with a specific client.</p>
            <select onChange={e => e.target.value && exportClientData(e.target.value)}
              className="w-full max-w-sm bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
              <option value="">Select client to export...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
            </select>
            {exporting && <p className="text-xs text-gray-500 mt-2">Loading data...</p>}
          </div>
          {exportData && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-white">Exported Data</h4>
                <button onClick={() => {
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'client_data.json'; a.click();
                }} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  <Download size={12} /> Download JSON
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#0f0f0f] rounded-lg p-3"><div className="text-lg font-bold text-white">1</div><div className="text-xs text-gray-500">Client Record</div></div>
                <div className="bg-[#0f0f0f] rounded-lg p-3"><div className="text-lg font-bold text-white">{exportData.messages?.length || 0}</div><div className="text-xs text-gray-500">Messages</div></div>
                <div className="bg-[#0f0f0f] rounded-lg p-3"><div className="text-lg font-bold text-white">{exportData.payments?.length || 0}</div><div className="text-xs text-gray-500">Payments</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deletion request modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">New Deletion Request</h3>
              <button onClick={() => setAdding(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
              </select>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for deletion..." rows={3}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={submitRequest} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium">Submit Request</button>
              <button onClick={() => setAdding(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
