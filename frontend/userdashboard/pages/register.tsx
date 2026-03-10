/**
 * Register Page — User Dashboard (Next.js)
 * Public self-registration for new users (always assigned "viewer" role).
 * Uses POST /auth/register, auto-logs in on success.
 * Warm light theme with inline styles matching userdashboard design.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../src/context/UserContext';
import { register } from '../src/services/api';

export default function RegisterPage() {
  const { setToken } = useUser();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Hydration fix: Only set greeting on client
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const hour = new Date().getHours();
    const g = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    setGreeting(g);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await register(firstName, lastName, email, password, orgId || undefined);
      setToken(res.access_token);
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed');
    } finally {
      setLoading(false);
    }
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
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box' as const,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--color-text-secondary, #555555)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
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
      {/* Warm subtle background gradients */}
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
        {/* Brand section */}
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
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--color-text, #111111)',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            SentinelIQ
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted, #999999)', marginTop: 4, fontWeight: 500 }}>
            {greeting ? `${greeting} — ` : ''}Create your account
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md, 10px)',
            border: '1px solid var(--color-border, #ddd9d2)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
            padding: '2rem 1.75rem',
          }}
        >
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text, #111)', marginBottom: 8 }}>
                Account created!
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted, #999)' }}>
                Verification email sent. Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    marginBottom: 16,
                    borderRadius: 'var(--radius-sm, 6px)',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Name fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>First name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #111111)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border, #ddd9d2)')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #111111)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border, #ddd9d2)')}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #111111)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border, #ddd9d2)')}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{ ...inputStyle, paddingRight: 42 }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #111111)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border, #ddd9d2)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'var(--color-text-muted, #999999)',
                      padding: 4,
                      lineHeight: 1,
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '\u{1F648}' : '\u{1F441}'}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted, #999)', marginTop: 4 }}>
                  Min 12 chars, 1 upper, 1 lower, 1 digit, 1 special character
                </p>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #111111)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border, #ddd9d2)')}
                />
              </div>

              {/* Organization ID */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  Organization ID <span style={{ fontWeight: 400, color: 'var(--color-text-muted, #999)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  placeholder="ORG-XXXX"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #111111)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border, #ddd9d2)')}
                />
              </div>

              {/* Submit */}
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
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }}
              >
                {loading ? (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ animation: 'spin 1s linear infinite' }}
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity={0.25} />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity={0.75} />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Sign in link */}
              <p
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--color-text-secondary, #555555)',
                  marginTop: '1.2rem',
                }}
              >
                Already have an account?{' '}
                <a
                  href="/"
                  style={{
                    color: 'var(--color-text, #111111)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Sign in
                </a>
              </p>
            </form>
          )}

          {/* Footer */}
          <p
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--color-text-muted, #999999)',
              marginTop: '1.4rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Protected by SentinelIQ Security
          </p>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
