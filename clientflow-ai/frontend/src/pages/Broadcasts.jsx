import { useEffect, useState } from 'react';
import { Send, Plus, Sparkles, X, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const AUDIENCE_LABELS = { all: 'All Clients', paid: 'Paid Only', inactive: 'Inactive', leads: 'Leads' };
const STATUS_COLORS = {
  sent: 'bg-emerald-500/20 text-emerald-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  draft: 'bg-gray-500/20 text-gray-400',
};
const emptyForm = { title: '', message: '', target_audience: 'all', scheduled_at: '' };

export default function Broadcasts() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [sending, setSending]       = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiTopic, setAiTopic]       = useState('');
  const [aiTone, setAiTone]         = useState('friendly');
  const [showAi, setShowAi]         = useState(false);
  const [preview, setPreview]       = useState(null);

  useEffect(() => { api.get('/broadcasts').then(r => setBroadcasts(r.data)); }, []);

  const generateWithAI = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    try {
      const r = await api.post('/ai/write-broadcast', { topic: aiTopic, tone: aiTone, audience: form.target_audience });
      setForm(f => ({ ...f, message: r.data.message }));
      setShowAi(false);
    } catch (e) { alert('AI error: ' + (e.response?.data?.error || e.message)); }
    finally { setAiLoading(false); }
  };

  const create = async () => {
    if (!form.title.trim() || !form.message.trim()) return alert('Title and message required');
    const r = await api.post('/broadcasts', form);
    setBroadcasts(b => [r.data, ...b]);
    setForm(emptyForm); setModal(false);
  };

  const sendNow = async id => {
    if (!confirm('Send this broadcast to all selected clients?')) return;
    setSending(id);
    try {
      const r = await api.post(`/broadcasts/${id}/send`);
      setBroadcasts(b => b.map(x => x.id === id ? { ...x, status: 'sent', total_sent: r.data.sent } : x));
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)); }
    finally { setSending(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Broadcasts</h2>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Broadcast
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: broadcasts.length },
          { label: 'Sent', value: broadcasts.filter(b => b.status === 'sent').length },
          { label: 'Total Delivered', value: broadcasts.reduce((a, b) => a + (parseInt(b.total_sent) || 0), 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {broadcasts.length === 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No broadcasts yet.</div>
        )}
        {broadcasts.map(b => (
          <div key={b.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-white truncate">{b.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 mb-2">{b.message}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users size={11}/> {AUDIENCE_LABELS[b.target_audience]}</span>
                  {b.total_sent > 0 && <span className="flex items-center gap-1"><Send size={11}/> {b.total_sent} sent</span>}
                  <span className="flex items-center gap-1"><Clock size={11}/> {format(new Date(b.created_at), 'dd MMM yyyy')}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => setPreview(b)} className="text-xs text-gray-400 hover:text-white border border-[#2a2a2a] px-3 py-1.5 rounded-lg transition-colors">Preview</button>
                {(b.status === 'draft' || b.status === 'scheduled') && (
                  <button onClick={() => sendNow(b.id)} disabled={sending === b.id}
                    className="flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                    <Send size={11}/> {sending === b.id ? 'Sending...' : 'Send Now'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">New Broadcast</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Eid Special Offer 🎉"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Audience</label>
                <select value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="all">All Clients</option>
                  <option value="paid">Paid Only</option>
                  <option value="inactive">Inactive</option>
                  <option value="leads">Leads</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Message</label>
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
                          <Sparkles size={14}/> {aiLoading ? 'Writing...' : 'Generate'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Your broadcast message... (use {{client_name}} variable)" rows={5}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"/>
                <p className="text-xs text-gray-600 mt-1">{form.message.length} characters</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Schedule (optional)</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={create} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">
                {form.scheduled_at ? 'Schedule' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Preview</h3>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white"><X size={16}/></button>
            </div>
            <div className="bg-[#0f0f0f] rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{preview.message}</div>
            <div className="mt-4 flex justify-between text-xs text-gray-500">
              <span>Audience: {AUDIENCE_LABELS[preview.target_audience]}</span>
              <span>{preview.message.length} chars</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
