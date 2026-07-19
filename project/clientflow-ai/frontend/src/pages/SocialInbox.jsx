// frontend/src/pages/SocialInbox.jsx
// Unified Social Inbox — Facebook + Instagram messages + comment handling
// Prompts 151, 158

import { useEffect, useState, useRef } from 'react';
import { Send, RefreshCw, MessageSquare, MessageCircle, Filter, Search } from 'lucide-react';
import api from '../utils/api';

const platformBadge = (platform) => platform === 'facebook'
  ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">FB</span>
  : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400">IG</span>;

const avatar = (name) => (name || '?')[0].toUpperCase();

export default function SocialInbox() {
  const [accounts, setAccounts]         = useState([]);
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [messages, setMessages]         = useState([]);
  const [comments, setComments]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [reply, setReply]               = useState('');
  const [replyComment, setReplyComment] = useState({});
  const [activeTab, setActiveTab]       = useState('messages');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [search, setSearch]             = useState('');
  const [syncing, setSyncing]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [sending, setSending]           = useState(false);
  const [msg, setMsg]                   = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let list = conversations;
    if (filterPlatform !== 'all') list = list.filter(c => c.platform === filterPlatform);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.sender_name || '').toLowerCase().includes(q) ||
        (c.last_message || '').toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [conversations, filterPlatform, search]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accRes, convRes, commentRes] = await Promise.all([
        api.get('/social/accounts'),
        api.get('/social/conversations'),
        api.get('/social/comments'),
      ]);
      setAccounts(accRes.data);
      setConversations(convRes.data);
      setComments(commentRes.data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const syncAccount = async (accountId) => {
    setSyncing(true);
    try {
      await api.post(`/social/accounts/${accountId}/sync-messages`);
      await loadAll();
      setMsg('✅ Messages synced');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    for (const acc of accounts.filter(a => a.is_active)) {
      try { await api.post(`/social/accounts/${acc.id}/sync-messages`); } catch {}
    }
    await loadAll();
    setSyncing(false);
    setMsg('✅ All accounts synced');
  };

  const selectConversation = async (conv) => {
    setSelected(conv);
    try {
      const { data } = await api.get(`/social/conversations/${conv.conversation_id}/messages`);
      setMessages(data);
    } catch (err) {
      setMsg('❌ ' + err.message);
    }
  };

  const sendMessage = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.post('/social/messages/send', {
        accountId:   selected.account_id,
        recipientId: selected.conversation_id?.split('_').pop(),
        message:     reply,
      });
      setMessages(m => [...m, {
        id: Date.now(),
        direction: 'outbound',
        content: reply,
        created_at: new Date().toISOString(),
      }]);
      setReply('');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  const replyToComment = async (comment) => {
    const text = replyComment[comment.comment_id];
    if (!text?.trim()) return;
    try {
      await api.post(`/social/comments/${comment.comment_id}/reply`, {
        accountId: comment.account_id,
        message:   text,
      });
      setReplyComment(r => ({ ...r, [comment.comment_id]: '' }));
      setMsg('✅ Reply sent');
      loadAll();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const unrepliedComments = comments.filter(c => !c.replied);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Social Inbox</h2>
        <div className="flex items-center gap-2">
          {accounts.filter(a => a.is_active).map(acc => (
            <button
              key={acc.id}
              onClick={() => syncAccount(acc.id)}
              disabled={syncing}
              className="text-xs border border-[#2a2a2a] text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {acc.account_name}
            </button>
          ))}
          <button
            onClick={syncAll}
            disabled={syncing}
            className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> Sync All
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 opacity-60">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#1a1a1a] rounded-lg p-1 w-fit border border-[#2a2a2a]">
        <button onClick={() => setActiveTab('messages')} className={`px-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'messages' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>
          <MessageSquare size={14} /> Messages
        </button>
        <button onClick={() => setActiveTab('comments')} className={`px-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'comments' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}>
          <MessageCircle size={14} /> Comments
          {unrepliedComments.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unrepliedComments.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'messages' && (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 240px)' }}>
          {/* Conversation List */}
          <div className="w-72 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-[#2a2a2a] space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-1">
                {['all','facebook','instagram'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPlatform(p)}
                    className={`flex-1 py-1 text-[10px] rounded-md capitalize transition-colors ${filterPlatform === p ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && <p className="text-xs text-gray-500 text-center mt-6">Loading...</p>}
              {!loading && filtered.length === 0 && (
                <p className="text-xs text-gray-500 text-center mt-6">No conversations found</p>
              )}
              {filtered.map(conv => (
                <div
                  key={conv.conversation_id}
                  onClick={() => selectConversation(conv)}
                  className={`px-4 py-3 cursor-pointer border-b border-[#2a2a2a] hover:bg-white/5 transition-colors ${selected?.conversation_id === conv.conversation_id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${conv.platform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                      {avatar(conv.sender_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white truncate">{conv.sender_name || 'Unknown'}</p>
                        {platformBadge(conv.platform)}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{conv.account_name}</p>
                    </div>
                    {!conv.is_read && <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate pl-9">{conv.last_message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <MessageSquare size={32} className="text-gray-700 mb-3" />
                <p className="text-sm">Select a conversation to view messages</p>
                {accounts.length === 0 && (
                  <p className="text-xs text-gray-600 mt-2">No social accounts connected yet</p>
                )}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-3 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selected.platform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                    {avatar(selected.sender_name)}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{selected.sender_name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {platformBadge(selected.platform)}
                      <span>{selected.account_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.length === 0 && <p className="text-xs text-center text-gray-600 mt-8">No messages yet</p>}
                  {messages.map((m, i) => (
                    <div key={m.id || i} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                        m.direction === 'outbound'
                          ? 'bg-emerald-500/20 text-emerald-100'
                          : 'bg-[#2a2a2a] text-white'
                      }`}>
                        <p>{m.content}</p>
                        <p className="text-[10px] opacity-50 mt-0.5 text-right">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="p-3 border-t border-[#2a2a2a] shrink-0">
                  <div className="flex gap-2">
                    <input
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !reply.trim()}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
              <MessageCircle size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No comments yet.</p>
              <p className="text-gray-600 text-xs mt-1">Comments will appear here when received via webhook.</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${!comment.replied ? 'border-yellow-500/30' : 'border-[#2a2a2a]'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${comment.platform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                    {avatar(comment.commenter_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-white">{comment.commenter_name || 'Unknown'}</span>
                      {platformBadge(comment.platform)}
                      {comment.replied
                        ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Replied</span>
                        : <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">Pending</span>
                      }
                    </div>
                    <p className="text-sm text-gray-300">{comment.content}</p>
                    {comment.reply_content && (
                      <div className="mt-2 pl-3 border-l-2 border-emerald-500/30">
                        <p className="text-xs text-emerald-400">Your reply: {comment.reply_content}</p>
                      </div>
                    )}
                    {!comment.replied && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={replyComment[comment.comment_id] || ''}
                          onChange={e => setReplyComment(r => ({ ...r, [comment.comment_id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && replyToComment(comment)}
                          placeholder="Write a reply..."
                          className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => replyToComment(comment)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
