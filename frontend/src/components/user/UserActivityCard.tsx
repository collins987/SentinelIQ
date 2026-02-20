/**
 * User Activity Card Component
 * Displays recent actions and failed login attempts
 */

import { ClockIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { UserActivity } from '../../types/user';

interface UserActivityCardProps {
  activity: UserActivity | undefined;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function UserActivityCard({ activity, isLoading, onRefresh }: UserActivityCardProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login') && action.includes('fail')) {
      return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
    }
    if (action.includes('login')) {
      return <ClockIcon className="w-5 h-5 text-green-400" />;
    }
    return <ClockIcon className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-sentinel-400" />
          Recent Activity
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            title="Refresh activity"
          >
            <ArrowPathIcon className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Failed Login Alert */}
      {activity && activity.failed_logins_24h > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">
              {activity.failed_logins_24h} failed login attempt{activity.failed_logins_24h > 1 ? 's' : ''} in the last 24 hours
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              If this wasn't you, consider changing your password
            </p>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activity?.recent_actions && activity.recent_actions.length > 0 ? (
          activity.recent_actions.map((action, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              {getActionIcon(action.action)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {formatAction(action.action)}
                </p>
                {action.target && (
                  <p className="text-xs text-gray-400 truncate">
                    Target: {action.target}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {formatTimestamp(action.timestamp)}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
