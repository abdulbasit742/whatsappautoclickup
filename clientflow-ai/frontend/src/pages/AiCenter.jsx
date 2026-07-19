import { useEffect, useState } from 'react';
import {
  Brain, Activity, Zap, Clock, AlertTriangle, DollarSign,
  CheckCircle2, XCircle, BarChart2, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const PROVIDERS = [
  {
    key: 'groq',
    name: 'Groq',
    model: 'llama-3.3-70b-versatile',
    active: true,
    color: '#f97316',
    description: 'Primary active provider — ultra-fast inference',
  },
  {
    key: 'claude',
    name: 'Claude',
    model: 'claude-sonnet-4',
    active: false,
    color: '#a78bfa',
    description: 'Anthropic — disabled placeholder',
  },
  {
    key: 'openai',
    name: 'OpenAI',
    model: 'gpt-4o',
    active: false,
    color: '#22d3ee',
    description: 'OpenAI — disabled placeholder',
  },
  {
    key: 'gemini',
    name: 'Gemini',
    model: 'gemini-1.5-flash',
    active: false,
    color: '#4ade80',
    description: 'Google — disabled placeholder',
  },
];

const COLORS = ['#10b981', '#a78bfa', '#22d3ee', '#f59e0b'];

const AI_FEATURES = [
  { label: 'Reply Suggestion', icon: '💬', active: true },
  { label: 'Message Generation', icon: '✍️', active: true },
  { label: 'Chat Summarization', icon: '📋', active: true },
  { label: 'Lead Scoring', icon: '🎯', active: true },
  { label: 'Sentiment Detection', icon: '🧠', active: false },
  { label: 'Issue Classification', icon: '🏷️', active: false },
  { label: 'Next Best Action', icon: '⚡', active: false },
];

export default function AiCenter() {
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState({});
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/ai/metrics').then((r) => setMetrics(r.data)).catch(() => {}),
      api.get('/ai/health').then((r) => setHealth(r.data)).catch(() => {}),
      api.get('/analytics/ai-usage').then((r) => setUsageData(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 p-6">Loading AI Center…</div>;

  const totalRequests = metrics?.total ?? 0;
  const todayRequests = metrics?.today ?? 0;
  const failedRequests = metrics?.failed ?? 0;
  const avgLatency = metrics?.avgLatencyMs ? `${metrics.avgLatencyMs}ms` : '—';
  const estimatedCost = metrics?.estimatedCostUSD
    ? `$${metrics.estimatedCostUSD.toFixed(4)}`
    : '$0.00';

  const pieData = usageData.map((d) => ({ name: d.provider, value: parseInt(d.count) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain size={24} className="text-purple-400" />
        <h2 className="text-xl font-bold text-white">AI Center</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Requests" value={totalRequests} icon={Activity} color="purple" />
        <StatCard title="Today" value={todayRequests} icon={TrendingUp} color="blue" />
        <StatCard title="Groq Calls" value={metrics?.groqCalls ?? 0} icon={Zap} color="orange" />
        <StatCard title="Avg Latency" value={avgLatency} icon={Clock} color="yellow" />
        <StatCard title="Failed" value={failedRequests} icon={AlertTriangle} color="red" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provider Status Cards */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity size={14} className="text-emerald-400" /> Provider Status
          </h3>
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const online = health[p.key]?.available ?? p.active;
              return (
                <div
                  key={p.key}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: p.color + '20', color: p.color }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      {!p.active && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                          Placeholder
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.model}</p>
                    <p className="text-xs text-gray-600 truncate">{p.description}</p>
                  </div>
                  <div className="shrink-0">
                    {p.active ? (
                      online ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 size={12} /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <XCircle size={12} /> Offline
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <XCircle size={12} /> Disabled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provider usage pie */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-400" /> Usage Distribution (30d)
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
              No AI usage data yet
            </div>
          )}
        </div>
      </div>

      {/* AI Features */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">AI Feature Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AI_FEATURES.map((f) => (
            <div
              key={f.label}
              className={`rounded-xl p-3 border ${
                f.active
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-[#2a2a2a] border-[#2a2a2a] opacity-50'
              }`}
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-xs font-medium text-white">{f.label}</p>
              <span className={`text-[10px] ${f.active ? 'text-emerald-400' : 'text-gray-600'}`}>
                {f.active ? '● Active' : '○ Coming soon'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Estimated Cost */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4">
        <DollarSign size={20} className="text-yellow-400" />
        <div>
          <p className="text-sm text-gray-400">Estimated AI Cost (month-to-date)</p>
          <p className="text-xl font-bold text-yellow-400">{estimatedCost}</p>
          <p className="text-xs text-gray-600">Groq pricing: ~$0.0001/1k tokens</p>
        </div>
      </div>
    </div>
  );
}
