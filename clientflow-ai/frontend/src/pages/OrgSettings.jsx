import { useEffect, useState } from 'react';
import { Building2, Save, RefreshCw, Globe, Bell, Cpu, Palette } from 'lucide-react';
import api from '../utils/api';

const TIMEZONES = [
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Riyadh',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'UTC',
];

const AI_PROVIDERS = ['groq', 'claude', 'openai', 'gemini'];

export default function OrgSettings() {
  const [settings, setSettings] = useState({
    org_name: '', logo_url: '', timezone: 'Asia/Karachi',
    primary_color: '#10b981', email_notifications: true,
    whatsapp_alerts: true, ai_provider_priority: ['groq', 'claude', 'openai', 'gemini'],
    integrations: {},
  });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [tab, setTab]           = useState('branding');

  const load = async () => {
    const r = await api.get('/org');
    if (r.data && r.data.org_name) {
      setSettings(s => ({ ...s, ...r.data, ai_provider_priority: r.data.ai_provider_priority || ['groq', 'claude', 'openai', 'gemini'] }));
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/org', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const moveProvider = (idx, dir) => {
    const arr = [...(settings.ai_provider_priority || [])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setSettings(s => ({ ...s, ai_provider_priority: arr }));
  };

  const TABS = [
    { id: 'branding',        icon: Building2, label: 'Branding' },
    { id: 'timezone',        icon: Globe,     label: 'Timezone' },
    { id: 'notifications',   icon: Bell,      label: 'Notifications' },
    { id: 'ai',              icon: Cpu,       label: 'AI Config' },
    { id: 'integrations',    icon: Palette,   label: 'Integrations' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Organization Settings</h2>
        </div>
        <button onClick={save} disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Save size={14} />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 shrink-0 space-y-1">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${tab === id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          {tab === 'branding' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Branding</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Organization Name</label>
                <input value={settings.org_name} onChange={e => setSettings(s => ({ ...s, org_name: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Logo URL</label>
                <input value={settings.logo_url || ''} onChange={e => setSettings(s => ({ ...s, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.primary_color || '#10b981'}
                    onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                    className="h-10 w-20 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg cursor-pointer" />
                  <input value={settings.primary_color || '#10b981'}
                    onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-36" />
                </div>
              </div>
            </div>
          )}

          {tab === 'timezone' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Timezone Settings</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Organization Timezone</label>
                <select value={settings.timezone} onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-500">Current local time: {new Date().toLocaleString('en-US', { timeZone: settings.timezone || 'UTC' })}</p>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Notification Preferences</h3>
              {[
                { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive alerts and summaries via email' },
                { key: 'whatsapp_alerts',     label: 'WhatsApp Alerts',     desc: 'Get critical alerts via WhatsApp' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-xl border border-[#2a2a2a]">
                  <div>
                    <p className="text-sm text-white font-medium">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                    className={`w-10 h-6 rounded-full transition-colors relative ${settings[key] ? 'bg-emerald-500' : 'bg-[#3a3a3a]'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'ai' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">AI Provider Priority</h3>
              <p className="text-xs text-gray-500 mb-3">Drag to reorder or use arrows. The first available provider will be used.</p>
              <div className="space-y-2">
                {(settings.ai_provider_priority || AI_PROVIDERS).map((p, i) => (
                  <div key={p} className="flex items-center gap-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-white capitalize">{p}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveProvider(i, -1)} disabled={i === 0} className="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-2 py-1">↑</button>
                      <button onClick={() => moveProvider(i, 1)} disabled={i === (settings.ai_provider_priority || []).length - 1} className="text-gray-500 hover:text-white disabled:opacity-20 text-xs px-2 py-1">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Integrations Config</h3>
              {[
                { key: 'slack_webhook', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/...' },
                { key: 'zapier_key',   label: 'Zapier API Key',    placeholder: 'zap_...' },
                { key: 'hubspot_key',  label: 'HubSpot API Key',   placeholder: 'pat-...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    value={(settings.integrations || {})[key] || ''}
                    onChange={e => setSettings(s => ({ ...s, integrations: { ...s.integrations, [key]: e.target.value } }))}
                    placeholder={placeholder}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
