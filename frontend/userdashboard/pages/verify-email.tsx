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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text, #111111)' }}>
            Invalid verification link
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #555555)', marginTop: 6 }}>
            This link is missing or expired. Request a new verification email below.
          </p>
        </div>
      );
    }

    if (status === 'loading' || status === 'idle') {
      return (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text, #111111)' }}>
            Verifying your email
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #555555)', marginTop: 6 }}>
            Please wait while we confirm your email address.
          </p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text, #111111)' }}>
            Email verified
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #555555)', marginTop: 6 }}>
            {message}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: 16,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--color-text, #111111)',
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
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text, #111111)' }}>
          Verification failed
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #555555)', marginTop: 6 }}>
          {message || 'The verification link is invalid or expired.'}
        </p>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg, #f7f7f5)',
        fontFamily: "var(--font-body, 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 20% 30%, var(--color-bg-warm, #e8e6e1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--color-bg-warm, #e8e6e1) 0%, transparent 50%)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 'var(--radius-lg, 12px)',
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              marginBottom: '1rem',
            }}
          >
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" style={{ width: 72, height: 72, objectFit: 'cover' }} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading, 'Fraunces', Georgia, serif)",
              fontSize: '1.85rem',
              fontWeight: 700,
              color: 'var(--color-text, #111111)',
              margin: 0,
            }}
          >
            Verify Your Email
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #555555)', fontSize: '0.88rem', marginTop: '0.4rem', fontWeight: 500 }}>
            Confirm your email to secure your account
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card, #f0eeeb)',
            border: '1px solid var(--color-border, #ddd9d2)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {renderBody()}

          {(status === 'error' || !token) && (
            <form onSubmit={handleResend} style={{ marginTop: 18 }}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="resend-email"
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--color-text, #111111)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Email address
                </label>
                <input
                  id="resend-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'var(--color-bg, #f7f7f5)',
                    border: '1px solid var(--color-border, #ddd9d2)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: 'var(--color-text, #111111)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={resendStatus === 'loading'}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  background: '#111111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: resendStatus === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: resendStatus === 'loading' ? 0.6 : 1,
                }}
              >
                {resendStatus === 'loading' ? 'Sending…' : 'Resend verification email'}
              </button>
              {resendStatus === 'success' && (
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary, #555555)', marginTop: 10 }}>
                  If the email exists, a new verification link has been sent.
                </p>
              )}
              {resendStatus === 'error' && (
                <p style={{ fontSize: 12, color: 'var(--color-danger, #c0392b)', marginTop: 10 }}>
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
