import React from 'react';

interface RiskScoreCardProps {
  riskScores: Array<{ id: string; score: number; type: string; suggestions: string[] }>;
}

export default function RiskScoreCard({ riskScores }: RiskScoreCardProps) {
  if (!riskScores || riskScores.length === 0) return (
    <div className="card">No risk scores available.</div>
  );
  return (
    <div className="card" style={{ minHeight: 140 }}>
      <h2 style={{ marginBottom: 18 }}>Risk Scores</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}>
        {riskScores.map(risk => (
          <div key={risk.id} style={{
            background: '#f7f8fa',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            minHeight: 70,
          }}>
            <span style={{ color: '#888', fontWeight: 500 }}>{risk.type}</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: risk.score > 70 ? '#ef4444' : risk.score > 40 ? '#f59e42' : '#22c55e' }}>{risk.score}</span>
            <span style={{ fontSize: 13, color: '#888' }}>Score</span>
          </div>
        ))}
      </div>
    </div>
  );
}
