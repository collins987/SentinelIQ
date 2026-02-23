import React from 'react';

interface LoanDueReminderProps {
  loansSummary: {
    active_loans?: number;
    total_outstanding?: number;
    next_due_date?: string | null;
  } | null;
  onNavigate: (section: string) => void;
}

export default function LoanDueReminder({ loansSummary, onNavigate }: LoanDueReminderProps) {
  if (!loansSummary?.next_due_date || !loansSummary.total_outstanding) return null;

  const dueDate = new Date(loansSummary.next_due_date);
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Only show if payment is within 14 days or overdue
  if (daysUntilDue > 14) return null;

  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 3;
  const absDays = Math.abs(daysUntilDue);

  const severity = isOverdue ? 'overdue' : isUrgent ? 'urgent' : 'upcoming';
  const config = {
    overdue: {
      bg: 'var(--color-danger-bg)',
      border: 'var(--color-danger)',
      color: 'var(--color-danger)',
      icon: '⚠️',
      title: 'Payment Overdue',
      subtitle: `${absDays} day${absDays !== 1 ? 's' : ''} past due`,
    },
    urgent: {
      bg: 'var(--color-warning-bg)',
      border: 'var(--color-warning)',
      color: 'var(--color-warning)',
      icon: '⏰',
      title: 'Payment Due Soon',
      subtitle: daysUntilDue === 0 ? 'Due today' : daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`,
    },
    upcoming: {
      bg: 'var(--color-primary-bg)',
      border: 'var(--color-border)',
      color: 'var(--color-text)',
      icon: '📅',
      title: 'Upcoming Payment',
      subtitle: `Due in ${daysUntilDue} days`,
    },
  };

  const c = config[severity];

  return (
    <div className="loan-due-banner" style={{
      background: c.bg,
      borderColor: c.border,
    }}>
      <div className="loan-due-left">
        <span className="loan-due-icon">{c.icon}</span>
        <div className="loan-due-info">
          <span className="loan-due-title" style={{ color: c.color }}>{c.title}</span>
          <span className="loan-due-subtitle">
            {c.subtitle} — {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="loan-due-right">
        <div className="loan-due-amount" style={{ color: c.color }}>
          Ksh.{loansSummary.total_outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <button className="loan-due-action" onClick={() => onNavigate('Loans')}>
          Make Payment →
        </button>
      </div>
    </div>
  );
}
