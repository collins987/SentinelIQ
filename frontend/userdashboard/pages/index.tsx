import { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../src/context/UserContext';
import { login } from '../src/services/api';

export default function LoginPage() {
  const { setToken } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(email, password);
      setToken(res.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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
        {/* ── Brand section ── */}
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
            <img
              src="/sentineliq-logo.jpeg"
              alt="SentinelIQ"
              style={{ width: 72, height: 72, objectFit: 'cover' }}
            />
          </div>

          <h1
            style={{
              fontFamily: "var(--font-heading, 'Fraunces', Georgia, serif)",
              fontSize: '1.85rem',
              fontWeight: 700,
              color: 'var(--color-text, #111111)',
              margin: 0,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}
          >
            Welcome to SentinelIQ
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary, #555555)',
              fontSize: '0.88rem',
              marginTop: '0.4rem',
              fontWeight: 500,
            }}
          >
            {greeting}, sign in to access your dashboard
          </p>
        </div>

        {/* ── Login card ── */}
        <div
          style={{
            background: 'var(--color-bg-card, #f0eeeb)',
            border: '1px solid var(--color-border, #ddd9d2)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Error */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-danger-bg, rgba(192,57,43,0.06))',
                border: '1px solid rgba(192,57,43,0.2)',
                marginBottom: '1.2rem',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠</span>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-danger, #c0392b)',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label
                htmlFor="login-email"
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
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #111111)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border, #ddd9d2)')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="login-password"
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
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 42px 11px 14px',
                    background: 'var(--color-bg, #f7f7f5)',
                    border: '1px solid var(--color-border, #ddd9d2)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: 'var(--color-text, #111111)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                    boxSizing: 'border-box',
                  }}
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
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
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
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer tag */}
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

        {/* ── Footer branding ── */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-muted, #999999)',
            marginTop: '1.5rem',
            fontWeight: 500,
          }}
        >
          &copy; {new Date().getFullYear()} SentinelIQ. All rights reserved.
        </p>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
