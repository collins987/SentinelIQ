import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/main-layout';
import { DashboardPage } from './pages/Dashboard';
import { JobsPage } from './pages/jobs';
import { ActivityPage } from './pages/activity';
import { HealthPage } from './pages/health';
import { AnalyticsPage } from './pages/Analytics';
import { UsersPage } from './pages/users';
import { RolesPage } from './pages/roles';
import { AuditPage } from './pages/audit';
import { SettingsPage } from './pages/settings';
import { NotificationsPage } from './pages/notifications';
import { useUIStore } from './stores';
import { ToastContainer } from './components/ui/toast';
import { useRealTimeData } from './hooks/useRealTimeData';


function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return <>{children}</>;
}

export default function App() {
  // Enable real-time data updates
  // Mock data is DISABLED by default for production mode
  // Set VITE_USE_MOCK_DATA=true to enable for testing
  useRealTimeData({ enablePolling: true, pollingInterval: 5000 });

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </ThemeProvider>
  );
}