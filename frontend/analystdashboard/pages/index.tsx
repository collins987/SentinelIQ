import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAnalyst } from '../src/context/AnalystContext';
import { loginAnalyst } from '../src/services/api';

export default function LoginPage() {
  const { setToken } = useAnalyst();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginAnalyst(email, password);
      setToken(res.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed');
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
          <p className="login-subtitle">Analyst Investigation Console</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="login-error">{error}</div>}

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

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <span>Authorized personnel only</span>
          <span>•</span>
          <span>All actions are audited</span>
        </div>
      </div>
    </div>
  );
}
