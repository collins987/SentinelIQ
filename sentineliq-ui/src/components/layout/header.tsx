import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore, useNotificationsStore } from '@/stores';
import {
  Search,
  Bell,
  Command,
  Sun,
  Moon,
  Check,
  AlertTriangle,
  Info,
  AlertCircle,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export function Header() {
  const { sidebarCollapsed, toggleCommandPalette, theme, setTheme } = useUIStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationsStore();
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-sm transition-all dark:border-gray-800 dark:bg-gray-950/80',
        sidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Search or type a command...</span>
          <kbd className="hidden items-center gap-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium text-gray-500 md:flex dark:border-gray-600 dark:bg-gray-800">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)}
            className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsPanelOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationsPanelOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} onRead={() => markAsRead(notification.id)} />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: () => void }) {
  const iconMap: Record<NotificationType, React.ElementType> = {
    success: Check,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
  };
  const colorMap: Record<NotificationType, string> = {
    success: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
    warning: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
    error: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    info: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  };
  const Icon = iconMap[notification.type];

  return (
    <div
      className={cn(
        'flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
        !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10'
      )}
      onClick={onRead}
    >
      <div className={cn('flex-shrink-0 rounded-full p-1.5', colorMap[notification.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
        <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
