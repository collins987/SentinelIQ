import React from 'react';

interface RiskBreakdownCardProps {
  riskScore: number;
  breakdown: { identity: number; behavior: number; financial: number; compliance: number };
  trustLevel: string;
}

const domainConfig: Record<string, { label: string; icon: string; weight: string }> = {
  identity: { label: 'Identity', icon: '🛡️', weight: '25%' },
  behavior: { label: 'Behavioral', icon: '📊', weight: '20%' },
  financial: { label: 'Financial', icon: '💳', weight: '35%' },
  compliance: { label: 'Compliance', icon: '⚖️', weight: '20%' },
};

function getScoreColor(score: number): string {
  if (score <= 100) return 'var(--color-success)';
  if (score <= 200) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function getRiskLevel(score: number): string {
  if (score <= 300) return 'Low';
  if (score <= 600) return 'Medium';
  if (score <= 800) return 'High';
  return 'Critical';
}

function getTrustBadge(level: string) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    trusted: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: '✓ Trusted' },
    under_review: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: '⏳ Under Review' },
    restricted: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', label: '⛔ Restricted' },
    unknown: { bg: 'var(--color-bg-card-inner)', color: 'var(--color-text-muted)', label: '? Unknown' },
  };
  const c = config[level] || config.unknown;
  return (
    <span style={{
      background: c.bg, color: c.color, padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, letterSpacing: '0.3px',
    }}>
      {c.label}
    </span>
  );
}

export default function RiskBreakdownCard({ riskScore, breakdown, trustLevel }: RiskBreakdownCardProps) {
  const level = getRiskLevel(riskScore);
  const levelColor = riskScore <= 300 ? 'var(--color-success)' : riskScore <= 600 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="card">
      <h2>Risk Overview</h2>

      {/* Total score + trust level */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: levelColor, letterSpacing: -1, lineHeight: 1 }}>
            {riskScore}
          </span>
          <span style={{ fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 500 }}>/1000</span>
          <span style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
            color: levelColor, background: `${levelColor}15`, padding: '3px 10px', borderRadius: 4,
          }}>
            {level}
          </span>
        </div>
        {getTrustBadge(trustLevel)}
      </div>

      {/* Domain breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Object.entries(domainConfig).map(([key, cfg]) => {
          const score = (breakdown as any)[key] || 0;
          const maxDomain = key === 'financial' ? 400 : key === 'identity' ? 300 : key === 'behavior' ? 250 : 150;
          const pct = Math.min((score / maxDomain) * 100, 100);
          const color = getScoreColor(score);

          return (
            <div key={key} className="risk-item" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {cfg.icon} {cfg.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{cfg.weight}</span>
              </div>
              <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
              <div className="risk-bar" style={{ marginTop: 6 }}>
                <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
