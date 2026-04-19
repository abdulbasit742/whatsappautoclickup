import { useEffect, useState } from 'react';
import { TrendingUp, CreditCard, Target, DollarSign, RefreshCw, Plus, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { format } from 'date-fns';
import api from '../utils/api';
import StatCard from '../components/StatCard';

const TOOLTIP_STYLE = { contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 } };
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f97316'];

export default function Revenue() {
  const [summary, setSummary] = useState({});
  const [trend, setTrend]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetModal, setTargetModal] = useState(false);
  const [targetForm, setTargetForm]   = useState({ target_pkr: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  const load = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.get('/revenue/summary'),
        api.get('/revenue/trend'),
      ]);
      setSummary(s.data);
      setTrend(t.data.map(d => ({ ...d, date: format(new Date(d.date), 'dd MMM'), total: parseFloat(d.total) })));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setTarget = async () => {
    await api.post('/revenue/targets', targetForm);
    setTargetModal(false);
    load();
  };

  const targetPct = summary.current_target
    ? Math.min(100, ((summary.this_month / summary.current_target.target_pkr) * 100)).toFixed(1)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Revenue Intelligence</h2>
        <div className="flex gap-2">
          <button onClick={() => setTargetModal(true)} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            <Target size={14} /> Set Target
          </button>
          <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue"    value={`PKR ${Number(summary.total_revenue || 0).toLocaleString()}`} icon={DollarSign} color="emerald" />
        <StatCard title="This Month"       value={`PKR ${Number(summary.this_month || 0).toLocaleString()}`}    icon={TrendingUp}  color="blue"
          sub={summary.growth_pct != null ? `${summary.growth_pct > 0 ? '+' : ''}${summary.growth_pct}% vs last month` : undefined} />
        <StatCard title="Pipeline Value"   value={`PKR ${Number(summary.pipeline_value || 0).toLocaleString()}`} icon={CreditCard} color="yellow" />
        <StatCard title="Conversion Rate"  value={`${summary.conversion_rate || '0.0'}%`} icon={Target} color="purple"
          sub={summary.won_count ? `${summary.won_count} deals won` : undefined} />
      </div>

      {/* Revenue target progress */}
      {summary.current_target && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-white">Monthly Target Progress</h3>
            <span className="text-xs text-gray-400">PKR {Number(summary.current_target.target_pkr).toLocaleString()}</span>
          </div>
          <div className="h-3 bg-[#2a2a2a] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${targetPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>PKR {Number(summary.this_month || 0).toLocaleString()} earned</span>
            <span className={parseFloat(targetPct) >= 100 ? 'text-emerald-400 font-bold' : ''}>{targetPct}%</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue trend */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue Trend (30 days)</h3>
          {trend.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [`PKR ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#revGrad2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by service */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue by Service</h3>
          {!summary.by_service?.length ? (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No service data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.by_service} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={80} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [`PKR ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {summary.by_service.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Target modal */}
      {targetModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Set Revenue Target</h3>
              <button onClick={() => setTargetModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Target (PKR)</label>
                <input type="number" value={targetForm.target_pkr} onChange={e => setTargetForm(f => ({ ...f, target_pkr: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Year</label>
                  <input type="number" value={targetForm.year} onChange={e => setTargetForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Month</label>
                  <input type="number" min={1} max={12} value={targetForm.month} onChange={e => setTargetForm(f => ({ ...f, month: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={setTarget} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Save</button>
              <button onClick={() => setTargetModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
