import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import AnnouncementBanner from './components/AnnouncementBanner';
import LiveChatWidget from './components/LiveChatWidget';
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
import TeamInvite from './pages/TeamInvite';
import BrandingSettings from './pages/BrandingSettings';
import EmailTemplates from './pages/EmailTemplates';
import Billing from './pages/Billing';
import ReleaseNotes from './pages/ReleaseNotes';
import HelpCenter from './pages/HelpCenter';
import FAQs from './pages/FAQs';
import SupportContact from './pages/SupportContact';
import HealthScore from './pages/HealthScore';
import LifecycleDashboard from './pages/LifecycleDashboard';
import AnnouncementsAdmin from './pages/AnnouncementsAdmin';
import InviteAccept from './pages/InviteAccept';

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <AnnouncementBanner />
        {children}
      </main>
      <LiveChatWidget />
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
          <Route path="/invite/:token" element={<InviteAccept />} />
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
          <Route path="/team"        element={<Protected><TeamInvite /></Protected>} />
          <Route path="/branding"    element={<Protected><BrandingSettings /></Protected>} />
          <Route path="/email-templates" element={<Protected><EmailTemplates /></Protected>} />
          <Route path="/billing"     element={<Protected><Billing /></Protected>} />
          <Route path="/release-notes" element={<Protected><ReleaseNotes /></Protected>} />
          <Route path="/help"        element={<Protected><HelpCenter /></Protected>} />
          <Route path="/faqs"        element={<Protected><FAQs /></Protected>} />
          <Route path="/support"     element={<Protected><SupportContact /></Protected>} />
          <Route path="/health"      element={<Protected><HealthScore /></Protected>} />
          <Route path="/lifecycle"   element={<Protected><LifecycleDashboard /></Protected>} />
          <Route path="/announcements" element={<Protected><AnnouncementsAdmin /></Protected>} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
