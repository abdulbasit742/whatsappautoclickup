import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const SCOPE_OPTIONS = ['read', 'write', 'messages', 'clients', 'payments', 'analytics', 'admin'];

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', scopes: ['read'], expires_days: '' });
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    try { const r = await api.get('/api-keys'); setKeys(r.data); } catch {}
  }

  async function createKey(e) {
    e.preventDefault(); setLoading(true);
    try {
      const r = await api.post('/api-keys', form);
      setNewKey(r.data.key);
      setShowForm(false);
      setForm({ name: '', scopes: ['read'], expires_days: '' });
      fetchKeys();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  }

  async function deleteKey(id) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    await api.delete(`/api-keys/${id}`);
    fetchKeys();
  }

  async function toggleKey(key) {
    await api.put(`/api-keys/${key.id}`, { name: key.name, scopes: key.scopes, is_active: !key.is_active });
    fetchKeys();
  }

  function copyKey(k) {
    navigator.clipboard.writeText(k);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScope(scope) {
    setForm(f => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter(s => s !== scope) : [...f.scopes, scope]
    }));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Key className="text-emerald-400" size={22} />
        <h1 className="text-xl font-bold">API Key Manager</h1>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        API keys allow external systems to access ClientFlow AI data. Keep keys secret — treat them like passwords.
      </p>

      {/* New key reveal */}
      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-emerald-400 font-semibold text-sm">API Key Created</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">Copy this key now — it won't be shown again.</p>
          <div className="flex items-center gap-3 bg-[#0f0f0f] rounded-lg px-4 py-3">
            <code className="text-sm font-mono text-emerald-300 flex-1 break-all">{newKey}</code>
            <button onClick={() => copyKey(newKey)} className="shrink-0 text-gray-400 hover:text-white">
              {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-gray-500 hover:text-white">
            I've saved my key — dismiss
          </button>
        </div>
      )}

      {/* Header with create button */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">{keys.length} API key{keys.length !== 1 ? 's' : ''}</div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus size={16} /> Create Key
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createKey} className="bg-[#1a1a1a] rounded-xl p-5 border border-emerald-500/30 mb-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Key Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              placeholder="e.g. Production API, Zapier Integration"
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Scopes (permissions)</label>
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map(s => (
                <button type="button" key={s} onClick={() => toggleScope(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    form.scopes.includes(s)
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-[#333] text-gray-500 hover:border-gray-500'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Expiry (days, leave blank for no expiry)</label>
            <input value={form.expires_days} onChange={e => setForm({ ...form, expires_days: e.target.value })}
              type="number" min="1" placeholder="e.g. 365"
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[#333] text-sm">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-semibold">
              {loading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>
      )}

      {/* Keys list */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Key size={32} className="mx-auto mb-3 opacity-20" />
            <p>No API keys yet. Create one to integrate external apps.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-400">
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Key</th>
                <th className="text-left p-4">Scopes</th>
                <th className="text-left p-4">Expires</th>
                <th className="text-left p-4">Last Used</th>
                <th className="text-left p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="p-4 font-medium">{k.name}</td>
                  <td className="p-4">
                    <code className="text-xs text-gray-400 bg-[#252525] px-2 py-1 rounded font-mono">
                      {k.key_prefix}...
                    </code>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {(k.scopes || []).map(s => (
                        <span key={s} className="text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleKey(k)}
                      className={`text-xs px-2 py-0.5 rounded-full ${k.is_active ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                      {k.is_active ? 'Active' : 'Revoked'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button onClick={() => deleteKey(k.id)} className="p-1.5 hover:text-red-400 text-gray-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API Documentation teaser */}
      <div className="mt-6 bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]">
        <h3 className="font-semibold mb-3">Using the API</h3>
        <p className="text-xs text-gray-500 mb-3">Include your API key in request headers:</p>
        <div className="bg-[#0f0f0f] rounded-lg p-3">
          <code className="text-xs text-emerald-300">
            Authorization: Bearer cfk_your_api_key_here
          </code>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            { endpoint: 'GET /api/clients', desc: 'List all clients' },
            { endpoint: 'GET /api/leads', desc: 'List all leads' },
            { endpoint: 'GET /api/analytics', desc: 'Get analytics data' },
          ].map(({ endpoint, desc }) => (
            <div key={endpoint} className="bg-[#0f0f0f] rounded-lg p-3">
              <code className="text-xs text-blue-400">{endpoint}</code>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
