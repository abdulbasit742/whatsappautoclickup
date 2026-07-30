import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Puzzle, CheckCircle, XCircle, ExternalLink, RefreshCw, Webhook, Plus, Trash2, Globe } from 'lucide-react';

const INTEGRATION_META = {
  gmail: { label: 'Gmail', icon: '✉️', desc: 'Sync email conversations with CRM contacts', color: 'text-red-400', fields: [{ key: 'client_id', label: 'OAuth Client ID' }, { key: 'client_secret', label: 'OAuth Client Secret' }] },
  google_calendar: { label: 'Google Calendar', icon: '📅', desc: 'Sync appointments and schedule follow-ups', color: 'text-blue-400', fields: [{ key: 'calendar_id', label: 'Calendar ID' }, { key: 'service_account_key', label: 'Service Account JSON' }] },
  clickup: { label: 'ClickUp', icon: '✅', desc: 'Create tasks and manage projects from CRM', color: 'text-purple-400', fields: [{ key: 'api_token', label: 'API Token' }, { key: 'workspace_id', label: 'Workspace ID' }] },
  make: { label: 'Make (Integromat)', icon: '⚙️', desc: 'Connect to 1000+ apps via Make automation', color: 'text-cyan-400', fields: [{ key: 'webhook_url', label: 'Make Webhook URL' }] },
  stripe: { label: 'Stripe', icon: '💳', desc: 'Accept online payments globally', color: 'text-violet-400', fields: [{ key: 'public_key', label: 'Publishable Key' }, { key: 'secret_key', label: 'Secret Key' }] },
  paypal: { label: 'PayPal', icon: '💰', desc: 'Accept PayPal payments from clients', color: 'text-yellow-400', fields: [{ key: 'client_id', label: 'Client ID' }, { key: 'client_secret', label: 'Client Secret' }] },
  razorpay: { label: 'Razorpay', icon: '💸', desc: 'Accept payments via Razorpay gateway', color: 'text-blue-400', fields: [{ key: 'key_id', label: 'Key ID' }, { key: 'key_secret', label: 'Key Secret' }] },
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [activeTab, setActiveTab] = useState('integrations');
  const [configuring, setConfiguring] = useState(null);
  const [configData, setConfigData] = useState({});
  const [webhookForm, setWebhookForm] = useState({ url: '', events: ['message.inbound', 'payment.confirmed', 'lead.updated'] });
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIntegrations();
    fetchEndpoints();
  }, []);

  async function fetchIntegrations() {
    try { const r = await api.get('/integrations'); setIntegrations(r.data); } catch {}
  }

  async function fetchEndpoints() {
    try { const r = await api.get('/integrations/webhooks/endpoints'); setEndpoints(r.data); } catch {}
  }

  function getIntegration(name) {
    return integrations.find(i => i.name === name);
  }

  async function saveConfig(name) {
    setSaving(true);
    try {
      await api.post(`/integrations/${name}`, { config: configData, is_enabled: true });
      setConfiguring(null);
      setConfigData({});
      fetchIntegrations();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  }

  async function toggleIntegration(name) {
    try {
      await api.patch(`/integrations/${name}/toggle`);
      fetchIntegrations();
    } catch {}
  }

  async function addWebhook(e) {
    e.preventDefault();
    try {
      await api.post('/integrations/webhooks/endpoints', webhookForm);
      setShowWebhookForm(false);
      setWebhookForm({ url: '', events: ['message.inbound'] });
      fetchEndpoints();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  }

  async function deleteEndpoint(id) {
    if (!confirm('Delete this webhook endpoint?')) return;
    await api.delete(`/integrations/webhooks/endpoints/${id}`);
    fetchEndpoints();
  }

  const EVENTS = ['message.inbound', 'message.outbound', 'payment.confirmed', 'payment.pending', 'lead.created', 'lead.updated', 'client.created', 'followup.due', 'alert.created'];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Puzzle className="text-emerald-400" size={22} />
        <h1 className="text-xl font-bold">Integrations</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#2a2a2a]">
        {[
          { id: 'integrations', icon: Globe, label: 'Connected Apps' },
          { id: 'webhooks', icon: Webhook, label: 'Webhooks' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition -mb-px ${
              activeTab === id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Integrations Grid */}
      {activeTab === 'integrations' && (
        <div>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(INTEGRATION_META).map(([key, meta]) => {
              const int = getIntegration(key);
              const enabled = int?.is_enabled || false;
              return (
                <div key={key} className={`bg-[#1a1a1a] rounded-xl p-5 border transition ${enabled ? 'border-emerald-500/30' : 'border-[#2a2a2a]'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-2xl">{meta.icon}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs flex items-center gap-1 ${enabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {enabled ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {enabled ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <div className={`font-semibold mb-1 ${meta.color}`}>{meta.label}</div>
                  <div className="text-xs text-gray-500 mb-4">{meta.desc}</div>
                  {int?.last_synced && (
                    <div className="text-xs text-gray-600 mb-3">Last synced: {new Date(int.last_synced).toLocaleString()}</div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setConfiguring(key); setConfigData(int?.config || {}); }}
                      className="flex-1 py-1.5 rounded-lg text-xs border border-[#333] hover:bg-white/5">
                      Configure
                    </button>
                    {enabled && (
                      <button onClick={() => toggleIntegration(key)}
                        className="py-1.5 px-3 rounded-lg text-xs border border-red-400/20 text-red-400 hover:bg-red-400/10">
                        Disable
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Config Modal */}
          {configuring && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] w-full max-w-md">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{INTEGRATION_META[configuring]?.icon}</span>
                  <div>
                    <div className="font-semibold">{INTEGRATION_META[configuring]?.label}</div>
                    <div className="text-xs text-gray-500">Configure integration</div>
                  </div>
                </div>
                <div className="space-y-3 mb-5">
                  {INTEGRATION_META[configuring]?.fields?.map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                      <input value={configData[f.key] || ''} onChange={e => setConfigData({ ...configData, [f.key]: e.target.value })}
                        type={f.key.includes('secret') || f.key.includes('key') ? 'password' : 'text'}
                        className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setConfiguring(null); setConfigData({}); }} className="flex-1 py-2 rounded-lg border border-[#333] text-sm">Cancel</button>
                  <button onClick={() => saveConfig(configuring)} disabled={saving}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-2 rounded-lg text-sm font-semibold">
                    {saving ? 'Saving...' : 'Save & Connect'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Webhook Endpoints</h3>
              <p className="text-xs text-gray-500 mt-1">Send real-time events to external systems</p>
            </div>
            <button onClick={() => setShowWebhookForm(true)}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Plus size={12} /> Add Endpoint
            </button>
          </div>

          {showWebhookForm && (
            <form onSubmit={addWebhook} className="bg-[#1a1a1a] rounded-xl p-4 border border-emerald-500/30 mb-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Endpoint URL</label>
                <input value={webhookForm.url} onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  placeholder="https://your-app.com/webhook" required type="url"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Events to listen</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENTS.map(ev => (
                    <label key={ev} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox"
                        checked={webhookForm.events.includes(ev)}
                        onChange={e => setWebhookForm({
                          ...webhookForm,
                          events: e.target.checked
                            ? [...webhookForm.events, ev]
                            : webhookForm.events.filter(x => x !== ev)
                        })}
                        className="accent-emerald-500" />
                      <span className="text-gray-400">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowWebhookForm(false)} className="flex-1 py-1.5 rounded-lg border border-[#333] text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-1.5 rounded-lg text-sm font-semibold">Add Endpoint</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {endpoints.map(ep => (
              <div key={ep.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${ep.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-sm font-medium">{ep.url}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ep.events?.map(ev => (
                        <span key={ev} className="text-xs bg-[#252525] text-gray-400 px-2 py-0.5 rounded">{ev}</span>
                      ))}
                    </div>
                    {ep.secret && <div className="text-xs text-gray-600 mt-2">Secret: {ep.secret.substring(0, 8)}...</div>}
                  </div>
                  <button onClick={() => deleteEndpoint(ep.id)} className="p-1.5 hover:text-red-400 text-gray-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!endpoints.length && (
              <div className="text-center text-gray-500 py-8">No webhook endpoints configured.</div>
            )}
          </div>

          {/* Available events reference */}
          <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <h4 className="text-sm font-semibold mb-3">Available Events</h4>
            <div className="grid grid-cols-3 gap-2">
              {EVENTS.map(ev => (
                <div key={ev} className="text-xs text-gray-500 bg-[#252525] px-2 py-1 rounded">{ev}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
