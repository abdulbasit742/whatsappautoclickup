import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, RefreshCw, Plug, PlugZap,
  ChevronDown, ChevronUp, Loader2, Clock, Info, Eye, EyeOff, FileText
} from 'lucide-react';
import api from '../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Status helpers ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  connected:    { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle, label: 'Connected' },
  configured:   { color: 'text-blue-400',    bg: 'bg-blue-500/20',    icon: Info,         label: 'Configured' },
  disconnected: { color: 'text-gray-400',    bg: 'bg-gray-500/20',    icon: XCircle,      label: 'Disconnected' },
  error:        { color: 'text-red-400',      bg: 'bg-red-500/20',     icon: AlertCircle,  label: 'Error' },
  not_connected:{ color: 'text-gray-500',    bg: 'bg-gray-500/10',    icon: XCircle,      label: 'Not Connected' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_connected;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Credential Field ────────────────────────────────────────────────────────────

function CredentialField({ label, fieldKey, value, onChange, isPassword = true, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder || label}
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Saved Key Row ───────────────────────────────────────────────────────────────

function SavedKeyRow({ keyName, maskedValue, lastUsedAt, expiresAt }) {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const expiresSoon = expiresAt && !isExpired &&
    new Date(expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#2a2a2a] last:border-0">
      <div>
        <span className="text-xs font-mono text-gray-300">{keyName}</span>
        <span className="ml-2 text-xs font-mono text-gray-500">{maskedValue}</span>
      </div>
      <div className="flex items-center gap-3 text-right">
        {expiresAt && (
          <span className={`text-xs ${isExpired ? 'text-red-400' : expiresSoon ? 'text-yellow-400' : 'text-gray-500'}`}>
            {isExpired ? '⚠ Expired' : `Exp: ${format(new Date(expiresAt), 'MMM dd, yyyy')}`}
          </span>
        )}
        {lastUsedAt && (
          <span className="text-xs text-gray-600">
            Used {formatDistanceToNow(new Date(lastUsedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Integration Card ────────────────────────────────────────────────────────────

function IntegrationCard({ provider, title, description, icon: CardIcon, iconColor, fields, extra }) {
  const [integration, setIntegration] = useState(null);
  const [savedKeys, setSavedKeys] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/integrations/${provider}`);
      setIntegration(r.data.integration);
      setSavedKeys(r.data.keys || []);
    } catch {}
  }, [provider]);

  useEffect(() => { load(); }, [load]);

  const handleFieldChange = (key, value) => setFormValues(p => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/integrations/${provider}/credentials`, formValues);
      setFormValues({});
      setShowForm(false);
      await load();
      flash('Credentials saved securely');
    } catch (err) {
      flash(err.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await api.post(`/integrations/${provider}/test`);
      await load();
      const name = r.data.data?.name || r.data.data?.username || 'OK';
      flash(`Connection OK — ${name}`);
    } catch (err) {
      await load();
      flash(err.response?.data?.error || 'Test failed', 'error');
    } finally { setTesting(false); }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await api.post(`/integrations/${provider}/connect`);
      await load();
      flash('Connected successfully!');
    } catch (err) {
      await load();
      flash(err.response?.data?.error || 'Connection failed', 'error');
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${title}?`)) return;
    try {
      await api.delete(`/integrations/${provider}`);
      await load();
      flash('Disconnected');
    } catch (err) {
      flash(err.response?.data?.error || 'Disconnect failed', 'error');
    }
  };

  const handleLoadLogs = async () => {
    if (!showLogs) {
      try {
        const r = await api.get(`/integrations/${provider}/logs`);
        setLogs(r.data);
      } catch {}
    }
    setShowLogs(s => !s);
  };

  const status = integration?.status || 'not_connected';
  const isConnected = status === 'connected';

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor || 'bg-gray-700'}`}>
              <CardIcon size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Meta info */}
        {integration && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            {integration.last_sync_at && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Last sync: {formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true })}
              </span>
            )}
            {integration.connected_at && (
              <span>Connected: {format(new Date(integration.connected_at), 'MMM dd, yyyy')}</span>
            )}
          </div>
        )}

        {integration?.last_error && (
          <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <span className="font-medium">Last error:</span> {integration.last_error}
          </div>
        )}

        {msg && (
          <div className={`mt-2 px-3 py-2 rounded-lg text-xs ${
            msg.type === 'error'
              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(s => !s)}
            className="px-3 py-1.5 text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-300 rounded-lg hover:border-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            {showForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Manage Credentials
          </button>

          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Test Connection
          </button>

          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-3 py-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {connecting ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
              {status === 'disconnected' || status === 'error' ? 'Reconnect' : 'Connect'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
            >
              <PlugZap size={12} />
              Disconnect
            </button>
          )}

          <button
            onClick={handleLoadLogs}
            className="px-3 py-1.5 text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 rounded-lg hover:border-gray-500 transition-colors flex items-center gap-1.5"
          >
            <FileText size={12} />
            Logs
          </button>
        </div>
      </div>

      {/* Saved Keys */}
      {savedKeys.length > 0 && (
        <div className="border-t border-[#2a2a2a] px-5 py-3">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Saved Keys</p>
          {savedKeys.map(k => (
            <SavedKeyRow
              key={k.key_name}
              keyName={k.key_name}
              maskedValue={k.masked_value}
              lastUsedAt={k.last_used_at}
              expiresAt={k.expires_at}
            />
          ))}
        </div>
      )}

      {/* Credentials Form */}
      {showForm && (
        <div className="border-t border-[#2a2a2a] px-5 py-4 bg-[#0f0f0f]">
          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Update Credentials</p>
          <p className="text-xs text-yellow-400/70 mb-4">⚠ Secrets are encrypted before storage. Leave a field blank to keep the existing value.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map(f => (
              <CredentialField
                key={f.key}
                label={f.label}
                fieldKey={f.key}
                value={formValues[f.key] || ''}
                onChange={handleFieldChange}
                isPassword={f.secret !== false}
                placeholder={f.placeholder}
              />
            ))}
          </div>
          {extra && <div className="mt-3">{extra}</div>}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Save Credentials
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      {showLogs && (
        <div className="border-t border-[#2a2a2a] px-5 py-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Recent Activity</p>
          {logs.length === 0 ? (
            <p className="text-xs text-gray-600">No logs yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                    log.status === 'success' ? 'bg-emerald-400' : log.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                  }`} />
                  <span className="text-gray-400 shrink-0 w-32">
                    {format(new Date(log.created_at), 'MMM dd HH:mm:ss')}
                  </span>
                  <span className="text-gray-300 font-mono">{log.event_type}</span>
                  <span className="text-gray-500 truncate">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Card ─────────────────────────────────────────────────────────────

function PlaceholderCard({ title, description, icon: CardIcon, iconColor, badge = 'Coming Soon' }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 opacity-60">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor || 'bg-gray-700'}`}>
            <CardIcon size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">{badge}</span>
      </div>
      <div className="mt-4">
        <button disabled className="px-3 py-1.5 text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-600 rounded-lg cursor-not-allowed">
          Connect
        </button>
      </div>
    </div>
  );
}

// ─── Provider Icons (SVG placeholders using initials) ────────────────────────────

function MetaIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.9 7.5c-.1-.9-.8-1.5-1.7-1.5-.9 0-1.6.6-1.7 1.5l-.4 3.5h-2.2l-.4-3.5C10.4 8.6 9.7 8 8.8 8c-.9 0-1.6.6-1.7 1.5L6.5 16h11l-.6-6.5z"/>
    </svg>
  );
}

function InstagramIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────────

const TABS = ['Social', 'AI', 'Email', 'Calendar', 'Payments'];

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('Social');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Integrations Hub</h2>
        <p className="text-sm text-gray-500 mt-1">Connect your external services. Credentials are encrypted at rest and never exposed in full.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Social Tab */}
      {activeTab === 'Social' && (
        <div className="space-y-4">
          <IntegrationCard
            provider="meta"
            title="Meta / Facebook"
            description="Connect your Facebook Page via Meta Graph API"
            icon={MetaIcon}
            iconColor="bg-blue-600"
            fields={[
              { key: 'META_APP_ID',              label: 'Meta App ID',            secret: false, placeholder: '123456789' },
              { key: 'META_APP_SECRET',          label: 'Meta App Secret',        placeholder: '••••••••' },
              { key: 'FACEBOOK_ACCESS_TOKEN',    label: 'Facebook Access Token',  placeholder: 'EAABsbCS…' },
              { key: 'FACEBOOK_PAGE_ID',         label: 'Facebook Page ID',       secret: false, placeholder: '123456789012345' },
              { key: 'META_WEBHOOK_VERIFY_TOKEN',label: 'Webhook Verify Token',   placeholder: 'my_verify_token' },
              { key: 'META_REDIRECT_URI',        label: 'Redirect URI',           secret: false, placeholder: 'https://yourdomain.com/oauth/meta/callback' },
            ]}
          />

          <IntegrationCard
            provider="instagram"
            title="Instagram"
            description="Connect your Instagram Business / Creator account"
            icon={InstagramIcon}
            iconColor="bg-gradient-to-br from-purple-600 to-pink-500"
            fields={[
              { key: 'INSTAGRAM_APP_ID',              label: 'Instagram App ID (or Meta App ID)', secret: false, placeholder: '123456789' },
              { key: 'INSTAGRAM_APP_SECRET',          label: 'Instagram App Secret',              placeholder: '••••••••' },
              { key: 'INSTAGRAM_ACCESS_TOKEN',        label: 'Instagram Access Token',            placeholder: 'IGQVJXa…' },
              { key: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', label: 'Business Account ID',              secret: false, placeholder: '17841400000000000' },
              { key: 'INSTAGRAM_REDIRECT_URI',        label: 'Redirect URI',                     secret: false, placeholder: 'https://yourdomain.com/oauth/instagram/callback' },
            ]}
            extra={<InstagramTokenActions />}
          />
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'AI' && (
        <div className="space-y-4">
          <IntegrationCard
            provider="groq"
            title="Groq"
            description="Ultra-fast LLM inference via Groq cloud"
            icon={({ size }) => <span style={{ fontSize: size * 0.65, fontWeight: 900, color: '#fff' }}>GQ</span>}
            iconColor="bg-orange-600"
            fields={[
              { key: 'GROQ_API_KEY', label: 'Groq API Key', placeholder: 'gsk_…' },
            ]}
          />
          <PlaceholderCard
            title="Claude (Anthropic)"
            description="Advanced reasoning with Claude 3 models"
            icon={({ size }) => <span style={{ fontSize: size * 0.65, fontWeight: 900, color: '#fff' }}>CL</span>}
            iconColor="bg-amber-700"
          />
          <PlaceholderCard
            title="OpenAI"
            description="GPT-4 and other OpenAI models"
            icon={({ size }) => <span style={{ fontSize: size * 0.65, fontWeight: 900, color: '#fff' }}>AI</span>}
            iconColor="bg-teal-600"
          />
          <PlaceholderCard
            title="Google Gemini"
            description="Google's multimodal AI models"
            icon={({ size }) => <span style={{ fontSize: size * 0.65, fontWeight: 900, color: '#fff' }}>GM</span>}
            iconColor="bg-indigo-600"
          />
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'Email' && (
        <div className="space-y-4">
          <PlaceholderCard
            title="Gmail"
            description="Send and receive emails via Gmail API"
            icon={({ size }) => <span style={{ fontSize: size * 0.65, fontWeight: 900, color: '#fff' }}>G</span>}
            iconColor="bg-red-600"
          />
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'Calendar' && (
        <div className="space-y-4">
          <PlaceholderCard
            title="Google Calendar"
            description="Sync appointments with Google Calendar"
            icon={({ size }) => <span style={{ fontSize: size * 0.65, fontWeight: 900, color: '#fff' }}>GC</span>}
            iconColor="bg-blue-500"
          />
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'Payments' && (
        <div className="space-y-4">
          <PlaceholderCard
            title="Stripe"
            description="Accept payments via Stripe"
            icon={({ size }) => <span style={{ fontSize: size * 0.65, fontWeight: 900, color: '#fff' }}>ST</span>}
            iconColor="bg-violet-600"
          />
        </div>
      )}
    </div>
  );
}

// ─── Instagram Token Actions ──────────────────────────────────────────────────────

function InstagramTokenActions() {
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);

  const runAction = async (action) => {
    setLoading(action);
    setResult(null);
    try {
      const endpoint = action === 'exchange'
        ? '/integrations/instagram/exchange-token'
        : '/integrations/instagram/refresh-token';
      const r = await api.post(endpoint);
      const days = r.data.expires_in ? Math.floor(r.data.expires_in / 86400) : null;
      setResult({ ok: true, text: `Token ${action === 'exchange' ? 'exchanged' : 'refreshed'}!${days ? ` Valid for ${days} days.` : ''}` });
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.error || 'Action failed' });
    } finally { setLoading(null); }
  };

  return (
    <div className="border-t border-[#2a2a2a] pt-3 mt-1">
      <p className="text-xs text-gray-400 mb-2 font-medium">Token Lifecycle</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => runAction('exchange')}
          disabled={!!loading}
          className="px-3 py-1.5 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/20 flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading === 'exchange' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Short-lived → Long-lived
        </button>
        <button
          onClick={() => runAction('refresh')}
          disabled={!!loading}
          className="px-3 py-1.5 text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading === 'refresh' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Refresh Token
        </button>
      </div>
      {result && (
        <p className={`mt-2 text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.text}</p>
      )}
      <p className="mt-2 text-xs text-gray-600">Long-lived tokens expire after ~60 days. Use Refresh Token to extend validity.</p>
    </div>
  );
}
