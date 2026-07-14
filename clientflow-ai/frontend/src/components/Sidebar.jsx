import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, MessageSquare, CreditCard, BarChart2,
  Star, Megaphone, Package, FileText, Calendar, Link, Settings, LogOut, Zap, Clock, Bot, Plug, ShieldAlert
} from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox', icon: MessageSquare, label: 'Chats' },
  { to: '/clients', icon: Users, label: 'CRM' },
  { to: '/broadcasts', icon: Megaphone, label: 'Campaigns' },
  { to: '/ai-center', icon: Bot, label: 'AI Center' },
  { to: '/issues', icon: ShieldAlert, label: 'Issues' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/reviews', icon: Star, label: 'Reviews' },
  { to: '/followups', icon: Clock, label: 'Follow-ups' },
  { to: '/services', icon: Package, label: 'Services' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/referrals', icon: Link, label: 'Referrals' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="w-56 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-full shrink-0">
      <div className="flex items-center gap-2 p-4 border-b border-[#2a2a2a]">
        <Zap size={20} className="text-emerald-400" />
        <span className="font-bold text-emerald-400">ClientFlow AI</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:text-red-400 border-t border-[#2a2a2a] transition-colors"
      >
        <LogOut size={16} /> Logout
      </button>
    </aside>
  );
}
