import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';

const EVENTS = [
  { key: 'connected_ai_provider',  label: 'Connected AI Provider',   color: 'text-purple-400' },
  { key: 'imported_contacts',      label: 'Imported Contacts',        color: 'text-blue-400' },
  { key: 'created_first_campaign', label: 'Created First Campaign',   color: 'text-emerald-400' },
  { key: 'opened_inbox',           label: 'Opened Inbox',             color: 'text-yellow-400' },
  { key: 'invited_team_member',    label: 'Invited Team Member',      color: 'text-pink-400' },
];

export default function ActivationMetrics() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend]     = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/activation/summary'),
      api.get('/activation/trend'),
      api.get('/activation/clients'),
    ]).then(([s, t, c]) => {
      setSummary(s.data);
      setTrend(t.data);
      setClients(c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading activation metrics...</div>;
  if (!summary) return null;

  const funnelData = EVENTS.map(e => ({
    name: e.label.replace('Connected ', '').replace('Created First ', '').replace('Imported ', '').replace('Opened ', '').replace('Invited ', ''),
    count: summary[e.key] || 0,
    pct: summary.total_clients > 0 ? ((summary[e.key] / summary.total_clients) * 100).toFixed(1) : 0,
  }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Activation Metrics</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Clients</p>
          <p className="text-2xl font-bold text-white">{summary.total_clients}</p>
        </div>
        {EVENTS.map(e => (
          <div key={e.key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{e.label}</p>
            <p className={`text-2xl font-bold ${e.color}`}>{summary[e.key] || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.total_clients > 0 ? ((summary[e.key] / summary.total_clients) * 100).toFixed(1) : 0}% adoption
            </p>
          </div>
        ))}
      </div>

      {/* Funnel chart */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Activation Funnel</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={funnelData} layout="vertical" margin={{ left: 80, right: 30, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, summary.total_clients || 1]} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
              formatter={(v, name, props) => [`${v} clients (${props.payload.pct}%)`]}
            />
            <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Client activation table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Client Activation Progress</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-[#2a2a2a]">
                <th className="text-left pb-2">Client</th>
                <th className="text-center pb-2">Steps</th>
                {EVENTS.map(e => <th key={e.key} className="text-center pb-2" title={e.label}>{e.label.split(' ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {clients.slice(0, 20).map(c => {
                const evts = Array.isArray(c.events) ? c.events : [];
                return (
                  <tr key={c.id} className="border-b border-[#1f1f1f] hover:bg-[#222]">
                    <td className="py-2 text-white">{c.name || c.whatsapp_number}</td>
                    <td className="py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${parseInt(c.steps_completed) >= 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {c.steps_completed}/5
                      </span>
                    </td>
                    {EVENTS.map(e => (
                      <td key={e.key} className="py-2 text-center">
                        {evts.includes(e.key)
                          ? <CheckCircle size={14} className="text-emerald-400 mx-auto" />
                          : <Circle size={14} className="text-gray-700 mx-auto" />
                        }
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
