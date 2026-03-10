import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const authBase = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch(`${authBase}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success to prevent email enumeration
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" style={{ height: 55, width: 'auto' }} />
          </div>
          <h1>SentinelIQ</h1>
          <p className="login-subtitle">Password Recovery</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Check Your Email
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>,
              you will receive a password reset link shortly.
            </p>
            <Link
              href="/"
              style={{
                fontSize: 13,
                color: 'var(--accent-cyan)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@sentineliq.local"
                required
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link
                href="/"
                style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                ← Back to Sign In
              </Link>
            </div>
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
