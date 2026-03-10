import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useAnalyst } from '../src/context/AnalystContext';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { token, logout } = useAnalyst();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const authBase = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

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
      const res = await fetch(`${authBase}/auth/change-password`, {
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

  // Redirect if not authenticated
  if (!token) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/sentineliq-logo.jpeg" alt="SentinelIQ" style={{ height: 55, width: 'auto' }} />
          </div>
          <h1>SentinelIQ</h1>
          <p className="login-subtitle">Change Password</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Password Changed
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Your password has been updated successfully.
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              You will be redirected to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Strength indicators */}
            {newPassword.length > 0 && (
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

            {/* Warning */}
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 12,
                color: '#eab308',
                fontWeight: 600,
              }}
            >
              ⚠ Changing your password will log you out of all devices.
            </div>

            <button
              type="submit"
              disabled={loading || !allChecks || !currentPassword}
              className="login-btn"
            >
              {loading ? 'Updating…' : 'Change Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--text-muted)',
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

        <div className="login-footer">
          <span>Authorized personnel only</span>
          <span>•</span>
          <span>All actions are audited</span>
        </div>
      </div>
    </div>
  );
}
