import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getAlerts, markAlertRead, dismissAlert, AlertInfo } from '../services/api';

export default function SecurityAlertsCard() {
  const { token } = useUser();
  const [alerts, setAlerts] = useState<AlertInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    if (!token) return;
    try {
      const data = await getAlerts(token);
      setAlerts(data.alerts);
      setLoading(false);
    } catch {
      setError('Could not load alerts');
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [token]);

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      await markAlertRead(id, token);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch { /* ignore */ }
  };

  const handleDismiss = async (id: string) => {
    if (!token) return;
    try {
      await dismissAlert(id, token);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const getSeverityStyle = (severity: string) => {
    const styles: Record<string, { bg: string; color: string; icon: string }> = {
      critical: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', icon: '🔴' },
      high: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', icon: '🟠' },
      medium: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', icon: '🟡' },
      low: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', icon: '🟢' },
      info: { bg: 'var(--color-primary-bg)', color: 'var(--color-primary)', icon: '🔵' },
    };
    return styles[severity] || styles.info;
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (loading) return <div className="card"><div className="card-header-row"><div className="card-header-copy"><h2>Security Alerts</h2><p className="card-subtitle">Your latest account warnings</p></div></div><div className="loading-text">Loading alerts...</div></div>;
  if (error) return <div className="card"><div className="card-header-row"><div className="card-header-copy"><h2>Security Alerts</h2><p className="card-subtitle">Your latest account warnings</p></div></div><div className="error-container">{error}</div></div>;

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-header-copy">
          <h2>Security Alerts</h2>
          <p className="card-subtitle">Your latest account warnings</p>
        </div>
        {unreadCount > 0 && <span className="card-badge" style={{ color: 'var(--color-danger)' }}>{unreadCount} unread</span>}
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>No security alerts. Your account looks secure!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map(alert => {
            const sev = getSeverityStyle(alert.severity);
            return (
              <div key={alert.id} className="activity-item" style={{
                borderLeft: `3px solid ${sev.color}`,
                opacity: alert.is_read ? 0.7 : 1,
                flexDirection: 'column', alignItems: 'stretch', gap: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span>{sev.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: alert.is_read ? 500 : 700, color: 'var(--color-text)' }}>
                          {alert.title}
                        </span>
                        <span style={{
                          background: sev.bg, color: sev.color, padding: '2px 8px',
                          borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        }}>
                          {alert.severity}
                        </span>
                        {!alert.is_read && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {alert.message}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'N/A'} · {alert.alert_type}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!alert.is_read && (
                      <button onClick={() => handleMarkRead(alert.id)}
                        style={{
                          padding: '4px 10px', fontSize: 11, fontWeight: 600,
                          color: 'var(--color-primary)', background: 'var(--color-primary-bg)',
                          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}>
                        Mark Read
                      </button>
                    )}
                    <button onClick={() => handleDismiss(alert.id)}
                      style={{
                        padding: '4px 10px', fontSize: 11, fontWeight: 600,
                        color: 'var(--color-text-muted)', background: 'none',
                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
