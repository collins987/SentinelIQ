import React, { useState } from 'react';
import { useRouter } from 'next/router';

const navItems = [
  { label: 'Dashboard', icon: '⬡', href: '/dashboard' },
  { label: 'Risk', icon: '◈', href: '/dashboard' },
  { label: 'Loans', icon: '◇', href: '/dashboard' },
  { label: 'Repayments', icon: '↻', href: '/repayments' },
  { label: 'Transactions', icon: '⇄', href: '/transactions' },
  { label: 'Spending alerts', icon: '◎', href: '/spending-alerts' },
  { label: 'Sessions', icon: '◻', href: '/dashboard' },
  { label: 'Security', icon: '△', href: '/dashboard' },
  { label: 'Support', icon: '○', href: '/dashboard' },
];

export default function SideNav({ onSelect, selected }: { onSelect: (label: string) => void, selected: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" className="sidebar-logo-img" />
        {!collapsed && (
          <div className="sidebar-logo-text">
            SENTINEL<span>IQ</span>
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
            onClick={() => {
              if (item.href && item.href !== '/dashboard') {
                router.push(item.href);
              } else {
                onSelect(item.label);
              }
            }}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
