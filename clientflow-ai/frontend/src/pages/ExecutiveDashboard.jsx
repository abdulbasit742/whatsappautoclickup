import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { format, subDays, startOfMonth } from 'date-fns';
import api from '../utils/api';

const PLAN_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function ExecutiveDashboard() {
  const [overview, setOverview]     = useState(null);
  const [revenueTrend, setRevenue]  = useState([]);
  const [adoption, setAdoption]     = useState([]);
  const [dateRange, setDateRange]   = useState('30d');
  const [loading, setLoading]       = useState(true);

  const load = async (range) => {
    setLoading(true);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const from = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const to   = format(new Date(), 'yyyy-MM-dd');
    try {
      const [ov, rv, fa] = await Promise.all([
        api.get(`/bi/overview?from=${from}&to=${to}`),
        api.get(`/bi/revenue-trend?period=${days >= 90 ? 'week' : 'day'}`),
        api.get('/bi/feature-adoption'),
      ]);
      setOverview(ov.data);
      setRevenue(rv.data);
      setAdoption(fa.data);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(dateRange); }, [dateRange]);

  if (loading) return <div className="text-gray-400">Loading executive dashboard...</div>;
  if (!overview) return null;

  const planData = overview.plan_distribution?.map(p => ({ name: p.status, value: parseInt(p.count) })) || [];
  const aiData   = overview.ai_usage_trend?.map(t => ({ date: format(new Date(t.week || t.date || t.created_at), 'MMM dd'), count: parseInt(t.count) })) || [];
  const revData  = revenueTrend.map(r => ({ date: format(new Date(r.date), 'MMM dd'), revenue: parseFloat(r.total) }));

  const KPI = ({ label, value, sub, trend, trendValue, color = 'text-white' }) => (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      {trendValue !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trendValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trendValue >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trendValue)}% vs prev period
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Executive BI Dashboard</h2>
        <div className="flex gap-2 items-center">
          <Calendar size={14} className="text-gray-400" />
          {['7d', '30d', '90d'].map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${dateRange === r ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="MRR" value={`PKR ${Number(overview.mrr || 0).toLocaleString()}`} trendValue={overview.mrr_growth_pct} color="text-emerald-400" />
        <KPI label="Churn Rate" value={`${overview.churn_rate}%`} sub={`Retention: ${overview.retention_rate}%`} color={parseFloat(overview.churn_rate) < 5 ? 'text-emerald-400' : 'text-red-400'} />
        <KPI label="New Clients" value={overview.new_clients} sub={`Total: ${overview.total_clients}`} color="text-blue-400" />
        <KPI label="Expansion Revenue" value={`PKR ${Number(overview.expansion_revenue || 0).toLocaleString()}`} color="text-yellow-400" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Support Load" value={overview.support_load || 0} sub="Alerts this period" color="text-orange-400" />
        <KPI label="New Customers" value={overview.top_segments?.new_customers || 0} color="text-white" />
        <KPI label="High-Value" value={overview.top_segments?.high_value_customers || 0} color="text-yellow-400" />
        <KPI label="Inactive" value={overview.top_segments?.inactive_customers || 0} color="text-gray-400" />
      </div>

      {/* Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue Trend (PKR)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revData}>
              <CartesianGrid stroke="#1f1f1f" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                formatter={v => `PKR ${Number(v).toLocaleString()}`}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={e => `${e.name}: ${e.value}`} labelLine={false}>
                {planData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Usage + Feature Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {aiData.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">AI Usage Growth</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={aiData}>
                <CartesianGrid stroke="#1f1f1f" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
                <Bar dataKey="count" name="AI Calls" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {adoption.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Feature Adoption (Total Uses)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={adoption.map(a => ({ name: a.feature, uses: parseInt(a.total_uses) }))}>
                <CartesianGrid stroke="#1f1f1f" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
                <Bar dataKey="uses" name="Uses" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
