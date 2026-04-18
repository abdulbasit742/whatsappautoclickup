import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Users, TrendingUp, Star, MessageSquare, RefreshCw, Lightbulb, Zap, Target, Activity } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
const CHART_TOOLTIP = { contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 } };

const SEGMENT_META = {
  hot_leads:  { label: 'Hot Leads',      color: '#f97316', bg: 'bg-orange-500/20 text-orange-400',   icon: '🔥' },
  interested: { label: 'Interested',     color: '#f59e0b', bg: 'bg-yellow-500/20 text-yellow-400',   icon: '👀' },
  paying:     { label: 'Paying',         color: '#10b981', bg: 'bg-emerald-500/20 text-emerald-400', icon: '💰' },
  repeat:     { label: 'Repeat Buyers',  color: '#8b5cf6', bg: 'bg-purple-500/20 text-purple-400',   icon: '⭐' },
  at_risk:    { label: 'At Risk',        color: '#ef4444', bg: 'bg-red-500/20 text-red-400',         icon: '⚠️' },
  inactive:   { label: 'Inactive',       color: '#6b7280', bg: 'bg-gray-500/20 text-gray-400',       icon: '😴' },
};

const INSIGHT_COLORS = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
  info:    'bg-blue-500/10 border-blue-500/20 text-blue-300',
};

export default function Analytics() {
  const [stats, setStats]       = useState({});
  const [msgVol, setMsgVol]     = useState([]);
  const [revenue, setRevenue]   = useState([]);
  const [aiUsage, setAiUsage]   = useState([]);
  const [funnel, setFunnel]     = useState({});
  const [segments, setSegments] = useState(null);
  const [insights, setInsights] = useState(null);
  const [aiPerf, setAiPerf]     = useState([]);
  const [svcPerf, setSvcPerf]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/messages-volume'),
      api.get('/analytics/ai-usage'),
      api.get('/analytics/funnel'),
      api.get('/payments/revenue'),
      api.get('/analytics/segments').catch(() => ({ data: null })),
      api.get('/analytics/insights').catch(() => ({ data: null })),
      api.get('/analytics/ai-performance').catch(() => ({ data: [] })),
      api.get('/analytics/service-performance').catch(() => ({ data: [] })),
    ]).then(([s, m, a, f, r, seg, ins, ap, sp]) => {
      setStats(s.data);
      setMsgVol(m.data.map(d => ({ ...d, date: format(new Date(d.date), 'dd MMM') })));
      setAiUsage(a.data);
      setFunnel(f.data);
      setRevenue(r.data.map(d => ({ ...d, date: format(new Date(d.date), 'dd MMM'), total: parseFloat(d.total) })));
      setSegments(seg.data);
      setInsights(ins.data);
      setAiPerf(ap.data);
      setSvcPerf(sp.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const funnelData = [
    { name: 'Leads',  value: funnel.leads  || 0, color: '#f59e0b' },
    { name: 'Active', value: funnel.active || 0, color: '#3b82f6' },
    { name: 'Paid',   value: funnel.paid   || 0, color: '#10b981' },
    { name: 'Repeat', value: funnel.repeat || 0, color: '#8b5cf6' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Analytics</h2>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Clients"  value={stats.totalClients  ?? 0} icon={Users}          color="emerald" sub={`+${stats.newThisWeek ?? 0} this week`} />
        <StatCard title="Revenue (30d)"  value={`PKR ${(stats.revenueMonth || 0).toLocaleString()}`} icon={TrendingUp} color="blue" />
        <StatCard title="Avg Rating"     value={`${stats.avgRating  ?? '0.0'} ⭐`}              icon={Star}          color="yellow" />
        <StatCard title="Total Messages" value={msgVol.reduce((a, b) => a + parseInt(b.count || 0), 0)} icon={MessageSquare} color="purple" />
      </div>

      {/* ── Actionable Insights ── */}
      {insights && insights.insights?.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb size={14} className="text-yellow-400" /> Business Insights
          </h3>
          <div className="space-y-2">
            {insights.insights.map((ins, i) => (
              <div key={i} className={`text-xs px-3 py-2.5 rounded-lg border ${INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.info}`}>
                {ins.type === 'success' ? '✅' : ins.type === 'warning' ? '⚠️' : 'ℹ️'} {ins.message}
              </div>
            ))}
          </div>
          {insights.dropOff && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Engaged', value: `${insights.dropOff.engagedPct}%`,    sub: 'of all clients', color: 'text-blue-400' },
                { label: 'Asked Pricing', value: `${insights.dropOff.pricingPct}%`,  sub: 'of engaged', color: 'text-yellow-400' },
                { label: 'Pay Attempt', value: `${insights.dropOff.payAttemptPct}%`, sub: 'of pricing', color: 'text-orange-400' },
                { label: 'Converted', value: `${insights.dropOff.conversionPct}%`,   sub: 'overall', color: 'text-emerald-400' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-[#0f0f0f] rounded-lg p-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-white mt-0.5">{label}</p>
                  <p className="text-xs text-gray-600">{sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Client Segments ── */}
      {segments && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={14} className="text-blue-400" /> Client Segments
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(SEGMENT_META).map(([key, meta]) => (
              <div key={key} className="text-center bg-[#0f0f0f] rounded-xl p-3">
                <div className="text-2xl mb-1">{meta.icon}</div>
                <p className="text-xl font-bold text-white">{segments[key] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">{meta.label}</p>
              </div>
            ))}
          </div>
          {/* Segment bar */}
          <div className="mt-4">
            {(() => {
              const total = Object.values(segments).reduce((a, b) => a + b, 0) || 1;
              return (
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {Object.entries(SEGMENT_META).map(([key, meta]) => {
                    const pct = (segments[key] / total) * 100;
                    if (pct < 1) return null;
                    return (
                      <div key={key} style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        title={`${meta.label}: ${segments[key]} (${pct.toFixed(1)}%)`} />
                    );
                  })}
                </div>
              );
            })()}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {Object.entries(SEGMENT_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue (30 days)</h3>
          {revenue.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => [`PKR ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Message Volume */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Message Volume (30 days)</h3>
          {msgVol.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No messages yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={msgVol}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Client Funnel */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Client Funnel</h3>
          <div className="space-y-3">
            {funnelData.map((d, i) => (
              <div key={d.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{d.name}</span>
                  <span className="text-white font-medium">{d.value}</span>
                </div>
                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${funnelData[0].value ? (d.value / funnelData[0].value) * 100 : 0}%`,
                      backgroundColor: d.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={160} className="mt-4">
            <BarChart data={funnelData}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {funnelData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Provider Usage */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">AI Provider Usage</h3>
          {aiUsage.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">No AI usage data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={aiUsage} dataKey="count" nameKey="provider" cx="50%" cy="50%" outerRadius={75} label={e => `${e.provider}: ${e.count}`}>
                    {aiUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {aiUsage.map((d, i) => (
                  <div key={d.provider} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {d.provider} ({d.count})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AI Provider Performance ── */}
      {aiPerf.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={14} className="text-purple-400" /> AI Provider Performance (30 days)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-[#2a2a2a]">
                  <th className="text-left pb-2">Provider</th>
                  <th className="text-right pb-2">Calls</th>
                  <th className="text-right pb-2">Success Rate</th>
                  <th className="text-right pb-2">Avg Latency</th>
                  <th className="text-right pb-2">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {aiPerf.map(p => (
                  <tr key={p.provider}>
                    <td className="py-2.5 text-white capitalize font-medium">{p.provider}</td>
                    <td className="py-2.5 text-right text-gray-300">{p.total_calls}</td>
                    <td className="py-2.5 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        parseFloat(p.success_rate) >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                        parseFloat(p.success_rate) >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{p.success_rate}%</span>
                    </td>
                    <td className="py-2.5 text-right text-gray-300">{p.avg_latency_ms ? `${p.avg_latency_ms}ms` : '—'}</td>
                    <td className="py-2.5 text-right text-gray-500 text-xs">
                      {p.last_used ? format(new Date(p.last_used), 'dd MMM HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Service Performance ── */}
      {svcPerf.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" /> Service Performance
          </h3>
          <div className="space-y-3">
            {svcPerf.slice(0, 6).map((s, i) => {
              const maxRev = parseFloat(svcPerf[0]?.total_revenue) || 1;
              const rev    = parseFloat(s.total_revenue) || 0;
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-600 w-4 shrink-0">#{i+1}</span>
                      <span className="text-white truncate">{s.name}</span>
                      {i === 0 && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full shrink-0">Best</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                      <span>{s.total_orders || 0} orders</span>
                      <span className="text-emerald-400 font-medium">PKR {Number(rev).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${(rev / maxRev) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Summary */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Summary Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Active This Week',   value: stats.activeClients   ?? 0 },
            { label: 'New This Week',      value: stats.newThisWeek     ?? 0 },
            { label: 'Pending Payments',   value: stats.pendingPayments ?? 0 },
            { label: 'Unresolved Alerts',  value: stats.unresolvedAlerts ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-white mb-1">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
