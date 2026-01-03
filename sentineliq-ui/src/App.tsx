import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { LoginPage } from './pages/LoginPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { AnalystTriagePage } from './pages/analyst/TriagePage'
import { SOCDashboardPage } from './pages/soc/DashboardPage'
import { APIKeysPage } from './pages/developer/APIKeysPage'
import { RulesPage } from './pages/datascientist/RulesPage'
import { AuditPage } from './pages/compliance/AuditPage'
import { EndUserPortalPage } from './pages/enduser/PortalPage'
import { UserRole } from './types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Analyst */}
        <Route
          path="/analyst/triage"
          element={
            <ProtectedRoute requiredRole={UserRole.ANALYST}>
              <AnalystTriagePage />
            </ProtectedRoute>
          }
        />

        {/* SOC */}
        <Route
          path="/soc/dashboard"
          element={
            <ProtectedRoute requiredRole={UserRole.SOC_RESPONDER}>
              <SOCDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Developer */}
        <Route
          path="/developer/api"
          element={
            <ProtectedRoute requiredRole={UserRole.DEVELOPER}>
              <APIKeysPage />
            </ProtectedRoute>
          }
        />

        {/* Data Scientist */}
        <Route
          path="/datascientist/rules"
          element={
            <ProtectedRoute requiredRole={UserRole.DATA_SCIENTIST}>
              <RulesPage />
            </ProtectedRoute>
          }
        />

        {/* Compliance */}
        <Route
          path="/compliance/audit"
          element={
            <ProtectedRoute requiredRole={UserRole.COMPLIANCE}>
              <AuditPage />
            </ProtectedRoute>
          }
        />

        {/* End User */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute requiredRole={UserRole.END_USER}>
              <EndUserPortalPage />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate
                to={
                  user?.role === UserRole.ANALYST
                    ? '/analyst/triage'
                    : user?.role === UserRole.SOC_RESPONDER
                    ? '/soc/dashboard'
                    : user?.role === UserRole.DEVELOPER
                    ? '/developer/api'
                    : user?.role === UserRole.DATA_SCIENTIST
                    ? '/datascientist/rules'
                    : user?.role === UserRole.COMPLIANCE
                    ? '/compliance/audit'
                    : '/portal'
                }
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
