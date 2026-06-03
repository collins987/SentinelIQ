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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-500">Jump to your most relevant next steps</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {actions.length} items
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {actions.slice(0, 6).map((action) => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.section)}
            className={`group flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${action.highlight ? 'border-rose-200 bg-rose-50/60 hover:bg-rose-50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'}`}
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base"
              style={{ backgroundColor: `${action.color}20`, color: action.color }}
            >
              {action.icon}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-slate-900">{action.label}</span>
              <span className="mt-0.5 text-xs text-slate-500">{action.description}</span>
            </span>
            <span className="pt-0.5 text-slate-400 group-hover:text-slate-700">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}
