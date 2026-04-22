import { useEffect, useState } from 'react';
import { ShieldCheck, Download, Trash2, EyeOff, Search, ClipboardList } from 'lucide-react';
import api from '../utils/api';

const ACTION_COLORS = {
  anonymize: 'bg-yellow-500/20 text-yellow-400',
  export:    'bg-blue-500/20 text-blue-400',
  delete:    'bg-red-500/20 text-red-400',
};

export default function GDPR() {
  const [search, setSearch]       = useState('');
  const [clients, setClients]     = useState([]);
  const [auditLog, setAuditLog]   = useState([]);
  const [activeTab, setActiveTab] = useState('manage');
  const [loading, setLoading]     = useState(false);
  const [confirm, setConfirm]     = useState(null);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data));
    api.get('/gdpr/audit-log').then(r => setAuditLog(r.data));
  }, []);

  const filteredClients = clients.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.whatsapp_number.includes(search)
  );

  const handleAction = (action, clientId) => setConfirm({ action, clientId, client: clients.find(c => c.id === clientId) });

  const executeAction = async () => {
    if (!confirm) return;
    setLoading(true);
    try {
      if (confirm.action === 'anonymize') await api.post(`/gdpr/anonymize/${confirm.clientId}`);
      if (confirm.action === 'delete')    await api.delete(`/gdpr/delete/${confirm.clientId}`);
      if (confirm.action === 'export') {
        const r = await api.get(`/gdpr/export/${confirm.clientId}`, { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)]));
        const a = document.createElement('a'); a.href = url; a.download = `client-data-${confirm.clientId}.json`; a.click();
      }
      const logRes = await api.get('/gdpr/audit-log');
      setAuditLog(logRes.data);
      if (confirm.action === 'delete') setClients(prev => prev.filter(c => c.id !== confirm.clientId));
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setLoading(false); setConfirm(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-400" /> GDPR &amp; Data Privacy</h2>
        <div className="flex gap-2">
          {['manage', 'audit'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab === 'audit' ? 'Audit Log' : 'Client Data'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'manage' && (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-80" />
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-gray-400">Client</th>
                <th className="text-left px-4 py-3 text-gray-400">Phone</th>
                <th className="text-left px-4 py-3 text-gray-400">Status</th>
                <th className="text-right px-4 py-3 text-gray-400">Actions</th>
              </tr></thead>
              <tbody>
                {filteredClients.slice(0, 50).map(c => (
                  <tr key={c.id} className="border-b border-[#1f1f1f] hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.whatsapp_number}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full">{c.status}</span></td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => handleAction('export', c.id)}    title="Export"    className="text-blue-400   hover:text-blue-300"><Download  size={14} /></button>
                      <button onClick={() => handleAction('anonymize', c.id)} title="Anonymize" className="text-yellow-400 hover:text-yellow-300"><EyeOff    size={14} /></button>
                      <button onClick={() => handleAction('delete', c.id)}    title="Delete"    className="text-red-400    hover:text-red-300"><Trash2     size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'audit' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-2">
            <ClipboardList size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-white">Audit Log ({auditLog.length})</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2a2a2a]">
              <th className="text-left px-4 py-3 text-gray-400">Action</th>
              <th className="text-left px-4 py-3 text-gray-400">Client</th>
              <th className="text-left px-4 py-3 text-gray-400">By</th>
              <th className="text-left px-4 py-3 text-gray-400">Time</th>
            </tr></thead>
            <tbody>
              {auditLog.map(l => (
                <tr key={l.id} className="border-b border-[#1f1f1f] hover:bg-white/5">
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_COLORS[l.action] || 'bg-gray-500/20 text-gray-400'}`}>{l.action}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{String(l.client_id).slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{l.performed_by || 'system'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {auditLog.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No audit entries</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-white mb-2 capitalize">{confirm.action} Client Data</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to <strong className="text-white">{confirm.action}</strong> data for{' '}
              <strong className="text-white">{confirm.client?.name || confirm.client?.whatsapp_number}</strong>?
              {confirm.action === 'delete' && <span className="block text-red-400 text-xs mt-1">⚠️ This action is irreversible.</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={executeAction} disabled={loading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${confirm.action === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white disabled:opacity-50`}>
                {loading ? 'Processing...' : `Confirm ${confirm.action}`}
              </button>
              <button onClick={() => setConfirm(null)} className="flex-1 py-2 rounded-lg text-sm bg-[#2a2a2a] text-gray-400 hover:text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
