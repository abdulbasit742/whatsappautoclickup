import { useEffect, useState } from 'react';
import { Send, Clock, CheckCircle, RefreshCw, Zap, SkipForward, Plus, X } from 'lucide-react';
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
  const [followups, setFollowups]   = useState([]);
  const [sending, setSending]       = useState(null);
  const [skipping, setSkipping]     = useState(null);
  const [editMsg, setEditMsg]       = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading]       = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [clients, setClients]       = useState([]);
  const [newFollowup, setNewFollowup] = useState({ client_id: '', type: 'cold_lead', scheduled_at: '' });
  const toast = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/followups?status=${statusFilter}`),
      clients.length === 0 ? api.get('/clients') : Promise.resolve({ data: clients }),
    ]).then(([r, c]) => {
      setFollowups(r.data);
      if (clients.length === 0) setClients(c.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const triggerSend = async (f) => {
    setSending(f.id);
    try {
      const msg = editMsg[f.id] || DEFAULT_MESSAGES[f.type] || 'Hello! Just checking in. 😊';
      await api.post(`/followups/trigger/${f.id}`, { message: msg });
      toast('Follow-up sent successfully!', 'success');
      setFollowups(prev => prev.filter(x => x.id !== f.id));
    } catch (e) {
      toast('Failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally { setSending(null); }
  };

  const skip = async (id) => {
    setSkipping(id);
    try {
      await api.put(`/followups/${id}/skip`);
      toast('Follow-up skipped.', 'info');
      setFollowups(prev => prev.filter(x => x.id !== id));
    } catch (e) {
      toast('Failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally { setSkipping(null); }
  };

  const createFollowup = async () => {
    if (!newFollowup.client_id || !newFollowup.scheduled_at) {
      toast('Please fill in all fields.', 'warning');
      return;
    }
    try {
      await api.post('/followups', newFollowup);
      toast('Follow-up scheduled!', 'success');
      setCreateModal(false);
      setNewFollowup({ client_id: '', type: 'cold_lead', scheduled_at: '' });
      load();
    } catch (e) {
      toast('Failed: ' + (e.response?.data?.error || e.message), 'error');
    }
  };

  const filtered = followups.filter(f => typeFilter === 'all' ? true : f.type === typeFilter);
  const overdue  = followups.filter(f => new Date(f.scheduled_at) < new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Follow-ups</h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated follow-up queue — sent by cron every hour</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-sm transition-colors">
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <Plus size={14}/> Schedule
          </button>
        </div>
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

      {/* Status filter */}
      <div className="flex gap-2 mb-3">
        {['pending', 'sent', 'skipped'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${statusFilter === s ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${typeFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
          All ({followups.length})
        </button>
        {Object.entries(TYPE_INFO).map(([type, info]) => {
          const count = followups.filter(f => f.type === type).length;
          if (!count) return null;
          return (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${typeFilter === type ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
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
          <p className="text-gray-600 text-sm mt-1">No {statusFilter} follow-ups</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const isOverdue  = statusFilter === 'pending' && new Date(f.scheduled_at) < new Date();
            const typeInfo   = TYPE_INFO[f.type] || { label: f.type, color: 'bg-gray-500/20 text-gray-400' };
            const defaultMsg = DEFAULT_MESSAGES[f.type] || '';
            const isSent     = statusFilter !== 'pending';

            return (
              <div key={f.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${isOverdue ? 'border-red-500/30' : 'border-[#2a2a2a]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                      {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Overdue</span>}
                      <span className="font-medium text-white text-sm">{f.name || f.whatsapp_number}</span>
                      <span className="text-xs text-gray-500">{f.whatsapp_number}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <Clock size={11}/>
                      {statusFilter === 'sent' ? `Sent: ${f.sent_at ? format(new Date(f.sent_at), 'dd MMM yyyy HH:mm') : '—'}` : `Scheduled: ${format(new Date(f.scheduled_at), 'dd MMM yyyy HH:mm')}`}
                    </div>
                    {!isSent && (
                      <textarea
                        value={editMsg[f.id] !== undefined ? editMsg[f.id] : defaultMsg}
                        onChange={e => setEditMsg(prev => ({ ...prev, [f.id]: e.target.value }))}
                        rows={2}
                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    )}
                  </div>
                  {!isSent && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => triggerSend(f)}
                        disabled={sending === f.id}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {sending === f.id ? <RefreshCw size={12} className="animate-spin"/> : <Send size={12}/>}
                        {sending === f.id ? 'Sending...' : 'Send Now'}
                      </button>
                      <button
                        onClick={() => skip(f.id)}
                        disabled={skipping === f.id}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 border border-[#2a2a2a] px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap"
                      >
                        <SkipForward size={12}/> Skip
                      </button>
                      {isOverdue && (
                        <div className="flex items-center gap-1 text-xs text-red-400 justify-center">
                          <Zap size={10}/> Auto soon
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Schedule Follow-up</h3>
              <button onClick={() => setCreateModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Client</label>
                <select
                  value={newFollowup.client_id}
                  onChange={e => setNewFollowup(s => ({ ...s, client_id: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select
                  value={newFollowup.type}
                  onChange={e => setNewFollowup(s => ({ ...s, type: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(TYPE_INFO).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={newFollowup.scheduled_at}
                  onChange={e => setNewFollowup(s => ({ ...s, scheduled_at: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setCreateModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={createFollowup} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
