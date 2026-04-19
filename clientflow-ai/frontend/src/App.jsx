/**
 * PROMPT 109 — Theme Engine integrated
 * PROMPT 118 — Frontend Performance: lazy loading + code splitting
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';

// ── PROMPT 118: Code splitting — each page loaded only when needed ────────────
const Login         = lazy(() => import('./pages/Login'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Clients       = lazy(() => import('./pages/Clients'));
const ClientProfile = lazy(() => import('./pages/ClientProfile'));
const Inbox         = lazy(() => import('./pages/Inbox'));
const Payments      = lazy(() => import('./pages/Payments'));
const Analytics     = lazy(() => import('./pages/Analytics'));
const Reviews       = lazy(() => import('./pages/Reviews'));
const Broadcasts    = lazy(() => import('./pages/Broadcasts'));
const Followups     = lazy(() => import('./pages/Followups'));
const Services      = lazy(() => import('./pages/Services'));
const Templates     = lazy(() => import('./pages/Templates'));
const Appointments  = lazy(() => import('./pages/Appointments'));
const Referrals     = lazy(() => import('./pages/Referrals'));
const Settings      = lazy(() => import('./pages/Settings'));

// ── Full-page loading spinner ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen"
         style={{ background: 'var(--color-bg)', color: 'var(--color-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="text-sm opacity-70">Loading…</span>
      </div>
    </div>
  );
}

function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Theme toggle in top-right corner */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/"             element={<Protected><Dashboard /></Protected>} />
                <Route path="/clients"      element={<Protected><Clients /></Protected>} />
                <Route path="/clients/:id"  element={<Protected><ClientProfile /></Protected>} />
                <Route path="/inbox"        element={<Protected><Inbox /></Protected>} />
                <Route path="/payments"     element={<Protected><Payments /></Protected>} />
                <Route path="/analytics"    element={<Protected><Analytics /></Protected>} />
                <Route path="/reviews"      element={<Protected><Reviews /></Protected>} />
                <Route path="/broadcasts"   element={<Protected><Broadcasts /></Protected>} />
                <Route path="/followups"    element={<Protected><Followups /></Protected>} />
                <Route path="/services"     element={<Protected><Services /></Protected>} />
                <Route path="/templates"    element={<Protected><Templates /></Protected>} />
                <Route path="/appointments" element={<Protected><Appointments /></Protected>} />
                <Route path="/referrals"    element={<Protected><Referrals /></Protected>} />
                <Route path="/settings"     element={<Protected><Settings /></Protected>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
