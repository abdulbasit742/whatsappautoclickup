import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Brain, Zap, MessageSquare, TrendingUp, AlertTriangle, BookOpen, BarChart2,
  RefreshCw, Lightbulb, CheckCircle, Activity
} from 'lucide-react';

const PROVIDER_COLORS = { groq: 'text-orange-400', claude: 'text-purple-400', openai: 'text-green-400', gemini: 'text-blue-400' };

function ProviderBadge({ name }) {
  return <span className={`text-xs font-medium ${PROVIDER_COLORS[name] || 'text-gray-400'}`}>{name}</span>;
}

export default function AIDashboard() {
  const [health, setHealth] = useState({});
  const [stats, setStats] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [broadcastTopic, setBroadcastTopic] = useState('');
  const [broadcastResult, setBroadcastResult] = useState('');
  const [bLoading, setBLoading] = useState(false);
  const [tone, setTone] = useState('friendly');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchHealth();
    fetchStats();
    fetchLogs();
  }, []);

  async function fetchHealth() {
    try { const r = await api.get('/ai/health'); setHealth(r.data); } catch {}
  }

  async function fetchStats() {
    try { const r = await api.get('/ai/stats'); setStats(r.data); } catch {}
  }

  async function fetchLogs() {
    try { const r = await api.get('/ai/logs?limit=20'); setLogs(r.data); } catch {}
  }

  async function getRecommendations() {
    setRecLoading(true);
    try { const r = await api.get('/ai/recommendations'); setRecommendations(r.data.recommendations || []); }
    catch {} finally { setRecLoading(false); }
  }

  async function generateBroadcast() {
    if (!broadcastTopic) return;
    setBLoading(true);
    try {
      const r = await api.post('/ai/write-broadcast', { topic: broadcastTopic, tone, audience: 'all clients' });
      setBroadcastResult(r.data.message);
    } catch {} finally { setBLoading(false); }
  }

  const totalCalls = stats.reduce((s, p) => s + parseInt(p.total_calls || 0), 0);
  const successRate = totalCalls > 0
    ? Math.round(stats.reduce((s, p) => s + parseInt(p.success_count || 0), 0) / totalCalls * 100)
    : 0;

  const PRIORITY_COLORS = { high: 'text-red-400 border-red-400/20 bg-red-400/5', medium: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5', low: 'text-blue-400 border-blue-400/20 bg-blue-400/5' };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Brain className="text-emerald-400" size={22} />
        <h1 className="text-xl font-bold">AI Dashboard</h1>
      </div>

      {/* Provider Health */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {['groq', 'claude', 'openai', 'gemini'].map(p => (
          <div key={p} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold capitalize text-sm ${PROVIDER_COLORS[p]}`}>{p}</span>
              <span className={`w-2 h-2 rounded-full ${health[p]?.available !== false ? 'bg-emerald-400' : 'bg-red-400'}`} />
            </div>
            <div className="text-xs text-gray-500">
              {health[p]?.available !== false ? 'Online' : 'Offline'}
            </div>
            {health[p]?.lastError && <div className="text-xs text-red-400 mt-1 truncate">{health[p].lastError}</div>}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-white">{totalCalls.toLocaleString()}</div>
          <div className="text-gray-400 text-sm">Total AI Calls</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-emerald-400">{successRate}%</div>
          <div className="text-gray-400 text-sm">Success Rate</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="text-2xl font-bold text-yellow-400">
            {stats.length > 0 ? Math.round(stats.reduce((s, p) => s + parseFloat(p.avg_latency_ms || 0), 0) / stats.length) : 0}ms
          </div>
          <div className="text-gray-400 text-sm">Avg Latency</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#2a2a2a]">
        {[
          { id: 'overview', icon: Activity, label: 'Provider Stats' },
          { id: 'broadcast', icon: MessageSquare, label: 'Message Generator' },
          { id: 'recommendations', icon: Lightbulb, label: 'Recommendations' },
          { id: 'logs', icon: BookOpen, label: 'AI Logs' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition -mb-px ${
              activeTab === id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-400">
                <th className="text-left p-4">Provider</th>
                <th className="text-left p-4">Calls</th>
                <th className="text-left p-4">Success</th>
                <th className="text-left p-4">Errors</th>
                <th className="text-left p-4">Avg Latency</th>
                <th className="text-left p-4">Last Used</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.provider} className="border-b border-[#2a2a2a]">
                  <td className="p-4"><ProviderBadge name={s.provider} /></td>
                  <td className="p-4 text-gray-300">{s.total_calls}</td>
                  <td className="p-4 text-emerald-400">{s.success_count}</td>
                  <td className="p-4 text-red-400">{s.error_count}</td>
                  <td className="p-4 text-gray-400">{s.avg_latency_ms ? `${Math.round(s.avg_latency_ms)}ms` : '—'}</td>
                  <td className="p-4 text-gray-500 text-xs">{s.last_used ? new Date(s.last_used).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {!stats.length && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No AI calls recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Message Generator tab */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap size={16} className="text-emerald-400" /> AI Broadcast Generator</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Topic / Product</label>
                <input value={broadcastTopic} onChange={e => setBroadcastTopic(e.target.value)}
                  placeholder="e.g. New service launch, seasonal offer..."
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)}
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  {['friendly', 'professional', 'urgent', 'casual', 'persuasive'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={generateBroadcast} disabled={bLoading || !broadcastTopic}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {bLoading ? <><RefreshCw size={14} className="animate-spin" /> Generating...</> : <><Brain size={14} /> Generate Message</>}
              </button>
            </div>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]">
            <h3 className="font-semibold mb-4">Generated Message</h3>
            {broadcastResult ? (
              <>
                <div className="bg-[#0f0f0f] rounded-lg p-4 text-sm whitespace-pre-wrap text-gray-200 min-h-[120px]">
                  {broadcastResult}
                </div>
                <button onClick={() => navigator.clipboard.writeText(broadcastResult)}
                  className="mt-3 text-xs text-emerald-400 hover:text-emerald-300">Copy to clipboard</button>
              </>
            ) : (
              <div className="text-gray-500 text-sm">Generated message will appear here...</div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations tab */}
      {activeTab === 'recommendations' && (
        <div>
          <button onClick={getRecommendations} disabled={recLoading}
            className="mb-4 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {recLoading ? <RefreshCw size={14} className="animate-spin" /> : <Lightbulb size={14} />}
            {recLoading ? 'Analyzing...' : 'Get AI Recommendations'}
          </button>
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className={`rounded-xl p-4 border ${PRIORITY_COLORS[r.priority] || 'text-gray-400 border-[#2a2a2a]'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{r.title}</div>
                    <div className="text-xs mt-1 opacity-80">{r.reason}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full border capitalize">{r.priority}</span>
                </div>
                <div className="mt-2 text-xs opacity-90 flex items-center gap-1">
                  <CheckCircle size={12} /> {r.action}
                </div>
              </div>
            ))}
            {!recommendations.length && !recLoading && (
              <div className="text-center text-gray-500 py-8">Click the button above to get AI-powered business recommendations.</div>
            )}
          </div>
        </div>
      )}

      {/* Logs tab */}
      {activeTab === 'logs' && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
            <span className="font-medium text-sm">Recent AI Calls</span>
            <button onClick={fetchLogs} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-400">
                <th className="text-left p-4">Provider</th>
                <th className="text-left p-4">Client</th>
                <th className="text-left p-4">Latency</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-[#2a2a2a]">
                  <td className="p-4"><ProviderBadge name={l.provider} /></td>
                  <td className="p-4 text-gray-400 text-xs">{l.client_name || 'System'}</td>
                  <td className="p-4 text-gray-400">{l.latency_ms}ms</td>
                  <td className="p-4">
                    <span className={l.success ? 'text-emerald-400' : 'text-red-400'}>
                      {l.success ? '✓' : '✗'} {l.success ? 'Success' : l.error_message?.substring(0, 30)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No AI logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
