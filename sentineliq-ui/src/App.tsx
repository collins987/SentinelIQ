// ============================================================================
// App.tsx - Main Application with Routing
// ============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventsPage from './pages/Events';
import AnalyticsPage from './pages/Analytics';
import LinkAnalysisPage from './pages/LinkAnalysis';
import ShadowModePage from './pages/ShadowMode';
import MLModelsPage from './pages/MLModels';
import RulesPage from './pages/Rules';
import AuditLogsPage from './pages/AuditLogs';

// Protected Route Component
interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

// Layout wrapper for dashboard routes
const DashboardRoutes: React.FC = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

// Placeholder component for routes not yet implemented
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="text-center">
      <p className="text-6xl mb-4">🚧</p>
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-gray-400">This page is coming soon</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardRoutes />}>
            {/* Main Dashboard */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Risk Events */}
            <Route path="/events" element={<EventsPage />} />

            {/* Analytics */}
            <Route path="/analytics" element={<AnalyticsPage />} />

            {/* Link Analysis */}
            <Route path="/link-analysis" element={<LinkAnalysisPage />} />

            {/* Shadow Mode */}
            <Route path="/shadow-mode" element={<ShadowModePage />} />

            {/* ML Models */}
            <Route path="/ml-models" element={<MLModelsPage />} />

            {/* Rules Engine */}
            <Route path="/rules" element={<RulesPage />} />

            {/* Audit Logs */}
            <Route path="/audit-logs" element={<AuditLogsPage />} />

            {/* Placeholder routes for future pages */}
            <Route path="/integrations" element={<PlaceholderPage title="Integrations" />} />
            <Route path="/users" element={<PlaceholderPage title="User Management" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          </Route>
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App