import React from 'react';

// ─────────────────────────────────────────────────────────────
// SOC-Style Circular Gauge Component — Professional Threat Dashboard Aesthetic
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
  size = 170,
  strokeWidth = 10,
}: CircularGraphProps) {
  const radius = (size - strokeWidth) / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  // Outer decorative ring
  const outerRadius = radius + 8;
  const innerDecoRadius = radius - 14;

  // Unique IDs
  const uid = label.replace(/[\s&\n]/g, '');
  const glowId = `soc-glow-${uid}`;
  const gradId = `soc-grad-${uid}`;
  const pulseId = `soc-pulse-${uid}`;

  // Generate tick marks (SOC radar-style)
  const tickCount = 36;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = (i * 360) / tickCount - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 9 === 0;
    const len = isMajor ? 6 : 3;
    const r1 = outerRadius + 2;
    const r2 = r1 + len;
    return {
      x1: center + r1 * Math.cos(rad),
      y1: center + r1 * Math.sin(rad),
      x2: center + r2 * Math.cos(rad),
      y2: center + r2 * Math.sin(rad),
      isMajor,
    };
  });

  // Status color for inner glow ring
  const statusAlpha = clamped >= 60 ? 0.15 : clamped >= 40 ? 0.1 : 0.08;

  return (
    <div className="soc-gauge-container">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* Glow filter */}
            <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient for arc */}
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
            {/* Pulse animation */}
            <radialGradient id={pulseId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity="0.08" />
              <stop offset="80%" stopColor={color} stopOpacity="0.02" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient pulse background */}
          <circle cx={center} cy={center} r={outerRadius + 10} fill={`url(#${pulseId})`} className="soc-pulse-ring" />

          {/* Tick marks — SOC radar perimeter */}
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={color}
              strokeWidth={t.isMajor ? 1.5 : 0.6}
              opacity={t.isMajor ? 0.5 : 0.2}
            />
          ))}

          {/* Outer decorative ring */}
          <circle
            cx={center} cy={center} r={outerRadius}
            fill="none" stroke={color} strokeWidth={0.5} opacity={0.18}
          />

          {/* Inner decorative ring */}
          <circle
            cx={center} cy={center} r={innerDecoRadius}
            fill="none" stroke={color} strokeWidth={0.5} opacity={0.12}
          />

          {/* Inner ambient fill */}
          <circle
            cx={center} cy={center} r={innerDecoRadius}
            fill={color} opacity={statusAlpha}
          />

          {/* Background track */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="var(--color-ring-bg)"
            strokeWidth={strokeWidth}
            opacity={0.35}
          />

          {/* Secondary ghost arc (subtle full range indicator) */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            opacity={0.06}
          />

          {/* Main progress arc */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
            filter={`url(#${glowId})`}
            className="soc-arc-animate"
          />

          {/* Arc endpoint dot */}
          {clamped > 0 && clamped < 100 && (() => {
            const endAngle = ((clamped / 100) * 360 - 90) * (Math.PI / 180);
            const dotX = center + radius * Math.cos(endAngle);
            const dotY = center + radius * Math.sin(endAngle);
            return (
              <>
                <circle cx={dotX} cy={dotY} r={strokeWidth / 2 + 2} fill={color} opacity={0.3} className="soc-dot-pulse" />
                <circle cx={dotX} cy={dotY} r={strokeWidth / 2 - 1} fill={color} />
              </>
            );
          })()}
        </svg>

        {/* Center content */}
        <div className="soc-gauge-center" style={{ width: size, height: size }}>
          <span className="soc-gauge-value" style={{ color, textShadow: `0 0 20px ${color}60, 0 0 40px ${color}20` }}>
            {clamped}
          </span>
          <span className="soc-gauge-percent" style={{ color }}>%</span>
          {subtitle && (
            <span className="soc-gauge-subtitle" style={{ color }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <span className="soc-gauge-label">
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
        { key: 'Outstanding', value: `Ksh.${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, ok: outstanding === 0 },
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
    <div className="card objectives-card soc-objectives">
      <div className="soc-header">
        <div className="soc-header-left">
          <span className="soc-header-indicator" />
          <h2>Core Monitoring Objectives</h2>
        </div>
        <span className="soc-header-badge">LIVE</span>
      </div>
      <p className="soc-subheading">
        Real-time threat posture across SentinelIQ&apos;s 3 security pillars
      </p>

      <div className="objectives-grid soc-grid">
        {objectives.map((obj) => {
          const color = getScoreColor(obj.score);
          const threat = obj.score >= 80 ? 'NOMINAL' : obj.score >= 60 ? 'ELEVATED' : obj.score >= 40 ? 'GUARDED' : obj.score >= 20 ? 'HIGH' : 'SEVERE';
          return (
            <div key={obj.label} className="objective-column soc-column">
              {/* Threat level indicator at top */}
              <div className="soc-threat-badge" style={{
                color,
                borderColor: color,
                boxShadow: `0 0 8px ${color}25`,
              }}>
                {threat}
              </div>

              <CircularGraph
                value={obj.score}
                label={obj.label}
                color={color}
                subtitle={getScoreLabel(obj.score)}
                size={170}
                strokeWidth={10}
              />

              {/* Detail rows with SOC styling */}
              <div className="soc-details">
                {obj.details.map((d) => (
                  <div key={d.key} className="soc-detail-row" style={{
                    borderLeftColor: d.ok ? 'var(--color-success)' : 'var(--color-danger)',
                  }}>
                    <span className="soc-detail-key">{d.key}</span>
                    <span className="soc-detail-value" style={{
                      color: d.ok ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
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
