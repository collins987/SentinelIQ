import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAnalyst } from '../context/AnalystContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles = ['analyst'] }: ProtectedRouteProps) {
  const router = useRouter();
  const { token, user } = useAnalyst();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!token) {
      // Not authenticated - redirect to login
      router.push('/');
      setIsLoading(false);
      return;
    }

    if (user && allowedRoles.includes(user.role)) {
      // Authenticated and authorized
      setIsAuthorized(true);
      setIsLoading(false);
    } else if (user) {
      // Authenticated but not authorized
      router.push('/unauthorized');
      setIsLoading(false);
    } else {
      // Still loading user info
      setIsLoading(false);
    }
  }, [token, user, router, allowedRoles]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#F8FAFC'
      }}>
        <div style={{
          fontSize: '1.125rem',
          color: '#475569'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect above
  }

  return <>{children}</>;
}
