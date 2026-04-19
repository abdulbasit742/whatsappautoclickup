import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, MessageSquare, Users, Megaphone, ListChecks, BarChart3, Plug, Zap, Star, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const features = [
  { icon: MessageSquare, title: 'AI-Powered Inbox', desc: 'Unified WhatsApp inbox with AI reply suggestions, sentiment analysis, and smart routing.', color: 'bg-blue-500' },
  { icon: Users, title: 'CRM & Contact Management', desc: 'Complete CRM with lead scoring, lifecycle tracking, and 360° contact profiles.', color: 'bg-emerald-500' },
  { icon: Megaphone, title: 'Campaign Engine', desc: 'Broadcast campaigns with targeting, scheduling, delivery tracking, and A/B testing.', color: 'bg-purple-500' },
  { icon: ListChecks, title: 'Follow-up Automation', desc: 'Never miss a follow-up with smart reminders and automated follow-up sequences.', color: 'bg-orange-500' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep insights into team performance, campaign ROI, and customer behavior.', color: 'bg-pink-500' },
  { icon: Plug, title: 'Integrations Hub', desc: 'Connect with Gmail, ClickUp, Stripe, Make.com, Slack, and 20+ more tools.', color: 'bg-brand-500' },
]

const testimonials = [
  { name: 'Sarah Johnson', role: 'Head of Sales, TechCorp', avatar: 'SJ', text: 'ClientFlow AI transformed how we handle customer communication. Response times dropped by 60% and our team loves the AI suggestions.', stars: 5 },
  { name: 'Ahmed Al-Rashid', role: 'Founder, GrowthAgency', avatar: 'AA', text: 'The CRM + WhatsApp combo is exactly what we needed. Lead conversion went up 40% in the first month. Incredible platform.', stars: 5 },
  { name: 'Priya Sharma', role: 'Operations Manager, RetailPlus', avatar: 'PS', text: 'Campaign management is so easy now. We run 50+ campaigns a month and the analytics are phenomenal. Best investment we made.', stars: 5 },
]

const faqs = [
  { q: 'How does the AI reply suggestion work?', a: 'Our AI analyzes conversation context and suggests relevant, personalized replies using Groq\'s ultra-fast inference. You review and send with one click.' },
  { q: 'Can I import my existing contacts?', a: 'Yes! Upload a CSV file with your contacts and we\'ll import them instantly. We support standard contact fields plus custom attributes.' },
  { q: 'What WhatsApp accounts can I connect?', a: 'We support WhatsApp Business API accounts. You can connect multiple numbers and manage them all from one dashboard.' },
  { q: 'Is my data secure?', a: 'Absolutely. We use end-to-end encryption, SOC2 compliant infrastructure, and all data is stored in your chosen region.' },
  { q: 'Can I upgrade or downgrade my plan anytime?', a: 'Yes, plan changes take effect immediately. Upgrades are prorated and you\'ll only pay the difference.' },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{q}</span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 bg-gray-50">{a}</div>
      )}
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">ClientFlow AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Sign in</Link>
            <Link to="/signup" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
          Powered by Groq AI — Ultra-fast inference
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-tight mb-6">
          AI-Powered Business
          <br />
          <span className="bg-gradient-to-r from-brand-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Communication Platform
          </span>
        </h1>
        <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
          Unify your WhatsApp, CRM, campaigns, and follow-ups in one intelligent platform.
          AI handles the complexity — you focus on growth.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link to="/signup" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-brand-500/25">
            Start Free — No Card Required
            <ArrowRight size={20} />
          </Link>
          <button className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
            Watch Demo
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">2 min</span>
          </button>
        </div>

        {/* Trust bar */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} size={18} className="fill-amber-400 text-amber-400" />)}
            <span className="ml-2 text-sm font-semibold text-gray-700">4.9/5 rating</span>
          </div>
          <p className="text-sm text-gray-500">Trusted by <span className="font-semibold text-gray-700">1,000+</span> businesses worldwide</p>
        </div>
      </section>

      {/* Dashboard preview mockup */}
      <section className="py-8 px-4 max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <div className="flex-1 bg-gray-700 rounded px-4 py-1 text-xs text-gray-400 max-w-xs mx-auto text-center">app.clientflow.ai/dashboard</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Contacts', value: '12,847', trend: '+12%', color: 'text-blue-400' },
              { label: 'Active Leads', value: '3,291', trend: '+8%', color: 'text-emerald-400' },
              { label: 'Open Conversations', value: '247', trend: '+24%', color: 'text-purple-400' },
              { label: 'AI Requests Today', value: '1,482', trend: '+31%', color: 'text-orange-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-emerald-400 mt-1">{kpi.trend} this week</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 h-32 flex items-center justify-center">
            <div className="flex items-end gap-1 h-20">
              {[40,65,45,80,60,90,55,75,85,70,95,80].map((h, i) => (
                <div key={i} className="w-5 bg-brand-500 rounded-t opacity-80" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Everything you need to scale</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">One platform to manage all customer communications, automate follow-ups, and gain AI-powered insights.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="group p-6 rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all duration-200">
              <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                <f.icon size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap size={12} />
              Powered by Groq AI
            </div>
            <h2 className="text-4xl font-black mb-6 leading-tight">AI that understands your customers</h2>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              From instant reply suggestions to lead scoring and sentiment analysis — our AI layer makes every interaction smarter.
            </p>
            <div className="space-y-4">
              {[
                'AI reply suggestions in under 100ms',
                'Lead scoring & qualification automation',
                'Sentiment analysis on every conversation',
                'Smart follow-up timing recommendations',
              ].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-brand-400 shrink-0" />
                  <span className="text-gray-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-3">AI Reply Suggestion</p>
              <p className="text-sm text-gray-300 mb-3">Customer: "Hi, I'm interested in your Pro plan. What does it include?"</p>
              <div className="bg-brand-600/20 border border-brand-600/40 rounded-lg p-3 text-sm text-brand-300">
                💡 Suggested: "Hi! Great to hear from you. Our Pro plan includes unlimited contacts, 50,000 messages/month, advanced analytics, and priority support..."
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-900 rounded-xl p-3">
                <p className="text-2xl font-bold text-brand-400">98ms</p>
                <p className="text-xs text-gray-500 mt-1">Avg. latency</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-3">
                <p className="text-2xl font-bold text-emerald-400">94%</p>
                <p className="text-xs text-gray-500 mt-1">Accuracy</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-3">
                <p className="text-2xl font-bold text-purple-400">10+</p>
                <p className="text-xs text-gray-500 mt-1">AI features</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-gray-500">Start free, scale as you grow. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { name: 'Free', price: '$0', period: '/month', features: ['500 contacts', '1,000 messages', '1 user', 'Basic analytics'], cta: 'Start Free', highlight: false },
            { name: 'Pro', price: '$79', period: '/month', features: ['Unlimited contacts', '50,000 messages', '10 users', 'Advanced AI', 'All integrations', 'Priority support'], cta: 'Start Pro Trial', highlight: true },
            { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited everything', 'Dedicated support', 'Custom AI training', 'SLA guarantee', 'SSO', 'On-premise option'], cta: 'Contact Sales', highlight: false },
          ].map(plan => (
            <div key={plan.name} className={`p-8 rounded-2xl border ${plan.highlight ? 'border-brand-500 bg-brand-600 text-white shadow-xl shadow-brand-500/25 scale-105' : 'border-gray-200 bg-white'}`}>
              <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                <span className={`text-sm mb-1 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className={plan.highlight ? 'text-brand-200' : 'text-emerald-500'} />
                    <span className={plan.highlight ? 'text-brand-100' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                  plan.highlight ? 'bg-white text-brand-600 hover:bg-brand-50' : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/pricing" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            View full pricing comparison →
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Loved by growth teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => <FAQItem key={faq.q} {...faq} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-gradient-to-br from-brand-600 to-purple-700 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-black mb-6">Ready to transform your business?</h2>
          <p className="text-xl text-brand-100 mb-10">Join 1,000+ businesses already using ClientFlow AI to close more deals and delight customers.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-brand-600 hover:bg-brand-50 font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-xl">
            Start for Free Today
            <ArrowRight size={20} />
          </Link>
          <p className="mt-4 text-sm text-brand-200">No credit card required • Free forever plan available</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <span className="font-bold text-white">ClientFlow AI</span>
              </div>
              <p className="text-sm">AI-powered communication platform for modern businesses.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-white mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-sm hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-sm">
            <p>© 2024 ClientFlow AI. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Built with ❤️ for modern businesses</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
