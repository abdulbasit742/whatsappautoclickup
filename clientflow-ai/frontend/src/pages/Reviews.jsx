import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import api from '../utils/api';
import DataTable from '../components/DataTable';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats]     = useState({});

  useEffect(() => {
    api.get('/reviews').then(r => setReviews(r.data));
    api.get('/reviews/stats').then(r => setStats(r.data));
  }, []);

  const pieData = [
    { name: 'Positive', value: parseInt(stats.positive) || 0 },
    { name: 'Neutral',  value: parseInt(stats.neutral)  || 0 },
    { name: 'Negative', value: parseInt(stats.negative) || 0 },
  ];

  const cols = [
    { key: 'name',       label: 'Client',    render: (v, r) => v || r.whatsapp_number },
    { key: 'rating',     label: 'Rating',    render: v => '⭐'.repeat(v) },
    { key: 'sentiment',  label: 'Sentiment', render: v => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        v === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
        v === 'negative' ? 'bg-red-500/20 text-red-400' :
        'bg-yellow-500/20 text-yellow-400'
      }`}>{v}</span>
    )},
    { key: 'feedback',   label: 'Feedback' },
    { key: 'created_at', label: 'Date',      render: v => format(new Date(v), 'dd MMM yyyy') },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Reviews</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-sm text-gray-400 mb-1">Average Rating</p>
          <p className="text-3xl font-bold text-white">{parseFloat(stats.avg_rating || 0).toFixed(1)} ⭐</p>
          <p className="text-xs text-gray-500 mt-1">{stats.total || 0} total reviews</p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 md:col-span-2">
          <p className="text-sm font-medium text-gray-400 mb-2">Sentiment Breakdown</p>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={e => `${e.name}: ${e.value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DataTable columns={cols} data={reviews} />
    </div>
  );
}
