import { useState } from 'react';
import { CreditCard, Check, Zap, Shield, Building2, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    color: 'border-gray-600',
    badge: null,
    limits: {
      users: 1,
      contacts: 100,
      campaigns: 2,
      aiRequests: 50,
      integrations: 1,
      analyticsDepth: '7 days',
    },
    features: [
      '1 user seat',
      '100 contacts',
      '2 campaigns / month',
      '50 AI requests / month',
      '1 integration',
      '7-day analytics',
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 29,
    color: 'border-blue-500',
    badge: null,
    limits: {
      users: 3,
      contacts: 1000,
      campaigns: 10,
      aiRequests: 500,
      integrations: 3,
      analyticsDepth: '30 days',
    },
    features: [
      '3 user seats',
      '1,000 contacts',
      '10 campaigns / month',
      '500 AI requests / month',
      '3 integrations',
      '30-day analytics',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 79,
    color: 'border-emerald-500',
    badge: 'Most Popular',
    limits: {
      users: 10,
      contacts: 10000,
      campaigns: 50,
      aiRequests: 5000,
      integrations: 10,
      analyticsDepth: '90 days',
    },
    features: [
      '10 user seats',
      '10,000 contacts',
      '50 campaigns / month',
      '5,000 AI requests / month',
      '10 integrations',
      '90-day analytics',
      'Priority support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: null,
    color: 'border-purple-500',
    badge: 'Custom',
    limits: {
      users: 'Unlimited',
      contacts: 'Unlimited',
      campaigns: 'Unlimited',
      aiRequests: 'Unlimited',
      integrations: 'Unlimited',
      analyticsDepth: 'Unlimited',
    },
    features: [
      'Unlimited seats',
      'Unlimited contacts',
      'Unlimited campaigns',
      'Unlimited AI requests',
      'All integrations',
      'Unlimited analytics',
      'Dedicated support',
      'Custom SLA',
      'White-label option',
    ],
  },
];

const PLAN_ICONS = { free: Zap, starter: CreditCard, pro: Shield, enterprise: Building2 };

export default function Billing() {
  const [currentPlan] = useState('free');
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly | yearly

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard size={22} className="text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Billing & Plans</h2>
      </div>

      {/* Current Plan Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-400">Current Plan</p>
            <p className="text-2xl font-bold text-white capitalize">{currentPlan}</p>
            <p className="text-xs text-gray-500 mt-1">Next billing: —</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Usage this month</p>
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 w-20 text-right">Contacts</span>
                <div className="w-32 bg-[#2a2a2a] rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '35%' }} />
                </div>
                <span className="text-white">35 / 100</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 w-20 text-right">AI Requests</span>
                <div className="w-32 bg-[#2a2a2a] rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '60%' }} />
                </div>
                <span className="text-white">30 / 50</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
            billingCycle === 'monthly'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
            billingCycle === 'yearly'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          Yearly <span className="text-emerald-400 text-xs ml-1">Save 20%</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const Icon = PLAN_ICONS[plan.key];
          const isCurrent = plan.key === currentPlan;
          const displayPrice =
            plan.price === null
              ? 'Custom'
              : plan.price === 0
              ? 'Free'
              : billingCycle === 'yearly'
              ? `$${Math.round(plan.price * 0.8)}/mo`
              : `$${plan.price}/mo`;

          return (
            <div
              key={plan.key}
              className={`relative bg-[#1a1a1a] border-2 rounded-2xl p-5 flex flex-col ${
                isCurrent ? 'border-emerald-500' : plan.color
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-0.5 rounded-full bg-emerald-500 text-white font-medium">
                  {plan.badge}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 text-xs px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Current
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    plan.key === 'free' ? 'bg-gray-500/20 text-gray-400' :
                    plan.key === 'starter' ? 'bg-blue-500/20 text-blue-400' :
                    plan.key === 'pro' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span className="font-semibold text-white">{plan.name}</span>
              </div>

              <div className="mb-4">
                <span className="text-2xl font-bold text-white">{displayPrice}</span>
                {plan.price !== null && plan.price > 0 && billingCycle === 'yearly' && (
                  <span className="text-xs text-gray-500 ml-1 line-through">${plan.price}/mo</span>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                    <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-[#2a2a2a] text-gray-500 cursor-default'
                    : plan.key === 'enterprise'
                    ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {isCurrent ? 'Current Plan' : plan.key === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                {!isCurrent && <ArrowRight size={14} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoice History Placeholder */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Invoice History</h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-600 text-sm">
          <CreditCard size={28} className="mb-2 opacity-30" />
          No invoices yet
        </div>
      </div>
    </div>
  );
}
