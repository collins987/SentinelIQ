import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useJobsStore } from '@/stores';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDistanceToNow } from 'date-fns';
import {
  ListTodo,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import type { BackgroundJob, JobStatus } from '@/types';

const statusConfig: Record<JobStatus, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'processing'; icon: React.ElementType }> = {
  pending: { variant: 'default', icon: Clock },
  running: { variant: 'processing', icon: Play },
  completed: { variant: 'success', icon: CheckCircle },
  failed: { variant: 'error', icon: XCircle },
  retrying: { variant: 'warning', icon: RefreshCw },
  cancelled: { variant: 'default', icon: Pause },
};

interface JobQueueWidgetProps {
  className?: string;
  maxItems?: number;
}

export function JobQueueWidget({ className, maxItems = 5 }: JobQueueWidgetProps) {
  const { jobs, selectJob } = useJobsStore();

  const recentJobs = useMemo(() => jobs.slice(0, maxItems), [jobs, maxItems]);

  const stats = useMemo(() => {
    const running = jobs.filter((j) => j.status === 'running').length;
    const pending = jobs.filter((j) => j.status === 'pending').length;
    const failed = jobs.filter((j) => j.status === 'failed').length;
    return { running, pending, failed, total: jobs.length };
  }, [jobs]);

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Job Queue</h3>
        </div>
        <a href="/jobs" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
          View all <ChevronRight className="h-4 w-4" />
        </a>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <StatItem label="Running" value={stats.running} color="text-purple-600" />
        <StatItem label="Pending" value={stats.pending} color="text-gray-600" />
        <StatItem label="Failed" value={stats.failed} color="text-red-600" />
        <StatItem label="Total" value={stats.total} color="text-blue-600" />
      </div>

      {/* Jobs List */}
      <div className="max-h-80 overflow-y-auto">
        {recentJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <ListTodo className="mb-2 h-8 w-8" />
            <p className="text-sm">No jobs in queue</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentJobs.map((job) => (
              <JobItem key={job.id} job={job} onClick={() => selectJob(job)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-xl font-bold', color)}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function JobItem({ job, onClick }: { job: BackgroundJob; onClick: () => void }) {
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  return (
    <div
      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
      onClick={onClick}
    >
      <div className="flex-shrink-0">
        <StatusIcon className={cn('h-4 w-4', job.status === 'running' && 'animate-spin text-purple-500')} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{job.name}</p>
          <StatusBadge variant={config.variant} size="sm">
            {job.status}
          </StatusBadge>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{job.queue}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
        </div>
      </div>

      {job.status === 'running' && (
        <div className="flex-shrink-0">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="mt-0.5 text-right text-xs text-gray-400">{job.progress}%</p>
        </div>
      )}

      {job.retryCount > 0 && (
        <span className="flex-shrink-0 text-xs text-amber-500">
          Retry {job.retryCount}/{job.maxRetries}
        </span>
      )}
    </div>
  );
}
