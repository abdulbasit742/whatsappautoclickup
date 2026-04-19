import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, MessageSquare, CreditCard, BarChart2,
  Star, Megaphone, Package, FileText, Calendar, Settings, LogOut,
  Zap, Clock, Brain, Link2, AlertOctagon, Wallet, Radio,
} from 'lucide-react';

const links = [
  { section: 'Main' },
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox',       icon: MessageSquare,   label: 'Inbox' },
  { to: '/clients',     icon: Users,           label: 'CRM / Clients' },
  { to: '/payments',    icon: CreditCard,      label: 'Payments' },
  { to: '/analytics',   icon: BarChart2,       label: 'Analytics' },

  { section: 'Engage' },
  { to: '/campaigns',   icon: Radio,           label: 'Campaigns' },
  { to: '/broadcasts',  icon: Megaphone,       label: 'Broadcasts' },
  { to: '/followups',   icon: Clock,           label: 'Follow-ups' },
  { to: '/issues',      icon: AlertOctagon,    label: 'Issues' },

  { section: 'AI & Platform' },
  { to: '/ai-center',   icon: Brain,           label: 'AI Center' },
  { to: '/integrations',icon: Link2,           label: 'Integrations' },
  { to: '/billing',     icon: Wallet,          label: 'Billing' },

  { section: 'Tools' },
  { to: '/reviews',     icon: Star,            label: 'Reviews' },
  { to: '/templates',   icon: FileText,        label: 'Templates' },
  { to: '/services',    icon: Package,         label: 'Services' },
  { to: '/appointments',icon: Calendar,        label: 'Appointments' },
  { to: '/settings',    icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-56 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 border-b border-[#2a2a2a]">
        <Zap size={20} className="text-emerald-400" />
        <span className="font-bold text-emerald-400">ClientFlow AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {links.map((item, idx) => {
          if (item.section) {
            return (
              <p key={idx} className="px-4 pt-4 pb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                {item.section}
              </p>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={15} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:text-red-400 border-t border-[#2a2a2a] transition-colors"
      >
        <LogOut size={15} /> Logout
      </button>
    </aside>
  );
}
