import { useEffect, useState, useRef } from 'react';
import { Send, Sparkles, Search, Tag, Thermometer, Clock, Brain } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import ChatBubble from '../components/ChatBubble';

const LEAD_SCORE_CONFIG = {
  hot:  { color: 'text-red-400 bg-red-500/10', label: '🔥 Hot' },
  warm: { color: 'text-orange-400 bg-orange-500/10', label: '🌤 Warm' },
  cold: { color: 'text-blue-400 bg-blue-500/10', label: '❄️ Cold' },
};

export default function Inbox() {
  const [clients, setClients]     = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [messages, setMessages]   = useState([]);
  const [reply, setReply]         = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/clients').then(r => { setClients(r.data); setFiltered(r.data); });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter(c => (c.name || '').toLowerCase().includes(q) || c.whatsapp_number.includes(q)));
  }, [search, clients]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectClient = async c => {
    setSelected(c);
    setAiSuggestion('');
    const r = await api.get(`/clients/${c.id}/messages`);
    setMessages(r.data);
  };

  const send = async () => {
    if (!reply.trim() || !selected) return;
    await api.post(`/clients/${selected.id}/send`, { message: reply });
    setMessages(m => [...m, { id: Date.now(), direction: 'outbound', content: reply, created_at: new Date() }]);
    setReply('');
  };

  const suggestReply = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const lastMsg = messages.filter(m => m.direction === 'inbound').slice(-1)[0]?.content || '';
      const r = await api.post('/ai/suggest-reply', { clientId: selected.id, lastMessage: lastMsg });
      setReply(r.data.reply);
    } catch (e) {
      alert('AI error: ' + (e.response?.data?.error || e.message));
    } finally {
      setAiLoading(false);
    }
  };

  const getAiSuggestion = async () => {
    if (!selected) return;
    setSuggestLoading(true);
    try {
      const lastMsg = messages.filter(m => m.direction === 'inbound').slice(-1)[0]?.content || 'No recent message';
      const r = await api.post('/ai/suggest-reply', { clientId: selected.id, lastMessage: lastMsg });
      setAiSuggestion(r.data.reply);
    } catch {
      setAiSuggestion('AI suggestion unavailable');
    } finally {
      setSuggestLoading(false);
    }
  };

  const lsCfg = selected ? (LEAD_SCORE_CONFIG[selected.lead_score] || LEAD_SCORE_CONFIG.cold) : null;

  return (
    <div className="flex gap-3" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Client List */}
      <div className="w-60 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col shrink-0 overflow-hidden">
        <div className="p-3 border-b border-[#2a2a2a]">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && <p className="text-xs text-gray-500 text-center mt-6">No clients found</p>}
          {filtered.map(c => (
            <div
              key={c.id} onClick={() => selectClient(c)}
              className={`px-3 py-2.5 cursor-pointer border-b border-[#2a2a2a] hover:bg-white/5 transition-colors ${selected?.id === c.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                  {(c.name || c.whatsapp_number)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{c.name || c.whatsapp_number}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-gray-500 truncate flex-1">{c.whatsapp_number}</p>
                    {c.lead_score && (
                      <span className={`text-xs px-1 rounded shrink-0 ${LEAD_SCORE_CONFIG[c.lead_score]?.color}`}>
                        {c.lead_score === 'hot' ? '🔥' : c.lead_score === 'warm' ? '🌤' : '❄️'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-3">
              <Send size={24} className="text-gray-600" />
            </div>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                {(selected.name || selected.whatsapp_number)[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white text-sm">{selected.name || selected.whatsapp_number}</p>
                <p className="text-xs text-gray-500">{selected.whatsapp_number}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selected.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                  selected.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{selected.status}</span>
                {lsCfg && <span className={`text-xs px-2 py-0.5 rounded-full ${lsCfg.color}`}>{lsCfg.label}</span>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.length === 0 && <p className="text-xs text-center text-gray-600 mt-8">No messages yet</p>}
              {messages.map((m, i) => <ChatBubble key={m.id || i} msg={m} />)}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-[#2a2a2a] shrink-0">
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-4 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button onClick={suggestReply} disabled={aiLoading} title="AI suggest reply"
                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                  <Sparkles size={16} />
                </button>
                <button onClick={send} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors">
                  <Send size={16} />
                </button>
              </div>
              {aiLoading && <p className="text-xs text-purple-400 mt-1">✨ AI is thinking...</p>}
            </div>
          </>
        )}
      </div>

      {/* Client Intelligence Panel */}
      {selected && (
        <div className="w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#2a2a2a]">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Intelligence</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Name & Status */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Client</p>
              <p className="text-sm font-semibold text-white">{selected.name || '—'}</p>
              <p className="text-xs text-gray-500">{selected.whatsapp_number}</p>
            </div>

            {/* Lead Score */}
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Thermometer size={10} /> Lead Score</p>
              {lsCfg && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lsCfg.color}`}>{lsCfg.label}</span>}
            </div>

            {/* Tags */}
            {selected.tags && selected.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Tag size={10} /> Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-xs bg-[#2a2a2a] text-gray-300 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Last Activity */}
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={10} /> Last Active</p>
              <p className="text-xs text-gray-300">
                {selected.last_active_at ? format(new Date(selected.last_active_at), 'dd MMM, HH:mm') : '—'}
              </p>
            </div>

            {/* Total Spent */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Spent</p>
              <p className="text-sm font-semibold text-emerald-400">PKR {Number(selected.total_spent_pkr || 0).toLocaleString()}</p>
            </div>

            {/* AI Suggestion */}
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Brain size={10} /> AI Suggestion</p>
              {aiSuggestion ? (
                <div className="bg-[#0f0f0f] border border-purple-500/30 rounded-lg p-2">
                  <p className="text-xs text-purple-300">{aiSuggestion}</p>
                  <button
                    onClick={() => setReply(aiSuggestion)}
                    className="text-xs text-purple-400 hover:text-purple-300 mt-1"
                  >Use this →</button>
                </div>
              ) : (
                <button
                  onClick={getAiSuggestion}
                  disabled={suggestLoading}
                  className="w-full text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {suggestLoading ? '✨ Thinking...' : '✨ Get AI Suggestion'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
