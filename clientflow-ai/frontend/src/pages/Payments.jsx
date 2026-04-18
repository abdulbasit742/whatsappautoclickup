import { useEffect, useState } from 'react';
import { CheckCircle, Clock, TrendingUp, DollarSign, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const METHOD_COLORS = {
  easypaisa: 'bg-green-500/20 text-green-400',
  jazzcash:  'bg-red-500/20 text-red-400',
  bank:      'bg-blue-500/20 text-blue-400',
};

export default function Payments() {
  const [payments, setPayments]   = useState([]);
  const [filter, setFilter]       = useState('all');
  const [preview, setPreview]     = useState(null);
  const [stats, setStats]         = useState({ total: 0, confirmed: 0, pending: 0, revenue: 0 });
  const [confirming, setConfirming] = useState(null); // id being confirmed
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/payments').then(r => {
      setPayments(r.data);
      const confirmed = r.data.filter(p => p.status === 'confirmed');
      setStats({
        total:     r.data.length,
        confirmed: confirmed.length,
        pending:   r.data.filter(p => p.status === 'pending').length,
        revenue:   confirmed.reduce((sum, p) => sum + parseFloat(p.amount_pkr || 0), 0),
      });
    }).catch(e => setError(e.response?.data?.error || e.message));
  }, []);

  const confirm = async id => {
    if (confirming) return; // prevent double-click
    setConfirming(id);
    setError('');
    try {
      await api.put(`/payments/${id}/confirm`);
      setPayments(p => p.map(x => x.id === id ? { ...x, status: 'confirmed' } : x));
      setStats(s => ({
        ...s,
        confirmed: s.confirmed + 1,
        pending: Math.max(0, s.pending - 1),
        revenue: s.revenue + parseFloat(payments.find(p => p.id === id)?.amount_pkr || 0),
      }));
    } catch (e) {
      setError('Failed to confirm payment: ' + (e.response?.data?.error || e.message));
    } finally {
      setConfirming(null);
    }
  };

  const filtered = payments.filter(p => filter === 'all' ? true : p.status === filter);

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Payments</h2>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-4">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `PKR ${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Confirmed',     value: stats.confirmed,  icon: CheckCircle, color: 'text-blue-400',    bg: 'bg-blue-500/10' },
          { label: 'Pending',       value: stats.pending,    icon: Clock,       color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
          { label: 'Total Orders',  value: stats.total,      icon: DollarSign,  color: 'text-purple-400',  bg: 'bg-purple-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'confirmed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${filter === f ? 'bg-emerald-500 text-white font-medium' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}
          >
            {f} {f !== 'all' && `(${payments.filter(p => p.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Client', 'Service', 'Amount', 'Method', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No payments found</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-[#2a2a2a]/50 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{p.name || p.whatsapp_number}</td>
                <td className="px-4 py-3 text-gray-300">{p.service_name || '—'}</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">PKR {Number(p.amount_pkr).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${METHOD_COLORS[p.method] || 'bg-gray-500/20 text-gray-400'}`}>{p.method}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(p.created_at), 'dd MMM HH:mm')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {p.screenshot_url && (
                      <button onClick={() => setPreview(p)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <Eye size={12}/> Receipt
                      </button>
                    )}
                    {p.status === 'pending' && (
                      <button
                        onClick={() => confirm(p.id)}
                        disabled={confirming === p.id}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle size={12}/> {confirming === p.id ? 'Confirming…' : 'Confirm'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Payment Receipt</h3>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <img src={preview.screenshot_url} alt="Receipt" className="w-full rounded-xl mb-4 object-cover" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Client</span><span className="text-white">{preview.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="text-emerald-400 font-bold">PKR {Number(preview.amount_pkr).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Method</span><span className="text-white capitalize">{preview.method}</span></div>
            </div>
            {preview.status === 'pending' && (
              <button onClick={() => { confirm(preview.id); setPreview(null); }}
                disabled={confirming === preview.id}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                <CheckCircle size={14}/> {confirming === preview.id ? 'Confirming…' : 'Confirm Payment'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
