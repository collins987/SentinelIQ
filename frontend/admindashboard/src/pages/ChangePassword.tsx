/**
 * Change Password Page — Admin Dashboard
 * Allows authenticated users to change their password from within the dashboard.
 * Uses POST /auth/change-password (requires JWT)
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../features/authSlice';
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export default function ChangePassword() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password strength checks
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
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Password change failed');
      }

      setSuccess(true);

      // Log user out after 3 seconds (sessions are revoked server-side)
      setTimeout(() => {
        dispatch(logout());
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheckIcon className="w-7 h-7 text-sentinel-400" />
            Change Password
          </h1>
          <p className="text-gray-400 mt-1">
            Update your account password
          </p>
        </div>
      </div>

      <div className="max-w-lg">
        <div className="card">
          {success ? (
            <div className="text-center py-6">
              <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Password Changed</h2>
              <p className="text-gray-400 mb-2">
                Your password has been updated successfully.
              </p>
              <p className="text-sm text-gray-500">
                You will be redirected to the login page in a few seconds...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-1">Update Password</h2>
                <p className="text-sm text-gray-400">
                  Changing for: <strong className="text-gray-300">{user?.email}</strong>
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

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

                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400">
                    <strong>Note:</strong> Changing your password will log you out of all devices.
                    You will need to sign in again.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !allChecks || !currentPassword}
                  className="btn-primary w-full py-3"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
