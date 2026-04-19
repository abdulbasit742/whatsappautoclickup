import { useState, useEffect } from 'react';
import api from '../utils/api';
import { CreditCard, Plus, CheckCircle, XCircle, FileText, RefreshCw, Shield } from 'lucide-react';

const STATUS_COLORS = {
  trial: 'text-yellow-400 bg-yellow-400/10',
  active: 'text-emerald-400 bg-emerald-400/10',
  paused: 'text-gray-400 bg-gray-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
  expired: 'text-red-400 bg-red-400/10',
};

const INVOICE_STATUS = {
  unpaid: 'text-yellow-400 bg-yellow-400/10',
  paid: 'text-emerald-400 bg-emerald-400/10',
  overdue: 'text-red-400 bg-red-400/10',
  void: 'text-gray-400 bg-gray-400/10',
};

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('subscription');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', description: '', price_pkr: '', price_usd: '', billing_cycle: 'monthly', max_users: 3, max_contacts: 500, features: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
    fetchInvoices();
  }, []);

  async function fetchPlans() { try { const r = await api.get('/billing/plans'); setPlans(r.data); } catch {} }
  async function fetchSubscription() { try { const r = await api.get('/billing/subscription'); setSubscription(r.data); } catch {} }
  async function fetchInvoices() { try { const r = await api.get('/billing/invoices'); setInvoices(r.data); } catch {} }

  async function subscribeToPlan(planId) {
    try {
      await api.post('/billing/subscription', { plan_id: planId, payment_method: 'manual', trial_days: 14 });
      fetchSubscription();
      fetchInvoices();
      alert('Subscription activated with 14-day trial!');
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  }

  async function createPlan(e) {
    e.preventDefault(); setLoading(true);
    try {
      const features = planForm.features.split('\n').filter(Boolean);
      await api.post('/billing/plans', { ...planForm, features });
      setShowPlanForm(false);
      setPlanForm({ name: '', description: '', price_pkr: '', price_usd: '', billing_cycle: 'monthly', max_users: 3, max_contacts: 500, features: '' });
      fetchPlans();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  }

  async function markInvoicePaid(id) {
    await api.patch(`/billing/invoices/${id}/pay`);
    fetchInvoices();
  }

  const daysLeft = subscription?.expires_at
    ? Math.max(0, Math.floor((new Date(subscription.expires_at) - Date.now()) / 86400000))
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="text-emerald-400" size={22} />
        <h1 className="text-xl font-bold">Billing & Subscriptions</h1>
      </div>

      {/* Current subscription banner */}
      {subscription && (
        <div className={`rounded-xl p-5 border mb-6 ${subscription.status === 'active' || subscription.status === 'trial' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-400/30 bg-red-400/5'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-emerald-400" />
                <span className="font-semibold">{subscription.plan_name || 'Unknown Plan'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[subscription.status]}`}>
                  {subscription.status}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                PKR {subscription.price_pkr?.toLocaleString()}/month ·
                {subscription.max_users} users · {subscription.max_contacts?.toLocaleString()} contacts
              </div>
              {subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date() && (
                <div className="text-xs text-yellow-400 mt-1">
                  Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="text-right">
              {daysLeft !== null && <div className="text-2xl font-bold text-emerald-400">{daysLeft}</div>}
              {daysLeft !== null && <div className="text-xs text-gray-500">days remaining</div>}
            </div>
          </div>
          {subscription.features && (
            <div className="flex flex-wrap gap-2 mt-3">
              {(Array.isArray(subscription.features) ? subscription.features : JSON.parse(subscription.features || '[]')).map((f, i) => (
                <span key={i} className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle size={10} /> {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#2a2a2a]">
        {[
          { id: 'subscription', label: 'Plans' },
          { id: 'invoices', label: 'Invoices' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm border-b-2 transition -mb-px ${
              activeTab === id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Plans Tab */}
      {activeTab === 'subscription' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Available Plans</h3>
            <button onClick={() => setShowPlanForm(!showPlanForm)}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Plus size={12} /> New Plan
            </button>
          </div>

          {showPlanForm && (
            <form onSubmit={createPlan} className="bg-[#1a1a1a] rounded-xl p-5 border border-emerald-500/30 mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Plan Name</label>
                <input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} required
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Price (PKR/month)</label>
                <input value={planForm.price_pkr} onChange={e => setPlanForm({ ...planForm, price_pkr: e.target.value })} type="number" required
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Price (USD/month)</label>
                <input value={planForm.price_usd} onChange={e => setPlanForm({ ...planForm, price_usd: e.target.value })} type="number"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Billing Cycle</label>
                <select value={planForm.billing_cycle} onChange={e => setPlanForm({ ...planForm, billing_cycle: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Max Users</label>
                <input value={planForm.max_users} onChange={e => setPlanForm({ ...planForm, max_users: e.target.value })} type="number"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Max Contacts</label>
                <input value={planForm.max_contacts} onChange={e => setPlanForm({ ...planForm, max_contacts: e.target.value })} type="number"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Features (one per line)</label>
                <textarea value={planForm.features} onChange={e => setPlanForm({ ...planForm, features: e.target.value })} rows={4}
                  placeholder="Unlimited messages&#10;AI assistant&#10;Campaign engine&#10;Priority support"
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <input value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowPlanForm(false)} className="px-4 py-2 rounded-lg border border-[#333] text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold">
                  {loading ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-3 gap-6">
            {plans.map(p => {
              const isActive = subscription?.plan_id === p.id;
              const features = Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]');
              return (
                <div key={p.id} className={`bg-[#1a1a1a] rounded-2xl p-6 border transition ${isActive ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-[#2a2a2a] hover:border-emerald-500/20'}`}>
                  {isActive && <div className="text-xs text-emerald-400 font-semibold mb-3 flex items-center gap-1"><CheckCircle size={12} /> Current Plan</div>}
                  <div className="font-bold text-lg mb-1">{p.name}</div>
                  <div className="text-gray-500 text-xs mb-4">{p.description}</div>
                  <div className="text-3xl font-bold mb-1">PKR {Number(p.price_pkr).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mb-1">/{p.billing_cycle}</div>
                  {p.price_usd && <div className="text-xs text-gray-600 mb-4">${p.price_usd} USD</div>}
                  <div className="text-xs text-gray-500 mb-4">{p.max_users} users · {Number(p.max_contacts).toLocaleString()} contacts</div>
                  <ul className="space-y-2 mb-5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle size={12} className="text-emerald-400 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => subscribeToPlan(p.id)} disabled={isActive}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition ${isActive ? 'bg-emerald-500/10 text-emerald-400 cursor-default' : 'bg-emerald-500 hover:bg-emerald-600 text-black'}`}>
                    {isActive ? 'Active' : 'Subscribe'}
                  </button>
                </div>
              );
            })}
            {!plans.length && (
              <div className="col-span-3 text-center text-gray-500 py-8">No plans created yet. Create your first plan.</div>
            )}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-400">
                  <th className="text-left p-4">Invoice</th>
                  <th className="text-left p-4">Plan</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Due Date</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} className="border-b border-[#2a2a2a] hover:bg-white/5">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-500" />
                        <span className="text-xs text-gray-400">INV-{String(i + 1).padStart(4, '0')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{inv.plan_name || '—'}</td>
                    <td className="p-4">
                      <div className="font-medium">PKR {Number(inv.amount_pkr).toLocaleString()}</div>
                      {inv.amount_usd && <div className="text-xs text-gray-500">${inv.amount_usd}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${INVOICE_STATUS[inv.status]}`}>{inv.status}</span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      {inv.status === 'unpaid' && (
                        <button onClick={() => markInvoicePaid(inv.id)}
                          className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg hover:bg-emerald-500/20">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
