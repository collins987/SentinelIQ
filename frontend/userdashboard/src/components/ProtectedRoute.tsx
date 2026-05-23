import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles = ['viewer', 'user'] }: ProtectedRouteProps) {
  const router = useRouter();
  const { token, user, isReady, isProfileLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isReady) {
      setIsLoading(true);
      return;
    }

    if (!token) {
      router.push('/');
      setIsLoading(false);
      return;
    }

    if (isProfileLoading || !user) {
      setIsLoading(true);
      return;
    }

    if (allowedRoles.includes(user.role)) {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    router.push('/unauthorized');
    setIsLoading(false);
  }, [token, user, router, allowedRoles, isReady, isProfileLoading]);

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
