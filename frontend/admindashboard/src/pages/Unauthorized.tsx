import { useNavigate } from 'react-router-dom';
import styles from './Unauthorized.module.css';


export default function Unauthorized() {
  const navigate = useNavigate();

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
            onClick={() => navigate('/welcome')}
          >
            Return to Welcome Page
          </button>
          <button 
            className={styles.secondaryButton}
            onClick={() => navigate(-1)}
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
