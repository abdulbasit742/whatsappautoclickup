import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';
import ChatBubble from '../components/ChatBubble';

const STATUS_COLORS = {
  lead:     'bg-yellow-500/20 text-yellow-400',
  active:   'bg-blue-500/20 text-blue-400',
  paid:     'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  blocked:  'bg-red-500/20 text-red-400',
};

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [reply, setReply]       = useState('');
  const [tab, setTab]           = useState('chat');
  const [saving, setSaving]     = useState(false);
  const [notes, setNotes]       = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/clients/${id}/messages`),
      api.get(`/payments?client_id=${id}`),
      api.get(`/reviews?client_id=${id}`),
    ]).then(([c, m, p, r]) => {
      setClient(c.data);
      setNotes(c.data.notes || '');
      setMessages(m.data);
      setPayments(p.data);
      setReviews(r.data);
    });
  }, [id]);

  const sendMessage = async () => {
    if (!reply.trim()) return;
    await api.post(`/clients/${id}/send`, { message: reply });
    setMessages(m => [...m, { id: Date.now(), direction: 'outbound', content: reply, created_at: new Date() }]);
    setReply('');
  };

  const saveNotes = async () => {
    setSaving(true);
    await api.put(`/clients/${id}`, { ...client, notes });
    setSaving(false);
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
        {['chat', 'payments', 'reviews', 'notes'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              tab === t ? 'bg-emerald-500 text-white font-medium' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
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
                {['Service', 'Amount', 'Method', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No payments yet</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-300">{p.service_name || '—'}</td>
                  <td className="px-4 py-3 text-white font-medium">PKR {Number(p.amount_pkr).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300 capitalize">{p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{format(new Date(p.created_at), 'dd MMM yyyy')}</td>
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

      {tab === 'notes' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={8}
            placeholder="Add private notes about this client..."
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={saveNotes}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
