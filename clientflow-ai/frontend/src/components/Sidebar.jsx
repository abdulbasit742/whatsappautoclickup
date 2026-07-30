import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, MessageSquare, CreditCard, BarChart2,
  Star, Megaphone, Package, FileText, Calendar, Link, Settings, LogOut, Zap, Clock,
  Target, Brain, Puzzle, Receipt, Key, UserCog, ChevronDown, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const groups = [
  {
    label: 'Overview',
    links: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    label: 'CRM',
    links: [
      { to: '/clients', icon: Users, label: 'Clients' },
      { to: '/leads', icon: Target, label: 'Leads' },
      { to: '/followups', icon: Clock, label: 'Follow-ups' },
      { to: '/appointments', icon: Calendar, label: 'Appointments' },
    ]
  },
  {
    label: 'Inbox',
    links: [
      { to: '/inbox', icon: MessageSquare, label: 'Inbox' },
      { to: '/templates', icon: FileText, label: 'Templates' },
    ]
  },
  {
    label: 'AI',
    links: [
      { to: '/ai', icon: Brain, label: 'AI Dashboard' },
    ]
  },
  {
    label: 'Campaigns',
    links: [
      { to: '/broadcasts', icon: Megaphone, label: 'Broadcasts' },
      { to: '/campaigns', icon: Zap, label: 'Campaign Engine' },
    ]
  },
  {
    label: 'Business',
    links: [
      { to: '/payments', icon: CreditCard, label: 'Payments' },
      { to: '/services', icon: Package, label: 'Services' },
      { to: '/billing', icon: Receipt, label: 'Billing' },
      { to: '/reviews', icon: Star, label: 'Reviews' },
      { to: '/referrals', icon: Link, label: 'Referrals' },
    ]
  },
  {
    label: 'Analytics',
    links: [
      { to: '/analytics', icon: BarChart2, label: 'Analytics' },
    ]
  },
  {
    label: 'System',
    links: [
      { to: '/users', icon: UserCog, label: 'Users & Roles' },
      { to: '/integrations', icon: Puzzle, label: 'Integrations' },
      { to: '/api-keys', icon: Key, label: 'API Keys' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState({});

  function toggleGroup(label) {
    setCollapsed(c => ({ ...c, [label]: !c[label] }));
  }

  return (
    <aside className="w-56 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-full shrink-0">
      <div className="flex items-center gap-2 p-4 border-b border-[#2a2a2a]">
        <Zap size={20} className="text-emerald-400" />
        <span className="font-bold text-emerald-400">ClientFlow AI</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map(({ label, links }) => (
          <div key={label}>
            <button
              onClick={() => toggleGroup(label)}
              className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-gray-600 hover:text-gray-400 uppercase tracking-wider">
              <span>{label}</span>
              {collapsed[label] ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
            </button>
            {!collapsed[label] && links.map(({ to, icon: Icon, label: linkLabel }) => (
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
                {linkLabel}
              </NavLink>
            ))}
          </div>
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

