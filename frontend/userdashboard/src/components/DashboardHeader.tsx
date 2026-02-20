import React from 'react';

export default function DashboardHeader({ user, onLogout }: { user: any, onLogout: () => void }) {
  const firstName = user?.name?.split(' ')[0] || 'User';
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="dashboard-header">
      <div className="header-user-info">
        <div className="header-avatar">{initials}</div>
        <div className="header-text">
          <h1>Welcome back, {firstName}!</h1>
          <p>{user?.email || 'Your security overview at a glance'}</p>
        </div>
      </div>
      <button onClick={onLogout} className="logout-btn">
        <span>↗</span> Logout
      </button>
    </div>
  );
}
