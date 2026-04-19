import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Star, DollarSign, Wrench,
  BarChart2, Settings, Bell, Clock, Megaphone, FileText, Rocket,
  Shield, UsersRound, GitBranch, Search, Command, Tag,
  AlertTriangle, Download, Webhook, BookOpen, BrainCircuit,
  Activity, Server, Lock, CheckSquare, BarChart3, Filter
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Followups from './pages/Followups';
import Reviews from './pages/Reviews';
import Broadcasts from './pages/Broadcasts';
import Templates from './pages/Templates';
import Appointments from './pages/Appointments';
import Services from './pages/Services';
import Team from './pages/Team';
import Permissions from './pages/Permissions';
import Issues from './pages/Issues';
import Notifications from './pages/Notifications';
import Timeline from './pages/Timeline';
import Customer360 from './pages/Customer360';
import WorkflowBuilder from './pages/WorkflowBuilder';
import TemplateLibrary from './pages/TemplateLibrary';
import AIPromptLibrary from './pages/AIPromptLibrary';
import Segments from './pages/Segments';
import Tags from './pages/Tags';
import Exports from './pages/Exports';
import QueueMonitor from './pages/QueueMonitor';
import IntegrationHealth from './pages/IntegrationHealth';
import SecurityAudit from './pages/SecurityAudit';
import Onboarding from './pages/Onboarding';
import WebhookSettings from './pages/WebhookSettings';
import SearchModal from './components/SearchModal';
import CommandPalette from './components/CommandPalette';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/',            label: 'Dashboard',         icon: LayoutDashboard },
      { to: '/clients',     label: 'Clients / Inbox',   icon: Users },
      { to: '/issues',      label: 'Issues & SLA',      icon: AlertTriangle },
      { to: '/followups',   label: 'Follow-ups',        icon: Clock },
      { to: '/broadcasts',  label: 'Campaigns',         icon: Megaphone },
    ]
  },
  {
    label: 'CRM',
    items: [
      { to: '/segments',    label: 'Segments',          icon: Filter },
      { to: '/tags',        label: 'Tags',              icon: Tag },
      { to: '/workflows',   label: 'Workflows',         icon: GitBranch },
    ]
  },
  {
    label: 'Content',
    items: [
      { to: '/template-library', label: 'Templates',   icon: BookOpen },
      { to: '/ai-prompts',       label: 'AI Prompts',  icon: BrainCircuit },
    ]
  },
  {
    label: 'Team',
    items: [
      { to: '/team',         label: 'Team',            icon: UsersRound },
      { to: '/permissions',  label: 'Permissions',     icon: Shield },
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/notifications',      label: 'Notifications',       icon: Bell },
      { to: '/exports',            label: 'Exports',             icon: Download },
      { to: '/webhook-settings',   label: 'Webhooks',            icon: Webhook },
      { to: '/integration-health', label: 'Integration Health',  icon: Activity },
      { to: '/queue-monitor',      label: 'Queue Monitor',       icon: Server },
      { to: '/security-audit',     label: 'Security Audit',      icon: Lock },
      { to: '/onboarding',         label: 'Onboarding',          icon: Rocket },
    ]
  },
  {
    label: 'More',
    items: [
      { to: '/reviews',      label: 'Reviews',         icon: Star },
      { to: '/appointments', label: 'Appointments',    icon: CheckSquare },
      { to: '/services',     label: 'Services',        icon: Wrench },
      { to: '/settings',     label: 'Settings',        icon: Settings },
    ]
  }
];

function Layout({ children }) {
  const { user, logout } = useAuth();
  const [showSearch, setShowSearch]   = useState(false);
  const [showCmd, setShowCmd]         = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCmd(s => !s); }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setShowSearch(s => !s); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0f0f0f] text-white">
      {/* Sidebar */}
      <aside className="w-56 bg-[#111] border-r border-[#1e1e1e] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-[#1e1e1e]">
          <span className="font-bold text-emerald-400 text-sm">⚡ ClientFlow AI</span>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-4">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs text-gray-600 px-2 mb-1 uppercase tracking-wider">{group.label}</p>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium mb-0.5 ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}`
                  }
                >
                  <item.icon size={13} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1e1e1e]">
          <div className="text-xs text-gray-500 mb-2">{user?.email}</div>
          <button onClick={logout} className="w-full text-xs text-gray-500 hover:text-red-400 py-1.5 text-left">Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-[#111] border-b border-[#1e1e1e] flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setShowSearch(true)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-1.5 rounded-lg flex-1 max-w-xs">
            <Search size={12} /> Search... <span className="ml-auto text-gray-600">Ctrl+/</span>
          </button>
          <button onClick={() => setShowCmd(true)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-[#2a2a2a] px-2 py-1.5 rounded-lg">
            <Command size={12} /> <span className="hidden sm:inline">Ctrl+K</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Modals */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showCmd    && <CommandPalette onClose={() => setShowCmd(false)} />}
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/"                    element={<Dashboard />} />
        <Route path="/clients"             element={<Clients />} />
        <Route path="/clients/:id"         element={<Customer360 />} />
        <Route path="/followups"           element={<Followups />} />
        <Route path="/broadcasts"          element={<Broadcasts />} />
        <Route path="/templates"           element={<Templates />} />
        <Route path="/template-library"    element={<TemplateLibrary />} />
        <Route path="/ai-prompts"          element={<AIPromptLibrary />} />
        <Route path="/appointments"        element={<Appointments />} />
        <Route path="/services"            element={<Services />} />
        <Route path="/reviews"             element={<Reviews />} />
        <Route path="/team"                element={<Team />} />
        <Route path="/permissions"         element={<Permissions />} />
        <Route path="/issues"              element={<Issues />} />
        <Route path="/notifications"       element={<Notifications />} />
        <Route path="/timeline/:clientId"  element={<Timeline />} />
        <Route path="/workflows"           element={<WorkflowBuilder />} />
        <Route path="/segments"            element={<Segments />} />
        <Route path="/tags"                element={<Tags />} />
        <Route path="/exports"             element={<Exports />} />
        <Route path="/queue-monitor"       element={<QueueMonitor />} />
        <Route path="/integration-health"  element={<IntegrationHealth />} />
        <Route path="/security-audit"      element={<SecurityAudit />} />
        <Route path="/onboarding"          element={<Onboarding />} />
        <Route path="/webhook-settings"    element={<WebhookSettings />} />
        <Route path="*"                    element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
