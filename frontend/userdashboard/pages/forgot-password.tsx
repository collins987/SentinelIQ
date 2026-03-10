import { useState, FormEvent } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Request failed');
      }
      setSent(true);
    } catch (err) {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
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
        {/* Brand */}
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
            Reset Password
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #555555)', fontSize: '0.88rem', marginTop: '0.4rem', fontWeight: 500 }}>
            We&apos;ll send you a link to reset your password
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--color-bg-card, #f0eeeb)',
            border: '1px solid var(--color-border, #ddd9d2)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
              <h2
                style={{
                  fontFamily: "var(--font-heading, 'Fraunces', Georgia, serif)",
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--color-text, #111111)',
                  marginBottom: 8,
                }}
              >
                Check Your Email
              </h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #555555)', lineHeight: 1.6 }}>
                If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
              </p>
              <Link
                href="/"
                style={{
                  display: 'inline-block',
                  marginTop: 24,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--color-text, #111111)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    background: 'rgba(192,57,43,0.06)',
                    border: '1px solid rgba(192,57,43,0.2)',
                    marginBottom: '1.2rem',
                    fontSize: 13,
                    color: '#c0392b',
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="email"
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
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                disabled={loading}
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
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
                <Link
                  href="/"
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary, #555555)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
