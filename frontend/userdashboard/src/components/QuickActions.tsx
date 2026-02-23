import React from 'react';

interface QuickActionsProps {
  profile: {
    mfa_enabled?: boolean;
    phone?: string;
    phone_verified?: boolean;
    email_verified?: boolean;
  } | null;
  loansSummary: {
    active_loans?: number;
    total_outstanding?: number;
    next_due_date?: string | null;
  } | null;
  alertsSummary: { unread?: number } | null;
  onNavigate: (section: string) => void;
}

export default function QuickActions({ profile, loansSummary, alertsSummary, onNavigate }: QuickActionsProps) {
  const actions: Array<{
    label: string;
    icon: string;
    section: string;
    highlight?: boolean;
    description: string;
    color: string;
  }> = [];

  // Contextual actions — show what matters most
  const unread = alertsSummary?.unread ?? 0;
  if (unread > 0) {
    actions.push({
      label: `${unread} Alert${unread !== 1 ? 's' : ''}`,
      icon: '🔔',
      section: 'Security',
      highlight: true,
      description: 'Review security alerts',
      color: 'var(--color-danger)',
    });
  }

  if (!profile?.mfa_enabled) {
    actions.push({
      label: 'Enable MFA',
      icon: '🔐',
      section: 'Security',
      description: 'Secure your account',
      color: 'var(--color-warning)',
    });
  }

  if (!profile?.phone_verified) {
    actions.push({
      label: profile?.phone ? 'Verify Phone' : 'Add Phone',
      icon: '📱',
      section: 'Security',
      description: 'Phone verification',
      color: 'var(--color-warning)',
    });
  }

  if ((loansSummary?.total_outstanding ?? 0) > 0) {
    actions.push({
      label: 'Make Payment',
      icon: '💳',
      section: 'Loans',
      description: `Ksh.${(loansSummary?.total_outstanding ?? 0).toLocaleString()} outstanding`,
      color: 'var(--color-warning)',
    });
  }

  // Always-available actions
  actions.push({
    label: 'View Sessions',
    icon: '🖥️',
    section: 'Sessions',
    description: 'Manage active sessions',
    color: 'var(--color-accent)',
  });

  actions.push({
    label: 'Risk Analysis',
    icon: '📊',
    section: 'Risk',
    description: 'Detailed risk breakdown',
    color: 'var(--color-accent)',
  });

  actions.push({
    label: 'Get Support',
    icon: '💬',
    section: 'Support',
    description: 'Contact our team',
    color: 'var(--color-accent)',
  });

  return (
    <div className="quick-actions-strip">
      {actions.slice(0, 6).map((action) => (
        <button
          key={action.label}
          className={`quick-action-btn ${action.highlight ? 'highlight' : ''}`}
          onClick={() => onNavigate(action.section)}
        >
          <span className="quick-action-icon">{action.icon}</span>
          <div className="quick-action-text">
            <span className="quick-action-label">{action.label}</span>
            <span className="quick-action-desc">{action.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
