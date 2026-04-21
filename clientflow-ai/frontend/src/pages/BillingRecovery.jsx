import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X, Send } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  failed:  'bg-red-500/20 text-red-400',
};

export default function BillingRecovery() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(null);

  const load = () => Promise.all([
    api.get('/billing-recovery').then(r => setPayments(r.data)),
    api.get('/billing-recovery/summary').then(r => setSummary(r.data)),
  ]);

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const remind = async (id) => {
    setActing(id + '_remind');
    try { await api.post(`/billing-recovery/${id}/remind`); alert('Reminder sent!'); }
    catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setActing(null); }
  };

  const markFailed = async (id) => {
    if (!confirm('Mark this payment as failed?')) return;
    setActing(id + '_fail');
    try { await api.post(`/billing-recovery/${id}/mark-failed`); await load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setActing(null); }
  };

  const retry = async (id) => {
    setActing(id + '_retry');
    try { await api.post(`/billing-recovery/${id}/retry`); await load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setActing(null); }
  };

  if (loading) return <div className="text-gray-400">Loading billing recovery...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Billing Recovery</h2>

      {/* Warning banner */}
      {summary.pending_count > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-300">{summary.pending_count} payment(s) pending recovery</p>
            <p className="text-xs text-yellow-200/70 mt-0.5">PKR {Number(summary.pending_amount).toLocaleString()} at risk. Send reminders or mark as failed.</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending',      value: summary.pending_count,  sub: `PKR ${Number(summary.pending_amount || 0).toLocaleString()}`, color: 'text-yellow-400' },
          { label: 'Failed',       value: summary.failed_count,   sub: `PKR ${Number(summary.failed_amount || 0).toLocaleString()}`,  color: 'text-red-400' },
          { label: 'Overdue Amt',  value: `PKR ${Number(summary.overdue_amount || 0).toLocaleString()}`, color: 'text-orange-400' },
          { label: 'Reminders Sent', value: summary.retried_count, color: 'text-blue-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Payment list */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-[#2a2a2a] bg-[#111]">
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Service</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Reminded</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No pending/failed payments 🎉</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id} className="border-b border-[#1f1f1f] hover:bg-[#222]">
                  <td className="px-4 py-3 text-white">{p.name || p.whatsapp_number}</td>
                  <td className="px-4 py-3 text-gray-400">{p.service_name || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-white">PKR {Number(p.amount_pkr).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-400'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">{p.reminder_sent ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(p.created_at), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'pending' && (
                        <button onClick={() => remind(p.id)} disabled={acting === p.id + '_remind'}
                          className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2 py-1 rounded-lg disabled:opacity-50">
                          <Send size={11} /> Remind
                        </button>
                      )}
                      {p.status === 'pending' && (
                        <button onClick={() => markFailed(p.id)} disabled={acting === p.id + '_fail'}
                          className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded-lg disabled:opacity-50">
                          <X size={11} /> Fail
                        </button>
                      )}
                      {p.status === 'failed' && (
                        <button onClick={() => retry(p.id)} disabled={acting === p.id + '_retry'}
                          className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded-lg disabled:opacity-50">
                          <RefreshCw size={11} /> Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
