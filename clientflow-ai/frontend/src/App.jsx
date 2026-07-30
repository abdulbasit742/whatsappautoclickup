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
import Users from './pages/Users';
import Leads from './pages/Leads';
import AIDashboard from './pages/AIDashboard';
import CampaignDashboard from './pages/CampaignDashboard';
import Integrations from './pages/Integrations';
import Billing from './pages/Billing';
import ApiKeys from './pages/ApiKeys';

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
          <Route path="/login"             element={<Login />} />
          <Route path="/"                  element={<Protected><Dashboard /></Protected>} />
          <Route path="/clients"           element={<Protected><Clients /></Protected>} />
          <Route path="/clients/:id"       element={<Protected><ClientProfile /></Protected>} />
          <Route path="/leads"             element={<Protected><Leads /></Protected>} />
          <Route path="/inbox"             element={<Protected><Inbox /></Protected>} />
          <Route path="/payments"          element={<Protected><Payments /></Protected>} />
          <Route path="/analytics"         element={<Protected><Analytics /></Protected>} />
          <Route path="/reviews"           element={<Protected><Reviews /></Protected>} />
          <Route path="/broadcasts"        element={<Protected><Broadcasts /></Protected>} />
          <Route path="/campaigns"         element={<Protected><CampaignDashboard /></Protected>} />
          <Route path="/followups"         element={<Protected><Followups /></Protected>} />
          <Route path="/services"          element={<Protected><Services /></Protected>} />
          <Route path="/templates"         element={<Protected><Templates /></Protected>} />
          <Route path="/appointments"      element={<Protected><Appointments /></Protected>} />
          <Route path="/referrals"         element={<Protected><Referrals /></Protected>} />
          <Route path="/settings"          element={<Protected><Settings /></Protected>} />
          <Route path="/users"             element={<Protected><Users /></Protected>} />
          <Route path="/ai"                element={<Protected><AIDashboard /></Protected>} />
          <Route path="/integrations"      element={<Protected><Integrations /></Protected>} />
          <Route path="/billing"           element={<Protected><Billing /></Protected>} />
          <Route path="/api-keys"          element={<Protected><ApiKeys /></Protected>} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
