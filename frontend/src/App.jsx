import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore.js'
import AppLayout from './components/layout/AppLayout.jsx'
import ToastContainer from './components/ui/ToastContainer.jsx'

// Public pages
import Landing from './pages/public/Landing.jsx'
import Pricing from './pages/public/Pricing.jsx'
import Login from './pages/public/Login.jsx'
import Signup from './pages/public/Signup.jsx'
import ForgotPassword from './pages/public/ForgotPassword.jsx'
import ResetPassword from './pages/public/ResetPassword.jsx'

// App pages
import Dashboard from './pages/app/Dashboard.jsx'
import Inbox from './pages/app/Inbox.jsx'
import CRM from './pages/app/CRM.jsx'
import ContactProfile from './pages/app/ContactProfile.jsx'
import Campaigns from './pages/app/Campaigns.jsx'
import CampaignDetail from './pages/app/CampaignDetail.jsx'
import Templates from './pages/app/Templates.jsx'
import Followups from './pages/app/Followups.jsx'
import Reminders from './pages/app/Reminders.jsx'
import Issues from './pages/app/Issues.jsx'
import AICenter from './pages/app/AICenter.jsx'
import Billing from './pages/app/Billing.jsx'
import Integrations from './pages/app/Integrations.jsx'
import Analytics from './pages/app/Analytics.jsx'
import Team from './pages/app/Team.jsx'
import Settings from './pages/app/Settings.jsx'
import APIKeys from './pages/app/APIKeys.jsx'
import FeatureFlags from './pages/app/FeatureFlags.jsx'
import AuditLogs from './pages/app/AuditLogs.jsx'
import Notifications from './pages/app/Notifications.jsx'

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected app routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="crm" element={<CRM />} />
          <Route path="contacts/:id" element={<ContactProfile />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="templates" element={<Templates />} />
          <Route path="followups" element={<Followups />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="issues" element={<Issues />} />
          <Route path="ai" element={<AICenter />} />
          <Route path="billing" element={<Billing />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
          <Route path="api-keys" element={<APIKeys />} />
          <Route path="feature-flags" element={<FeatureFlags />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
