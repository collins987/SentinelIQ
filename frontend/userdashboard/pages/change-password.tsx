import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../src/context/UserContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { token, logout } = useUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password strength checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]~`/\\;']/.test(newPassword),
  };
  const allChecks = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!allChecks) {
      setError('Password does not meet strength requirements');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password change failed');
      setSuccess(true);
      // Log out after 3 seconds
      setTimeout(() => {
        logout();
        router.push('/');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login if not authenticated
  if (!token) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
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
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--color-text, #111111)',
              margin: 0,
            }}
          >
            Change Password
          </h1>
          <p style={{ color: 'var(--color-text-secondary, #555555)', fontSize: '0.88rem', marginTop: '0.4rem', fontWeight: 500 }}>
            Update your account password
          </p>
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
                Password Changed
              </h2>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                Your password has been updated successfully.
              </p>
              <p style={{ fontSize: 12, color: '#999' }}>
                You will be redirected to sign in…
              </p>
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
                <label htmlFor="current-password" style={labelStyle}>Current Password</label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label htmlFor="new-password" style={labelStyle}>New Password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label htmlFor="confirm-password" style={labelStyle}>Confirm New Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Strength indicators */}
              {newPassword.length > 0 && (
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

              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'rgba(243,156,18,0.06)',
                  border: '1px solid rgba(243,156,18,0.2)',
                  marginBottom: '1.2rem',
                  fontSize: 12,
                  color: '#b7791f',
                  fontWeight: 600,
                }}
              >
                ⚠ Changing your password will log you out of all devices.
              </div>

              <button
                type="submit"
                disabled={loading || !allChecks || !currentPassword}
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
                  cursor: loading || !allChecks || !currentPassword ? 'not-allowed' : 'pointer',
                  opacity: loading || !allChecks || !currentPassword ? 0.6 : 1,
                }}
              >
                {loading ? 'Updating…' : 'Change Password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 13,
                    color: 'var(--color-text-secondary, #555)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ← Back to Dashboard
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
