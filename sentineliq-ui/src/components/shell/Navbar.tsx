import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { UserRole } from '@/types'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white dark:bg-slate-900 shadow-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                SentinelIQ
              </h1>
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

interface NavItem {
  label: string
  href: string
  icon?: string
  roles: UserRole[]
}

const navigationItems: NavItem[] = [
  {
    label: 'Security Center',
    href: '/portal/security',
    roles: [UserRole.END_USER]
  },
  {
    label: 'Triage Queue',
    href: '/analyst/triage',
    roles: [UserRole.ANALYST]
  },
  {
    label: 'Link Analysis',
    href: '/analyst/graph',
    roles: [UserRole.ANALYST]
  },
  {
    label: 'Attack Map',
    href: '/soc/attack-map',
    roles: [UserRole.SOC_RESPONDER]
  },
  {
    label: 'System Health',
    href: '/soc/health',
    roles: [UserRole.SOC_RESPONDER]
  },
  {
    label: 'Rule Lab',
    href: '/datascientist/rules',
    roles: [UserRole.DATA_SCIENTIST]
  },
  {
    label: 'Shadow Mode',
    href: '/datascientist/shadow',
    roles: [UserRole.DATA_SCIENTIST]
  },
  {
    label: 'API Keys',
    href: '/developer/keys',
    roles: [UserRole.DEVELOPER]
  },
  {
    label: 'Webhook Logs',
    href: '/developer/webhooks',
    roles: [UserRole.DEVELOPER]
  },
  {
    label: 'Audit Logs',
    href: '/compliance/audit',
    roles: [UserRole.COMPLIANCE, UserRole.ADMIN]
  },
  {
    label: 'Evidence Export',
    href: '/compliance/export',
    roles: [UserRole.COMPLIANCE, UserRole.ADMIN]
  }
]

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const userNavItems = navigationItems.filter((item) =>
    item.roles.includes(user.role)
  )

  return (
    <aside className="w-64 bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 h-[calc(100vh-64px)] overflow-y-auto sticky top-16">
      <nav className="p-4 space-y-1">
        {userNavItems.map((item) => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className="w-full text-left px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
