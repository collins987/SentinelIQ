import React, { useState } from 'react';

const navItems = [
  { label: 'Dashboard', icon: '🏠' },
  { label: 'Profile', icon: '👤' },
  { label: 'Risk', icon: '⚠️' },
  { label: 'Activity', icon: '📋' },
  { label: 'Support', icon: '💬' },
];

export default function SideNav({ onSelect, selected }: { onSelect: (label: string) => void, selected: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <nav style={{
      width: collapsed ? 60 : 200,
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      padding: '18px 0',
      minHeight: 500,
      transition: 'width 0.2s',
      display: 'flex',
      flexDirection: 'column',
      alignItems: collapsed ? 'center' : 'flex-start',
      position: 'sticky',
      top: 32,
      zIndex: 10,
    }}>
      <button
        aria-label="Toggle navigation"
        onClick={() => setCollapsed(c => !c)}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563eb',
          fontSize: 22,
          margin: collapsed ? '0 0 18px 0' : '0 0 18px 18px',
          cursor: 'pointer',
          alignSelf: collapsed ? 'center' : 'flex-start',
        }}
      >
        {collapsed ? '»' : '«'}
      </button>
      {navItems.map(item => (
        <div
          key={item.label}
          onClick={() => onSelect(item.label)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '10px 0' : '10px 18px',
            width: '100%',
            cursor: 'pointer',
            background: selected === item.label ? '#f3f4f6' : 'none',
            fontWeight: selected === item.label ? 700 : 500,
            color: selected === item.label ? '#2563eb' : '#222',
            borderLeft: selected === item.label ? '4px solid #2563eb' : '4px solid transparent',
            borderRadius: '0 8px 8px 0',
            fontSize: 17,
            transition: 'background 0.15s',
            marginBottom: 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <span style={{ fontSize: 22 }}>{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </div>
      ))}
    </nav>
  );
}
