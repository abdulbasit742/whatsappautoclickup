import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles, Search, Star, Archive, Users, Megaphone } from 'lucide-react';
import api from '../utils/api';
import ChatBubble from '../components/ChatBubble';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'archived', label: 'Archived' },
  { key: 'groups', label: 'Groups' },
  { key: 'channels', label: 'Channels' },
];

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [clientPayments, setClientPayments] = useState([]);
  const [clientIssues, setClientIssues] = useState([]);
  const bottomRef = useRef(null);

  const fetchConversations = async () => {
    const params = {};
    if (tab === 'unread') params.unread_only = true;
    const r = await api.get('/inbox/conversations', { params });
    setConversations(r.data);
  };

  useEffect(() => { fetchConversations().catch(() => {}); }, [tab]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return conversations.filter(c => {
      if (tab === 'favorites' && !c.is_starred) return false;
      if (tab === 'archived' && c.status !== 'resolved') return false;
      if (tab === 'groups' || tab === 'channels') return false; // placeholders
      return (c.name || '').toLowerCase().includes(q) || (c.whatsapp_number || '').includes(q);
    });
  }, [conversations, search, tab]);

  const openConversation = async (c) => {
    setSelected(c);
    const [msgs, lead, pays, alerts] = await Promise.all([
      api.get(`/clients/${c.client_id}/messages`),
      api.get(`/clients/${c.client_id}/insights`).catch(() => ({ data: null })),
      api.get('/payments', { params: { client_id: c.client_id } }).catch(() => ({ data: [] })),
      api.get('/alerts').catch(() => ({ data: [] }))
    ]);
    setMessages(msgs.data);
    setInsights(lead.data);
    setClientPayments(pays.data.slice(0, 5));
    setClientIssues(alerts.data.filter(a => a.client_id === c.client_id).slice(0, 5));
    await api.patch(`/inbox/conversations/${c.id}`, { unread_count: 0 }).catch(() => {});
    fetchConversations().catch(() => {});
  };

  const send = async () => {
    if (!reply.trim() || !selected) return;
    await api.post(`/clients/${selected.client_id}/send`, { message: reply });
    setMessages(m => [...m, { id: Date.now(), direction: 'outbound', content: reply, created_at: new Date() }]);
    setReply('');
  };

  const suggestReply = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const lastMsg = messages.filter(m => m.direction === 'inbound').slice(-1)[0]?.content || '';
      const r = await api.post('/ai/suggest-reply', { clientId: selected.client_id, lastMessage: lastMsg, tone: 'friendly' });
      setReply(r.data.reply);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 140px)' }}>
      <aside className="w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-[#2a2a2a]">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-8 pr-3 py-2 text-xs text-white" />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs px-2 py-1 rounded-full ${tab === t.key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#0f0f0f] text-gray-400'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <div key={c.id} onClick={() => openConversation(c)} className={`p-3 border-b border-[#2a2a2a] cursor-pointer hover:bg-white/5 ${selected?.id === c.id ? 'bg-emerald-500/10' : ''}`}>
              <div className="flex justify-between">
                <p className="text-sm font-medium">{c.name || c.whatsapp_number}</p>
                {c.unread_count > 0 && <span className="text-xs bg-emerald-500 text-black px-1.5 rounded-full">{c.unread_count}</span>}
              </div>
              <p className="text-xs text-gray-500">{c.whatsapp_number}</p>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Select chat to open conversation</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center">
              <p className="font-medium">{selected.name || selected.whatsapp_number}</p>
              <div className="ml-auto flex items-center gap-2 text-gray-400">
                <Star size={14} />
                <Archive size={14} />
                <Users size={14} />
                <Megaphone size={14} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.map((m, i) => <ChatBubble key={m.id || i} msg={m} />)}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-[#2a2a2a]">
              <div className="flex gap-2">
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type message..." className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm" />
                <button onClick={suggestReply} className="bg-purple-500/20 text-purple-300 px-3 rounded-lg">{aiLoading ? '...' : <Sparkles size={16} />}</button>
                <button onClick={send} className="bg-emerald-500 px-4 rounded-lg"><Send size={15} /></button>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 overflow-y-auto">
        <h3 className="font-semibold mb-3">Client Intelligence</h3>
        {!selected || !insights ? (
          <p className="text-xs text-gray-500">Open a chat to view client intelligence panel.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <Row label="Name" value={insights.profile?.name || selected.name || selected.whatsapp_number} />
            <Row label="Phone" value={selected.whatsapp_number} />
            <Row label="Lead score" value={`${insights.score} (${insights.temperature})`} />
            <Row label="Tags" value={(insights.tags || []).join(', ') || 'none'} />
            <Row label="Payment status" value={clientPayments[0]?.status || 'unknown'} />
            <Row label="Issue risk" value={clientIssues.length ? 'High' : 'Low'} />
            <Row label="Follow-up due" value={insights.temperature === 'hot' ? 'Today' : 'Planned'} />
            <Row label="Assigned team" value={selected.assigned_to || 'Unassigned'} />
            <div className="pt-3 border-t border-[#2a2a2a]">
              <h4 className="text-xs text-gray-400 mb-2">Issue alerts</h4>
              {(clientIssues.length ? clientIssues : [{ id: 'none', message: 'No active issue alerts' }]).map(i => (
                <p key={i.id} className="text-xs text-gray-300 mb-1">• {i.message}</p>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
