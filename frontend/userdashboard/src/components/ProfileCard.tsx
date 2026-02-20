import { useUser } from '../context/UserContext';

export default function ProfileCard({ user }: { user: any }) {
  if (!user) return null;
  return (
    <div className="card">
      <h2>Profile</h2>
      <div className="profile-grid">
        <div className="profile-field">
          <span className="profile-label">Name</span>
          <span className="profile-value">{user.name}</span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Email</span>
          <span className="profile-value">{user.email}</span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Role</span>
          <span className="profile-value" style={{ textTransform: 'capitalize' }}>{user.role}</span>
        </div>
        {user.department && (
          <div className="profile-field">
            <span className="profile-label">Department</span>
            <span className="profile-value">{user.department}</span>
          </div>
        )}
      </div>
    </div>
  );
}
