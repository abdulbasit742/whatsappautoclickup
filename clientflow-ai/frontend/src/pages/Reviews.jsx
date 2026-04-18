import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { Star, Search } from 'lucide-react';
import api from '../utils/api';
import DataTable from '../components/DataTable';
import { useToast } from '../components/Toast';

const STARS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
const PIE_COLORS  = ['#10b981', '#f59e0b', '#ef4444'];
const BAR_COLORS  = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'];
const CHART_TOOLTIP = { contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 } };

export default function Reviews() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats]     = useState({});
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/reviews'),
      api.get('/reviews/stats'),
    ]).then(([r, s]) => {
      setReviews(r.data);
      setStats(s.data);
    }).catch(err => {
      setError(err.response?.data?.error || 'Failed to load reviews');
      toast('Failed to load reviews', 'error');
    }).finally(() => setLoading(false));
  }, []);

  const pieData = [
    { name: 'Positive', value: parseInt(stats.positive) || 0 },
    { name: 'Neutral',  value: parseInt(stats.neutral)  || 0 },
    { name: 'Negative', value: parseInt(stats.negative) || 0 },
  ];

  // Rating distribution 1-5
  const barData = [1, 2, 3, 4, 5].map(n => ({
    rating: `${n}★`,
    count: reviews.filter(r => r.rating === n).length,
  }));

  const filtered = reviews.filter(r => {
    const q = search.toLowerCase();
    return (r.name || r.whatsapp_number || '').toLowerCase().includes(q)
        || (r.feedback || '').toLowerCase().includes(q);
  });

  const total   = parseInt(stats.total)    || 0;
  const posPct  = total ? Math.round(parseInt(stats.positive || 0) / total * 100) : 0;
  const negPct  = total ? Math.round(parseInt(stats.negative || 0) / total * 100) : 0;

  const cols = [
    { key: 'name',       label: 'Client',    render: (v, r) => v || r.whatsapp_number || '—' },
    { key: 'rating',     label: 'Rating',    render: v => STARS[Math.min(Math.max(v, 1), 5)] },
    { key: 'sentiment',  label: 'Sentiment', render: v => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        v === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
        v === 'negative' ? 'bg-red-500/20 text-red-400' :
        'bg-yellow-500/20 text-yellow-400'
      }`}>
        {v === 'positive' ? '😊 Positive' : v === 'negative' ? '😞 Negative' : '😐 Neutral'}
      </span>
    )},
    { key: 'feedback', label: 'Feedback', render: v => (
      <span title={v || ''} className="cursor-help">
        {v ? (v.length > 60 ? v.slice(0, 60) + '…' : v) : '—'}
      </span>
    )},
    { key: 'created_at', label: 'Date', render: v => format(new Date(v), 'dd MMM yyyy') },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
        <Star size={20} className="text-yellow-400" /> Reviews
      </h2>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Average Rating</p>
              <p className="text-2xl font-bold text-emerald-400">{parseFloat(stats.avg_rating || 0).toFixed(1)} ⭐</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Total Reviews</p>
              <p className="text-2xl font-bold text-blue-400">{total}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Positive</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.positive || 0} <span className="text-sm font-normal text-gray-500">({posPct}%)</span></p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Negative</p>
              <p className="text-2xl font-bold text-red-400">{stats.negative || 0} <span className="text-sm font-normal text-gray-500">({negPct}%)</span></p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Sentiment Distribution</h3>
              {total === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                         outerRadius={70} label={e => e.value > 0 ? `${e.name}: ${e.value}` : ''}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Rating Distribution</h3>
              {total === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} barSize={28}>
                    <XAxis dataKey="rating" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Search + Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-3">
              <Search size={14} className="text-gray-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by client name or feedback…"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                {reviews.length === 0 ? 'No reviews yet.' : 'No results match your search.'}
              </div>
            ) : (
              <DataTable columns={cols} data={filtered} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

