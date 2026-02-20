import { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../src/context/UserContext';
import { login } from '../src/services/api';
import Image from 'next/image';

export default function LoginPage() {
  const { setToken } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f3f4f6' }}>
      {/* Header */}
      <header style={{ padding: '24px 0', textAlign: 'center', background: '#2563eb', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>SentinelIQ User Dashboard</h1>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 32 }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Image src="/sentineliq-logo.png" alt="SentinelIQ Logo" width={150} height={80} />
          </div>
          <h2 style={{ marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>Welcome to SentinelIQ</h2>
          <p style={{ marginBottom: 24, textAlign: 'center', color: '#374151' }}>
            Securely access your personalized dashboard. Please log in to continue.
          </p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
            <button
              type="submit"
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '16px 0', textAlign: 'center', background: '#2563eb', color: '#fff' }}>
        <small>&copy; {new Date().getFullYear()} SentinelIQ. All rights reserved.</small>
      </footer>
    </div>
  );
}
