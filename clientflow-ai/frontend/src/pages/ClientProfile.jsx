import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Send, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import api from '../utils/api';
import ChatBubble from '../components/ChatBubble';

const STATUS_COLORS = {
  lead:     'bg-yellow-500/20 text-yellow-400',
  active:   'bg-blue-500/20 text-blue-400',
  paid:     'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  blocked:  'bg-red-500/20 text-red-400',
};

const FOLLOW_UP_TYPES = [
  { value: 'cold_lead', label: 'Cold Lead' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'post_delivery', label: 'Post Delivery' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'upsell', label: 'Upsell' },
];

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [followups, setFollowups] = useState([]);
  const [reply, setReply]       = useState('');
  const [tab, setTab]           = useState('chat');
  const [saving, setSaving]     = useState(false);
  const [notes, setNotes]       = useState('');
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [newFu, setNewFu]       = useState({ type: 'cold_lead', scheduled_at: '' });

  const loadData = () => Promise.all([
    api.get(`/clients/${id}`),
    api.get(`/clients/${id}/messages`),
    api.get(`/payments?client_id=${id}`),
    api.get(`/reviews?client_id=${id}`),
    api.get(`/followups?client_id=${id}&status=pending`),
  ]).then(([c, m, p, r, fu]) => {
    setClient(c.data);
    setNotes(c.data.notes || '');
    setMessages(m.data);
    setPayments(p.data);
    setReviews(r.data);
    setFollowups(fu.data);
  });

  useEffect(() => { loadData(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!reply.trim()) return;
    const text = reply;
    setReply('');
    await api.post(`/clients/${id}/send`, { message: text });
    setMessages(m => [...m, { id: Date.now(), direction: 'outbound', content: text, created_at: new Date() }]);
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/${id}`, { ...client, notes });
    } finally {
      setSaving(false);
    }
  };

  const triggerFollowUp = async (fuId) => {
    await api.post(`/followups/trigger/${fuId}`);
    await loadData();
    alert('Follow-up sent!');
  };

  const addFollowUp = async () => {
    if (!newFu.scheduled_at) return alert('Please set a scheduled date/time');
    await api.post('/followups', { client_id: id, ...newFu });
    setShowAddFollowup(false);
    setNewFu({ type: 'cold_lead', scheduled_at: '' });
    await loadData();
  };

  const confirmPayment = async (payId) => {
    if (!window.confirm('Confirm this payment?')) return;
    await api.put(`/payments/${payId}/confirm`);
    await loadData();
  };

  if (!client) return <div className="text-gray-400 p-6">Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/clients')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{client.name || client.whatsapp_number}</h2>
          <p className="text-sm text-gray-500">{client.whatsapp_number}</p>
        </div>
        <span className={`ml-auto text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[client.status]}`}>
          {client.status}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Spent', value: `PKR ${Number(client.total_spent_pkr || 0).toLocaleString()}` },
          { label: 'First Contact', value: client.first_contact_at ? format(new Date(client.first_contact_at), 'dd MMM yyyy') : '—' },
          { label: 'Last Active', value: client.last_active_at ? format(new Date(client.last_active_at), 'dd MMM HH:mm') : '—' },
          { label: 'Referral Code', value: client.referral_code || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {['chat', 'payments', 'reviews', 'followups', 'notes'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              tab === t ? 'bg-emerald-500 text-white font-medium' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
            {t === 'followups' && followups.length > 0 && (
              <span className="ml-1 text-xs bg-yellow-500/30 text-yellow-400 px-1.5 rounded-full">{followups.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'chat' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col" style={{ height: '420px' }}>
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && <p className="text-gray-500 text-sm text-center mt-8">No messages yet</p>}
            {messages.map((m, i) => <ChatBubble key={m.id || i} msg={m} />)}
          </div>
          <div className="p-3 border-t border-[#2a2a2a] flex gap-2">
            <input
              value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <button onClick={sendMessage} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Service', 'Amount', 'Method', 'Status', 'Date', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No payments yet</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-300">{p.service_name || '—'}</td>
                  <td className="px-4 py-3 text-white font-medium">PKR {Number(p.amount_pkr).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300 capitalize">{p.method || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.status === 'rejected'  ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{format(new Date(p.created_at), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    {p.status === 'pending' && (
                      <button
                        onClick={() => confirmPayment(p.id)}
                        className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded-lg transition-colors"
                      >
                        Confirm
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {reviews.length === 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No reviews yet</div>
          )}
          {reviews.map(r => (
            <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400">{'⭐'.repeat(r.rating)}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                    r.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{r.sentiment}</span>
                  <span className="text-xs text-gray-500">{format(new Date(r.created_at), 'dd MMM yyyy')}</span>
                </div>
              </div>
              <p className="text-sm text-gray-300">{r.feedback || 'No feedback provided'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'followups' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400">Pending Follow-ups</h3>
            <button
              onClick={() => setShowAddFollowup(v => !v)}
              className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={12} /> Add Follow-up
            </button>
          </div>

          {showAddFollowup && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select
                    value={newFu.type}
                    onChange={e => setNewFu(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {FOLLOW_UP_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Schedule At</label>
                  <input
                    type="datetime-local"
                    value={newFu.scheduled_at}
                    onChange={e => setNewFu(f => ({ ...f, scheduled_at: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddFollowup(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
                <button onClick={addFollowUp} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Schedule</button>
              </div>
            </div>
          )}

          {followups.length === 0 && !showAddFollowup && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500 text-sm">
              No pending follow-ups
            </div>
          )}
          {followups.map(f => (
            <div key={f.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white capitalize">{f.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={11} /> Scheduled: {format(new Date(f.scheduled_at), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
              <button
                onClick={() => triggerFollowUp(f.id)}
                className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Send size={11} /> Send Now
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={8}
            placeholder="Add private notes about this client... (only visible to you)"
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={saveNotes}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? <XCircle size={14} /> : <CheckCircle size={14} />}
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
