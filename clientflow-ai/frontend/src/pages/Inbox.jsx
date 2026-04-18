import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Sparkles, Search, Clock, ChevronDown } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import ChatBubble from '../components/ChatBubble';

const QUICK_TEMPLATES = [
  { label: 'Greeting',        text: 'Assalam u Alaikum! 👋 How can we help you today?' },
  { label: 'Pricing',        text: 'Sure! Here are our services and pricing. Please type *pricing* to see the full list. 😊' },
  { label: 'Payment prompt', text: 'To proceed, please send payment to our Easypaisa/JazzCash number and share the screenshot here. ✅' },
  { label: 'Confirmed',      text: '✅ Payment confirmed! Your service is now being processed. We will update you shortly. 🚀' },
  { label: 'Follow up',      text: 'Hi! Just checking in 😊 Did you have any questions about our services?' },
  { label: 'Thank you',      text: 'Thank you so much! It was a pleasure working with you. 🙏 Please rate us from 1–5!' },
];

export default function Inbox() {
  const [clients, setClients]       = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [messages, setMessages]     = useState([]);
  const [msgError, setMsgError]     = useState('');
  const [reply, setReply]           = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending]       = useState(false);
  const bottomRef = useRef(null);
  const templateRef = useRef(null);

  const loadClients = useCallback(() => {
    return api.get('/clients').then(r => { setClients(r.data); setFiltered(r.data); });
  }, []);

  useEffect(() => {
    loadClients();

    const socket = io('', { path: '/socket.io' });
    // Refresh client list on new messages
    socket.on('new_alert', loadClients);
    return () => socket.disconnect();
  }, [loadClients]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter(c =>
      (c.name || '').toLowerCase().includes(q) || c.whatsapp_number.includes(q)
    ));
  }, [search, clients]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close template dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (templateRef.current && !templateRef.current.contains(e.target)) {
        setShowTemplates(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectClient = async c => {
    setSelected(c);
    setMessages([]);   // Clear previous conversation immediately
    setMsgError('');
    try {
      const r = await api.get(`/clients/${c.id}/messages`);
      setMessages(r.data);
    } catch (e) {
      setMsgError('Failed to load messages. Please try refreshing.');
      console.error('Failed to load messages:', e.message);
    }
  };

  const refreshMessages = async () => {
    if (!selected) return;
    setMsgError('');
    try {
      const r = await api.get(`/clients/${selected.id}/messages`);
      setMessages(r.data);
    } catch (e) {
      setMsgError('Failed to refresh messages.');
    }
  };

  const send = async () => {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    const text = reply;
    setReply('');
    try {
      await api.post(`/clients/${selected.id}/send`, { message: text });
      setMessages(m => [...m, { id: Date.now(), direction: 'outbound', content: text, created_at: new Date() }]);
    } catch (e) {
      alert('Failed to send: ' + (e.response?.data?.error || e.message));
      setReply(text);
    } finally {
      setSending(false);
    }
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

  const triggerFollowUp = async (type) => {
    if (!selected) return;
    try {
      // Create immediate follow-up
      const fu = await api.post('/followups', {
        client_id: selected.id,
        type,
        scheduled_at: new Date().toISOString(),
      });
      // Trigger it immediately
      await api.post(`/followups/trigger/${fu.data.id}`);
      alert('Follow-up sent successfully!');
      await refreshMessages();
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.error || e.message));
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
                  <p className="text-xs text-gray-500 truncate">{c.status}</p>
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
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selected.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                  selected.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{selected.status}</span>
                {/* Follow-up buttons */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplates(v => !v)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg transition-colors"
                    title="Quick follow-up"
                  >
                    <Clock size={12} /> Follow-up <ChevronDown size={10} />
                  </button>
                  {showTemplates && (
                    <div ref={templateRef} className="absolute right-0 top-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl z-20 w-48 py-1">
                      {['cold_lead', 'pending_payment', 'post_delivery', 're_engagement', 'upsell'].map(t => (
                        <button
                          key={t}
                          onClick={() => { triggerFollowUp(t); setShowTemplates(false); }}
                          className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5 capitalize"
                        >
                          {t.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={refreshMessages}
                  className="text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg"
                  title="Refresh messages"
                >
                  ↻
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {msgError && (
                <p className="text-xs text-center text-red-400 mt-8">⚠️ {msgError}</p>
              )}
              {!msgError && messages.length === 0 && (
                <p className="text-xs text-center text-gray-600 mt-8">No messages yet</p>
              )}
              {messages.map((m, i) => <ChatBubble key={m.id || i} msg={m} />)}
              <div ref={bottomRef} />
            </div>

            {/* Quick Templates Bar */}
            <div className="px-3 pt-2 flex gap-2 overflow-x-auto border-t border-[#2a2a2a] pb-1 scrollbar-hide">
              {QUICK_TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => setReply(t.text)}
                  className="text-xs whitespace-nowrap bg-[#2a2a2a] hover:bg-[#333] text-gray-300 px-3 py-1 rounded-full transition-colors shrink-0"
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Reply Box */}
            <div className="p-3 border-t border-[#2a2a2a] shrink-0">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    rows={2}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-4 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
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
                    disabled={sending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
              {aiLoading && <p className="text-xs text-purple-400 mt-1">✨ AI is thinking...</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
