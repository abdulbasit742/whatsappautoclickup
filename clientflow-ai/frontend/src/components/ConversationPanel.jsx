import { useRef, useEffect } from 'react';
import {
  Send, Sparkles, Paperclip, Smile, ChevronDown, Loader2,
  MessageSquare, Phone, Video, MoreVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import useInboxStore from '../store/useInboxStore';

function Bubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  const hasAttachment = msg.message_type && msg.message_type !== 'text';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
          isOut
            ? 'bg-[#005c4b] text-white rounded-br-none'
            : 'bg-[#202c33] text-gray-100 rounded-bl-none'
        }`}
      >
        {hasAttachment && (
          <div className="mb-1 text-xs opacity-70 flex items-center gap-1">
            <Paperclip size={10} />
            <span>{msg.message_type}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isOut ? 'text-emerald-200/70' : 'text-gray-500'} text-[10px]`}>
          {format(new Date(msg.created_at), 'HH:mm')}
          {isOut && msg.ai_provider_used && (
            <span className="opacity-60">· {msg.ai_provider_used}</span>
          )}
          {isOut && (
            <span className="text-blue-400">✓✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-[#2a3942]" />
      <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#111b21] rounded-full">
        {date}
      </span>
      <div className="flex-1 h-px bg-[#2a3942]" />
    </div>
  );
}

const QUICK_REPLIES = [
  'Thanks for contacting us! How can we help?',
  'Sure! I can help you with that.',
  'Please share your payment screenshot.',
  'Your order is being processed.',
];

export default function ConversationPanel() {
  const {
    selected,
    messages,
    reply,
    aiLoading,
    sendLoading,
    loadingMessages,
    setReply,
    sendMessage,
    suggestReply,
  } = useInboxStore();

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0b1418] text-gray-600">
        <div className="w-20 h-20 rounded-full bg-[#202c33] flex items-center justify-center mb-4">
          <MessageSquare size={32} />
        </div>
        <p className="text-lg font-medium text-gray-400">Select a conversation</p>
        <p className="text-sm mt-1">Choose a chat from the left to start messaging</p>
      </div>
    );
  }

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const day = format(new Date(msg.created_at), 'dd MMM yyyy');
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col bg-[#0b1418] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] border-b border-[#2a3942] shrink-0">
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
          {(selected.name || selected.whatsapp_number).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate">
            {selected.name || selected.whatsapp_number}
          </p>
          <p className="text-xs text-gray-400">{selected.whatsapp_number}</p>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors" title="Voice call">
            <Phone size={16} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors" title="Video call">
            <Video size={16} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors" title="More">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      >
        {loadingMessages && (
          <div className="flex justify-center mt-8">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        )}

        {!loadingMessages && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <DateSeparator date={date} />
            {msgs.map((m, i) => (
              <Bubble key={m.id || i} msg={m} />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 pt-2 flex gap-2 overflow-x-auto pb-1 shrink-0">
        {QUICK_REPLIES.map((qr) => (
          <button
            key={qr}
            onClick={() => setReply(qr)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-[#202c33] text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors border border-[#2a3942]"
          >
            {qr.length > 30 ? qr.slice(0, 30) + '…' : qr}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-[#202c33] border-t border-[#2a3942] shrink-0">
        <div className="flex items-end gap-2">
          <button className="p-2 text-gray-400 hover:text-white transition-colors shrink-0" title="Emoji">
            <Smile size={20} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white transition-colors shrink-0" title="Attach">
            <Paperclip size={20} />
          </button>
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message…"
              className="w-full bg-[#2a3942] border-0 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
            />
          </div>
          <button
            onClick={suggestReply}
            disabled={aiLoading}
            title="AI suggest reply"
            className="p-2 shrink-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-40"
          >
            {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          </button>
          <button
            onClick={sendMessage}
            disabled={sendLoading || !reply.trim()}
            className="p-2.5 shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
        {aiLoading && (
          <p className="text-xs text-purple-400 mt-1.5">✨ AI is composing a reply…</p>
        )}
      </div>
    </div>
  );
}
