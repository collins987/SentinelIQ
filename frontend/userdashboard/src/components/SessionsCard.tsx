import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getSessions, revokeSession, SessionInfo } from '../services/api';

export default function SessionsCard() {
  const { token } = useUser();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const data = await getSessions(token);
      setSessions(data.sessions);
      setLoading(false);
    } catch {
      setError('Could not load sessions');
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [token]);

  const handleRevoke = async (id: string) => {
    if (!token) return;
    setRevokingId(id);
    try {
      await revokeSession(id, token);
      setMsg('Session revoked');
      fetchSessions();
    } catch {
      setMsg('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (device: string) => {
    const d = (device || '').toLowerCase();
    if (d.includes('mobile') || d.includes('iphone') || d.includes('android')) return '📱';
    if (d.includes('tablet') || d.includes('ipad')) return '📲';
    return '💻';
  };

  if (loading) return <div className="card"><h2>Active Sessions</h2><div className="loading-text">Loading sessions...</div></div>;
  if (error) return <div className="card"><h2>Active Sessions</h2><div className="error-container">{error}</div></div>;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>Active Sessions</h2>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
          {sessions.filter(s => !s.revoked).length} active
        </span>
      </div>

      {msg && <div className="status-success" style={{ marginBottom: 12 }}>{msg}</div>}

      {sessions.length === 0 ? (
        <div className="empty-state">No active sessions found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map(session => (
            <div key={session.id} className="activity-item" style={{ opacity: session.revoked ? 0.5 : 1, position: 'relative' }}>
              <div style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>{getDeviceIcon(typeof session.device_info === 'string' ? session.device_info : (session.device_info?.type || ''))}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                      {typeof session.device_info === 'string' ? session.device_info : (session.device_info?.name || session.device_info?.type || 'Unknown Device')}
                    </span>
                    {session.is_current && (
                      <span style={{
                        background: 'var(--color-success-bg)', color: 'var(--color-success)',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        Current
                      </span>
                    )}
                    {session.revoked && (
                      <span style={{
                        background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase',
                      }}>
                        Revoked
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <span>📍 {typeof session.location === 'string' ? session.location : (session.location?.city || session.location?.country || 'Unknown')}</span>
                    <span>🌐 {session.ip_address}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Started: {session.created_at ? new Date(session.created_at).toLocaleString() : 'N/A'}
                    {session.last_seen_at && ` · Last active: ${new Date(session.last_seen_at).toLocaleString()}`}
                  </div>
                </div>
              </div>
              {!session.is_current && !session.revoked && (
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                  style={{
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    color: 'var(--color-danger)', background: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
