import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import DashboardLayout from './layouts/DashboardLayout';
import UserDashboardLayout from './layouts/UserDashboardLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import RiskCenter from './pages/RiskCenter';
import AuditLogs from './pages/AuditLogs';
import ActivityFeed from './pages/ActivityFeed';
import SystemHealth from './pages/SystemHealth';
import UserDashboard from './pages/UserDashboard';

// Protected Route wrapper - checks authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Admin Route wrapper - checks for admin role
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If not admin, redirect to user dashboard
  if (user?.role !== 'admin') {
    return <Navigate to="/my-dashboard" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { user } = useAppSelector((state) => state.auth);
  
  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (user?.role === 'admin') {
      return '/overview';
    }
    return '/my-dashboard';
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      
      {/* User Dashboard - accessible by all authenticated users */}
      <Route
        path="/my-dashboard"
        element={
          <ProtectedRoute>
            <UserDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<UserDashboard />} />
      </Route>
      
      {/* Admin Protected dashboard routes */}
      <Route
        path="/"
        element={
          <AdminRoute>
            <DashboardLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:userId" element={<UserDetail />} />
        <Route path="risk" element={<RiskCenter />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="activity" element={<ActivityFeed />} />
        <Route path="health" element={<SystemHealth />} />
      </Route>
      
      {/* Catch all - redirect to appropriate dashboard */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

export default App;
