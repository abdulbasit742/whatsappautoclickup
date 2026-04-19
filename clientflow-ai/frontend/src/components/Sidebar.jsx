import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, MessageSquare, Users, Megaphone, Brain,
  Clock, CreditCard, Plug, BarChart2, Settings, LogOut, Zap
} from 'lucide-react';

const links = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chats',       icon: MessageSquare,   label: 'Chats' },
  { to: '/crm',         icon: Users,           label: 'CRM' },
  { to: '/campaigns',   icon: Megaphone,        label: 'Campaigns' },
  { to: '/ai-center',   icon: Brain,           label: 'AI Center' },
  { to: '/followups',   icon: Clock,           label: 'Follow-ups' },
  { to: '/payments',    icon: CreditCard,      label: 'Payments' },
  { to: '/integrations',icon: Plug,            label: 'Integrations' },
  { to: '/analytics',   icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',    icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <aside className="w-56 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 border-b border-[#2a2a2a]">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Zap size={14} className="text-emerald-400" />
        </div>
        <span className="font-bold text-emerald-400 text-sm">ClientFlow AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-[#2a2a2a] p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{user?.name || 'Admin'}</p>
          <p className="text-[10px] text-gray-500 truncate">{user?.email || 'admin@clientflow.ai'}</p>
        </div>
        <button
          onClick={logout}
          className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
