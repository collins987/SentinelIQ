import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { AuthLayout } from '../layouts'
import { UserRole } from '../types'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = React.useState('analyst@sentineliq.com')
  const [password, setPassword] = React.useState('password')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleLogin = async (role: UserRole) => {
    setLoading(true)
    setError('')
    try {
      const roleEmail = {
        [UserRole.ANALYST]: 'analyst@sentineliq.com',
        [UserRole.END_USER]: 'user@sentineliq.com',
        [UserRole.SOC_RESPONDER]: 'soc@sentineliq.com',
        [UserRole.DATA_SCIENTIST]: 'scientist@sentineliq.com',
        [UserRole.DEVELOPER]: 'dev@sentineliq.com',
        [UserRole.COMPLIANCE]: 'compliance@sentineliq.com',
      }[role]

      await login(roleEmail, password)
      navigate(
        role === UserRole.ANALYST
          ? '/analyst/triage'
          : role === UserRole.SOC_RESPONDER
          ? '/soc/dashboard'
          : role === UserRole.DEVELOPER
          ? '/developer/api'
          : role === UserRole.DATA_SCIENTIST
          ? '/datascientist/rules'
          : role === UserRole.COMPLIANCE
          ? '/compliance/audit'
          : '/portal'
      )
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
          SentinelIQ
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Fraud Detection Platform
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
            Demo Logins:
          </p>
          {[
            { role: UserRole.ANALYST, label: 'Risk Analyst' },
            { role: UserRole.SOC_RESPONDER, label: 'SOC Responder' },
            { role: UserRole.DEVELOPER, label: 'Developer' },
            { role: UserRole.DATA_SCIENTIST, label: 'Data Scientist' },
            { role: UserRole.COMPLIANCE, label: 'Compliance Officer' },
            { role: UserRole.END_USER, label: 'End User' },
          ].map(({ role, label }) => (
            <button
              key={role}
              onClick={() => handleLogin(role)}
              disabled={loading}
              className="w-full px-4 py-2 mb-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
            >
              {loading ? 'Loading...' : `Login as ${label}`}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
