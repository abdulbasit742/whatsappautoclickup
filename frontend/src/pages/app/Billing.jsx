import { useQuery } from '@tanstack/react-query'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import { CreditCard, Download, CheckCircle, Crown } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_PLAN = { name: 'Pro', price: 79, usage: { contacts: { used: 9400, limit: 'unlimited' }, messages: { used: 22000, limit: 50000 }, aiRequests: { used: 28420, limit: 50000 }, seats: { used: 6, limit: 10 } } }
const MOCK_INVOICES = [
  { id: 'inv1', date: new Date().toISOString(), amount: 79, status: 'paid', period: 'Jun 2024' },
  { id: 'inv2', date: new Date(Date.now()-2592000000).toISOString(), amount: 79, status: 'paid', period: 'May 2024' },
  { id: 'inv3', date: new Date(Date.now()-5184000000).toISOString(), amount: 29, status: 'paid', period: 'Apr 2024' },
]
const PLANS = [
  { name: 'Free', price: 0, features: ['500 contacts', '1,000 messages', '1 user'] },
  { name: 'Starter', price: 29, features: ['5,000 contacts', '10,000 messages', '3 users'] },
  { name: 'Pro', price: 79, features: ['Unlimited contacts', '50,000 messages', '10 users', 'AI features'], current: true },
  { name: 'Enterprise', price: null, features: ['Unlimited everything', 'Dedicated support', 'Custom AI'] },
]

export default function Billing() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1><p className="text-sm text-gray-500 mt-0.5">Manage your subscription and billing</p></div>
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div><div className="flex items-center gap-2 mb-1"><Crown size={18} className="text-purple-500" /><span className="font-bold text-gray-900 dark:text-white text-lg">{MOCK_PLAN.name} Plan</span><Badge variant="purple" size="sm">Active</Badge></div><p className="text-gray-500 text-sm">${MOCK_PLAN.price}/month · Renews Jul 1, 2024</p></div>
          <Button variant="outline" size="sm">Manage Subscription</Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <ProgressBar label="Messages" value={MOCK_PLAN.usage.messages.used} max={MOCK_PLAN.usage.messages.limit} color="brand" showValue />
          <ProgressBar label="AI Requests" value={MOCK_PLAN.usage.aiRequests.used} max={MOCK_PLAN.usage.aiRequests.limit} color="purple" showValue />
          <ProgressBar label="Seats" value={MOCK_PLAN.usage.seats.used} max={MOCK_PLAN.usage.seats.limit} color="green" showValue />
          <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Contacts</span><span className="font-semibold text-gray-900 dark:text-white">{MOCK_PLAN.usage.contacts.used.toLocaleString()} / Unlimited</span></div>
        </div>
      </Card>
      <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upgrade Plan</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-xl border p-5 ${p.current ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
              <p className="font-bold text-gray-900 dark:text-white mb-1">{p.name}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white mb-3">{p.price === null ? 'Custom' : `$${p.price}`}<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-1 mb-4">{p.features.map(f => <li key={f} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500 shrink-0" />{f}</li>)}</ul>
              <Button variant={p.current ? 'ghost' : 'outline'} size="sm" className="w-full" disabled={p.current}>{p.current ? 'Current Plan' : 'Upgrade'}</Button>
            </div>
          ))}
        </div>
      </div>
      <Card header="Payment History" padding={false}>
        <table className="min-w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr>{['Period','Date','Amount','Status','Invoice'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {MOCK_INVOICES.map(inv=>(
              <tr key={inv.id} className="bg-white dark:bg-gray-800">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{inv.period}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(inv.date),'MMM d, yyyy')}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${inv.amount}</td>
                <td className="px-4 py-3"><Badge variant="success" size="sm" dot>{inv.status}</Badge></td>
                <td className="px-4 py-3"><Button variant="ghost" size="xs" icon={Download}>PDF</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
