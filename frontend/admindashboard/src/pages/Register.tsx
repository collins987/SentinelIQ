/**
 * Register Page — Admin Dashboard (React + Vite)
 * Public self-registration for new users (always assigned "viewer" role).
 * Calls POST /auth/register, auto-logs in on success.
 */

import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { setCredentials, setLoading } from '../features/authSlice';
import { UserPlusIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          org_id: orgId || undefined,
          role: 'admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      // Auto-login: store credentials from registration response
      const user = data.user || {
        id: '',
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'viewer',
      };

      dispatch(setCredentials({
        token: data.access_token,
        refreshToken: data.refresh_token || '',
        user,
      }));

      setSuccess(true);


      // Brief delay so user sees success, then redirect to admin overview.
      // This is the Admin Dashboard app — always redirect to /overview.
      setTimeout(() => {
        navigate('/overview');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dashboard-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden">
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" className="w-16 h-16 object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-white">SentinelIQ</h1>
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>

        <div className="card">
          {success ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Account created!</h2>
              <p className="text-gray-400 mb-2">
                A verification email has been sent to <strong className="text-gray-300">{email}</strong>.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <UserPlusIcon className="w-10 h-10 text-sentinel-400 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-white mb-1">Sign Up</h2>
                <p className="text-sm text-gray-400">All accounts start as viewer. Admins can upgrade roles.</p>
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1.5">
                      First name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="orgId" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Organization ID <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="orgId"
                    type="text"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    className="input"
                    placeholder="ORG-XXXX"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-sentinel-400 hover:text-sentinel-300 font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
