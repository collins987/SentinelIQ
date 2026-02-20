import React from 'react';

export default function DashboardHeader({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: -1, margin: 0 }}>Welcome, {user?.name?.split(' ')[0] || 'User'}!</h1>
        <div style={{ color: '#888', fontWeight: 500, fontSize: 16 }}>{user?.email}</div>
      </div>
      <button onClick={onLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 22px', fontWeight: 600, fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        Logout
      </button>
    </div>
  );
}
