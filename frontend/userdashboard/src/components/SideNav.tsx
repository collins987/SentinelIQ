import { useState } from 'react';
import { useRouter } from 'next/router';

const navItems = [
  { label: 'Dashboard', icon: '⌂', href: '/dashboard' },
  { label: 'Transactions', icon: '⇄', href: '/transactions' },
  { label: 'Loans', icon: '◇', href: '/dashboard' },
  { label: 'Repayments', icon: '↻', href: '/repayments' },
  { label: 'Spending alerts', icon: '◎', href: '/spending-alerts' },
  { label: 'Risk', icon: '◈', href: '/dashboard' },
  { label: 'Sessions', icon: '◻', href: '/dashboard' },
  { label: 'Security', icon: '△', href: '/dashboard' },
  { label: 'Support', icon: '○', href: '/dashboard' },
];

export default function SideNav({
  onSelect,
  selected,
  onLogout,
}: {
  onSelect: (label: string) => void;
  selected: string;
  onLogout?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const menuItems = navItems.slice(0, 5);
  const generalItems = navItems.slice(5);

  const handleSelect = (label: string, href: string) => {
    if (href && href !== '/dashboard') {
      router.push(href);
      return;
    }
    onSelect(label);
  };

  return (
    <nav
      className={`hidden min-h-screen bg-black text-white shadow-2xl shadow-black/40 lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-64'}`}
      style={{ transition: 'width 180ms ease' }}
    >
      <div className="relative flex items-center gap-3 border-b border-white/15 px-5 py-6">
        <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/15" />
        {!collapsed && (
          <div className="ml-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">SENTINELIQ</div>
          </div>
        )}

        <button
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => setCollapsed((c) => !c)}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-chevrons-left">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!collapsed && <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Menu</div>}
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleSelect(item.label, item.href)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selected === item.label ? 'bg-white text-black' : 'text-white hover:bg-white/10 hover:text-white'}`}
            >
              <span className="flex h-5 w-5 items-center justify-center text-sm">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </div>

        {!collapsed && <div className="mb-3 mt-6 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">General</div>}
        <div className="space-y-1">
          {generalItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleSelect(item.label, item.href)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selected === item.label ? 'bg-white text-black' : 'text-white hover:bg-white/10 hover:text-white'}`}
            >
              <span className="flex h-5 w-5 items-center justify-center text-sm">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </div>

        {!collapsed && (
          <div className="mt-8 rounded-2xl border border-white/25 bg-white/5 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Switch to Pro</div>
            <div className="mt-2 text-sm font-semibold text-white">Unlock advanced monitoring</div>
            <div className="mt-1 text-xs leading-5 text-white/75">Access richer analytics and proactive account intelligence.</div>
          </div>
        )}
      </div>

      <div className="border-t border-white/15 p-4">
        <button
          onClick={() => {
            if (onLogout) {
              onLogout();
              return;
            }
            router.push('/');
          }}
          className="flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          {collapsed ? '⎋' : 'Log out'}
        </button>
      </div>
    </nav>
  );
}
