import React from 'react';

interface AccountCompletionTrackerProps {
  profile: {
    mfa_enabled?: boolean;
    email_verified?: boolean;
    phone?: string;
    phone_verified?: boolean;
    trust_level?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  onNavigate: (section: string) => void;
}

export default function AccountCompletionTracker({ profile, onNavigate }: AccountCompletionTrackerProps) {
  if (!profile) return null;

  const steps = [
    {
      key: 'profile',
      label: 'Profile Created',
      description: 'Account registered and active',
      done: true,
      action: null,
      icon: '👤',
    },
    {
      key: 'email',
      label: 'Email Verified',
      description: profile.email_verified ? 'Email address confirmed' : 'Verify your email to secure your account',
      done: !!profile.email_verified,
      action: null,
      icon: '✉️',
    },
    {
      key: 'mfa',
      label: 'MFA Enabled',
      description: profile.mfa_enabled ? 'Two-factor authentication active' : 'Add an extra layer of protection',
      done: !!profile.mfa_enabled,
      action: () => onNavigate('Security'),
      actionLabel: 'Enable MFA',
      icon: '🔐',
    },
    {
      key: 'phone',
      label: 'Phone Verified',
      description: profile.phone_verified
        ? 'Phone number confirmed'
        : profile.phone
          ? 'Verify your phone number'
          : 'Add and verify a phone number',
      done: !!profile.phone_verified,
      action: () => onNavigate('Security'),
      actionLabel: profile.phone ? 'Verify Phone' : 'Add Phone',
      icon: '📱',
    },
    {
      key: 'trusted',
      label: 'Trusted Status',
      description: profile.trust_level === 'trusted'
        ? 'Account fully trusted'
        : 'Complete all steps to earn trusted status',
      done: profile.trust_level === 'trusted',
      action: null,
      icon: '🛡️',
    },
  ];

  const completed = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);

  // SVG ring config
  const ringSize = 80;
  const strokeW = 7;
  const radius = (ringSize - strokeW) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  const ringColor = pct === 100 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="card completion-tracker">
      <div className="completion-header">
        <div className="completion-ring-section">
          <div style={{ position: 'relative', width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" stroke="var(--color-ring-bg)" strokeWidth={strokeW} opacity={0.4}
              />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" stroke={ringColor} strokeWidth={strokeW}
                strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: ringColor, lineHeight: 1 }}>{pct}%</span>
            </div>
          </div>

          <div className="completion-summary">
            <h2 style={{ border: 'none', padding: 0, fontSize: '0.9rem', fontWeight: 700 }}>
              Account Setup
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
              {completed === total
                ? 'All steps complete — your account is fully secured!'
                : `${completed} of ${total} steps complete`}
            </p>
          </div>
        </div>
      </div>

      <div className="completion-steps">
        {steps.map((step, i) => (
          <div key={step.key} className={`completion-step ${step.done ? 'done' : 'pending'}`}>
            <div className="completion-step-indicator">
              {step.done ? (
                <span className="completion-checkmark">✓</span>
              ) : (
                <span className="completion-number">{i + 1}</span>
              )}
              {i < steps.length - 1 && <div className={`completion-connector ${steps[i + 1].done || step.done ? 'active' : ''}`} />}
            </div>

            <div className="completion-step-content">
              <div className="completion-step-header">
                <span className="completion-step-icon">{step.icon}</span>
                <span className={`completion-step-label ${step.done ? 'done' : ''}`}>{step.label}</span>
              </div>
              <p className="completion-step-desc">{step.description}</p>
            </div>

            {!step.done && step.action && (
              <button className="completion-action-btn" onClick={step.action}>
                {step.actionLabel} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
