import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Sparkles, Search, Paperclip, Smile, MoreVertical,
  Phone, Video, Star, Archive, Users, MessageSquare, Tag, X
} from 'lucide-react';
import api from '../utils/api';
import ChatBubble from '../components/ChatBubble';

const TABS = ['All', 'Unread', 'Favorites', 'Archived'];

const TEMP_INDICATOR = {
  lead:     { label: 'Hot',  color: 'text-red-400 bg-red-400/10' },
  active:   { label: 'Warm', color: 'text-yellow-400 bg-yellow-400/10' },
  paid:     { label: 'Warm', color: 'text-yellow-400 bg-yellow-400/10' },
  inactive: { label: 'Cold', color: 'text-blue-400 bg-blue-400/10' },
};

const MOCK_GROUPS = [
  { id: 'g1', name: 'Sales Team',    count: 5 },
  { id: 'g2', name: 'VIP Clients',   count: 12 },
];

export default function Inbox() {
  const navigate = useNavigate();
  const [clients,   setClients]   = useState([]);
  const [tab,       setTab]       = useState('All');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [reply,     setReply]     = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [note,      setNote]      = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || c.whatsapp_number.includes(q);
  });

  const selectClient = async c => {
    setSelected(c);
    try {
      const r = await api.get(`/clients/${c.id}/messages`);
      setMessages(r.data);
    } catch { setMessages([]); }
  };

  const send = async () => {
    if (!reply.trim() || !selected) return;
    try { await api.post(`/clients/${selected.id}/send`, { message: reply }); } catch {}
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
    } catch (e) { alert('AI error: ' + (e.response?.data?.error || e.message)); }
    finally { setAiLoading(false); }
  };

  const temp = selected ? (TEMP_INDICATOR[selected.status] || TEMP_INDICATOR.inactive) : null;

  return (
    <div className="flex gap-0" style={{ height: 'calc(100vh - 104px)' }}>

      {/* ─── LEFT PANEL: Chat List ──────────────────────────────────────────── */}
      <div className="w-72 bg-[#1a1a1a] border border-[#2a2a2a] rounded-l-xl flex flex-col shrink-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Chats</h2>
          <button className="text-gray-400 hover:text-white transition-colors">
            <MessageSquare size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a] shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-2 border-b border-[#2a2a2a] shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-500 text-center mt-6 px-4">No chats found</p>
          )}
          {filtered.map(c => (
            <div
              key={c.id} onClick={() => selectClient(c)}
              className={`px-4 py-3 cursor-pointer border-b border-[#2a2a2a] hover:bg-white/5 transition-colors ${
                selected?.id === c.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                  {(c.name || c.whatsapp_number)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-white truncate">{c.name || c.whatsapp_number}</p>
                    <span className="text-[9px] text-gray-600 shrink-0 ml-1">12:34</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-gray-500 truncate">{c.whatsapp_number}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-1 ${
                      (TEMP_INDICATOR[c.status] || TEMP_INDICATOR.inactive).color
                    }`}>
                      {(TEMP_INDICATOR[c.status] || TEMP_INDICATOR.inactive).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Groups section */}
          <div className="px-4 py-2 border-t border-[#2a2a2a]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users size={10} /> Groups
            </p>
            {MOCK_GROUPS.map(g => (
              <div key={g.id} className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-white/5 rounded-lg px-1 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                  {g.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{g.name}</p>
                  <p className="text-[10px] text-gray-500">{g.count} members</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CENTER PANEL: Conversation ────────────────────────────────────── */}
      <div className="flex-1 bg-[#111111] border-y border-[#2a2a2a] flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-gray-700" />
            </div>
            <p className="text-sm font-medium text-gray-500">Select a conversation</p>
            <p className="text-xs text-gray-600 mt-1">Choose from your chat list to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                {(selected.name || selected.whatsapp_number)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{selected.name || selected.whatsapp_number}</p>
                <p className="text-xs text-gray-500">{selected.whatsapp_number}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${temp?.color}`}>{temp?.label}</span>
                <button className="text-gray-500 hover:text-gray-300 transition-colors" title="Voice call (disabled)"><Phone size={15} /></button>
                <button className="text-gray-500 hover:text-gray-300 transition-colors" title="Video call (disabled)"><Video size={15} /></button>
                <button className="text-gray-500 hover:text-gray-300 transition-colors"><MoreVertical size={15} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.length === 0 && (
                <p className="text-xs text-center text-gray-600 mt-8">No messages yet — say hello!</p>
              )}
              {messages.map((m, i) => <ChatBubble key={m.id || i} msg={m} />)}
              <div ref={bottomRef} />
            </div>

            {/* Reply Bar */}
            <div className="p-3 bg-[#1a1a1a] border-t border-[#2a2a2a] shrink-0">
              {aiLoading && (
                <p className="text-xs text-purple-400 mb-2 flex items-center gap-1">
                  <Sparkles size={11} /> AI is thinking…
                </p>
              )}
              <div className="flex items-center gap-2">
                <button className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"><Paperclip size={16} /></button>
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Type a message…"
                  className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"><Smile size={16} /></button>
                <button
                  onClick={suggestReply} disabled={aiLoading} title="AI suggest reply"
                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 p-2.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                  <Sparkles size={15} />
                </button>
                <button
                  onClick={send}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-lg transition-colors shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── RIGHT PANEL: Client Intelligence ──────────────────────────────── */}
      {selected && (
        <div className="w-72 bg-[#1a1a1a] border border-[#2a2a2a] rounded-r-xl flex flex-col shrink-0 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Client Intelligence</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Avatar + name */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl font-bold text-emerald-400 mx-auto mb-2">
                {(selected.name || selected.whatsapp_number)[0].toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-white">{selected.name || '—'}</p>
              <p className="text-xs text-gray-500">{selected.whatsapp_number}</p>
            </div>

            {/* Lead temperature */}
            <div className="flex justify-center">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${temp?.color}`}>
                {temp?.label} Lead
              </span>
            </div>

            {/* Overview */}
            <Section title="Overview">
              <Row label="Status"       value={<Badge v={selected.status} />} />
              <Row label="Last Seen"    value="2 hours ago" />
              <Row label="Lead Score"   value={
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '72%' }} />
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">72</span>
                </div>
              } />
            </Section>

            {/* Analysis */}
            <Section title="Analysis">
              <Row label="Sentiment"  value={<span className="text-xs text-emerald-400 font-medium">Positive</span>} />
              <Row label="Issue Risk" value={<span className="text-xs text-emerald-400 font-medium">Low</span>} />
              <Row label="Payment"    value={
                <span className={`text-xs font-medium ${selected.status === 'paid' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {selected.status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              } />
            </Section>

            {/* AI Suggestion */}
            <Section title="Recommended Reply">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5">
                <p className="text-[10px] text-purple-300 leading-relaxed">
                  "Hi! Just checking in — would you like to schedule a quick call to discuss your needs this week? 😊"
                </p>
              </div>
            </Section>

            {/* Schedule */}
            <Section title="Schedule">
              <Row label="Follow-up Due" value={<span className="text-xs text-yellow-400">Tomorrow 2:00 PM</span>} />
              <Row label="Assigned To"   value={<span className="text-xs text-white">Abdul Basit</span>} />
            </Section>

            {/* Tags */}
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {['VIP', 'WhatsApp Lead', selected.status].map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] bg-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded-full">
                    <Tag size={8} /> {tag}
                  </span>
                ))}
              </div>
            </Section>

            {/* Notes */}
            <Section title="Notes">
              <textarea
                value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="Add a note…"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </Section>

            {/* Action */}
            <button
              onClick={() => navigate(`/clients/${selected.id}`)}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium py-2 rounded-lg border border-emerald-500/20 transition-colors"
            >
              View Full Profile →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 text-right">{value}</div>
    </div>
  );
}

function Badge({ v }) {
  const map = {
    lead:     'bg-yellow-500/20 text-yellow-400',
    active:   'bg-blue-500/20 text-blue-400',
    paid:     'bg-emerald-500/20 text-emerald-400',
    inactive: 'bg-gray-500/20 text-gray-400',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[v] || map.inactive}`}>{v}</span>;
}
