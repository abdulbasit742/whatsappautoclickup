import { useEffect, useState } from 'react';
import { Send, Plus, Sparkles, X, Users, Clock, Trash2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const AUDIENCE_LABELS = { all: 'All Clients', paid: 'Paid Clients Only', inactive: 'Inactive Clients', leads: 'Leads Only' };
const STATUS_COLORS = {
  sent:      'bg-emerald-500/20 text-emerald-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  draft:     'bg-gray-500/20 text-gray-400',
  failed:    'bg-red-500/20 text-red-400',
};
const emptyForm = { title: '', message: '', target_audience: 'all', scheduled_at: '' };

export default function Broadcasts() {
  const toast = useToast();
  const [broadcasts, setBroadcasts] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [stats, setStats]           = useState({});
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [sending, setSending]       = useState(false);
  const [creating, setCreating]     = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiTopic, setAiTopic]       = useState('');
  const [aiTone, setAiTone]         = useState('friendly');
  const [showAi, setShowAi]         = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get('/broadcasts')
      .then(r => setBroadcasts(r.data))
      .catch(() => toast('Failed to load broadcasts', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingStats(true);
    api.get(`/broadcasts/${selected.id}/stats`)
      .then(r => setStats(r.data))
      .catch(() => setStats({}))
      .finally(() => setLoadingStats(false));
  }, [selected?.id]);

  const generateWithAI = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    try {
      const r = await api.post('/ai/write-broadcast', { topic: aiTopic, tone: aiTone, audience: form.target_audience });
      setForm(f => ({ ...f, message: r.data.message }));
      setShowAi(false);
      toast('AI message generated!', 'success');
    } catch (e) {
      toast('AI error: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setAiLoading(false); }
  };

  const openModal = () => { setForm(emptyForm); setShowAi(false); setAiTopic(''); setModal(true); };

  const create = async (sendImmediately = false) => {
    if (!form.title.trim() || !form.message.trim()) {
      toast('Title and message are required', 'error'); return;
    }
    setCreating(true);
    try {
      const r = await api.post('/broadcasts', form);
      const newBroadcast = r.data;
      setBroadcasts(b => [newBroadcast, ...b]);
      setModal(false);
      setForm(emptyForm);
      if (sendImmediately) {
        await sendBroadcast(newBroadcast);
      } else {
        toast(form.scheduled_at ? 'Broadcast scheduled!' : 'Draft saved!', 'success');
        setSelected(newBroadcast);
      }
    } catch (e) {
      toast('Failed to create broadcast', 'error');
    } finally {
      setCreating(false);
    }
  };

  const sendBroadcast = async (broadcast) => {
    setSending(true);
    try {
      const r = await api.post(`/broadcasts/${broadcast.id}/send`);
      const updated = { ...broadcast, status: 'sent', total_sent: r.data.sent };
      setBroadcasts(b => b.map(x => x.id === broadcast.id ? updated : x));
      setSelected(updated);
      toast(`Sent to ${r.data.sent} client(s)!`, 'success');
    } catch (e) {
      toast('Failed to send: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSending(false);
    }
  };

  // NOTE: Add DELETE /api/broadcasts/:id route to broadcasts.js to enable this
  const deleteBroadcast = async (broadcast) => {
    if (!window.confirm(`Delete "${broadcast.title}"?`)) return;
    try {
      await api.delete(`/broadcasts/${broadcast.id}`);
      setBroadcasts(b => b.filter(x => x.id !== broadcast.id));
      if (selected?.id === broadcast.id) setSelected(null);
      toast('Broadcast deleted', 'success');
    } catch {
      toast('Delete not yet supported', 'info');
    }
  };

  const sel = selected ? broadcasts.find(b => b.id === selected.id) || selected : null;

  return (
    <div className="flex gap-5 h-full min-h-[600px]">
      {/* LEFT PANEL — Broadcast List */}
      <div className="w-1/3 min-w-[240px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Broadcasts</h2>
          <button onClick={openModal}
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            <Plus size={13} /> New
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center text-gray-500 text-sm flex-1">
            No broadcasts yet
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {broadcasts.map(b => (
              <button key={b.id} onClick={() => setSelected(b)}
                className={`w-full text-left bg-[#1a1a1a] border rounded-xl p-4 transition-colors hover:border-emerald-500/50 ${sel?.id === b.id ? 'border-emerald-500/60' : 'border-[#2a2a2a]'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate flex-1">{b.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                </div>
                <p className="text-xs text-gray-500">{AUDIENCE_LABELS[b.target_audience]}</p>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <Clock size={10} />
                  {b.sent_at ? format(new Date(b.sent_at), 'dd MMM yyyy') : (b.scheduled_at ? `Scheduled ${format(new Date(b.scheduled_at), 'dd MMM')}` : 'Draft')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Selected Broadcast Detail */}
      <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        {!sel ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ChevronRight size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Select a broadcast to view details</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-bold text-white">{sel.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sel.status]}`}>{sel.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Audience: {AUDIENCE_LABELS[sel.target_audience]} · Created {format(new Date(sel.created_at), 'dd MMM yyyy')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {(sel.status === 'draft' || sel.status === 'scheduled') && (
                  <button onClick={() => sendBroadcast(sel)} disabled={sending}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                    {sending ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={12} />}
                    Send Now
                  </button>
                )}
                <button onClick={() => deleteBroadcast(sel)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg border border-[#2a2a2a] hover:border-red-400/30">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Sent',  value: sel.total_sent || 0 },
                { label: 'Delivered',   value: loadingStats ? '…' : (stats.delivered ?? 0) },
                { label: 'Replies',     value: loadingStats ? '…' : (stats.replies   ?? 0) },
                { label: 'Reply Rate',  value: loadingStats ? '…' : `${stats.replyRate ?? '0.0'}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#0f0f0f] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Message content */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Message</p>
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                {sel.message}
              </div>
            </div>

            {sel.total_sent > 0 && (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Users size={11} /> Sent to {sel.total_sent} recipient{sel.total_sent !== 1 ? 's' : ''}
                {sel.sent_at && ` on ${format(new Date(sel.sent_at), 'dd MMM yyyy HH:mm')}`}
              </p>
            )}
          </>
        )}
      </div>

      {/* COMPOSE MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">New Broadcast</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Eid Special Offer 🎉"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Audience</label>
                <select value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="all">All Clients</option>
                  <option value="paid">Paid Clients Only</option>
                  <option value="inactive">Inactive Clients</option>
                  <option value="leads">Leads Only</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Message *</label>
                  <button onClick={() => setShowAi(!showAi)} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                    <Sparkles size={12}/> Write with AI
                  </button>
                </div>
                {showAi && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mb-3">
                    <p className="text-xs text-purple-300 font-medium mb-3">✨ AI Broadcast Writer</p>
                    <div className="space-y-2">
                      <input value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                        placeholder="What is this broadcast about?"
                        className="w-full bg-[#0f0f0f] border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"/>
                      <div className="flex gap-2">
                        <select value={aiTone} onChange={e => setAiTone(e.target.value)}
                          className="flex-1 bg-[#0f0f0f] border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                          <option value="friendly">Friendly</option>
                          <option value="professional">Professional</option>
                          <option value="urgent">Urgent</option>
                          <option value="excited">Excited</option>
                        </select>
                        <button onClick={generateWithAI} disabled={aiLoading}
                          className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                          <Sparkles size={14}/> {aiLoading ? 'Writing…' : 'Generate'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Your broadcast message… (use {{client_name}} variable)" rows={5}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"/>
                <p className="text-xs text-gray-600 mt-1">{form.message.length} characters</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Schedule (optional)</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setModal(false)} className="bg-[#2a2a2a] hover:bg-[#333] text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={() => create(false)} disabled={creating}
                className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                {form.scheduled_at ? 'Schedule' : 'Save Draft'}
              </button>
              <button onClick={() => create(true)} disabled={creating}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {creating && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Send size={13} /> Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
