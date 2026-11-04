import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/AppShell';
import { Icon } from './components/Icons';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { LiveIncidentsPage } from './pages/LiveIncidentsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { IncidentHistoryPage } from './pages/IncidentHistoryPage';
import { UsersPage } from './pages/UsersPage';
import { GuardiansPage } from './pages/GuardiansPage';
import { ContactsPage } from './pages/ContactsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

function Splash() {
  return (
    <div className="splash">
      <span className="splash-mark">
        <Icon name="shield" size={30} />
      </span>
      <p>SURAKSHA AI</p>
      <span className="muted small">Restoring secure session…</span>
    </div>
  );
}

function ProtectedLayout() {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <Outlet />;
}

function DashboardLayout() {
  return (
    <RealtimeProvider>
      <AppShell />
    </RealtimeProvider>
  );
}

function RouteScrollReset() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RouteScrollReset />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/incidents" element={<LiveIncidentsPage />} />
                <Route path="/map" element={<LiveMapPage />} />
                <Route path="/history" element={<IncidentHistoryPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/guardians" element={<GuardiansPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/audit" element={<AuditLogsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
