// frontend/src/pages/SocialAccounts.jsx
// Social Account Manager + Permissions/Scopes + Error Handling + Auto-Reply Rules
// Prompts 152, 153, 154

import { useEffect, useState } from 'react';
import {
  Facebook, Instagram, RefreshCw, Trash2, AlertTriangle, CheckCircle,
  ShieldCheck, Plus, ToggleLeft, ToggleRight, ExternalLink, Wifi, WifiOff
} from 'lucide-react';
import api from '../utils/api';

const platformIcon = (p) => p === 'facebook'
  ? <Facebook size={16} className="text-blue-400" />
  : <Instagram size={16} className="text-pink-400" />;

const platformColor = (p) => p === 'facebook' ? 'blue' : 'pink';

export default function SocialAccounts() {
  const [accounts, setAccounts]     = useState([]);
  const [health, setHealth]         = useState({ healthyAccounts: 0, issues: [] });
  const [autoReplies, setAutoReplies] = useState([]);
  const [scopes, setScopes]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('accounts');
  const [newRule, setNewRule]       = useState({ accountId: '', triggerType: 'new_message', keyword: '', replyText: '' });
  const [connecting, setConnecting] = useState('');
  const [msg, setMsg]               = useState('');

  // Read OAuth result from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) setMsg(`✅ Connected ${params.get('connected')} successfully!`);
    if (params.get('error'))     setMsg(`❌ Error: ${params.get('error')}`);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [accRes, healthRes, arRes] = await Promise.all([
        api.get('/social/accounts'),
        api.get('/social/health'),
        api.get('/social/auto-replies'),
      ]);
      setAccounts(accRes.data);
      setHealth(healthRes.data);
      setAutoReplies(arRes.data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const connectFacebook = async () => {
    setConnecting('facebook');
    try {
      const { data } = await api.get('/social/auth/facebook');
      window.location.href = data.url;
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
      setConnecting('');
    }
  };

  const connectInstagram = async () => {
    setConnecting('instagram');
    try {
      const { data } = await api.get('/social/auth/instagram');
      window.location.href = data.url;
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
      setConnecting('');
    }
  };

  const disconnect = async (id) => {
    if (!confirm('Disconnect this account?')) return;
    await api.delete(`/social/accounts/${id}`);
    load();
  };

  const refreshToken = async (id) => {
    try {
      const { data } = await api.post(`/social/accounts/${id}/refresh`);
      setMsg(data.refreshed ? '✅ Token refreshed' : `ℹ️ ${data.reason}`);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
    load();
  };

  const loadScopes = async (accountId) => {
    try {
      const { data } = await api.get(`/social/scopes/${accountId}`);
      setScopes(s => ({ ...s, [accountId]: data }));
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const reauthorize = async (accountId) => {
    const { data } = await api.get(`/social/scopes/${accountId}/reauthorize`);
    window.location.href = data.url;
  };

  const syncPages = async () => {
    try {
      const { data } = await api.post('/social/pages/sync');
      setMsg(`✅ Synced ${data.synced} Facebook pages`);
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const syncInstagram = async () => {
    try {
      const { data } = await api.post('/social/instagram/sync');
      setMsg(`✅ Synced ${data.synced} Instagram accounts`);
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const addAutoReply = async () => {
    if (!newRule.accountId || !newRule.replyText) return setMsg('❌ Please fill all required fields');
    try {
      await api.post('/social/auto-replies', {
        accountId: newRule.accountId,
        triggerType: newRule.triggerType,
        keyword: newRule.keyword || undefined,
        replyText: newRule.replyText,
      });
      setNewRule({ accountId: '', triggerType: 'new_message', keyword: '', replyText: '' });
      setMsg('✅ Auto-reply rule created');
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleAutoReply = async (rule) => {
    await api.put(`/social/auto-replies/${rule.id}`, {
      triggerType: rule.trigger_type,
      keyword:     rule.keyword,
      replyText:   rule.reply_text,
      isActive:    !rule.is_active,
    });
    load();
  };

  const deleteAutoReply = async (id) => {
    await api.delete(`/social/auto-replies/${id}`);
    load();
  };

  const tabs = ['accounts', 'permissions', 'auto-reply'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Social Accounts</h2>
        <div className="flex gap-2">
          <button onClick={syncPages} className="text-xs border border-[#2a2a2a] text-gray-400 hover:text-blue-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
            <RefreshCw size={12} /> Sync Pages
          </button>
          <button onClick={syncInstagram} className="text-xs border border-[#2a2a2a] text-gray-400 hover:text-pink-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
            <RefreshCw size={12} /> Sync Instagram
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg}
          <button onClick={() => setMsg('')} className="ml-2 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Health Banner */}
      {health.issues.length > 0 && (
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2 text-sm font-medium">
            <AlertTriangle size={16} /> {health.issues.length} account(s) need attention
          </div>
          <div className="space-y-1">
            {health.issues.map(issue => (
              <div key={issue.id} className="flex items-center justify-between text-xs text-gray-400">
                <span>{platformIcon(issue.platform)} {issue.accountName} — {issue.error}</span>
                <button
                  onClick={() => issue.action === 'reconnect' ? (issue.platform === 'facebook' ? connectFacebook() : connectInstagram()) : refreshToken(issue.id)}
                  className="text-yellow-400 hover:text-yellow-300 underline ml-2"
                >
                  {issue.action === 'reconnect' ? 'Reconnect' : 'Refresh'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={connectFacebook}
          disabled={connecting === 'facebook'}
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl p-4 flex items-center gap-3 transition-colors disabled:opacity-50"
        >
          <Facebook size={24} />
          <div className="text-left">
            <p className="font-medium text-sm">Connect Facebook</p>
            <p className="text-xs text-gray-500">Pages + Messenger</p>
          </div>
          {connecting === 'facebook' && <RefreshCw size={14} className="ml-auto animate-spin" />}
        </button>
        <button
          onClick={connectInstagram}
          disabled={connecting === 'instagram'}
          className="bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 rounded-xl p-4 flex items-center gap-3 transition-colors disabled:opacity-50"
        >
          <Instagram size={24} />
          <div className="text-left">
            <p className="font-medium text-sm">Connect Instagram</p>
            <p className="text-xs text-gray-500">Business Account</p>
          </div>
          {connecting === 'instagram' && <RefreshCw size={14} className="ml-auto animate-spin" />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a1a1a] rounded-lg p-1 w-fit border border-[#2a2a2a]">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors capitalize ${activeTab === t ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Tab: Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No social accounts connected yet.</p>
              <p className="text-gray-600 text-xs mt-1">Use the buttons above to connect Facebook or Instagram.</p>
            </div>
          ) : (
            accounts.map(acc => (
              <div key={acc.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {acc.profile_picture_url
                    ? <img src={acc.profile_picture_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${acc.platform === 'facebook' ? 'bg-blue-500/20' : 'bg-pink-500/20'}`}>
                        {platformIcon(acc.platform)}
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm">{acc.account_name}</span>
                      {acc.username && <span className="text-xs text-gray-500">@{acc.username}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${acc.platform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                        {acc.platform}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${acc.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {acc.is_active ? <span className="flex items-center gap-1"><Wifi size={10} /> Active</span> : <span className="flex items-center gap-1"><WifiOff size={10} /> Inactive</span>}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Type: {acc.token_type}</span>
                      {acc.expires_at && <span>Expires: {new Date(acc.expires_at).toLocaleDateString()}</span>}
                      {acc.last_refreshed_at && <span>Last sync: {new Date(acc.last_refreshed_at).toLocaleDateString()}</span>}
                    </div>
                    {acc.error_message && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle size={12} /> {acc.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => loadScopes(acc.id)}
                      title="Check permissions"
                      className="text-xs border border-[#2a2a2a] text-gray-400 hover:text-emerald-400 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <ShieldCheck size={12} />
                    </button>
                    <button
                      onClick={() => refreshToken(acc.id)}
                      title="Refresh token"
                      className="text-xs border border-[#2a2a2a] text-gray-400 hover:text-blue-400 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                    </button>
                    <button
                      onClick={() => disconnect(acc.id)}
                      title="Disconnect"
                      className="text-xs border border-[#2a2a2a] text-gray-400 hover:text-red-400 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {/* Scopes panel */}
                {scopes[acc.id] && (
                  <div className="mt-3 border-t border-[#2a2a2a] pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-white">Permissions</span>
                      {scopes[acc.id].missing.length > 0 && (
                        <button onClick={() => reauthorize(acc.id)} className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                          <ExternalLink size={10} /> Reauthorize
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {scopes[acc.id].required.map(scope => {
                        const granted = scopes[acc.id].granted.includes(scope);
                        return (
                          <span key={scope} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${granted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {granted ? <CheckCircle size={9} /> : <AlertTriangle size={9} />}
                            {scope}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Permissions */}
      {activeTab === 'permissions' && (
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Connect accounts first to manage permissions.</p>
          ) : accounts.map(acc => {
            const scopeData = scopes[acc.id];
            return (
              <div key={acc.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {platformIcon(acc.platform)}
                    <span className="text-sm font-medium text-white">{acc.account_name}</span>
                  </div>
                  <button
                    onClick={() => loadScopes(acc.id)}
                    className="text-xs border border-[#2a2a2a] text-gray-400 hover:text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    Check Scopes
                  </button>
                </div>
                {!scopeData ? (
                  <p className="text-xs text-gray-600">Click "Check Scopes" to inspect permissions.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
                        <p className="text-emerald-400 font-medium mb-1">✅ Granted ({scopeData.granted.length})</p>
                        <div className="space-y-0.5">
                          {scopeData.granted.map(s => <p key={s} className="text-gray-400">{s}</p>)}
                          {scopeData.granted.length === 0 && <p className="text-gray-600">None</p>}
                        </div>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                        <p className="text-red-400 font-medium mb-1">❌ Missing ({scopeData.missing.length})</p>
                        <div className="space-y-0.5">
                          {scopeData.missing.map(s => <p key={s} className="text-gray-400">{s}</p>)}
                          {scopeData.missing.length === 0 && <p className="text-gray-500">All granted ✓</p>}
                        </div>
                      </div>
                    </div>
                    {scopeData.missing.length > 0 && (
                      <button
                        onClick={() => reauthorize(acc.id)}
                        className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={12} /> Reauthorize to Grant Missing Permissions
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Auto-Reply */}
      {activeTab === 'auto-reply' && (
        <div className="space-y-4">
          {/* Add Rule Form */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">New Auto-Reply Rule</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Account</label>
                <select
                  value={newRule.accountId}
                  onChange={e => setNewRule(r => ({ ...r, accountId: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select account...</option>
                  {accounts.filter(a => a.is_active).map(a => (
                    <option key={a.id} value={a.id}>{a.account_name} ({a.platform})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Trigger</label>
                <select
                  value={newRule.triggerType}
                  onChange={e => setNewRule(r => ({ ...r, triggerType: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="new_message">New Message</option>
                  <option value="keyword">Keyword Match</option>
                  <option value="comment">New Comment</option>
                </select>
              </div>
            </div>
            {newRule.triggerType === 'keyword' && (
              <input
                value={newRule.keyword}
                onChange={e => setNewRule(r => ({ ...r, keyword: e.target.value }))}
                placeholder="Keyword to match..."
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 mb-3"
              />
            )}
            <textarea
              value={newRule.replyText}
              onChange={e => setNewRule(r => ({ ...r, replyText: e.target.value }))}
              placeholder="Auto-reply message..."
              rows={2}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 mb-3 resize-none"
            />
            <button
              onClick={addAutoReply}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus size={14} /> Add Rule
            </button>
          </div>

          {/* Existing Rules */}
          {autoReplies.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No auto-reply rules yet.</p>
          ) : autoReplies.map(rule => (
            <div key={rule.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {platformIcon(rule.platform)}
                  <span className="text-xs text-white font-medium">{rule.account_name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 capitalize">
                    {rule.trigger_type.replace('_', ' ')}
                  </span>
                  {rule.keyword && <span className="text-xs text-gray-500">"{rule.keyword}"</span>}
                  <span className="text-xs text-gray-600">· {rule.match_count} matches</span>
                </div>
                <p className="text-sm text-gray-300 truncate">{rule.reply_text}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleAutoReply(rule)} className="text-gray-400 hover:text-white transition-colors">
                  {rule.is_active ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => deleteAutoReply(rule.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
