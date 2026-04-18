import { useEffect, useState } from 'react';
import { Check, Zap, Star, Building2, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const PLAN_ICONS = { free: Gift, basic: Zap, pro: Star, enterprise: Building2 };
const PLAN_COLORS = {
  free:       'border-[#2a2a2a] hover:border-gray-500',
  basic:      'border-blue-500/40 hover:border-blue-400',
  pro:        'border-emerald-500/60 hover:border-emerald-400 ring-1 ring-emerald-500/20',
  enterprise: 'border-purple-500/40 hover:border-purple-400',
};
const BADGE_COLORS = {
  free:       'bg-gray-700 text-gray-300',
  basic:      'bg-blue-500/20 text-blue-300',
  pro:        'bg-emerald-500/20 text-emerald-300',
  enterprise: 'bg-purple-500/20 text-purple-300',
};

function fmt(n) {
  if (n === -1) return 'Unlimited';
  return n.toLocaleString();
}

function pkr(n) {
  if (n === 0) return 'Free';
  return `PKR ${Number(n).toLocaleString()}`;
}

export default function Pricing() {
  const [plans, setPlans]       = useState([]);
  const [billing, setBilling]   = useState('monthly'); // 'monthly' | 'yearly'
  const [loading, setLoading]   = useState(true);
  const [current, setCurrent]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ payment_method: 'easypaisa', transaction_ref: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/plans').then(r => { setPlans(r.data); setLoading(false); });
    api.get('/subscription').then(r => setCurrent(r.data)).catch(() => {});
  }, []);

  const handleChoose = (plan) => {
    if (plan.name === 'enterprise') {
      window.open('mailto:sales@clientflow.ai?subject=Enterprise%20Inquiry', '_blank');
      return;
    }
    setSelected(plan);
    setModal(true);
  };

  const handleSubscribe = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/subscription', {
        plan_id: selected.id,
        billing_cycle: billing,
        payment_method: form.payment_method || null,
        transaction_ref: form.transaction_ref || null,
      });
      setModal(false);
      navigate('/subscription');
    } catch (err) {
      alert(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const price = (plan) => {
    if (plan.name === 'enterprise') return 'Custom';
    const val = billing === 'yearly' ? plan.price_yearly_pkr : plan.price_monthly_pkr;
    return pkr(val);
  };

  const savings = (plan) => {
    if (!plan.price_monthly_pkr || plan.name === 'enterprise') return null;
    const monthly = plan.price_monthly_pkr * 12;
    const yearly  = plan.price_yearly_pkr;
    if (!yearly || yearly >= monthly) return null;
    const pct = Math.round(((monthly - yearly) / monthly) * 100);
    return `Save ${pct}%`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">Loading plans…</div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-white mb-3">Simple, Transparent Pricing</h2>
        <p className="text-gray-400 text-sm">Start free. Scale as you grow. Cancel any time.</p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-2 mt-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
          {['monthly', 'yearly'].map(c => (
            <button
              key={c}
              onClick={() => setBilling(c)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${billing === c ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
              {c === 'yearly' && <span className="ml-1.5 text-xs text-emerald-300">2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map(plan => {
          const Icon = PLAN_ICONS[plan.name] || Zap;
          const isCurrent = current?.plan_name === plan.name;
          const save = savings(plan);
          return (
            <div key={plan.id} className={`relative bg-[#1a1a1a] border rounded-2xl p-6 flex flex-col transition-all ${PLAN_COLORS[plan.name]}`}>
              {plan.name === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  MOST POPULAR
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-3 right-3 bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                  Current
                </div>
              )}

              {/* Plan Name */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${BADGE_COLORS[plan.name]}`}>
                  <Icon size={15}/>
                </span>
                <h3 className="text-white font-bold">{plan.display_name}</h3>
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className="text-3xl font-extrabold text-white">{price(plan)}</span>
                {plan.name !== 'enterprise' && plan.price_monthly_pkr > 0 && (
                  <span className="text-gray-500 text-sm ml-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
                )}
              </div>
              {save && billing === 'yearly' && (
                <p className="text-emerald-400 text-xs font-medium mb-4">{save} vs monthly</p>
              )}
              {(!save || billing === 'monthly') && <div className="mb-4"/>}

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6">
                {[
                  [`${fmt(plan.max_clients)} clients`,       true],
                  [`${fmt(plan.max_broadcasts)} broadcasts/mo`, true],
                  [`${fmt(plan.max_templates)} templates`,   true],
                  [`${fmt(plan.max_appointments)} appts/mo`, true],
                  [`${fmt(plan.max_ai_messages)} AI msgs/mo`,plan.ai_enabled],
                  ['AI auto-replies',                         plan.ai_enabled],
                  ['Analytics dashboard',                     plan.analytics_enabled],
                  ['Referral system',                         plan.referrals_enabled],
                  ['WhatsApp Business API',                   plan.whatsapp_api_enabled],
                  ['Custom branding',                         plan.custom_branding],
                  ['Priority support',                        plan.priority_support],
                ].map(([label, enabled]) => (
                  <li key={label} className={`flex items-center gap-2 text-xs ${enabled ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Check size={12} className={enabled ? 'text-emerald-400 shrink-0' : 'text-gray-700 shrink-0'}/>
                    {label}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleChoose(plan)}
                disabled={isCurrent}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
                    : plan.name === 'pro'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : plan.name === 'enterprise'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-[#2a2a2a] hover:bg-[#333] text-white border border-[#3a3a3a]'
                }`}
              >
                {isCurrent ? 'Current Plan' : plan.name === 'enterprise' ? 'Contact Sales' : plan.name === 'free' ? 'Get Started Free' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Note */}
      <p className="text-center text-gray-600 text-xs mt-8">
        All plans include WhatsApp messaging, client management, payment tracking, follow-ups & templates.
        Monthly billing renews automatically. You can cancel anytime from Settings → Subscription.
      </p>

      {/* Subscribe Modal */}
      {modal && selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white text-lg mb-1">Subscribe to {selected.display_name}</h3>
            <p className="text-gray-400 text-sm mb-5">
              {billing === 'yearly'
                ? `PKR ${Number(selected.price_yearly_pkr).toLocaleString()} / year`
                : `PKR ${Number(selected.price_monthly_pkr).toLocaleString()} / month`}
            </p>

            {selected.name !== 'free' && (
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="easypaisa">Easypaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Transaction Reference (optional)</label>
                  <input
                    value={form.transaction_ref}
                    onChange={e => setForm(f => ({ ...f, transaction_ref: e.target.value }))}
                    placeholder="e.g. TXN-12345678"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                  />
                </div>
                <p className="text-xs text-yellow-400/80">
                  ⚠️ Your subscription will be activated once payment is confirmed by our team.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-[#2a2a2a] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                disabled={submitting}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing…' : selected.name === 'free' ? 'Activate Free' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
