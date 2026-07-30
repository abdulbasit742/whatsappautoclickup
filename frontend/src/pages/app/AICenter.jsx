import { useQuery } from '@tanstack/react-query'
import { aiService } from '../../services/ai.service.js'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import AIProviderBadge from '../../components/shared/AIProviderBadge.jsx'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Zap, Brain, Eye, Settings, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

const MOCK_PROVIDERS = [
  { id: 'groq', name: 'Groq', description: 'Ultra-fast inference — default provider', status: 'active', model: 'llama3-70b-8192', latency: '98ms', cost: '$0.0008/1K' },
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o — for complex reasoning tasks', status: 'inactive', model: 'gpt-4o', latency: '800ms', cost: '$0.005/1K' },
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude — for long-context tasks', status: 'inactive', model: 'claude-3-5-sonnet', latency: '600ms', cost: '$0.003/1K' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini Pro — multimodal support', status: 'inactive', model: 'gemini-1.5-pro', latency: '400ms', cost: '$0.002/1K' },
]

const MOCK_USAGE = {
  totalRequests: 28420, successRate: 98.7, avgLatency: '102ms', estimatedCost: '$22.74',
  requestsByDay: Array.from({ length: 14 }, (_, i) => ({
    date: format(new Date(Date.now() - (13-i)*86400000), 'MMM d'),
    requests: Math.floor(Math.random()*1000)+500,
    errors: Math.floor(Math.random()*20)+2,
  })),
  byProvider: [
    { name: 'Groq', value: 85, color: '#10b981' },
    { name: 'OpenAI', value: 10, color: '#3b82f6' },
    { name: 'Claude', value: 5, color: '#8b5cf6' },
  ],
}

const MOCK_PROMPTS = [
  { id: 'p1', name: 'Reply Suggestion', trigger: 'conversation.new_message', model: 'groq', usageCount: 12840 },
  { id: 'p2', name: 'Lead Scoring', trigger: 'contact.updated', model: 'groq', usageCount: 8420 },
  { id: 'p3', name: 'Conversation Summary', trigger: 'manual', model: 'groq', usageCount: 5210 },
  { id: 'p4', name: 'Sentiment Analysis', trigger: 'message.received', model: 'groq', usageCount: 4800 },
]

const MOCK_FAILED = [
  { id: 'fr1', prompt: 'Reply suggestion for conv #1482', provider: 'groq', error: 'Rate limit exceeded', at: new Date(Date.now()-3600000).toISOString() },
  { id: 'fr2', prompt: 'Lead score for contact #892', provider: 'openai', error: 'API key invalid', at: new Date(Date.now()-7200000).toISOString() },
]

const AI_FEATURES = [
  { key: 'reply_suggestions', label: 'AI Reply Suggestions', description: 'Auto-generate reply suggestions in inbox' },
  { key: 'lead_scoring', label: 'Lead Scoring', description: 'Automatically score leads based on behavior' },
  { key: 'sentiment_analysis', label: 'Sentiment Analysis', description: 'Analyze conversation sentiment in real-time' },
  { key: 'auto_summary', label: 'Conversation Summary', description: 'Generate AI summaries after conversations' },
  { key: 'smart_followups', label: 'Smart Follow-up Timing', description: 'AI recommends optimal follow-up times' },
]

export default function AICenter() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage AI providers, usage, and feature configuration</p>
      </div>

      {/* Provider cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_PROVIDERS.map(p => (
          <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-5 shadow-sm ${p.status === 'active' ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.model}</p>
              </div>
              {p.status === 'active' ? (
                <Badge variant="success" size="sm" dot>Active</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Inactive</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{p.description}</p>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
              <span>Latency: <span className="font-medium text-gray-700 dark:text-gray-200">{p.latency}</span></span>
              <span>Cost: <span className="font-medium text-gray-700 dark:text-gray-200">{p.cost}</span></span>
            </div>
            {p.status === 'active' ? (
              <Button variant="ghost" size="sm" className="w-full" icon={Settings}>Configure</Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full" icon={Zap}>Connect</Button>
            )}
          </div>
        ))}
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: MOCK_USAGE.totalRequests.toLocaleString() },
          { label: 'Success Rate', value: `${MOCK_USAGE.successRate}%` },
          { label: 'Avg Latency', value: MOCK_USAGE.avgLatency },
          { label: 'Est. Cost (MTD)', value: MOCK_USAGE.estimatedCost },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card header="AI Requests Per Day">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={MOCK_USAGE.requestsByDay}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="requests" stroke="#0ea5e9" fill="url(#reqGrad)" strokeWidth={2} name="Requests" />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="4 4" name="Errors" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <Card header="Provider Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={MOCK_USAGE.byProvider} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {MOCK_USAGE.byProvider.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={v => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prompt Templates */}
        <Card header="Prompt Template Library" padding={false}>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {MOCK_PROMPTS.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <Brain size={16} className="text-brand-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.trigger} · {p.model}</p>
                </div>
                <span className="text-xs text-gray-400">{p.usageCount.toLocaleString()}×</span>
                <Button variant="ghost" size="xs" icon={Eye}>View</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Feature Toggles */}
        <Card header="AI Feature Configuration">
          <div className="space-y-4">
            {AI_FEATURES.map(f => (
              <div key={f.key} className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{f.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{f.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Failed Requests */}
      <Card header="Recent Failed Requests" padding={false}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {MOCK_FAILED.map(f => (
            <div key={f.id} className="flex items-center gap-3 px-5 py-3">
              <XCircle size={16} className="text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{f.prompt}</p>
                <p className="text-xs text-red-500">{f.error} · {f.provider}</p>
              </div>
              <span className="text-xs text-gray-400">{format(new Date(f.at), 'h:mm a')}</span>
            </div>
          ))}
          {MOCK_FAILED.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" /> No failed requests recently
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
