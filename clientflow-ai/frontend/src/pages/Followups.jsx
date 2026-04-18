import { useEffect, useState } from 'react';
import { Send, Clock, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const TYPE_INFO = {
  cold_lead:       { label: 'Cold Lead',        color: 'bg-yellow-500/20 text-yellow-400' },
  pending_payment: { label: 'Pending Payment',  color: 'bg-red-500/20 text-red-400' },
  post_delivery:   { label: 'Post Delivery',    color: 'bg-blue-500/20 text-blue-400' },
  re_engagement:   { label: 'Re-engagement',   color: 'bg-purple-500/20 text-purple-400' },
  upsell:          { label: 'Upsell',           color: 'bg-emerald-500/20 text-emerald-400' },
};

const DEFAULT_MESSAGES = {
  cold_lead:       "Hello! 👋 Just checking in — we're still here to help. Any questions about our services?",
  pending_payment: "Hi! 😊 Your payment is still pending. No rush — just send whenever you're ready! 💙",
  post_delivery:   "Hi! 🌟 Hope you're loving your service! Could you rate us 1–5 and share feedback? ⭐",
  re_engagement:   "Assalam u Alaikum! 👋 It's been a while — we have exciting new services for you! 🎉",
  upsell:          "Hi! 🚀 Based on your recent purchase, you might love our other services too! Want to see what's new?",
};

export default function Followups() {
  const toast = useToast();
  const [followups, setFollowups]   = useState([]);
  const [sending, setSending]       = useState(null);
  const [editMsg, setEditMsg]       = useState({});
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/followups').then(r => setFollowups(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const triggerSend = async (f) => {
    setSending(f.id);
    try {
      const msg = editMsg[f.id] || DEFAULT_MESSAGES[f.type] || 'Hello! Just checking in. 😊';
      await api.post(`/followups/trigger/${f.id}`, { message: msg });
      setFollowups(prev => prev.filter(x => x.id !== f.id));
      toast('Follow-up sent!', 'success');
    } catch (e) {
      toast('Failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSending(null);
    }
  };

  const filtered = followups.filter(f => filter === 'all' ? true : f.type === filter);
  const overdue  = followups.filter(f => new Date(f.scheduled_at) < new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Follow-ups</h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated follow-up queue — sent by cron every hour</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm transition-colors">
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Pending</p>
          <p className="text-2xl font-bold text-white">{followups.length}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-xs text-red-400 mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-400">{overdue.length}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Scheduled</p>
          <p className="text-2xl font-bold text-blue-400">{followups.length - overdue.length}</p>
        </div>
      </div>

      {/* Filter by type */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === 'all' ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
          All ({followups.length})
        </button>
        {Object.entries(TYPE_INFO).map(([type, info]) => {
          const count = followups.filter(f => f.type === type).length;
          if (!count) return null;
          return (
            <button key={type} onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === type ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Follow-up List */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">All caught up!</p>
          <p className="text-gray-600 text-sm mt-1">No pending follow-ups</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const isOverdue  = new Date(f.scheduled_at) < new Date();
            const typeInfo   = TYPE_INFO[f.type] || { label: f.type, color: 'bg-gray-500/20 text-gray-400' };
            const defaultMsg = DEFAULT_MESSAGES[f.type] || '';

            return (
              <div key={f.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${isOverdue ? 'border-red-500/30' : 'border-[#2a2a2a]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                      {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Overdue</span>}
                      <span className="font-medium text-white text-sm">{f.name || f.whatsapp_number}</span>
                      <span className="text-xs text-gray-500">{f.whatsapp_number}</span>
                    </div>

                    {/* Schedule time */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <Clock size={11}/>
                      Scheduled: {format(new Date(f.scheduled_at), 'dd MMM yyyy HH:mm')}
                    </div>

                    {/* Editable message */}
                    <textarea
                      value={editMsg[f.id] !== undefined ? editMsg[f.id] : defaultMsg}
                      onChange={e => setEditMsg(prev => ({ ...prev, [f.id]: e.target.value }))}
                      rows={2}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => triggerSend(f)}
                      disabled={sending === f.id}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {sending === f.id ? <RefreshCw size={12} className="animate-spin"/> : <Send size={12}/>}
                      {sending === f.id ? 'Sending...' : 'Send Now'}
                    </button>
                    {isOverdue && (
                      <div className="flex items-center gap-1 text-xs text-red-400 justify-center">
                        <Zap size={10}/> Auto soon
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
