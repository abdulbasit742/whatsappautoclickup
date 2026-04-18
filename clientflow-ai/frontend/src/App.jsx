import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#0f0f0f] text-white p-8">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
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
    <ErrorBoundary>
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
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
