import React from 'react';


interface UserActivityCardProps {
  activity: {
    failed_logins_24h: number;
    recent_actions: Array<{ action: string; target: string | null; timestamp: string | null }>;
  };
  session: {
    last_login_at: string | null;
    last_login_ip: string | null;
    last_device_info: Record<string, any> | null;
    active_sessions: number;
  };
}

export default function UserActivityCard({ activity, session }: UserActivityCardProps) {
  // Render device info as a string if it's an object and not empty
  let deviceInfoDisplay = 'Unknown';
  if (session.last_device_info && typeof session.last_device_info === 'object' && Object.keys(session.last_device_info).length > 0) {
    deviceInfoDisplay = Object.entries(session.last_device_info)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  } else if (typeof session.last_device_info === 'string' && session.last_device_info) {
    deviceInfoDisplay = session.last_device_info;
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 18 }}>User Activity & Session</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 18,
      }}>
        <div style={{ background: '#f7f8fa', borderRadius: 8, padding: 12 }}>
          <div style={{ color: '#888', fontSize: 13 }}>Active Sessions</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{session.active_sessions}</div>
        </div>
        <div style={{ background: '#f7f8fa', borderRadius: 8, padding: 12 }}>
          <div style={{ color: '#888', fontSize: 13 }}>Last Login</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{session.last_login_at ? new Date(session.last_login_at).toLocaleString() : 'Never'}</div>
        </div>
        <div style={{ background: '#f7f8fa', borderRadius: 8, padding: 12 }}>
          <div style={{ color: '#888', fontSize: 13 }}>Last IP</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{session.last_login_ip || 'N/A'}</div>
        </div>
        <div style={{ background: '#f7f8fa', borderRadius: 8, padding: 12 }}>
          <div style={{ color: '#888', fontSize: 13 }}>Device</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{deviceInfoDisplay}</div>
        </div>
        <div style={{ background: '#f7f8fa', borderRadius: 8, padding: 12 }}>
          <div style={{ color: '#888', fontSize: 13 }}>Failed Logins (24h)</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{activity.failed_logins_24h}</div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: '18px 0 8px 0' }}>Recent Actions</h3>
        {activity.recent_actions && activity.recent_actions.length === 0 ? (
          <div style={{ color: '#888' }}>No recent activity.</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 10,
          }}>
            {activity.recent_actions && activity.recent_actions.map((a, i) => {
              const targetDisplay = typeof a.target === 'string' ? a.target : (a.target ? JSON.stringify(a.target) : null);
              return (
                <div key={i} style={{
                  background: '#f3f4f6',
                  borderRadius: 6,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 15,
                }}>
                  <span style={{ fontWeight: 600, color: '#2563eb', marginRight: 8 }}>{(a.action || '').replace(/_/g, ' ')}</span>
                  {targetDisplay && <span style={{ color: '#888', marginRight: 8 }}>→ {targetDisplay}</span>}
                  {a.timestamp && <span style={{ color: '#888', fontSize: 13 }}>{new Date(a.timestamp).toLocaleString()}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
