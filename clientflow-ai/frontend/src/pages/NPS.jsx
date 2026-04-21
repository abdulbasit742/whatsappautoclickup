import { useEffect, useState } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import api from '../utils/api';

const COLORS = { promoter: '#10b981', passive: '#f59e0b', detractor: '#ef4444' };

export default function NPS() {
  const [analytics, setAnalytics] = useState(null);
  const [responses, setResponses] = useState([]);
  const [clients, setClients]     = useState([]);
  const [sendModal, setSendModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading]     = useState(true);

  const load = () => Promise.all([
    api.get('/nps/analytics').then(r => setAnalytics(r.data)),
    api.get('/nps').then(r => setResponses(r.data)),
  ]);

  useEffect(() => {
    Promise.all([load(), api.get('/clients').then(r => setClients(r.data))]).finally(() => setLoading(false));
  }, []);

  const sendSurvey = async () => {
    if (!selectedClient) return alert('Select a client');
    try {
      await api.post('/nps/send', { client_id: selectedClient });
      alert('NPS survey sent!');
      setSendModal(false);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  if (loading) return <div className="text-gray-400">Loading NPS...</div>;

  const pieData = analytics ? [
    { name: 'Promoters',  value: analytics.promoters,  key: 'promoter' },
    { name: 'Passives',   value: analytics.passives,   key: 'passive' },
    { name: 'Detractors', value: analytics.detractors, key: 'detractor' },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Net Promoter Score</h2>
        <button onClick={() => setSendModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Send size={16} /> Send Survey
        </button>
      </div>

      {/* NPS Score hero */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center">
            <p className="text-xs text-gray-400 mb-2">NPS Score</p>
            <p className={`text-5xl font-bold ${analytics.nps_score >= 50 ? 'text-emerald-400' : analytics.nps_score >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {analytics.nps_score}
            </p>
            <p className="text-xs text-gray-500 mt-2">{analytics.total} responses · avg {analytics.avg_score}/10</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 md:col-span-2">
            <p className="text-sm font-medium text-gray-400 mb-2">Response Breakdown</p>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={e => `${e.name}: ${e.value}`} labelLine={false}>
                  {pieData.map(entry => <Cell key={entry.key} fill={COLORS[entry.key]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Promoter/Detractor counts */}
      {analytics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: '😍 Promoters',  value: analytics.promoters,  color: 'text-emerald-400', desc: 'Score 9–10' },
            { label: '😐 Passives',   value: analytics.passives,   color: 'text-yellow-400',  desc: 'Score 7–8' },
            { label: '😞 Detractors', value: analytics.detractors, color: 'text-red-400',     desc: 'Score 0–6' },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend */}
      {analytics?.trend?.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">NPS Trend (Weekly Avg Score)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={analytics.trend}>
              <CartesianGrid stroke="#1f1f1f" />
              <XAxis dataKey="week" tickFormatter={v => format(new Date(v), 'MMM dd')} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              <Line type="monotone" dataKey="avg_score" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Responses */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Responses</h3>
        <div className="space-y-2">
          {responses.filter(r => r.status === 'responded').slice(0, 20).map(r => (
            <div key={r.id} className="bg-[#111] rounded-xl p-3 flex items-start gap-3">
              <span className={`text-lg font-bold w-8 shrink-0 ${r.score >= 9 ? 'text-emerald-400' : r.score >= 7 ? 'text-yellow-400' : 'text-red-400'}`}>{r.score}</span>
              <div className="flex-1">
                <p className="text-sm text-white">{r.client_name || r.whatsapp_number}</p>
                {r.comment && <p className="text-xs text-gray-400 mt-0.5">"{r.comment}"</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${r.category === 'promoter' ? 'bg-emerald-500/20 text-emerald-400' : r.category === 'passive' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                {r.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Send modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Send NPS Survey</h3>
              <button onClick={() => setSendModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <label className="block text-xs text-gray-400 mb-1">Select Client</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
              <option value="">Choose a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
            </select>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSendModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={sendSurvey} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Send Survey</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
