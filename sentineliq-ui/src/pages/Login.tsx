// ============================================================================
// Login Page - Modern Authentication UI
// ============================================================================

import React, { useState } from 'react';
import { useAuthStore, DEMO_USERS, UserRole } from '../stores/authStore';

export default function LoginPage() {
  const { login, loginAsRole, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDemoRoles, setShowDemoRoles] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  const handleDemoLogin = (role: UserRole) => {
    loginAsRole(role);
  };

  const roleDescriptions: Record<UserRole, { icon: string; description: string }> = {
    admin: { icon: '👑', description: 'Full system access' },
    risk_analyst: { icon: '📊', description: 'Risk analysis & rules' },
    soc_responder: { icon: '🛡️', description: 'Incident response' },
    compliance_officer: { icon: '📋', description: 'Audit & compliance' },
    data_scientist: { icon: '🤖', description: 'ML models & data' },
    developer: { icon: '💻', description: 'API & integrations' },
    viewer: { icon: '👁️', description: 'Read-only access' },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SentinelIQ</h1>
          <p className="text-gray-400">Intelligent Fraud Detection Platform</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          {/* Tab Toggle */}
          <div className="flex items-center gap-2 mb-6 p-1 bg-gray-800 rounded-lg">
            <button
              onClick={() => setShowDemoRoles(false)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                !showDemoRoles ? 'bg-indigo-600 text-white' : 'text-gray-400'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setShowDemoRoles(true)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                showDemoRoles ? 'bg-indigo-600 text-white' : 'text-gray-400'
              }`}
            >
              Demo Mode
            </button>
          </div>

          {!showDemoRoles ? (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="flex items-center justify-between text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Forgot password?
                </a>
                <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Request access
                </a>
              </div>
            </form>
          ) : (
            /* Demo Role Selection */
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Select a role to explore the platform with demo data:
              </p>
              {(Object.keys(DEMO_USERS) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleDemoLogin(role)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-all hover:scale-[1.02] group"
                >
                  <span className="text-2xl">{roleDescriptions[role].icon}</span>
                  <div className="text-left flex-1">
                    <p className="text-white font-medium capitalize">
                      {role.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-500">{roleDescriptions[role].description}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Protected by enterprise-grade security</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span>🔒 256-bit TLS</span>
            <span>🛡️ SOC2 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
