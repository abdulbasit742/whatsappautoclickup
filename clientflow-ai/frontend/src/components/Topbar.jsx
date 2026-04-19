import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Zap } from 'lucide-react';

const TITLES = {
  '/':             'Executive Dashboard',
  '/chats':        'Chats',
  '/crm':          'CRM',
  '/campaigns':    'Campaigns',
  '/ai-center':    'AI Center',
  '/followups':    'Follow-ups',
  '/payments':     'Payments',
  '/integrations': 'Integrations',
  '/analytics':    'Analytics',
  '/settings':     'Settings',
  '/clients':      'Clients',
  '/reviews':      'Reviews',
  '/broadcasts':   'Broadcasts',
  '/services':     'Services',
  '/templates':    'Templates',
  '/appointments': 'Appointments',
  '/referrals':    'Referrals',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = TITLES[pathname] ?? 'ClientFlow AI';
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <header className="h-14 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center gap-4 px-6 shrink-0">
      {/* Page title */}
      <h1 className="text-sm font-semibold text-white whitespace-nowrap">{title}</h1>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          placeholder="Search clients, chats, campaigns…"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-8 pr-4 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* AI provider indicator */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
          <Zap size={11} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Groq</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Notifications */}
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={17} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">3</span>
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold cursor-pointer">
          {initials}
        </div>
      </div>
    </header>
  );
}
