import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, MessageSquare, CreditCard, BarChart2,
  Star, Megaphone, Package, FileText, Calendar, Link, Settings, LogOut, Zap, Clock,
  Layers, Activity, UserCheck, TrendingUp, Kanban, Tag, Upload, Download,
  Database, Shield, Building2, LayoutGrid, Filter, Cpu, Brain, ThumbsUp, Heart
} from 'lucide-react';

const SECTIONS = [
  {
    label: null,
    links: [
      { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/clients',     icon: Users,           label: 'Clients' },
      { to: '/inbox',       icon: MessageSquare,   label: 'WhatsApp Inbox' },
    ],
  },
  {
    label: 'Communication',
    links: [
      { to: '/unified-inbox', icon: Layers,      label: 'Unified Inbox' },
      { to: '/broadcasts',    icon: Megaphone,   label: 'Broadcasts' },
      { to: '/followups',     icon: Clock,       label: 'Follow-ups' },
      { to: '/templates',     icon: FileText,    label: 'Templates' },
    ],
  },
  {
    label: 'Sales & Revenue',
    links: [
      { to: '/pipeline',    icon: Kanban,      label: 'Pipeline' },
      { to: '/revenue',     icon: TrendingUp,  label: 'Revenue' },
      { to: '/payments',    icon: CreditCard,  label: 'Payments' },
    ],
  },
  {
    label: 'Analytics',
    links: [
      { to: '/analytics',   icon: BarChart2,   label: 'Analytics' },
      { to: '/activity',    icon: Activity,    label: 'Activity Feed' },
      { to: '/team',        icon: UserCheck,   label: 'Team Performance' },
      { to: '/system-health', icon: Heart,     label: 'System Health' },
    ],
  },
  {
    label: 'Automation',
    links: [
      { to: '/rules',       icon: Zap,         label: 'Rule Engine' },
      { to: '/assignments', icon: UserCheck,   label: 'Assignments' },
      { to: '/auto-tagging', icon: Tag,        label: 'Auto-Tagging' },
    ],
  },
  {
    label: 'AI',
    links: [
      { to: '/ai-training', icon: Brain,        label: 'AI Training' },
      { to: '/ai-feedback', icon: ThumbsUp,     label: 'AI Feedback' },
    ],
  },
  {
    label: 'Data',
    links: [
      { to: '/filter-builder',    icon: Filter,     label: 'Filter Builder' },
      { to: '/dashboard-builder', icon: LayoutGrid, label: 'Dashboard Builder' },
      { to: '/import',            icon: Upload,     label: 'Import' },
      { to: '/export',            icon: Download,   label: 'Export' },
      { to: '/backup',            icon: Database,   label: 'Backup' },
      { to: '/privacy',           icon: Shield,     label: 'Privacy' },
    ],
  },
  {
    label: 'Other',
    links: [
      { to: '/reviews',      icon: Star,     label: 'Reviews' },
      { to: '/services',     icon: Package,  label: 'Services' },
      { to: '/appointments', icon: Calendar, label: 'Appointments' },
      { to: '/referrals',    icon: Link,     label: 'Referrals' },
      { to: '/settings',     icon: Settings, label: 'Settings' },
      { to: '/org-settings', icon: Building2, label: 'Org Settings' },
    ],
  },
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
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-4 pt-3 pb-1">{section.label}</p>
            )}
            {section.links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={15} />
                {label}
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
