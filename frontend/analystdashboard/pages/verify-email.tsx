import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const authBase = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token || Array.isArray(token)) return;
    setStatus('loading');
    fetch(`${authBase}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    })
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
  }, [token, authBase]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setResendStatus('loading');
    try {
      await fetch(`${authBase}/auth/verify-email/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendStatus('success');
    } catch {
      setResendStatus('error');
    }
  };

  const renderBody = () => {
    if (!token) {
      return (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Invalid verification link
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            This link is missing or expired. You can request a new verification email below.
          </p>
        </div>
      );
    }

    if (status === 'loading' || status === 'idle') {
      return (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Verifying your email
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            Please wait while we confirm your email address.
          </p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: 44, marginBottom: 12, color: 'var(--accent-green, #10b981)' }}>
            ✓
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Email verified
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            {message}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: 16,
              fontSize: 13,
              color: 'var(--accent-cyan)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Continue to sign in
          </Link>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          Verification failed
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
          {message || 'The verification link is invalid or expired.'}
        </p>
      </div>
    );
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" style={{ height: 55, width: 'auto' }} />
          </div>
          <h1>SentinelIQ</h1>
          <p className="login-subtitle">Analyst Verification</p>
        </div>

        {renderBody()}

        {(status === 'error' || !token) && (
          <form onSubmit={handleResend} className="login-form" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@sentineliq.local"
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={resendStatus === 'loading'}>
              {resendStatus === 'loading' ? 'Sending...' : 'Resend verification email'}
            </button>
            {resendStatus === 'success' && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                If the email exists, a new verification link has been sent.
              </div>
            )}
            {resendStatus === 'error' && (
              <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 8 }}>
                Failed to send verification email. Please try again.
              </div>
            )}
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
