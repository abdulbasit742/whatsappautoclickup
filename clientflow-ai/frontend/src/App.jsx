import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import Inbox from './pages/Inbox';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import Reviews from './pages/Reviews';
import Broadcasts from './pages/Broadcasts';
import Followups from './pages/Followups';
import Services from './pages/Services';
import Templates from './pages/Templates';
import Appointments from './pages/Appointments';
import Referrals from './pages/Referrals';
import Settings from './pages/Settings';
// v2 pages
import UnifiedInbox from './pages/UnifiedInbox';
import ActivityFeed from './pages/ActivityFeed';
import TeamPerformance from './pages/TeamPerformance';
import Revenue from './pages/Revenue';
import Pipeline from './pages/Pipeline';
import AssignmentRules from './pages/AssignmentRules';
import AutoTagging from './pages/AutoTagging';
import DataImport from './pages/DataImport';
import DataExport from './pages/DataExport';
import DataBackup from './pages/DataBackup';
import DataPrivacy from './pages/DataPrivacy';
import OrgSettings from './pages/OrgSettings';
import DashboardBuilder from './pages/DashboardBuilder';
import FilterBuilder from './pages/FilterBuilder';
import RuleEngine from './pages/RuleEngine';
import AITraining from './pages/AITraining';
import AIFeedback from './pages/AIFeedback';
import SystemHealth from './pages/SystemHealth';

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0f0f0f] text-emerald-400">
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"            element={<Protected><Dashboard /></Protected>} />
          <Route path="/clients"     element={<Protected><Clients /></Protected>} />
          <Route path="/clients/:id" element={<Protected><ClientProfile /></Protected>} />
          <Route path="/inbox"       element={<Protected><Inbox /></Protected>} />
          <Route path="/payments"    element={<Protected><Payments /></Protected>} />
          <Route path="/analytics"   element={<Protected><Analytics /></Protected>} />
          <Route path="/reviews"     element={<Protected><Reviews /></Protected>} />
          <Route path="/broadcasts"  element={<Protected><Broadcasts /></Protected>} />
          <Route path="/followups"   element={<Protected><Followups /></Protected>} />
          <Route path="/services"    element={<Protected><Services /></Protected>} />
          <Route path="/templates"   element={<Protected><Templates /></Protected>} />
          <Route path="/appointments" element={<Protected><Appointments /></Protected>} />
          <Route path="/referrals"   element={<Protected><Referrals /></Protected>} />
          <Route path="/settings"    element={<Protected><Settings /></Protected>} />
          {/* v2 routes */}
          <Route path="/unified-inbox"   element={<Protected><UnifiedInbox /></Protected>} />
          <Route path="/activity"        element={<Protected><ActivityFeed /></Protected>} />
          <Route path="/team"            element={<Protected><TeamPerformance /></Protected>} />
          <Route path="/revenue"         element={<Protected><Revenue /></Protected>} />
          <Route path="/pipeline"        element={<Protected><Pipeline /></Protected>} />
          <Route path="/assignments"     element={<Protected><AssignmentRules /></Protected>} />
          <Route path="/auto-tagging"    element={<Protected><AutoTagging /></Protected>} />
          <Route path="/import"          element={<Protected><DataImport /></Protected>} />
          <Route path="/export"          element={<Protected><DataExport /></Protected>} />
          <Route path="/backup"          element={<Protected><DataBackup /></Protected>} />
          <Route path="/privacy"         element={<Protected><DataPrivacy /></Protected>} />
          <Route path="/org-settings"    element={<Protected><OrgSettings /></Protected>} />
          <Route path="/dashboard-builder" element={<Protected><DashboardBuilder /></Protected>} />
          <Route path="/filter-builder"  element={<Protected><FilterBuilder /></Protected>} />
          <Route path="/rules"           element={<Protected><RuleEngine /></Protected>} />
          <Route path="/ai-training"     element={<Protected><AITraining /></Protected>} />
          <Route path="/ai-feedback"     element={<Protected><AIFeedback /></Protected>} />
          <Route path="/system-health"   element={<Protected><SystemHealth /></Protected>} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
