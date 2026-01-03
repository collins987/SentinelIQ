import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useEventsStore } from '@/stores';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  User,
  Shield,
  Database,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Zap,
} from 'lucide-react';
import type { SystemEvent, EventSeverity } from '@/types';

const severityConfig: Record<EventSeverity, { icon: React.ElementType; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-200 dark:bg-red-900/50' },
};

const sourceIcons: Record<string, React.ElementType> = {
  user: User,
  auth: Shield,
  database: Database,
  api: Server,
  system: Zap,
  job: Activity,
};

interface ActivityFeedProps {
  maxItems?: number;
  className?: string;
  showHeader?: boolean;
}

export function ActivityFeed({ maxItems = 10, className, showHeader = true }: ActivityFeedProps) {
  const { events } = useEventsStore();

  const displayEvents = useMemo(() => events.slice(0, maxItems), [events, maxItems]);

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      {showHeader && (
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Live Activity</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Activity className="mb-2 h-8 w-8" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {displayEvents.map((event, index) => (
              <ActivityItem key={event.id} event={event} isNew={index === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ event, isNew }: { event: SystemEvent; isNew?: boolean }) {
  const config = severityConfig[event.severity];
  const SourceIcon = sourceIcons[event.source] || Activity;
  const SeverityIcon = config.icon;

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isNew && 'animate-pulse-once bg-blue-50/50 dark:bg-blue-900/10'
      )}
    >
      <div className={cn('flex-shrink-0 rounded-full p-1.5', config.bg)}>
        <SeverityIcon className={cn('h-4 w-4', config.color)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-900 dark:text-white">{event.message}</p>
          <span className="flex-shrink-0 text-xs text-gray-400">
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <SourceIcon className="h-3 w-3" />
            {event.source}
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{event.type}</span>
        </div>
      </div>
    </div>
  );
}
