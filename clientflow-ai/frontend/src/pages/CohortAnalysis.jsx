import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import api from '../utils/api';

const COL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export default function CohortAnalysis() {
  const [monthly, setMonthly] = useState([]);
  const [weekly, setWeekly]   = useState([]);
  const [tab, setTab]         = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/cohorts'),
      api.get('/cohorts/by-week'),
    ]).then(([m, w]) => {
      setMonthly(m.data);
      setWeekly(w.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading cohort analysis...</div>;

  const data = tab === 'monthly' ? monthly : weekly;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Cohort Analysis</h2>
        <div className="flex gap-2">
          {['monthly', 'weekly'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${tab === t ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Retention chart */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Retention & Activation by Cohort (%)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={[...data].reverse()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="cohort" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
              formatter={(v) => `${v}%`}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            <Bar dataKey="retentionPct"   name="Retention %"   fill="#10b981" radius={[4,4,0,0]} />
            <Bar dataKey="activationPct"  name="Activation %"  fill="#3b82f6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by cohort */}
      {tab === 'monthly' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue by Cohort (PKR)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[...monthly].reverse()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="cohort" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} formatter={v => `PKR ${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cohort table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Cohort Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-[#2a2a2a]">
                <th className="text-left pb-2">Cohort</th>
                <th className="text-right pb-2">Signups</th>
                <th className="text-right pb-2">Retained</th>
                <th className="text-right pb-2">Retention %</th>
                <th className="text-right pb-2">Activated</th>
                <th className="text-right pb-2">Activation %</th>
                {tab === 'monthly' && <th className="text-right pb-2">Revenue</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.cohort} className="border-b border-[#1f1f1f] hover:bg-[#222]">
                  <td className="py-2 text-white font-medium">{row.cohort}</td>
                  <td className="py-2 text-right text-gray-300">{row.signups}</td>
                  <td className="py-2 text-right text-emerald-400">{row.retained}</td>
                  <td className="py-2 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${parseFloat(row.retentionPct) >= 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {row.retentionPct}%
                    </span>
                  </td>
                  <td className="py-2 text-right text-blue-400">{row.activated}</td>
                  <td className="py-2 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${parseFloat(row.activationPct) >= 30 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {row.activationPct}%
                    </span>
                  </td>
                  {tab === 'monthly' && <td className="py-2 text-right text-yellow-400">PKR {Number(row.revenue || 0).toLocaleString()}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
