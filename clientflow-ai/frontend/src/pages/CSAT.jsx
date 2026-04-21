import { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import api from '../utils/api';

export default function CSAT() {
  const [analytics, setAnalytics] = useState(null);
  const [responses, setResponses] = useState([]);
  const [clients, setClients]     = useState([]);
  const [sendModal, setSendModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [surveyType, setSurveyType]         = useState('support');
  const [loading, setLoading]     = useState(true);

  const load = () => Promise.all([
    api.get('/csat/analytics').then(r => setAnalytics(r.data)),
    api.get('/csat').then(r => setResponses(r.data)),
  ]);

  useEffect(() => {
    Promise.all([load(), api.get('/clients').then(r => setClients(r.data))]).finally(() => setLoading(false));
  }, []);

  const sendSurvey = async () => {
    if (!selectedClient) return alert('Select a client');
    try {
      await api.post('/csat/send', { client_id: selectedClient, survey_type: surveyType });
      alert('CSAT survey sent!');
      setSendModal(false);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  if (loading) return <div className="text-gray-400">Loading CSAT...</div>;

  const byTypeData = analytics?.by_type?.map(t => ({
    name: t.survey_type === 'support' ? 'Support' : 'Campaign',
    avg: parseFloat(t.avg_rating),
    total: parseInt(t.total),
  })) || [];

  const ratingColors = { 1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#84cc16', 5: '#10b981' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">CSAT Surveys</h2>
        <button onClick={() => setSendModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Send size={16} /> Send Survey
        </button>
      </div>

      {/* Summary */}
      {analytics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400 mb-2">Overall CSAT</p>
            <p className={`text-4xl font-bold ${analytics.avg_rating >= 4 ? 'text-emerald-400' : analytics.avg_rating >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
              {analytics.avg_rating.toFixed(1)} / 5
            </p>
            <p className="text-xs text-gray-500 mt-2">{analytics.total} responses</p>
          </div>
          <div className="col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">By Survey Type</h3>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={byTypeData}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} formatter={v => `${v}/5`} />
                <Bar dataKey="avg" name="Avg Rating" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trend */}
      {analytics?.trend?.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">CSAT Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={analytics.trend}>
              <CartesianGrid stroke="#1f1f1f" />
              <XAxis dataKey="week" tickFormatter={v => format(new Date(v), 'MMM dd')} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis domain={[0, 5]} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              <Line type="monotone" dataKey="avg_rating" stroke="#10b981" strokeWidth={2} dot={false} />
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
              <span className="text-lg font-bold w-6 shrink-0" style={{ color: ratingColors[r.rating] || '#fff' }}>{'⭐'.repeat(r.rating)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white">{r.client_name || r.whatsapp_number}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{r.survey_type}</span>
                </div>
                {r.comment && <p className="text-xs text-gray-400 mt-0.5">"{r.comment}"</p>}
              </div>
            </div>
          ))}
          {responses.filter(r => r.status === 'responded').length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No responses yet.</p>
          )}
        </div>
      </div>

      {/* Send Modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Send CSAT Survey</h3>
              <button onClick={() => setSendModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Survey Type</label>
                <select value={surveyType} onChange={e => setSurveyType(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="support">Support Interaction</option>
                  <option value="campaign">Campaign Interaction</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Select Client</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="">Choose a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
                </select>
              </div>
            </div>
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
