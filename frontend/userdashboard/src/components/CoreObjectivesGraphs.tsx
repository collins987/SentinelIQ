import React from 'react';

// ─────────────────────────────────────────────────────────────
// Pure SVG Circular (Doughnut) Graph Component
// ─────────────────────────────────────────────────────────────

interface CircularGraphProps {
  /** 0–100 percentage value */
  value: number;
  /** Label shown below the graph */
  label: string;
  /** Color for the filled arc */
  color: string;
  /** Subtitle text inside the ring */
  subtitle?: string;
  /** Size in px */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
}

function CircularGraph({
  value,
  label,
  color,
  subtitle,
  size = 140,
  strokeWidth = 12,
}: CircularGraphProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  // Glow filter id unique per label
  const filterId = `glow-${label.replace(/\s/g, '')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background circle */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="var(--color-ring-bg)"
            strokeWidth={strokeWidth}
            opacity={0.6}
          />
          {/* Filled arc with glow */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
            filter={`url(#${filterId})`}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, textShadow: `0 0 12px ${color}40` }}>
            {clamped}
          </span>
          {subtitle && (
            <span style={{
              fontSize: 10, color, marginTop: 3, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.85,
            }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700, color: 'var(--color-text)',
        textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line',
      }}>
        {label}
      </span>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// Score helpers — 5-tier color system
// ─────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';  // green  — excellent
  if (score >= 60) return '#3b82f6';  // blue   — good
  if (score >= 40) return '#f59e0b';  // amber  — moderate
  if (score >= 20) return '#f97316';  // orange — poor
  return '#ef4444';                   // red    — critical
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Poor';
  return 'Critical';
}


// ─────────────────────────────────────────────────────────────
// Core Objectives component
// ─────────────────────────────────────────────────────────────

interface CoreObjectivesGraphsProps {
  profile: {
    mfa_enabled?: boolean;
    email_verified?: boolean;
    trust_level?: string;
    phone?: string;
    phone_verified?: boolean;
  } | null;
  riskBreakdown: {
    identity?: number;
    behavior?: number;
    financial?: number;
    compliance?: number;
  } | null;
  loansSummary: {
    total_loans?: number;
    active_loans?: number;
    total_outstanding?: number;
    next_due_date?: string | null;
  } | null;
  alertsSummary: {
    unread?: number;
  } | null;
  session: {
    active_sessions?: number;
  } | null;
  activity: {
    failed_logins_24h?: number;
    recent_actions?: any[];
  } | null;
}

export default function CoreObjectivesGraphs({
  profile,
  riskBreakdown,
  loansSummary,
  alertsSummary,
  session,
  activity,
}: CoreObjectivesGraphsProps) {

  // Risk values from backend are 0–1000 scale; normalize to 0–100
  const norm = (v: number) => Math.min(100, Math.max(0, Math.round((v / 1000) * 100)));

  // ─── 1. Identity & Security Score (0‑100, higher = better) ───
  const identityRiskPct = norm(riskBreakdown?.identity ?? 0);
  const mfaBonus = profile?.mfa_enabled ? 20 : 0;
  const emailBonus = profile?.email_verified ? 10 : 0;
  const phoneBonus = profile?.phone_verified ? 5 : 0;
  // Without MFA/email/phone verified, and no risk → base of 50 (not perfect)
  const identityBase = 50;
  const identityFromRisk = Math.round((100 - identityRiskPct) * 0.5); // max 50 from low risk
  const identityScore = Math.min(100, Math.max(0,
    identityBase - identityRiskPct + mfaBonus + emailBonus + phoneBonus
  ));

  // ─── 2. Financial Health Score (0‑100, higher = better) ───
  const financialRiskPct = norm(riskBreakdown?.financial ?? 0);
  const activeLoans = loansSummary?.active_loans ?? 0;
  const outstanding = loansSummary?.total_outstanding ?? 0;
  let financialScore = 100 - financialRiskPct;
  // Penalize outstanding balance
  if (outstanding > 10000) financialScore = Math.max(0, financialScore - 20);
  else if (outstanding > 5000) financialScore = Math.max(0, financialScore - 12);
  else if (outstanding > 1000) financialScore = Math.max(0, financialScore - 5);
  // Penalize active loans
  if (activeLoans > 3) financialScore = Math.max(0, financialScore - 10);
  // If no risk data at all, show a cautious 65 instead of perfect 100
  if (financialRiskPct === 0 && activeLoans === 0 && outstanding === 0) financialScore = 65;
  financialScore = Math.min(100, Math.max(0, Math.round(financialScore)));

  // ─── 3. Behavior & Compliance Score (0‑100, higher = better) ───
  const behaviorRiskPct = norm(riskBreakdown?.behavior ?? 0);
  const complianceRiskPct = norm(riskBreakdown?.compliance ?? 0);
  const failedLogins = activity?.failed_logins_24h ?? 0;
  const unreadAlerts = alertsSummary?.unread ?? 0;
  const combinedRiskPct = Math.round(behaviorRiskPct * 0.5 + complianceRiskPct * 0.5);
  let behaviorScore = 100 - combinedRiskPct;
  if (failedLogins > 5) behaviorScore -= 25;
  else if (failedLogins > 2) behaviorScore -= 12;
  else if (failedLogins > 0) behaviorScore -= 5;
  if (unreadAlerts > 5) behaviorScore -= 15;
  else if (unreadAlerts > 2) behaviorScore -= 8;
  // If no risk data at all, show cautious 70
  if (combinedRiskPct === 0 && failedLogins === 0 && unreadAlerts === 0) behaviorScore = 70;
  behaviorScore = Math.min(100, Math.max(0, Math.round(behaviorScore)));

  // Objectives data
  const objectives = [
    {
      label: 'Identity &\nSecurity',
      score: identityScore,
      details: [
        { key: 'MFA', value: profile?.mfa_enabled ? '✓ Enabled' : '✗ Off', ok: !!profile?.mfa_enabled },
        { key: 'Email', value: profile?.email_verified ? '✓ Verified' : '✗ Unverified', ok: !!profile?.email_verified },
        { key: 'Phone', value: profile?.phone_verified ? '✓ Verified' : (profile?.phone ? '✗ Unverified' : '— None'), ok: !!profile?.phone_verified },
        { key: 'Trust', value: (profile?.trust_level || 'unknown').replace('_', ' '), ok: profile?.trust_level === 'trusted' },
      ],
    },
    {
      label: 'Financial\nHealth',
      score: financialScore,
      details: [
        { key: 'Active Loans', value: String(activeLoans), ok: activeLoans <= 1 },
        { key: 'Outstanding', value: `$${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, ok: outstanding === 0 },
        { key: 'Fin. Risk', value: `${financialRiskPct}%`, ok: financialRiskPct <= 30 },
        { key: 'Next Due', value: loansSummary?.next_due_date ? new Date(loansSummary.next_due_date).toLocaleDateString() : '—', ok: !loansSummary?.next_due_date },
      ],
    },
    {
      label: 'Behavior &\nCompliance',
      score: behaviorScore,
      details: [
        { key: 'Behavior', value: `${behaviorRiskPct}%`, ok: behaviorRiskPct <= 30 },
        { key: 'Compliance', value: `${complianceRiskPct}%`, ok: complianceRiskPct <= 30 },
        { key: 'Failed Logins', value: String(failedLogins), ok: failedLogins === 0 },
        { key: 'Unread Alerts', value: String(unreadAlerts), ok: unreadAlerts === 0 },
      ],
    },
  ];

  return (
    <div className="card objectives-card">
      <h2>Core Monitoring Objectives</h2>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 0 0', padding: '0 1.4rem 1rem' }}>
        Real-time health scores across SentinelIQ&apos;s 3 pillars
      </p>

      <div className="objectives-grid">
        {objectives.map((obj) => {
          const color = getScoreColor(obj.score);
          return (
            <div key={obj.label} className="objective-column">
              <CircularGraph
                value={obj.score}
                label={obj.label}
                color={color}
                subtitle={getScoreLabel(obj.score)}
                size={120}
                strokeWidth={10}
              />

              {/* Detail rows */}
              <div style={{ width: '100%', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {obj.details.map((d) => (
                  <div key={d.key} className="objective-detail-row" style={{
                    background: d.ok ? 'var(--color-detail-ok)' : 'var(--color-detail-warn)',
                  }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{d.key}</span>
                    <span style={{ fontWeight: 700, color: d.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
