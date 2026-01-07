import { useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useNotificationsStore } from '../stores';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '../components/ui/toast';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  AlertCircle,
  ExternalLink,
  User,
  FileText,
  Activity,
  Shield,
  RefreshCw,
} from 'lucide-react';
import type { Notification, NotificationType } from '../types';

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  success: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, isLoading } = useNotificationsStore();

  // Handle notification click - navigate to related entity
  const handleNotificationClick = useCallback((notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on notification type/metadata
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http')) {
        window.open(notification.actionUrl, '_blank');
      } else {
        navigate(notification.actionUrl);
      }
      return;
    }

    // Derive navigation from metadata
    const entityType = notification.metadata?.entityType as string | undefined;
    const entityId = notification.metadata?.entityId as string | undefined;

    if (entityType && entityId) {
      switch (entityType) {
        case 'user':
          navigate(`/users?highlight=${entityId}`);
          break;
        case 'audit':
        case 'audit_log':
          navigate(`/audit?highlight=${entityId}`);
          break;
        case 'job':
          navigate(`/jobs?highlight=${entityId}`);
          break;
        case 'event':
          navigate(`/activity?highlight=${entityId}`);
          break;
        case 'alert':
          navigate(`/analytics?alert=${entityId}`);
          break;
      }
    }
  }, [markAsRead, navigate]);

  // Wrap store actions with toast feedback
  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
    toast('success', 'Done', 'Notification marked as read');
  }, [markAsRead]);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
    toast('success', 'Done', 'All notifications marked as read');
  }, [markAllAsRead]);

  const handleRemove = useCallback((id: string) => {
    removeNotification(id);
    toast('info', 'Removed', 'Notification removed');
  }, [removeNotification]);

  const handleClearAll = useCallback(() => {
    clearAll();
    toast('success', 'Done', 'All notifications cleared');
  }, [clearAll]);

  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);

    notifications.forEach((n) => {
      const date = new Date(n.timestamp);
      if (date >= todayStart) today.push(n);
      else if (date >= yesterdayStart) yesterday.push(n);
      else older.push(n);
    });

    return { today, yesterday, older };
  }, [notifications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-gray-700">
              <Trash2 className="h-4 w-4" /> Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 dark:border-gray-700">
          <Bell className="h-12 w-12 text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No notifications</p>
          <p className="text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.today.length > 0 && (
            <NotificationGroup title="Today" notifications={groupedNotifications.today} onRead={handleMarkAsRead} onRemove={handleRemove} onClick={handleNotificationClick} />
          )}
          {groupedNotifications.yesterday.length > 0 && (
            <NotificationGroup title="Yesterday" notifications={groupedNotifications.yesterday} onRead={handleMarkAsRead} onRemove={handleRemove} onClick={handleNotificationClick} />
          )}
          {groupedNotifications.older.length > 0 && (
            <NotificationGroup title="Older" notifications={groupedNotifications.older} onRead={handleMarkAsRead} onRemove={handleRemove} onClick={handleNotificationClick} />
          )}
        </div>
      )}
    </div>
  );
}

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function NotificationGroup({ title, notifications, onRead, onRemove, onClick }: NotificationGroupProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <div className="space-y-2">
        {notifications.map((notification) => {
          const config = typeConfig[notification.type];
          const Icon = config.icon;
          
          // Determine if notification has an action
          const entityType = notification.metadata?.entityType as string | undefined;
          const hasAction = notification.actionUrl || entityType;
          
          // Determine entity icon
          const EntityIcon = entityType === 'user' ? User
            : entityType === 'audit' || entityType === 'audit_log' ? FileText
            : entityType === 'job' ? Activity
            : entityType === 'alert' ? Shield
            : null;

          return (
            <div
              key={notification.id}
              className={cn(
                'flex items-start gap-4 rounded-xl border border-gray-200 p-4 transition-colors dark:border-gray-800',
                !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10',
                hasAction && 'cursor-pointer hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-700'
              )}
              onClick={() => hasAction && onClick(notification)}
              role={hasAction ? 'button' : undefined}
              tabIndex={hasAction ? 0 : undefined}
              onKeyDown={(e) => hasAction && e.key === 'Enter' && onClick(notification)}
            >
              <div className={cn('flex-shrink-0 rounded-full p-2', config.bg)}>
                <Icon className={cn('h-5 w-5', config.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{notification.title}</p>
                      {hasAction && (
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
                    {EntityIcon && entityType && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <EntityIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-400 capitalize">Related: {entityType.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!notification.read && (
                    <button onClick={() => onRead(notification.id)} className="text-sm text-blue-600 hover:text-blue-700">
                      Mark as read
                    </button>
                  )}
                  <button onClick={() => onRemove(notification.id)} className="text-sm text-gray-400 hover:text-red-600">
                    Remove
                  </button>
                  {hasAction && (
                    <button 
                      onClick={() => onClick(notification)} 
                      className="ml-auto text-sm text-blue-600 hover:text-blue-700"
                    >
                      View details →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
