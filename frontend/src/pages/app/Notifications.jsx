import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, AlertTriangle, MessageSquare, Zap, CreditCard, Settings, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const TYPE_ICONS = {
  issue_alert: AlertTriangle,
  follow_up_due: Bell,
  new_message: MessageSquare,
  campaign_complete: Zap,
  billing_alert: CreditCard,
  integration_failure: Settings,
  team_mention: Users,
  ai_failure: Zap,
}

const TYPE_COLORS = {
  issue_alert: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  follow_up_due: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  new_message: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  campaign_complete: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  billing_alert: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  integration_failure: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  team_mention: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  ai_failure: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}

const TYPE_ROUTES = {
  issue_alert: '/app/issues',
  follow_up_due: '/app/followups',
  new_message: '/app/inbox',
  campaign_complete: '/app/campaigns',
  billing_alert: '/app/billing',
  integration_failure: '/app/integrations',
  team_mention: '/app/inbox',
}

function fetchNotifications(tab) {
  return api.get('/notifications', { params: { unread: tab === 'unread' ? true : undefined } }).then(r => r.data)
}

export default function Notifications() {
  const [tab, setTab] = useState('all')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', tab],
    queryFn: () => fetchNotifications(tab),
  })

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = data?.data || []
  const unreadCount = notifications.filter(n => !n.is_read).length

  function handleClick(notification) {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    const route = TYPE_ROUTES[notification.type]
    if (route) navigate(route)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {['all', 'unread'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t}
            {t === 'unread' && unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-brand-600 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-gray-600 dark:text-gray-400 font-medium">
              {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              We'll notify you when something important happens.
            </p>
          </div>
        ) : (
          notifications.map(notification => {
            const Icon = TYPE_ICONS[notification.type] || Bell
            const colorClass = TYPE_COLORS[notification.type] || 'bg-gray-100 dark:bg-gray-700 text-gray-500'

            return (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  notification.is_read
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    : 'bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${notification.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-brand-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
