import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import RiskCenter from './pages/RiskCenter';
import AuditLogs from './pages/AuditLogs';
import ActivityFeed from './pages/ActivityFeed';
import SystemHealth from './pages/SystemHealth';

import Governance from './pages/Governance';
import Enforcement from './pages/Enforcement';
import IdentityAccess from './pages/IdentityAccess';
import Compliance from './pages/Compliance';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Register from './pages/Register';

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
  
  // If not admin, redirect to login (non-admins should use their own dashboard apps)
  if (user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { user } = useAppSelector((state) => state.auth);
  
  // Determine default route based on user role
  const getDefaultRoute = () => {
    return '/overview';
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
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
        <Route path="governance" element={<Governance />} />
        <Route path="enforcement" element={<Enforcement />} />
        <Route path="iam" element={<IdentityAccess />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="change-password" element={<ChangePassword />} />
      </Route>
      
      {/* Catch all - redirect to appropriate dashboard */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

export default App;
