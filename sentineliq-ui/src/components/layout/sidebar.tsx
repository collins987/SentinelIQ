import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import {
  LayoutDashboard,
  Activity,
  ListTodo,
  Users,
  Shield,
  Settings,
  Bell,
  BarChart3,
  History,
  Server,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Jobs', href: '/jobs', icon: ListTodo },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'System Health', href: '/health', icon: Server },
];

const managementNav: NavItem[] = [
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Roles & Permissions', href: '/roles', icon: Shield },
  { label: 'Audit Trail', href: '/audit', icon: History },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];

const settingsNav: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-950',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              SentinelIQ
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        <NavGroup title="Main" items={mainNav} collapsed={sidebarCollapsed} />
        <NavGroup title="Management" items={managementNav} collapsed={sidebarCollapsed} />
        <NavGroup title="System" items={settingsNav} collapsed={sidebarCollapsed} />
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500" />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                Admin User
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                admin@sentineliq.io
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

interface NavGroupProps {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}

function NavGroup({ title, items, collapsed }: NavGroupProps) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              isActive
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
              collapsed && 'justify-center'
            )
          }
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
