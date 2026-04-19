import { useState } from 'react';
import { Brain, Zap, Clock, AlertTriangle, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard';

const TOOLTIP = { contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 } };

const requestsData = [
  { day: 'Mon', req: 245 }, { day: 'Tue', req: 312 }, { day: 'Wed', req: 289 },
  { day: 'Thu', req: 401 }, { day: 'Fri', req: 356 }, { day: 'Sat', req: 198 },
  { day: 'Sun', req: 342 },
];

const featureData = [
  { name: 'Reply',           value: 45, color: '#10b981' },
  { name: 'Summary',         value: 22, color: '#3b82f6' },
  { name: 'Lead Score',      value: 18, color: '#a855f7' },
  { name: 'Issue Detection', value: 15, color: '#f59e0b' },
];

const providers = [
  { name: 'Groq',   model: 'llama3-70b-8192',  status: 'active', requests: 342, latency: '1.2s', icon: '⚡', color: 'emerald' },
  { name: 'OpenAI', model: 'gpt-4o',            status: 'soon',   requests: 0,   latency: '—',    icon: '🤖', color: 'gray' },
  { name: 'Claude', model: 'claude-3-opus',      status: 'soon',   requests: 0,   latency: '—',    icon: '🔮', color: 'gray' },
  { name: 'Gemini', model: 'gemini-1.5-pro',     status: 'soon',   requests: 0,   latency: '—',    icon: '💎', color: 'gray' },
];

const promptHistory = [
  { time: '14:32', feature: 'Reply',      tokens: 847,  status: 'success', latency: '1.1s' },
  { time: '14:28', feature: 'Lead Score', tokens: 312,  status: 'success', latency: '0.9s' },
  { time: '14:15', feature: 'Summary',    tokens: 1204, status: 'success', latency: '1.4s' },
  { time: '13:58', feature: 'Reply',      tokens: 634,  status: 'failed',  latency: '—'    },
  { time: '13:44', feature: 'Reply',      tokens: 891,  status: 'success', latency: '1.2s' },
];

const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.1) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function AiCenter() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total AI Requests"  value="12,847"  icon={Brain}          color="purple" sub="all time" />
        <StatCard title="Today's Requests"   value="342"     icon={Zap}            color="emerald" sub="via Groq" />
        <StatCard title="Avg Response Time"  value="1.2s"    icon={Clock}          color="blue"   />
        <StatCard title="Failed Requests"    value="3"       icon={AlertTriangle}  color="red"    sub="last 24 h" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests over time */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Requests This Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={requestsData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip {...TOOLTIP} />
              <Line type="monotone" dataKey="req" stroke="#a855f7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Feature usage pie */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">AI Feature Usage</h3>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={featureData} dataKey="value" cx="50%" cy="50%" outerRadius={75} labelLine={false} label={PieLabel}>
                {featureData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip {...TOOLTIP} formatter={v => [`${v}%`, 'Usage']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {featureData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value}%)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Provider Cards */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">AI Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {providers.map(p => (
            <div key={p.name} className={`bg-[#1a1a1a] border rounded-xl p-4 ${p.status === 'active' ? 'border-emerald-500/30' : 'border-[#2a2a2a]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                </div>
                {p.status === 'active' ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Active</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-500">Soon</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mb-3 font-mono">{p.model}</p>
              {p.status === 'active' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Today</span>
                    <span className="text-white font-medium">{p.requests} req</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Latency</span>
                    <span className="text-emerald-400 font-medium">{p.latency}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600">Placeholder — connect API key to activate</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Token / Cost Estimation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Tokens Today',        value: '284,320',  sub: 'Groq tokens used',     color: 'text-purple-400' },
          { label: 'Est. Daily Cost',     value: '$0.43',    sub: 'at current usage',      color: 'text-emerald-400' },
          { label: 'Est. Monthly Cost',   value: '$12.90',   sub: 'projected at 30 days',  color: 'text-blue-400' },
        ].map(c => (
          <div key={c.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
            <p className={`text-2xl font-bold ${c.color} mb-1`}>{c.value}</p>
            <p className="text-sm text-white font-medium">{c.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Prompt History */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Prompt History</h3>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Time', 'Feature', 'Tokens', 'Status', 'Latency'].map(h => (
                  <th key={h} className="text-left text-gray-500 py-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promptHistory.map((r, i) => (
                <tr key={i} className="border-b border-[#2a2a2a]/50 hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4 text-gray-400 font-mono">{r.time}</td>
                  <td className="py-2.5 pr-4 text-white font-medium">{r.feature}</td>
                  <td className="py-2.5 pr-4 text-gray-400">{r.tokens.toLocaleString()}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`flex items-center gap-1 w-fit text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {r.status === 'success' ? <CheckCircle size={9} /> : <AlertTriangle size={9} />}
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-400">{r.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
