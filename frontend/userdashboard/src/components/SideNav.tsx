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
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">S</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            Sentinel<span>IQ</span>
          </div>
        )}
      </div>

      {/* Toggle */}
      <button
        aria-label="Toggle navigation"
        className="sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Nav Items */}
      <div className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.label}
            className={`sidebar-item${selected === item.label ? ' active' : ''}`}
            onClick={() => onSelect(item.label)}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
