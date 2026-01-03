import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useEventsStore } from '@/stores';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Activity,
  Filter,
  Download,
  RefreshCw,
  Info,
  AlertTriangle,
  XCircle,
  Search,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import type { SystemEvent, EventSeverity } from '@/types';

const severityConfig: Record<EventSeverity, { color: string; bg: string; icon: React.ElementType }> = {
  info: { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Info },
  warning: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: AlertTriangle },
  error: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
  critical: { color: 'text-red-600', bg: 'bg-red-200 dark:bg-red-900/50', icon: XCircle },
};

export function ActivityPage() {
  const { events, markAllRead } = useEventsStore();
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const sources = useMemo(() => {
    const uniqueSources = new Set(events.map((e) => e.source));
    return ['all', ...Array.from(uniqueSources)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
      if (sourceFilter !== 'all' && event.source !== sourceFilter) return false;
      if (searchQuery && !event.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [events, severityFilter, sourceFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: events.length,
    info: events.filter((e) => e.severity === 'info').length,
    warning: events.filter((e) => e.severity === 'warning').length,
    error: events.filter((e) => e.severity === 'error' || e.severity === 'critical').length,
  }), [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time system events and activity monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Events" value={stats.total} color="text-gray-600" />
        <StatCard label="Info" value={stats.info} color="text-blue-600" />
        <StatCard label="Warnings" value={stats.warning} color="text-amber-600" />
        <StatCard label="Errors" value={stats.error} color="text-red-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as EventSeverity | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          {sources.map((source) => (
            <option key={source} value={source}>
              {source === 'all' ? 'All Sources' : source}
            </option>
          ))}
        </select>
      </div>

      {/* Events List */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredEvents.length} events
            </span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Activity className="mb-2 h-8 w-8" />
              <p>No events found</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <EventItem
                key={event.id}
                event={event}
                expanded={expandedEvent === event.id}
                onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function EventItem({ event, expanded, onToggle }: { event: SystemEvent; expanded: boolean; onToggle: () => void }) {
  const config = severityConfig[event.severity];
  const Icon = config.icon;

  return (
    <div className="px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex cursor-pointer items-start gap-3" onClick={onToggle}>
        <div className={cn('flex-shrink-0 rounded-full p-1.5', config.bg)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-900 dark:text-white">{event.message}</p>
            <span className="flex-shrink-0 text-xs text-gray-400">
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">{event.source}</span>
            <span>{event.type}</span>
          </div>
        </div>

        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', expanded && 'rotate-180')} />
      </div>

      {expanded && (
        <div className="mt-3 ml-9 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Event ID</span>
              <span className="font-mono text-gray-900 dark:text-white">{event.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Timestamp</span>
              <span className="text-gray-900 dark:text-white">{format(new Date(event.timestamp), 'PPpp')}</span>
            </div>
            {event.userId && (
              <div className="flex justify-between">
                <span className="text-gray-500">User ID</span>
                <span className="text-gray-900 dark:text-white">{event.userId}</span>
              </div>
            )}
            {event.metadata && (
              <div className="mt-2">
                <span className="text-gray-500">Metadata</span>
                <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-2 text-xs text-gray-300">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
