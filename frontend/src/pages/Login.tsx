import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { setCredentials, setLoading } from '../features/authSlice';
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Decode JWT token payload (base64url decoding)
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64url to Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    dispatch(setLoading(true));
    
    try {
      // Use the correct backend endpoint /auth/login via /api proxy
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Invalid email or password');
      }
      
      // The /auth/login endpoint returns user info directly
      const user = data.user || {
        id: '',
        email: email,
        first_name: email.split('@')[0],
        last_name: '',
        role: 'viewer',
      };
      
      // Fallback: If user info not in response, decode JWT
      if (!data.user && data.access_token) {
        const tokenPayload = decodeJwtPayload(data.access_token);
        if (tokenPayload) {
          user.id = (tokenPayload.sub as string) || '';
          user.role = (tokenPayload.role as string) || 'viewer';
          user.email = (tokenPayload.email as string) || email;
        }
      }
      
      dispatch(setCredentials({
        token: data.access_token,
        refreshToken: data.refresh_token || '',
        user: user,
      }));
      
      // Route based on user role
      if (user.role === 'admin') {
        navigate('/overview');
      } else {
        navigate('/my-dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-dashboard-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sentinel-500 to-sentinel-700 rounded-2xl mb-4">
            <ShieldCheckIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SentinelIQ</h1>
          <p className="text-gray-400 mt-2">Security Dashboard</p>
        </div>
        
        {/* Login Form Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white text-center mb-6">
            Sign in to your account
          </h2>
          
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-400">
            Protected by SentinelIQ Security
          </p>
        </div>
        
        {/* Demo credentials hint */}
        <div className="mt-6 p-4 rounded-lg bg-sentinel-500/10 border border-sentinel-500/30">
          <p className="text-sm text-sentinel-400 text-center">
            <strong>Demo Credentials:</strong><br />
            Admin: admin@sentineliq.local / Admin@SentinelIQ#2025<br />
            Test User: user@test.sentineliq.local / UserTest@123<br />
            <span className="text-xs text-gray-500">(DEV_MODE must be enabled for test user)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
