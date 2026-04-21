import { useEffect, useState } from 'react';
import { Star, Send, Check, X, Globe } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const STATUS_COLORS = {
  requested: 'bg-blue-500/20 text-blue-400',
  pending:   'bg-yellow-500/20 text-yellow-400',
  approved:  'bg-emerald-500/20 text-emerald-400',
  rejected:  'bg-red-500/20 text-red-400',
  published: 'bg-purple-500/20 text-purple-400',
};

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [clients, setClients]           = useState([]);
  const [tab, setTab]                   = useState('all');
  const [requestModal, setRequestModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading]           = useState(true);

  const load = () => api.get('/testimonials').then(r => setTestimonials(r.data));

  useEffect(() => {
    Promise.all([load(), api.get('/clients').then(r => setClients(r.data))]).finally(() => setLoading(false));
  }, []);

  const request = async () => {
    if (!selectedClient) return alert('Select a client');
    try { await api.post('/testimonials/request', { client_id: selectedClient }); await load(); setRequestModal(false); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const approve = async (id) => {
    await api.put(`/testimonials/${id}/approve`);
    setTestimonials(t => t.map(x => x.id === id ? { ...x, status: 'approved' } : x));
  };

  const reject = async (id) => {
    await api.put(`/testimonials/${id}/reject`);
    setTestimonials(t => t.map(x => x.id === id ? { ...x, status: 'rejected' } : x));
  };

  const publish = async (id) => {
    await api.put(`/testimonials/${id}/publish`);
    setTestimonials(t => t.map(x => x.id === id ? { ...x, status: 'published' } : x));
  };

  const filtered = tab === 'all' ? testimonials : testimonials.filter(t => t.status === tab);

  if (loading) return <div className="text-gray-400">Loading testimonials...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Testimonials</h2>
        <button onClick={() => setRequestModal(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Send size={16} /> Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'approved', 'published', 'rejected'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${tab === t ? 'bg-emerald-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'all' ? `(${testimonials.length})` : `(${testimonials.filter(x => x.status === t).length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-gray-500">No testimonials in this category.</div>
        )}
        {filtered.map(t => (
          <div key={t.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-medium text-white">{t.client_name || t.whatsapp_number}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'bg-gray-500/20 text-gray-400'}`}>{t.status}</span>
                  {t.rating && (
                    <span className="text-yellow-400 text-xs">{'⭐'.repeat(t.rating)}</span>
                  )}
                </div>
                {t.content && <p className="text-sm text-gray-300 italic">"{t.content}"</p>}
                <p className="text-xs text-gray-500 mt-2">{format(new Date(t.created_at), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                {t.status === 'pending' && (
                  <>
                    <button onClick={() => approve(t.id)} className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Check size={11} /> Approve
                    </button>
                    <button onClick={() => reject(t.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                      <X size={11} /> Reject
                    </button>
                  </>
                )}
                {t.status === 'approved' && (
                  <button onClick={() => publish(t.id)} className="text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Globe size={11} /> Publish
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Request Testimonial</h3>
              <button onClick={() => setRequestModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <label className="block text-xs text-gray-400 mb-1">Select Client</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
              <option value="">Choose a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.whatsapp_number}</option>)}
            </select>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRequestModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={request} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
