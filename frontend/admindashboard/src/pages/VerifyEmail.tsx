import { useEffect, useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!token) return;
    setStatus('loading');
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'POST' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Invalid or expired verification link');
        setMessage(data.msg || 'Email verified successfully');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Verification failed');
        setStatus('error');
      });
  }, [token]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setResendStatus('loading');
    try {
      await fetch('/api/auth/verify-email/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendStatus('success');
    } catch {
      setResendStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dashboard-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden">
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" className="w-16 h-16 object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-white">SentinelIQ</h1>
          <p className="text-gray-400 mt-2">Admin Verification</p>
        </div>

        <div className="card">
          {!token ? (
            <div className="text-center py-4">
              <ExclamationTriangleIcon className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Invalid verification link</h2>
              <p className="text-gray-400 mb-6">
                This link is missing or expired. Request a new verification email below.
              </p>
            </div>
          ) : status === 'loading' || status === 'idle' ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">⏳</div>
              <h2 className="text-xl font-semibold text-white mb-2">Verifying your email</h2>
              <p className="text-gray-400">Please wait while we confirm your email address.</p>
            </div>
          ) : status === 'success' ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Email verified</h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <Link to="/login" className="btn-primary inline-block px-6 py-2.5">
                Continue to Sign In
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <ExclamationTriangleIcon className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Verification failed</h2>
              <p className="text-gray-400 mb-6">{message || 'The verification link is invalid or expired.'}</p>
            </div>
          )}

          {(status === 'error' || !token) && (
            <form onSubmit={handleResend} className="space-y-5">
              <div>
                <label htmlFor="resend-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="resend-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={resendStatus === 'loading'} className="btn-primary w-full py-3">
                {resendStatus === 'loading' ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendStatus === 'success' && (
                <p className="text-sm text-gray-400">
                  If the email exists, a new verification link has been sent.
                </p>
              )}
              {resendStatus === 'error' && (
                <p className="text-sm text-red-400">
                  Failed to send verification email. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
