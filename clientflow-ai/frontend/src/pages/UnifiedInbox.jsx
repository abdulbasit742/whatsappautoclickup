import { useEffect, useState, useRef } from 'react';
import { Send, Mail, MessageSquare, Phone, MonitorSmartphone, Search, RefreshCw, Check } from 'lucide-react';
import api from '../utils/api';

const CHANNEL_ICONS = {
  whatsapp:    { icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'WhatsApp' },
  email:       { icon: Mail,          color: 'text-blue-400',    bg: 'bg-blue-400/10',    label: 'Email' },
  sms:         { icon: Phone,         color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  label: 'SMS' },
  chat_widget: { icon: MonitorSmartphone, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Chat Widget' },
};

export default function UnifiedInbox() {
  const [messages, setMessages] = useState([]);
  const [badges, setBadges]     = useState({});
  const [channel, setChannel]   = useState('');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [composing, setComposing] = useState(false);
  const [form, setForm]         = useState({ client_id: '', channel: 'email', content: '', subject: '' });
  const [clients, setClients]   = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [msgs, b, c] = await Promise.all([
        api.get('/channels/unified-inbox', { params: { channel: channel || undefined } }),
        api.get('/channels/badges'),
        api.get('/clients'),
      ]);
      setMessages(msgs.data);
      setBadges(b.data);
      setClients(c.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [channel]);

  const markRead = async (id) => {
    await api.patch(`/channels/messages/${id}/read`);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    load(); // refresh badges
  };

  const sendMessage = async () => {
    if (!form.client_id || !form.content) return;
    await api.post('/channels/messages', form);
    setComposing(false);
    setForm({ client_id: '', channel: 'email', content: '', subject: '' });
    load();
  };

  const filtered = messages.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.client_name || '').toLowerCase().includes(q) || (m.content || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Unified Inbox</h2>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setComposing(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <Send size={14} /> Compose
          </button>
        </div>
      </div>

      {/* Channel badges */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <button
          onClick={() => setChannel('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${channel === '' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}
        >
          All
        </button>
        {Object.entries(CHANNEL_ICONS).map(([ch, { icon: Icon, color, bg, label }]) => (
          <button
            key={ch}
            onClick={() => setChannel(ch === channel ? '' : ch)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${channel === ch ? `${bg} ${color} border border-current/20` : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}
          >
            <Icon size={14} />
            {label}
            {badges[ch] > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {badges[ch]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-3 text-gray-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search messages..."
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No messages found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(msg => {
            const ch = CHANNEL_ICONS[msg.channel] || CHANNEL_ICONS.whatsapp;
            const ChIcon = ch.icon;
            return (
              <div key={msg.id} className={`bg-[#1a1a1a] border rounded-xl p-4 flex items-start gap-4 ${!msg.is_read ? 'border-emerald-500/30' : 'border-[#2a2a2a]'}`}>
                <div className={`p-2 rounded-lg shrink-0 ${ch.bg}`}>
                  <ChIcon size={16} className={ch.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white text-sm">{msg.client_name || msg.whatsapp_number || 'Unknown'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${msg.direction === 'inbound' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {msg.direction}
                    </span>
                    {!msg.is_read && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                  </div>
                  {msg.subject && <p className="text-xs text-gray-500 mb-1">Subject: {msg.subject}</p>}
                  <p className="text-sm text-gray-300 truncate">{msg.content}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                </div>
                {!msg.is_read && (
                  <button onClick={() => markRead(msg.id)} title="Mark as read" className="text-gray-500 hover:text-emerald-400 shrink-0">
                    <Check size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Compose Modal */}
      {composing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Compose Message</h3>
            <div className="space-y-3">
              <select
                value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
              </select>
              <select
                value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS (placeholder)</option>
                <option value="chat_widget">Chat Widget (placeholder)</option>
              </select>
              {form.channel === 'email' && (
                <input
                  value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject..."
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              )}
              <textarea
                value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Message content..."
                rows={4}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={sendMessage} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Send</button>
              <button onClick={() => setComposing(false)} className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
