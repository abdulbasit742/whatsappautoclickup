import { useState } from 'react'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react'

const INTEGRATIONS = [
  { id: 'groq', name: 'Groq', desc: 'AI inference provider — ultra-fast LLM', status: 'connected', category: 'AI', lastSync: '2m ago', color: 'bg-emerald-500' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4 models for complex reasoning', status: 'disconnected', category: 'AI', lastSync: null, color: 'bg-blue-500' },
  { id: 'claude', name: 'Claude', desc: 'Anthropic models for long context', status: 'disconnected', category: 'AI', lastSync: null, color: 'bg-purple-500' },
  { id: 'gemini', name: 'Gemini', desc: 'Google AI multimodal models', status: 'disconnected', category: 'AI', lastSync: null, color: 'bg-amber-500' },
  { id: 'gmail', name: 'Gmail', desc: 'Send and receive emails directly', status: 'disconnected', category: 'Email', lastSync: null, color: 'bg-red-500' },
  { id: 'gcal', name: 'Google Calendar', desc: 'Sync meetings and follow-up reminders', status: 'disconnected', category: 'Productivity', lastSync: null, color: 'bg-blue-400' },
  { id: 'clickup', name: 'ClickUp', desc: 'Create tasks from conversations', status: 'connected', category: 'Productivity', lastSync: '1h ago', color: 'bg-pink-500' },
  { id: 'make', name: 'Make.com', desc: 'Automate workflows with Make scenarios', status: 'connected', category: 'Automation', lastSync: '30m ago', color: 'bg-violet-500' },
  { id: 'stripe', name: 'Stripe', desc: 'Payment processing and billing', status: 'disconnected', category: 'Payments', lastSync: null, color: 'bg-indigo-500' },
  { id: 'slack', name: 'Slack', desc: 'Get notifications in Slack channels', status: 'disconnected', category: 'Messaging', lastSync: null, color: 'bg-yellow-500' },
  { id: 'telegram', name: 'Telegram', desc: 'Connect Telegram bot integration', status: 'disconnected', category: 'Messaging', lastSync: null, color: 'bg-sky-500' },
  { id: 'webhooks', name: 'Webhooks', desc: 'Send HTTP webhooks to any endpoint', status: 'connected', category: 'Developer', lastSync: '5m ago', color: 'bg-gray-600' },
]

export default function Integrations() {
  const [filter, setFilter] = useState('all')
  const cats = ['all', ...new Set(INTEGRATIONS.map(i => i.category))]
  const filtered = INTEGRATIONS.filter(i => filter === 'all' || i.category === filter)
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1><p className="text-sm text-gray-500 mt-0.5">Connect your tools and services</p></div>
      <div className="flex gap-2 flex-wrap">
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 text-xs rounded-full font-medium capitalize transition-colors ${filter === c ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>{c}</button>)}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(int => (
          <div key={int.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${int.color} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>{int.name[0]}</div>
              {int.status === 'connected' ? <Badge variant="success" size="sm" dot>Connected</Badge> : <Badge variant="neutral" size="sm">Not Connected</Badge>}
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{int.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{int.desc}</p>
            {int.lastSync && <p className="text-xs text-gray-400 mb-3">Last sync: {int.lastSync}</p>}
            <div className="flex gap-2">
              {int.status === 'connected' ? (
                <><Button variant="ghost" size="xs" icon={Settings} className="flex-1">Configure</Button><Button variant="ghost" size="xs" icon={RefreshCw}>Sync</Button></>
              ) : (
                <Button variant="primary" size="xs" className="flex-1">Connect</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
