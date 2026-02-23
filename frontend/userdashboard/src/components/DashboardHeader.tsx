import React from 'react';

export default function DashboardHeader({ user, onLogout }: { user: any, onLogout: () => void }) {
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="dashboard-header">
      <div className="header-user-info">
        <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" style={{ height: 28, width: 28, borderRadius: 6, objectFit: 'cover' }} />
        <div className="header-text">
          <h1>Dashboard</h1>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="header-avatar">{initials}</div>
        <button onClick={onLogout} className="logout-btn">
          Sign Out
        </button>
      </div>
    </div>
  );
}
