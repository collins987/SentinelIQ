import { useUser } from '../context/UserContext';

export default function ProfileCard({ user }: { user: any }) {
  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Calculate member duration
  const memberSince = user.created_at ? new Date(user.created_at) : null;
  const memberDuration = memberSince ? (() => {
    const now = new Date();
    const diffMs = now.getTime() - memberSince.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days < 1) return 'Today';
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}mo` : `${years} year${years !== 1 ? 's' : ''}`;
  })() : null;

  const trustConfig: Record<string, { bg: string; color: string; label: string }> = {
    trusted: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: '✓ Trusted' },
    under_review: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: '⏳ Under Review' },
    restricted: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', label: '⛔ Restricted' },
    unknown: { bg: 'var(--color-bg-card-inner)', color: 'var(--color-text-muted)', label: '— Unknown' },
  };
  const trust = trustConfig[user.trust_level] || trustConfig.unknown;

  return (
    <div className="card profile-card-enhanced">
      {/* Avatar header section */}
      <div className="profile-hero">
        <div className="profile-avatar-large">
          {initials}
        </div>
        <div className="profile-hero-info">
          <h3 className="profile-hero-name">{user.name}</h3>
          <span className="profile-hero-role">{user.role}</span>
          <div className="profile-badges">
            <span className="profile-badge" style={{ background: trust.bg, color: trust.color }}>
              {trust.label}
            </span>
            {user.email_verified && (
              <span className="profile-badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                ✓ Email
              </span>
            )}
            {user.mfa_enabled && (
              <span className="profile-badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                ✓ MFA
              </span>
            )}
            {user.phone_verified && (
              <span className="profile-badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                ✓ Phone
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="profile-grid">
        <div className="profile-field">
          <span className="profile-label">Email</span>
          <span className="profile-value">{user.email}</span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Phone</span>
          <span className="profile-value">
            {user.phone || '—'}
            {user.phone && (
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700,
                color: user.phone_verified ? 'var(--color-success)' : 'var(--color-warning)',
              }}>
                {user.phone_verified ? '✓' : '⏳'}
              </span>
            )}
          </span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Role</span>
          <span className="profile-value" style={{ textTransform: 'capitalize' }}>{user.role}</span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Member Since</span>
          <span className="profile-value">
            {memberSince
              ? `${memberSince.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${memberDuration})`
              : '—'}
          </span>
        </div>
        {user.last_login_at && (
          <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
            <span className="profile-label">Last Login</span>
            <span className="profile-value">
              {new Date(user.last_login_at).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        )}
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
