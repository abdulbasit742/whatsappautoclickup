import { format } from 'date-fns'
import Avatar from '../ui/Avatar.jsx'

const eventIcons = {
  message: '💬',
  note: '📝',
  call: '📞',
  email: '📧',
  stage_change: '🔄',
  followup: '⏰',
  issue: '🚨',
  created: '✅',
  updated: '✏️',
}

export default function ActivityTimeline({ events = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1,2,3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
        No activity yet
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-6">
        {events.map((event, i) => (
          <div key={event.id || i} className="flex gap-4">
            <div className="relative z-10 shrink-0">
              {event.user ? (
                <Avatar name={event.user.name} size="sm" />
              ) : (
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center text-sm">
                  {eventIcons[event.type] || '•'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <p className="text-sm text-gray-900 dark:text-gray-100">{event.description || event.text}</p>
              {event.meta && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{event.meta}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {event.createdAt ? format(new Date(event.createdAt), 'MMM d, yyyy h:mm a') : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
