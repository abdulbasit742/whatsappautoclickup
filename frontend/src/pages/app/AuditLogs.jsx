import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Download, Search, Filter, User, Settings, Zap, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'

const ACTION_ICONS = {
  login: User,
  logout: User,
  key_saved: Shield,
  key_deleted: Shield,
  campaign_created: Zap,
  campaign_launched: Zap,
  contact_imported: User,
  follow_up_completed: Zap,
  issue_created: AlertTriangle,
  plan_changed: Settings,
  integration_connected: Settings,
  settings_updated: Settings,
}

const ACTION_COLORS = {
  login: 'text-green-500',
  logout: 'text-gray-500',
  key_saved: 'text-blue-500',
  key_deleted: 'text-red-500',
  campaign_created: 'text-purple-500',
  campaign_launched: 'text-purple-600',
  contact_imported: 'text-cyan-500',
  follow_up_completed: 'text-green-500',
  issue_created: 'text-orange-500',
  plan_changed: 'text-yellow-500',
  integration_connected: 'text-blue-400',
  settings_updated: 'text-gray-400',
}

function fetchAuditLogs(params) {
  return api.get('/audit', { params }).then(r => r.data)
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', search, actionFilter, page],
    queryFn: () => fetchAuditLogs({ search, action: actionFilter, page, limit }),
  })

  const logs = data?.data || []
  const total = data?.meta?.total || 0

  function exportLogs() {
    const rows = [
      ['Timestamp', 'User', 'Action', 'Resource', 'IP'],
      ...logs.map(l => [
        l.created_at,
        l.user_email || 'System',
        l.action,
        `${l.resource_type} ${l.resource_id || ''}`.trim(),
        l.ip_address || '',
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Full audit trail of all actions in your organization
          </p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user or action..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="key_saved">Key Saved</option>
          <option value="campaign_created">Campaign Created</option>
          <option value="campaign_launched">Campaign Launched</option>
          <option value="contact_imported">Contact Imported</option>
          <option value="issue_created">Issue Created</option>
          <option value="plan_changed">Plan Changed</option>
          <option value="integration_connected">Integration Connected</option>
          <option value="settings_updated">Settings Updated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Action</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Resource</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">IP Address</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const Icon = ACTION_ICONS[log.action] || Settings
                  const colorClass = ACTION_COLORS[log.action] || 'text-gray-500'
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {log.user_name || 'System'}
                        </span>
                        {log.user_email && (
                          <p className="text-xs text-gray-500">{log.user_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${colorClass}`} />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {log.resource_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {log.resource_type}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {log.ip_address || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
