import { useRouter } from 'next/router';
import styles from '../src/styles/Unauthorized.module.css';

export default function Unauthorized() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>🔒</span>
        </div>
        
        <h1 className={styles.title}>Access Denied</h1>
        
        <p className={styles.message}>
          You do not have permission to access this page. Your current role does not allow access to this resource.
        </p>

        <p className={styles.subtitle}>
          If you believe this is an error, please contact your administrator.
        </p>

        <div className={styles.actions}>
          <button 
            className={styles.primaryButton}
            onClick={() => {
              // Clear session and redirect to welcome
              localStorage.removeItem('token');
              window.location.href = 'http://localhost:5000/welcome';
            }}
          >
            Return to Welcome Page
          </button>
          <button 
            className={styles.secondaryButton}
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>

        <div className={styles.errorCode}>
          Error Code: 403 Forbidden
        </div>
      </div>
    </div>
  );
}
