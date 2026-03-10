/**
 * Register Page — Analyst Dashboard (Next.js)
 * Public self-registration for new users (always assigned "viewer" role).
 * Uses POST /auth/register, auto-logs in on success.
 * SOC dark theme matching analyst dashboard design.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAnalyst } from '../src/context/AnalystContext';
import { registerAnalyst } from '../src/services/api';

export default function RegisterPage() {
  const { setToken } = useAnalyst();
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
      const res = await registerAnalyst(firstName, lastName, email, password, orgId || undefined);
      setToken(res.access_token);
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed');
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
          <p className="login-subtitle">Create Analyst Account</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--accent, #00ff88)' }}>&#10003;</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #e0e0e0)', marginBottom: 8 }}>
              Account created!
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #666)' }}>
              Verification email sent. Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}

            {/* Name fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@sentineliq.local"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="new-password"
                minLength={12}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted, #666)', marginTop: 4, display: 'block' }}>
                Min 12 chars, 1 upper, 1 lower, 1 digit, 1 special character
              </span>
            </div>

            <div className="form-group">
              <label>Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>
                Organization ID{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted, #666)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="ORG-XXXX"
              />
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <a
                href="/"
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                Already have an account? Sign in
              </a>
            </div>
          </form>
        )}

        <div className="login-footer">
          <span>Authorized personnel only</span>
          <span>&bull;</span>
          <span>All actions are audited</span>
        </div>
      </div>
    </div>
  );
}
