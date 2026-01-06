import { useState, useEffect } from 'react';
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
import { config, useMockData } from './lib/config';
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize real-time data only if mock mode is enabled
  const { isMockMode } = useRealTimeData({
    enablePolling: useMockData(), // Only poll in mock mode
    pollingInterval: 5000,
    onError: (error) => {
      console.error('[App] Real-time data error:', error);
    },
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        // Log startup info
        console.log(`[App] Starting ${config.appName} v${config.appVersion}`);
        console.log(`[App] Mode: ${config.mode}, Mock Data: ${isMockMode ? 'ON' : 'OFF'}`);

        // Add any async initialization here
        setIsInitialized(true);
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initialize();
  }, [isMockMode]);

  // Show error state
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-xl font-bold text-red-600">Initialization Error</h1>
          <p className="mt-2 text-gray-600">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading {config.appName}...</p>
        </div>
      </div>
    );
  }

  // Enable real-time data updates (respects config)
  useRealTimeData({ 
    enablePolling: config.enableRealTimeUpdates, 
    pollingInterval: config.pollingInterval, 
    enableMockData: config.enableMockData 
  });

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