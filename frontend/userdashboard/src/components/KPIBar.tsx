import React from 'react';

interface KPIBarProps {
  stats: Array<{ label: string; value: string | number; icon: string; color: string }>;
}

export default function KPIBar({ stats }: KPIBarProps) {
  return (
    <div className="kpi-grid">
      {stats.map((card, idx) => (
        <div
          key={idx}
          className="kpi-card"
          style={{ ['--kpi-color' as any]: card.color }}
        >
          <div
            className="kpi-icon"
            style={{ background: `${card.color}15` }}
          >
            {card.icon}
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{card.value}</span>
            <span className="kpi-label">{card.label}</span>
          </div>
          <style>{`
            .kpi-card:nth-child(${idx + 1})::after {
              background: ${card.color};
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}
