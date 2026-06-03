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
      <div className="card-header-row">
        <div className="card-header-copy">
          <h2>Activity & Sessions</h2>
          <p className="card-subtitle">Recent usage signals and session health</p>
        </div>
        <span className="card-badge">{session.active_sessions} active</span>
      </div>
      <div className="activity-stats">
        <div className="activity-stat">
          <div className="activity-stat-label">Active Sessions</div>
          <div className="activity-stat-value">{session.active_sessions}</div>
        </div>
        <div className="activity-stat">
          <div className="activity-stat-label">Last Login</div>
          <div className="activity-stat-value">{session.last_login_at ? new Date(session.last_login_at).toLocaleString() : 'Never'}</div>
        </div>
        <div className="activity-stat">
          <div className="activity-stat-label">Last IP</div>
          <div className="activity-stat-value">{session.last_login_ip || 'N/A'}</div>
        </div>
        <div className="activity-stat">
          <div className="activity-stat-label">Device</div>
          <div className="activity-stat-value" style={{ fontSize: 13 }}>{deviceInfoDisplay}</div>
        </div>
        <div className="activity-stat">
          <div className="activity-stat-label">Failed Logins (24h)</div>
          <div className="activity-stat-value" style={{ color: activity.failed_logins_24h > 0 ? 'var(--color-danger)' : undefined }}>
            {activity.failed_logins_24h}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, letterSpacing: '-0.2px' }}>
        Recent Actions
      </h3>
      {activity.recent_actions && activity.recent_actions.length === 0 ? (
        <div className="empty-state">No recent activity.</div>
      ) : (
        <div className="activity-list">
          {activity.recent_actions && activity.recent_actions.map((a, i) => {
            const targetDisplay = typeof a.target === 'string' ? a.target : (a.target ? JSON.stringify(a.target) : null);
            return (
              <div key={i} className="activity-item">
                <span className="activity-dot" />
                <span className="activity-action">{(a.action || '').replace(/_/g, ' ')}</span>
                {targetDisplay && <span className="activity-target">→ {targetDisplay}</span>}
                {a.timestamp && <span className="activity-time">{new Date(a.timestamp).toLocaleString()}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
