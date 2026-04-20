import { useEffect, useState, useRef } from 'react';
import { Send, Sparkles, Search } from 'lucide-react';
import api from '../utils/api';
import ChatBubble from '../components/ChatBubble';

export default function Inbox() {
  const [clients, setClients]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply]       = useState('');
  const [aiLoading, setAiLoading] = useState(false);
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

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Client List */}
      <div className="w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col shrink-0 overflow-hidden">
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
              className={`px-4 py-3 cursor-pointer border-b border-[#2a2a2a] hover:bg-white/5 transition-colors ${selected?.id === c.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                  {(c.name || c.whatsapp_number)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name || c.whatsapp_number}</p>
                  <p className="text-xs text-gray-500 truncate">{c.whatsapp_number}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-3">
              <Send size={24} className="text-gray-600" />
            </div>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                {(selected.name || selected.whatsapp_number)[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white text-sm">{selected.name || selected.whatsapp_number}</p>
                <p className="text-xs text-gray-500">{selected.whatsapp_number}</p>
              </div>
              <div className="ml-auto">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selected.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                  selected.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{selected.status}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.length === 0 && (
                <p className="text-xs text-center text-gray-600 mt-8">No messages yet</p>
              )}
              {messages.map((m, i) => <ChatBubble key={m.id || i} msg={m} />)}
              <div ref={bottomRef} />
            </div>

            {/* Reply Box */}
            <div className="p-3 border-t border-[#2a2a2a] shrink-0">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder="Type a message..."
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-4 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={suggestReply}
                  disabled={aiLoading}
                  title="AI suggest reply"
                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Sparkles size={16} />
                </button>
                <button
                  onClick={send}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
              {aiLoading && <p className="text-xs text-purple-400 mt-1">✨ AI is thinking...</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
