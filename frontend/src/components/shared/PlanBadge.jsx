import { Crown } from 'lucide-react'

const plans = {
  free: { label: 'Free', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  starter: { label: 'Starter', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  pro: { label: 'Pro', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
}

export default function PlanBadge({ plan = 'free' }) {
  const config = plans[plan?.toLowerCase()] || plans.free
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
      <Crown size={11} />
      {config.label}
    </span>
  )
}
