import { useUser } from '../context/UserContext';

export default function ProfileCard({ user }: { user: any }) {
  if (!user) return null;
  return (
    <div className="card" style={{ minHeight: 140 }}>
      <h2 style={{ marginBottom: 18 }}>Profile</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        alignItems: 'center',
      }}>
        <div style={{ color: '#888', fontWeight: 500 }}>Name</div>
        <div style={{ fontWeight: 700 }}>{user.name}</div>
        <div style={{ color: '#888', fontWeight: 500 }}>Email</div>
        <div style={{ fontWeight: 700 }}>{user.email}</div>
        <div style={{ color: '#888', fontWeight: 500 }}>Role</div>
        <div style={{ fontWeight: 700 }}>{user.role}</div>
      </div>
    </div>
  );
}
