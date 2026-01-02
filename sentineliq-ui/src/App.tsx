import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AuthLayout } from '@/layouts'

// Pages
import { AnalystTriagePage } from '@/pages/analyst/TriagePage'
import { AnalystGraphPage } from '@/pages/analyst/GraphPage'
import { EndUserPortalPage } from '@/pages/enduser/PortalPage'
import { SOCDashboardPage } from '@/pages/soc/DashboardPage'
import { DataScientistLabPage } from '@/pages/datascientist/LabPage'
import { DeveloperPortalPage } from '@/pages/developer/PortalPage'
import { ComplianceAuditPage } from '@/pages/compliance/AuditPage'
import { UserRole } from '@/types'

// Simple login page
const LoginPage: React.FC = () => {
  const { login } = useAuthStore()
  const [email, setEmail] = React.useState('analyst@sentineliq.com')
  const [password, setPassword] = React.useState('password')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleLogin = async (role: UserRole) => {
    setLoading(true)
    setError('')
    try {
      // For demo purposes, create a mock user
      useAuthStore.setState({
        user: {
          id: `user_${Date.now()}`,
          email,
          name: 'Demo User',
          role,
          permissions: ['read:transactions', 'write:transactions', 'read:rules'],
          created_at: new Date().toISOString()
        },
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (err) {
      setError('Login failed')
    }
    setLoading(false)
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 text-blue-600">SentinelIQ</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Fraud Detection Platform
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold mb-3">Demo Logins:</p>
          {[
            { role: UserRole.ANALYST, label: 'Risk Analyst' },
            { role: UserRole.END_USER, label: 'End User' },
            { role: UserRole.SOC_RESPONDER, label: 'SOC Responder' },
            { role: UserRole.DATA_SCIENTIST, label: 'Data Scientist' },
            { role: UserRole.DEVELOPER, label: 'Developer' },
            { role: UserRole.COMPLIANCE, label: 'Compliance' }
          ].map((demo) => (
            <button
              key={demo.role}
              onClick={() => handleLogin(demo.role)}
              disabled={loading}
              className="w-full px-4 py-2 mb-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition text-sm"
            >
              Login as {demo.label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
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

const UnauthorizedPage = () => (
  <AuthLayout>
    <div className="text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-2">Access Denied</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        You don't have permission to access this page.
      </p>
      <a href="/login" className="text-blue-600 hover:underline">
        Back to Login
      </a>
    </div>
  </AuthLayout>
)

export const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Analyst Routes */}
        <Route
          path="/analyst/triage"
          element={
            <ProtectedRoute requiredRole={UserRole.ANALYST}>
              <AnalystTriagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyst/graph"
          element={
            <ProtectedRoute requiredRole={UserRole.ANALYST}>
              <AnalystGraphPage />
            </ProtectedRoute>
          }
        />

        {/* End User Routes */}
        <Route
          path="/portal/security"
          element={
            <ProtectedRoute requiredRole={UserRole.END_USER}>
              <EndUserPortalPage />
            </ProtectedRoute>
          }
        />

        {/* SOC Routes */}
        <Route
          path="/soc/attack-map"
          element={
            <ProtectedRoute requiredRole={UserRole.SOC_RESPONDER}>
              <SOCDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/soc/health"
          element={
            <ProtectedRoute requiredRole={UserRole.SOC_RESPONDER}>
              <SOCDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Data Scientist Routes */}
        <Route
          path="/datascientist/rules"
          element={
            <ProtectedRoute requiredRole={UserRole.DATA_SCIENTIST}>
              <DataScientistLabPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datascientist/shadow"
          element={
            <ProtectedRoute requiredRole={UserRole.DATA_SCIENTIST}>
              <DataScientistLabPage />
            </ProtectedRoute>
          }
        />

        {/* Developer Routes */}
        <Route
          path="/developer/keys"
          element={
            <ProtectedRoute requiredRole={UserRole.DEVELOPER}>
              <DeveloperPortalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/developer/webhooks"
          element={
            <ProtectedRoute requiredRole={UserRole.DEVELOPER}>
              <DeveloperPortalPage />
            </ProtectedRoute>
          }
        />

        {/* Compliance Routes */}
        <Route
          path="/compliance/audit"
          element={
            <ProtectedRoute requiredRole={UserRole.COMPLIANCE}>
              <ComplianceAuditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance/export"
          element={
            <ProtectedRoute requiredRole={UserRole.COMPLIANCE}>
              <ComplianceAuditPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate
                to={
                  user?.role === UserRole.ANALYST
                    ? '/analyst/triage'
                    : user?.role === UserRole.END_USER
                    ? '/portal/security'
                    : user?.role === UserRole.SOC_RESPONDER
                    ? '/soc/attack-map'
                    : user?.role === UserRole.DATA_SCIENTIST
                    ? '/datascientist/rules'
                    : user?.role === UserRole.DEVELOPER
                    ? '/developer/keys'
                    : user?.role === UserRole.COMPLIANCE
                    ? '/compliance/audit'
                    : '/login'
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
