import { useEffect, useState } from 'react';
import { MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../utils/api';

const SENTIMENT_CONFIG = {
  positive: { emoji: '😊', color: 'bg-emerald-500/20 text-emerald-400', label: 'Positive' },
  neutral:  { emoji: '😐', color: 'bg-gray-500/20 text-gray-400',    label: 'Neutral' },
  negative: { emoji: '😠', color: 'bg-red-500/20 text-red-400',      label: 'Negative' },
};

const URGENCY_COLORS = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-gray-500' };

export default function CustomerService() {
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');
  const [selected, setSelected]   = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [newTicket, setNewTicket]  = useState({ clientId: '', message: '', category: 'general' });

  const loadTickets = () => api.get('/cs/tickets').then(r => setTickets(r.data)).finally(() => setLoading(false));
  useEffect(() => { loadTickets(); }, []);

  const getSuggestion = async ticket => {
    setSelected(ticket);
    setSuggestion('');
    try {
      const r = await api.get(`/cs/suggest/${ticket.id}`);
      setSuggestion(r.data.suggestion);
    } catch { setSuggestion('Unable to generate suggestion'); }
  };

  const routeTicket = async ticketId => {
    const r = await api.post(`/cs/route/${ticketId}`);
    alert(`Routed to: ${r.data.assignedTo}`);
    loadTickets();
  };

  const analyze = async () => {
    if (!analyzeText.trim()) return;
    const r = await api.post('/cs/analyze', { text: analyzeText });
    setAnalyzeResult(r.data);
  };

  const createTicket = async () => {
    if (!newTicket.clientId || !newTicket.message) return alert('Client ID and message required');
    await api.post('/cs/tickets', newTicket);
    setNewTicket({ clientId: '', message: '', category: 'general' });
    loadTickets();
  };

  if (loading) return <div className="text-emerald-400 animate-pulse">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><MessageSquare size={20} className="text-emerald-400" /> Customer Service</h2>
        <div className="flex gap-2">
          {['tickets', 'analyze', 'new'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analyze' && (
        <div className="space-y-4 max-w-xl">
          <textarea value={analyzeText} onChange={e => setAnalyzeText(e.target.value)} rows={4}
            placeholder="Paste customer message to analyze sentiment..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
          <button onClick={analyze} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm">Analyze</button>
          {analyzeResult && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-2">
              {(() => { const cfg = SENTIMENT_CONFIG[analyzeResult.sentiment] || SENTIMENT_CONFIG.neutral; return (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cfg.emoji}</span>
                  <div>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    <span className={`ml-2 text-xs ${URGENCY_COLORS[analyzeResult.urgency]}`}>Urgency: {analyzeResult.urgency}</span>
                  </div>
                  <span className="ml-auto text-xs text-gray-500">Score: {(analyzeResult.score * 100).toFixed(0)}%</span>
                </div>
              ); })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'new' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="font-semibold text-white">New Ticket</h3>
          <input value={newTicket.clientId} onChange={e => setNewTicket(p => ({ ...p, clientId: e.target.value }))}
            placeholder="Client ID" className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
          <textarea value={newTicket.message} onChange={e => setNewTicket(p => ({ ...p, message: e.target.value }))}
            placeholder="Customer message" rows={3}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
          <select value={newTicket.category} onChange={e => setNewTicket(p => ({ ...p, category: e.target.value }))}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            {['general','billing','payment','technical','complaint'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={createTicket} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm">Create Ticket</button>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-[#2a2a2a] text-sm font-semibold text-white">Tickets ({tickets.length})</div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#2a2a2a]">
              {tickets.map(t => {
                const cfg = SENTIMENT_CONFIG[t.sentiment] || SENTIMENT_CONFIG.neutral;
                return (
                  <div key={t.id} onClick={() => getSuggestion(t)}
                    className={`p-4 cursor-pointer hover:bg-white/5 ${selected?.id === t.id ? 'bg-emerald-500/5 border-l-2 border-l-emerald-400' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{t.name || 'Unknown'}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                      <span className={`text-xs ml-auto ${URGENCY_COLORS[t.urgency]}`}>{t.urgency}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{t.message}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={e => { e.stopPropagation(); routeTicket(t.id); }}
                        className="text-xs text-blue-400 hover:text-blue-300">Route →</button>
                    </div>
                  </div>
                );
              })}
              {tickets.length === 0 && <p className="text-center text-gray-500 text-sm p-8">No tickets</p>}
            </div>
          </div>
          {selected && (
            <div className="w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 shrink-0">
              <h3 className="font-semibold text-white mb-3">AI Suggestion</h3>
              <p className="text-xs text-gray-400 mb-2">For: {selected.name}</p>
              {suggestion
                ? <div className="bg-[#0f0f0f] rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap">{suggestion}</div>
                : <div className="text-emerald-400 animate-pulse text-sm">Generating...</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
