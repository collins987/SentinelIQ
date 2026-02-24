import React from 'react';

interface KPIBarProps {
  stats: Array<{ label: string; value: string | number; icon: string; color: string }>;
}

export default function KPIBar({ stats }: KPIBarProps) {
  return (
    <div className="kpi-grid">
      {stats.map((card, idx) => (
        <div key={idx} className="kpi-card">
          <div className="kpi-content">
            <span className="kpi-label">{card.label}</span>
            <span className="kpi-value">{card.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
