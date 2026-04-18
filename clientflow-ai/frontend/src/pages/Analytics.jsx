import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Users, TrendingUp, Star, MessageSquare, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
const CHART_TOOLTIP = { contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 } };

export default function Analytics() {
  const [stats, setStats]           = useState({});
  const [msgVol, setMsgVol]         = useState([]);
  const [revenue, setRevenue]       = useState([]);
  const [aiUsage, setAiUsage]       = useState([]);
  const [funnel, setFunnel]         = useState({});
  const [topClients, setTopClients] = useState([]);
  const [retention, setRetention]   = useState({});
  const [loading, setLoading]       = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/messages-volume'),
      api.get('/analytics/ai-usage'),
      api.get('/analytics/funnel'),
      api.get('/payments/revenue'),
      api.get('/analytics/top-clients'),
      api.get('/analytics/retention'),

    ]).then(([s, m, a, f, r, tc, ret]) => {
      setStats(s.data);
      setMsgVol(m.data.map(d => ({ ...d, date: format(new Date(d.date), 'dd MMM') })));
      setAiUsage(a.data);
      setFunnel(f.data);
      setRevenue(r.data.map(d => ({ ...d, date: format(new Date(d.date), 'dd MMM'), total: parseFloat(d.total) })));
      setTopClients(tc.data);
      setRetention(ret.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const funnelData = [
    { name: 'Leads',       value: funnel.leads  || 0, color: '#f59e0b' },
    { name: 'Active',      value: funnel.paid   || 0, color: '#3b82f6' },
    { name: 'Repeat',      value: funnel.repeat || 0, color: '#10b981' },
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

      {/* Top Clients & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top 10 Clients by Revenue</h3>
          {topClients.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topClients.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.name || c.whatsapp_number}</p>
                    <p className="text-xs text-gray-500">{c.order_count} orders</p>
                  </div>
                  <span className="text-sm text-emerald-400 font-semibold shrink-0">PKR {Number(c.total_spent_pkr).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Client Retention</h3>
          <div className="space-y-4">
            {[
              { label: 'Never Purchased',     value: parseInt(retention.never_paid  || 0), color: '#6b7280', pct: null },
              { label: 'One-Time Buyers',     value: parseInt(retention.one_time    || 0), color: '#f59e0b', pct: null },
              { label: 'Repeat Customers 🏆', value: parseInt(retention.repeat      || 0), color: '#10b981', pct: null },
            ].map(d => {
              const total = parseInt(retention.never_paid || 0) + parseInt(retention.one_time || 0) + parseInt(retention.repeat || 0);
              const pct = total ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{d.label}</span>
                    <span className="text-white font-medium">{d.value} <span className="text-gray-500 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
