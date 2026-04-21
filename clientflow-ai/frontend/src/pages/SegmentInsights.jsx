import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../utils/api';

const SEGMENT_COLORS = {
  new:        '#10b981',
  active:     '#3b82f6',
  high_value: '#f59e0b',
  inactive:   '#6b7280',
  at_risk:    '#ef4444',
};

const ENGAGEMENT_LABELS = {
  very_high: { label: 'Very High', cls: 'bg-emerald-500/20 text-emerald-400' },
  high:      { label: 'High',      cls: 'bg-blue-500/20 text-blue-400' },
  medium:    { label: 'Medium',    cls: 'bg-yellow-500/20 text-yellow-400' },
  low:       { label: 'Low',       cls: 'bg-gray-500/20 text-gray-400' },
};

export default function SegmentInsights() {
  const [data, setData]         = useState(null);
  const [selected, setSelected] = useState(null);
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/segments').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const viewClients = async (key) => {
    setSelected(key);
    const r = await api.get(`/segments/${key}/clients`);
    setClients(r.data);
  };

  if (loading) return <div className="text-gray-400">Loading segment insights...</div>;
  if (!data) return null;

  const { segments } = data;
  const chartData = segments.map(s => ({ name: s.label.replace(' Customers', ''), count: s.count, key: s.key }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Customer Segment Insights</h2>

      {/* Segment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {segments.map(s => {
          const growth = parseFloat(s.growthPct);
          const eng = ENGAGEMENT_LABELS[s.engagementLevel] || ENGAGEMENT_LABELS.medium;
          return (
            <div
              key={s.key}
              onClick={() => viewClients(s.key)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 cursor-pointer hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-3xl font-bold text-white">{s.count.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: SEGMENT_COLORS[s.key] + '20' }}>
                  <Users size={18} style={{ color: SEGMENT_COLORS[s.key] }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-sm">
                  {growth >= 0
                    ? <><ArrowUpRight size={14} className="text-emerald-400" /><span className="text-emerald-400">+{growth}%</span></>
                    : <><ArrowDownRight size={14} className="text-red-400" /><span className="text-red-400">{growth}%</span></>
                  }
                  <span className="text-gray-500 text-xs ml-1">vs prev period</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${eng.cls}`}>{eng.label}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                <p className="text-xs text-gray-500">Revenue Contribution</p>
                <p className="text-sm font-semibold text-white">PKR {s.revenue.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar Chart */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Segment Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map(entry => (
                <Cell key={entry.key} fill={SEGMENT_COLORS[entry.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Client Drill-Down */}
      {selected && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            {segments.find(s => s.key === selected)?.label} — Clients
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
                  <th className="text-left pb-2">Name</th>
                  <th className="text-left pb-2">WhatsApp</th>
                  <th className="text-left pb-2">Status</th>
                  <th className="text-right pb-2">Spent (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="border-b border-[#1f1f1f] hover:bg-[#222]">
                    <td className="py-2 text-white">{c.name || '—'}</td>
                    <td className="py-2 text-gray-400">{c.whatsapp_number}</td>
                    <td className="py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{c.status}</span></td>
                    <td className="py-2 text-right text-emerald-400">{Number(c.total_spent_pkr).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
