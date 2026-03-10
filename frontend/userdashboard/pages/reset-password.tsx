import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password strength checks
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
      const res = await fetch(`${API_BASE}/auth/password-reset/confirm`, {
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg, #f7f7f5)',
          fontFamily: "var(--font-body, 'Manrope', sans-serif)",
          padding: '1.5rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2
            style={{
              fontFamily: "var(--font-heading, 'Fraunces', Georgia, serif)",
              fontSize: '1.3rem',
              fontWeight: 700,
              color: 'var(--color-text, #111111)',
              marginBottom: 8,
            }}
          >
            Invalid Reset Link
          </h2>
          <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 700, color: '#111', textDecoration: 'underline' }}>
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-card, #f0eeeb)',
    border: '1px solid var(--color-border, #ddd9d2)',
    borderRadius: 'var(--radius-lg, 12px)',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--color-text, #111111)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const inputStyle: React.CSSProperties = {
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
              borderRadius: 12,
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
            Set New Password
          </h1>
        </div>

        <div style={cardStyle}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2
                style={{
                  fontFamily: "var(--font-heading, 'Fraunces', Georgia, serif)",
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--color-text, #111111)',
                  marginBottom: 8,
                }}
              >
                Password Updated
              </h2>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Link
                href="/"
                style={{
                  display: 'inline-block',
                  padding: '10px 28px',
                  background: '#111',
                  color: '#fff',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 6,
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

              <div style={{ marginBottom: '1.2rem' }}>
                <label htmlFor="new-password" style={labelStyle}>New Password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label htmlFor="confirm-password" style={labelStyle}>Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Strength indicators */}
              {password.length > 0 && (
                <div style={{ marginBottom: '1.2rem' }}>
                  {[
                    { key: 'length', label: 'At least 8 characters' },
                    { key: 'uppercase', label: 'One uppercase letter' },
                    { key: 'lowercase', label: 'One lowercase letter' },
                    { key: 'digit', label: 'One digit' },
                    { key: 'special', label: 'One special character' },
                  ].map(({ key, label }) => {
                    const met = checks[key as keyof typeof checks];
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: met ? '#27ae60' : '#999' }}>{met ? '✓' : '○'}</span>
                        <span style={{ fontSize: 12, color: met ? '#27ae60' : '#999' }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !allChecks}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  background: '#111111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: loading || !allChecks ? 'not-allowed' : 'pointer',
                  opacity: loading || !allChecks ? 0.6 : 1,
                }}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
