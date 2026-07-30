import { Zap } from 'lucide-react'

const providerInfo = {
  groq: { name: 'Groq', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500' },
  openai: { name: 'OpenAI', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', dot: 'bg-blue-500' },
  claude: { name: 'Claude', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', dot: 'bg-purple-500' },
  gemini: { name: 'Gemini', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-500' },
}

export default function AIProviderBadge({ provider = 'groq', active = true }) {
  const info = providerInfo[provider] || providerInfo.groq
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${info.bg} ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? info.dot : 'bg-gray-400'} ${active ? 'animate-pulse' : ''}`} />
      <Zap size={11} />
      {info.name}
      {active && <span className="text-xs opacity-70">active</span>}
    </div>
  )
}
