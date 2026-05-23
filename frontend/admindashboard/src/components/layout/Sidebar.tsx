import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  BoltIcon,
  ServerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ScaleIcon,
  ShieldCheckIcon,
  FingerPrintIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleSidebar } from '../../features/dashboardSlice';
import clsx from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;
  section?: string;
}

interface SidebarProps {
  collapsed: boolean;
}

// Admin navigation items
const adminNavigation: NavItem[] = [
  { name: 'Overview', href: '/overview', icon: HomeIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Risk Center', href: '/risk', icon: ShieldExclamationIcon },
  { name: 'Audit Logs', href: '/audit', icon: DocumentTextIcon },
  { name: 'Activity Feed', href: '/activity', icon: BoltIcon },
  { name: 'System Health', href: '/health', icon: ServerIcon },
  { name: 'Governance', href: '/governance', icon: ScaleIcon, section: 'admin' },
  { name: 'Enforcement', href: '/enforcement', icon: ShieldCheckIcon, section: 'admin' },
  { name: 'IAM', href: '/iam', icon: FingerPrintIcon, section: 'admin' },
  { name: 'Compliance', href: '/compliance', icon: ClipboardDocumentListIcon, section: 'admin' },
  { name: 'Loan Policies', href: '/loan-policies', icon: BanknotesIcon, section: 'fintech' },
  { name: 'Repayment Ops', href: '/repayment-ops', icon: ClockIcon, section: 'fintech' },
  { name: 'Transaction Risk', href: '/transaction-risk', icon: CurrencyDollarIcon, section: 'fintech' },
];

// User navigation items (non-admins should not access this dashboard,
// but provide a sensible fallback pointing to the admin overview)
const userNavigation: NavItem[] = [
  { name: 'Overview', href: '/overview', icon: HomeIcon },
];

export default function Sidebar({ collapsed }: SidebarProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  // Select navigation based on user role
  const navigation = user?.role === 'admin' ? adminNavigation : userNavigation;
  
  return (
    <aside
      className={clsx(
        'flex flex-col border-r border-dashboard-border bg-dashboard-card transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-dashboard-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-semibold text-white tracking-tight">SentinelIQ</span>
          </div>
        )}
        {collapsed && (
          <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" className="w-8 h-8 rounded-lg object-cover mx-auto" />
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item, idx) => {
          const prevItem = navigation[idx - 1];
          const showDivider =
            item.section &&
            prevItem &&
            prevItem.section !== item.section;
          const sectionLabel =
            item.section === 'admin'
              ? 'Governance'
              : item.section === 'fintech'
                ? 'Fintech'
                : '';
          return (
            <div key={item.name}>
              {showDivider && (
                <div className="pt-3 pb-2 px-3">
                  <div className="border-t border-dashboard-border" />
                  {!collapsed && (
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-2">{sectionLabel}</p>
                  )}
                </div>
              )}
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-sentinel-600/20 text-white border-l-2 border-sentinel-500'
                      : 'text-gray-400 hover:text-white hover:bg-dashboard-hover'
                  )
                }
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>
      
      {/* Collapse Toggle */}
      <div className="border-t border-dashboard-border p-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-dashboard-hover transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="ml-2 text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
