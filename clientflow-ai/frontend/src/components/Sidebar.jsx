import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, MessageSquare, CreditCard, BarChart2,
  Star, Megaphone, Package, FileText, Calendar, Link, Settings, LogOut, Zap, Clock,
  UserPlus, Palette, Mail, Bell, BookOpen, HelpCircle, HeartPulse, TrendingUp,
  Activity, Megaphone as MegaphoneIcon, CreditCard as BillingIcon
} from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/reviews', icon: Star, label: 'Reviews' },
  { to: '/broadcasts', icon: Megaphone, label: 'Broadcasts' },
  { to: '/followups', icon: Clock, label: 'Follow-ups' },
  { to: '/services', icon: Package, label: 'Services' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/referrals', icon: Link, label: 'Referrals' },
  { divider: true, label: 'Organization' },
  { to: '/team', icon: UserPlus, label: 'Team & Invites' },
  { to: '/branding', icon: Palette, label: 'Branding' },
  { to: '/email-templates', icon: Mail, label: 'Email Templates' },
  { to: '/billing', icon: BillingIcon, label: 'Billing' },
  { divider: true, label: 'Intelligence' },
  { to: '/health', icon: HeartPulse, label: 'Health Score' },
  { to: '/lifecycle', icon: TrendingUp, label: 'Lifecycle' },
  { divider: true, label: 'Help & Support' },
  { to: '/help', icon: HelpCircle, label: 'Help Center' },
  { to: '/faqs', icon: BookOpen, label: 'FAQs' },
  { to: '/support', icon: MessageSquare, label: 'Support' },
  { to: '/release-notes', icon: Bell, label: 'Release Notes' },
  { to: '/announcements', icon: Activity, label: 'Announcements' },
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
        {links.map((item, i) => {
          if (item.divider) return (
            <div key={i} className="px-4 pt-4 pb-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">{item.label}</div>
            </div>
          );
          const { to, icon: Icon, label } = item;
          return (
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
          );
        })}
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
