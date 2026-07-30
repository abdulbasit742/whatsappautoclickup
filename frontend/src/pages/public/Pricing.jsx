import { Link } from 'react-router-dom'
import { CheckCircle, Zap, ArrowRight } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for trying out ClientFlow AI',
    features: ['500 contacts', '1,000 messages/month', '1 user seat', 'Basic inbox', 'Basic CRM', 'Email support'],
    notIncluded: ['Campaigns', 'AI features', 'Integrations', 'Analytics'],
    cta: 'Get Started Free',
    href: '/signup',
    highlight: false,
    badge: null,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'For small teams getting started',
    features: ['5,000 contacts', '10,000 messages/month', '3 user seats', 'Full inbox', 'CRM + Follow-ups', 'Campaign builder', '5 integrations', 'Basic analytics'],
    notIncluded: ['AI features', 'Advanced analytics'],
    cta: 'Start Starter Trial',
    href: '/signup?plan=starter',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/month',
    description: 'For growing businesses',
    features: ['Unlimited contacts', '50,000 messages/month', '10 user seats', 'AI reply suggestions', 'Lead scoring & sentiment', 'Advanced campaigns', 'All integrations', 'Advanced analytics', 'Priority support', 'Audit logs'],
    notIncluded: [],
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large teams and enterprises',
    features: ['Unlimited everything', 'Unlimited users', 'Custom AI training', 'Dedicated account manager', 'SLA guarantee (99.99%)', 'SSO / SAML', 'Custom integrations', 'On-premise option', 'Custom reporting', 'White-label option'],
    notIncluded: [],
    cta: 'Contact Sales',
    href: '/signup?plan=enterprise',
    highlight: false,
    badge: null,
  },
]

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 h-16 flex items-center px-8 justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">ClientFlow AI</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link to="/signup" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Get Started</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Start free, pay only for what you need. No hidden fees, no surprises.</p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative flex flex-col rounded-2xl border p-6 ${plan.highlight ? 'border-brand-500 bg-brand-600 text-white shadow-2xl shadow-brand-500/20' : 'border-gray-200 bg-white'}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h2>
                <p className={`text-sm mb-4 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={15} className={plan.highlight ? 'text-brand-200 shrink-0' : 'text-emerald-500 shrink-0'} />
                    <span className={plan.highlight ? 'text-brand-100' : 'text-gray-700'}>{f}</span>
                  </li>
                ))}
                {plan.notIncluded.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm opacity-40">
                    <span className="w-3.5 h-3.5 shrink-0 border rounded-full border-current" />
                    <span className={plan.highlight ? 'text-brand-200' : 'text-gray-500'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.href}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                  plan.highlight ? 'bg-white text-brand-600 hover:bg-brand-50' : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>

        {/* Feature comparison note */}
        <div className="text-center text-gray-500 text-sm">
          <p>All plans include: SSL encryption, 99.9% uptime SLA, GDPR compliance, and 24/7 monitoring.</p>
          <p className="mt-2">Need help choosing? <a href="mailto:sales@clientflow.ai" className="text-brand-600 hover:underline">Contact our sales team</a></p>
        </div>
      </div>
    </div>
  )
}
