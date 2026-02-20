import React from 'react';

interface KPIBarProps {
  stats: Array<{ label: string; value: string | number; icon: string; color: string }>;
}

export default function KPIBar({ stats }: KPIBarProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 20,
      marginBottom: 32,
    }}>
      {stats.map((card, idx) => (
        <div key={idx} style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          borderLeft: `6px solid ${card.color}`,
          minHeight: 90,
        }}>
          <span style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 22 }}>{card.value}</span>
          <span style={{ color: '#888', fontWeight: 500 }}>{card.label}</span>
        </div>
      ))}
    </div>
  );
}
