import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Users, Megaphone, ListChecks,
  Bell, Cpu, CreditCard, Plug, BarChart3, Settings, ChevronLeft,
  ChevronRight, Zap, Shield, FileText, Key, Flag, AlertCircle,
  Clock, X
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import Avatar from '../ui/Avatar.jsx'
import PlanBadge from '../shared/PlanBadge.jsx'

const navSections = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/app/dashboard' },
      { label: 'Inbox', icon: MessageSquare, to: '/app/inbox' },
      { label: 'CRM', icon: Users, to: '/app/crm' },
    ]
  },
  {
    title: 'Automation',
    items: [
      { label: 'Campaigns', icon: Megaphone, to: '/app/campaigns' },
      { label: 'Templates', icon: FileText, to: '/app/templates' },
      { label: 'Follow-ups', icon: ListChecks, to: '/app/followups' },
      { label: 'Reminders', icon: Clock, to: '/app/reminders' },
      { label: 'Issues', icon: AlertCircle, to: '/app/issues' },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'AI Center', icon: Cpu, to: '/app/ai' },
      { label: 'Analytics', icon: BarChart3, to: '/app/analytics' },
    ]
  },
  {
    title: 'Admin',
    items: [
      { label: 'Billing', icon: CreditCard, to: '/app/billing' },
      { label: 'Integrations', icon: Plug, to: '/app/integrations' },
      { label: 'Team', icon: Users, to: '/app/team' },
      { label: 'API Keys', icon: Key, to: '/app/api-keys' },
      { label: 'Feature Flags', icon: Flag, to: '/app/feature-flags' },
      { label: 'Audit Logs', icon: Shield, to: '/app/audit-logs' },
      { label: 'Settings', icon: Settings, to: '/app/settings' },
    ]
  }
]

export default function Sidebar({ mobile = false, onClose }) {
  const sidebarOpen = useUIStore(s => s.sidebarOpen)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  const user = useAuthStore(s => s.user)
  const org = useAuthStore(s => s.org)
  const navigate = useNavigate()

  const collapsed = !mobile && !sidebarOpen

  return (
    <div className={`bg-gray-900 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} h-full shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-800 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">ClientFlow</div>
              <div className="text-gray-500 text-xs">AI Platform</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 text-gray-400">
            <X size={18} />
          </button>
        ) : (
          !collapsed && (
            <button onClick={toggleSidebar} className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors">
              <ChevronLeft size={18} />
            </button>
          )
        )}
      </div>
      {collapsed && !mobile && (
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center py-2 hover:bg-gray-800 text-gray-400 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={mobile ? onClose : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center' : ''} ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile at bottom */}
      <div className={`border-t border-gray-800 p-3 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => { navigate('/app/settings'); mobile && onClose?.() }}
          className={`flex items-center gap-3 rounded-lg hover:bg-gray-800 transition-colors p-2 w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <Avatar name={user?.name || 'User'} src={user?.avatar} size="sm" status="online" />
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1">
                <PlanBadge plan={org?.plan || 'free'} />
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
