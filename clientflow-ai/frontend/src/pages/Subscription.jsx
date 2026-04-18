import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CreditCard, TrendingUp, Calendar, AlertTriangle,
  CheckCircle, Clock, XCircle, RefreshCw, ChevronRight,
} from 'lucide-react';
import api from '../utils/api';

const STATUS_COLORS = {
  active:           'bg-emerald-500/20 text-emerald-400',
  trialing:         'bg-blue-500/20 text-blue-400',
  cancelled:        'bg-red-500/20 text-red-400',
  past_due:         'bg-yellow-500/20 text-yellow-400',
  pending_payment:  'bg-yellow-500/20 text-yellow-400',
  paused:           'bg-gray-500/20 text-gray-400',
};

const INV_STATUS_COLORS = {
  paid:     'bg-emerald-500/20 text-emerald-400',
  pending:  'bg-yellow-500/20 text-yellow-400',
  failed:   'bg-red-500/20 text-red-400',
  refunded: 'bg-blue-500/20 text-blue-400',
  waived:   'bg-gray-500/20 text-gray-400',
};

function UsageBar({ label, used, limit }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isUnlimited = limit === -1;
  const warning = pct >= 90;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={warning ? 'text-yellow-400' : 'text-gray-300'}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${warning ? 'bg-yellow-400' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function Subscription() {
  const [sub, setSub]           = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // invoice to confirm
  const [confirmForm, setConfirmForm]   = useState({ payment_method: 'easypaisa', transaction_ref: '' });
  const [submitting, setSubmitting]     = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [subRes, invRes, usageRes] = await Promise.all([
        api.get('/subscription'),
        api.get('/subscription/invoices'),
        api.get('/subscription/usage'),
      ]);
      setSub(subRes.data);
      setInvoices(invRes.data);
      setUsage(usageRes.data);
    } catch {
      // No subscription yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async () => {
    if (!window.confirm('Cancel subscription at period end?')) return;
    setCancelling(true);
    try {
      const r = await api.post('/subscription/cancel');
      setSub(r.data);
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const r = await api.post('/subscription/reactivate');
      setSub(r.data);
    } finally {
      setReactivating(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!confirmModal) return;
    setSubmitting(true);
    try {
      await api.put(`/subscription/invoices/${confirmModal.id}/confirm`, confirmForm);
      setConfirmModal(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>
  );

  if (!sub) return (
    <div className="text-center py-20">
      <CreditCard size={48} className="mx-auto text-gray-600 mb-4"/>
      <h3 className="text-white font-bold text-lg mb-2">No Active Subscription</h3>
      <p className="text-gray-400 text-sm mb-6">Choose a plan to unlock all features.</p>
      <button
        onClick={() => navigate('/pricing')}
        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
      >
        View Pricing Plans
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Subscription</h2>
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View plans <ChevronRight size={14}/>
        </button>
      </div>

      {/* Current Plan Card */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Plan</p>
            <h3 className="text-2xl font-extrabold text-white">{sub.display_name}</h3>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[sub.status] || 'bg-gray-500/20 text-gray-400'}`}>
                {sub.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500 capitalize">{sub.billing_cycle} billing</span>
              {sub.cancel_at_period_end && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={10}/> Cancels on {format(new Date(sub.current_period_end), 'dd MMM yyyy')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs text-gray-500">Next renewal</p>
              <p className="text-sm text-white font-medium">
                {sub.cancel_at_period_end ? '—' : format(new Date(sub.current_period_end), 'dd MMM yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              {sub.cancel_at_period_end ? (
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <RefreshCw size={11}/> Reactivate
                </button>
              ) : (
                sub.status === 'active' && sub.plan_name !== 'free' && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <XCircle size={11}/> Cancel
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-white mb-5">Usage This Period</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <UsageBar label="Clients"      used={usage.usage.clients.used}      limit={usage.usage.clients.limit}/>
            <UsageBar label="Broadcasts"   used={usage.usage.broadcasts.used}   limit={usage.usage.broadcasts.limit}/>
            <UsageBar label="AI Messages"  used={usage.usage.ai_messages.used}  limit={usage.usage.ai_messages.limit}/>
            <UsageBar label="Appointments" used={usage.usage.appointments.used} limit={usage.usage.appointments.limit}/>
          </div>
          {/* Plan Flags */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              ['AI Replies',        sub.ai_enabled],
              ['Analytics',         sub.analytics_enabled],
              ['Referrals',         sub.referrals_enabled],
              ['WhatsApp API',      sub.whatsapp_api_enabled],
              ['Custom Branding',   sub.custom_branding],
              ['Priority Support',  sub.priority_support],
            ].map(([label, on]) => (
              <span key={label} className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full ${on ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#2a2a2a] text-gray-600'}`}>
                {on ? <CheckCircle size={10}/> : <XCircle size={10}/>} {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a2a]">
          <h4 className="text-sm font-semibold text-white">Billing History</h4>
        </div>
        {invoices.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500 text-sm">No invoices yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Plan', 'Period', 'Amount', 'Method', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-[#2a2a2a]/50 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{inv.plan_display_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {format(new Date(inv.period_start), 'dd MMM')} – {format(new Date(inv.period_end), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">
                    {Number(inv.amount_pkr) === 0 ? 'Free' : `PKR ${Number(inv.amount_pkr).toLocaleString()}`}
                  </td>
                  <td className="px-4 py-3 text-gray-300 capitalize">{inv.payment_method || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${INV_STATUS_COLORS[inv.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => setConfirmModal(inv)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <CheckCircle size={12}/> Confirm
                      </button>
                    )}
                    {inv.paid_at && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={10}/> {format(new Date(inv.paid_at), 'dd MMM yyyy')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Payment Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(null)}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-1">Confirm Payment</h3>
            <p className="text-gray-400 text-sm mb-5">
              PKR {Number(confirmModal.amount_pkr).toLocaleString()} — {confirmModal.plan_display_name}
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Payment Method</label>
                <select
                  value={confirmForm.payment_method}
                  onChange={e => setConfirmForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="easypaisa">Easypaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Transaction Reference</label>
                <input
                  value={confirmForm.transaction_ref}
                  onChange={e => setConfirmForm(f => ({ ...f, transaction_ref: e.target.value }))}
                  placeholder="e.g. TXN-12345678"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-[#2a2a2a] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmInvoice}
                disabled={submitting}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
              >
                {submitting ? 'Confirming…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
