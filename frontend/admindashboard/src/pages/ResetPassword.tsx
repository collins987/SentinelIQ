/**
 * Reset Password Page — Admin Dashboard
 * Allows unauthenticated users to set a new password using a token from email.
 * Uses POST /auth/password-reset/confirm
 * URL: /reset-password?token=...
 */

import { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LockClosedIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password strength indicators
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]~`/\\;']/.test(newPassword),
  };
  const allChecks = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!allChecks) {
      setError('Password does not meet strength requirements');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Password reset failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dashboard-bg px-4">
        <div className="w-full max-w-md card text-center py-8">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Invalid Reset Link</h2>
          <p className="text-gray-400 mb-6">
            This link is missing or invalid. Please request a new password reset.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-block px-6 py-2.5">
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dashboard-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden">
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" className="w-16 h-16 object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-white">SentinelIQ</h1>
          <p className="text-gray-400 mt-2">Set New Password</p>
        </div>

        <div className="card">
          {success ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Password Reset Complete</h2>
              <p className="text-gray-400 mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link to="/login" className="btn-primary inline-block px-6 py-2.5">
                Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <LockClosedIcon className="w-12 h-12 text-sentinel-400 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-white mb-1">Reset Your Password</h2>
                <p className="text-sm text-gray-400">
                  Enter a strong new password for your account.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                {/* Strength indicators */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    {[
                      { key: 'length', label: 'At least 8 characters' },
                      { key: 'uppercase', label: 'One uppercase letter' },
                      { key: 'lowercase', label: 'One lowercase letter' },
                      { key: 'digit', label: 'One digit' },
                      { key: 'special', label: 'One special character' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className={checks[key as keyof typeof checks] ? 'text-green-400' : 'text-gray-500'}>
                          {checks[key as keyof typeof checks] ? '✓' : '○'}
                        </span>
                        <span className={checks[key as keyof typeof checks] ? 'text-green-400' : 'text-gray-500'}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={isLoading || !allChecks} className="btn-primary w-full py-3">
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-sentinel-400 hover:text-sentinel-300">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
