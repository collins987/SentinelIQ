import React from 'react';

interface RiskScoreCardProps {
  riskScores: Array<{ id: string; score: number; type: string; suggestions: string[] }>;
}

export default function RiskScoreCard({ riskScores }: RiskScoreCardProps) {
  if (!riskScores || riskScores.length === 0) return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-header-copy">
          <h2>Risk Scores</h2>
          <p className="card-subtitle">Tracked account risk factors</p>
        </div>
      </div>
      <div className="empty-state">No risk scores available.</div>
    </div>
  );

  const getScoreClass = (score: number) => {
    if (score > 70) return 'high';
    if (score > 40) return 'medium';
    return 'low';
  };

  const getScoreColor = (score: number) => {
    if (score > 70) return '#ef4444';
    if (score > 40) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-header-copy">
          <h2>Risk Scores</h2>
          <p className="card-subtitle">Tracked account risk factors</p>
        </div>
        <span className="card-badge">{riskScores.length} factors</span>
      </div>
      <div className="risk-grid">
        {riskScores.map(risk => (
          <div key={risk.id} className="risk-item">
            <span className="risk-type">{risk.type}</span>
            <span className={`risk-score ${getScoreClass(risk.score)}`}>{risk.score}</span>
            <div className="risk-bar">
              <div
                className="risk-bar-fill"
                style={{
                  width: `${Math.min(risk.score, 100)}%`,
                  background: getScoreColor(risk.score),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
