import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const authBase = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]~`/\\;']/.test(password),
  };
  const allChecks = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!allChecks) {
      setError('Password does not meet strength requirements');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${authBase}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reset failed');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Invalid Reset Link
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            style={{ fontSize: 13, color: 'var(--accent-cyan)', textDecoration: 'underline' }}
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" style={{ height: 55, width: 'auto' }} />
          </div>
          <h1>SentinelIQ</h1>
          <p className="login-subtitle">Set New Password</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Password Updated
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link
              href="/"
              className="login-btn"
              style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 28px' }}
            >
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Strength indicators */}
            {password.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  { key: 'length', label: 'At least 8 characters' },
                  { key: 'uppercase', label: 'One uppercase letter' },
                  { key: 'lowercase', label: 'One lowercase letter' },
                  { key: 'digit', label: 'One digit' },
                  { key: 'special', label: 'One special character' },
                ].map(({ key, label }) => {
                  const met = checks[key as keyof typeof checks];
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: met ? '#22c55e' : 'var(--text-muted)' }}>
                        {met ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: 12, color: met ? '#22c55e' : 'var(--text-muted)' }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button type="submit" disabled={loading || !allChecks} className="login-btn">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="login-footer">
          <span>Authorized personnel only</span>
          <span>•</span>
          <span>All actions are audited</span>
        </div>
      </div>
    </div>
  );
}
