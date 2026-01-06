import { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useJobsStore } from '../stores';
import { DataTable } from '../components/ui/data-table';
import { StatusBadge } from '../components/ui/status-badge';
import { Modal, ConfirmModal } from '../components/ui/modal';
import { Button } from '../components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from '../components/ui/toast';
import { useAsyncAction, copyToClipboard, simulateApiDelay } from '../hooks/useActions';
import type { ColumnDef } from '@tanstack/react-table';
import type { BackgroundJob, JobStatus } from '../types';
import { jobsService } from '../services/jobsService';
import {
  ListTodo,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  X,
  Terminal,
  Copy,
  Loader2,
} from 'lucide-react';

const statusVariants: Record<JobStatus, 'default' | 'success' | 'warning' | 'error' | 'processing'> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  retrying: 'warning',
  cancelled: 'default',
};

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className={cn('rounded-lg bg-gray-100 p-2 dark:bg-gray-800', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function JobDetailPanel({ job, onClose, onRetry, onCancel }: { job: BackgroundJob; onClose: () => void; onRetry: (job: BackgroundJob) => void; onCancel: (job: BackgroundJob) => void }) {
  const [showLogs, setShowLogs] = useState(false);
  const { isLoading: retryLoading, execute: executeRetry } = useAsyncAction();
  const { isLoading: cancelLoading, execute: executeCancel } = useAsyncAction();

  // Mock logs for demonstration
  const mockLogs = [
    `[${format(new Date(job.createdAt), 'HH:mm:ss')}] Job ${job.id} created`,
    `[${format(new Date(job.createdAt), 'HH:mm:ss')}] Queue: ${job.queue}`,
    job.startedAt ? `[${format(new Date(job.startedAt), 'HH:mm:ss')}] Job started processing` : null,
    job.status === 'running' ? `[${format(new Date(), 'HH:mm:ss')}] Progress: ${job.progress}%` : null,
    job.error ? `[${format(new Date(), 'HH:mm:ss')}] ERROR: ${job.error}` : null,
    job.completedAt ? `[${format(new Date(job.completedAt), 'HH:mm:ss')}] Job completed successfully` : null,
  ].filter(Boolean);

  const handleRetry = async () => {
    await executeRetry(
      async () => {
        await simulateApiDelay();
        onRetry(job);
      },
      { successMessage: 'Job queued for retry' }
    );
  };

  const handleCancel = async () => {
    await executeCancel(
      async () => {
        await simulateApiDelay();
        onCancel(job);
      },
      { successMessage: 'Job cancelled' }
    );
  };

  const handleCopyMetadata = () => {
    if (job.metadata) {
      copyToClipboard(JSON.stringify(job.metadata, null, 2), 'Metadata');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{job.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {job.id}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Status & Progress */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                  <StatusBadge variant={statusVariants[job.status]} size="lg">
                    {job.status}
                  </StatusBadge>
                </div>
                {job.status === 'running' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{job.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <DetailRow label="Type" value={job.type} />
                <DetailRow label="Queue" value={job.queue} />
                <DetailRow label="Created" value={format(new Date(job.createdAt), 'PPpp')} />
                {job.startedAt && <DetailRow label="Started" value={format(new Date(job.startedAt), 'PPpp')} />}
                {job.completedAt && <DetailRow label="Completed" value={format(new Date(job.completedAt), 'PPpp')} />}
                <DetailRow label="Retries" value={`${job.retryCount} / ${job.maxRetries}`} />
              </div>

              {/* Error */}
              {job.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Error</span>
                  </div>
                  <p className="mt-2 text-sm text-red-700 dark:text-red-300">{job.error}</p>
                </div>
              )}

              {/* Metadata */}
              {job.metadata && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Metadata</span>
                    <button 
                      onClick={handleCopyMetadata}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                      title="Copy metadata"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-300">
                    {JSON.stringify(job.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Logs Panel */}
              {showLogs && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Execution Logs</span>
                    <button 
                      onClick={() => copyToClipboard(mockLogs.join('\n'), 'Logs')}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                      title="Copy logs"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-300 font-mono">
                    {mockLogs.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              {job.status === 'failed' && (
                <Button
                  onClick={handleRetry}
                  isLoading={retryLoading}
                  loadingText="Retrying..."
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  className="flex-1"
                >
                  Retry Job
                </Button>
              )}
              {job.status === 'running' && (
                <Button
                  variant="danger"
                  onClick={handleCancel}
                  isLoading={cancelLoading}
                  loadingText="Cancelling..."
                  leftIcon={<XCircle className="h-4 w-4" />}
                  className="flex-1"
                >
                  Cancel Job
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowLogs(!showLogs)}
                leftIcon={<Terminal className="h-4 w-4" />}
              >
                {showLogs ? 'Hide Logs' : 'View Logs'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

export function JobsPage() {
  const { filter, setFilter } = useJobsStore();
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<BackgroundJob | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: actionLoading, execute: executeAction } = useAsyncAction();

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await jobsService.list();
      setJobs(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load jobs';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRetryJob = useCallback(async (job: BackgroundJob) => {
    await executeAction(
      async () => {
        await jobsService.retry(job.id);
        await loadJobs();
      },
      { successMessage: 'Job queued for retry' }
    );
  }, [executeAction, loadJobs]);

  const handleCancelJob = useCallback(async (job: BackgroundJob) => {
    await executeAction(
      async () => {
        await jobsService.cancel(job.id);
        await loadJobs();
        setSelectedJob(null);
      },
      { successMessage: 'Job cancelled' }
    );
  }, [executeAction, loadJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (filter.queue && job.queue !== filter.queue) return false;
      if (filter.search && !job.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [jobs, statusFilter, filter]);

  const columns: ColumnDef<BackgroundJob>[] = [
    {
      accessorKey: 'name',
      header: 'Job Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
          <p className="text-xs text-gray-500">{row.original.type}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge variant={statusVariants[row.original.status]}>
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: ({ row }) => (
        <div className="w-24">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={cn('h-full rounded-full transition-all', row.original.status === 'failed' ? 'bg-red-500' : 'bg-blue-500')}
                style={{ width: `${row.original.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{row.original.progress}%</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'queue',
      header: 'Queue',
      cell: ({ row }) => (
        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {row.original.queue}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); selectJob(row.original); }}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const stats = useMemo(() => ({
    total: jobs.length,
    running: jobs.filter((j) => j.status === 'running').length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  }), [jobs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Background Jobs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monitor and manage background tasks</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <StatCard icon={ListTodo} label="Total Jobs" value={stats.total} color="text-gray-600" />
        <StatCard icon={Play} label="Running" value={stats.running} color="text-purple-600" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="text-blue-600" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="text-emerald-600" />
        <StatCard icon={AlertTriangle} label="Failed" value={stats.failed} color="text-red-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm text-gray-500"><Filter className="h-4 w-4" /> Filter:</span>
        {(['all', 'running', 'pending', 'completed', 'failed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              statusFilter === status
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filteredJobs} searchKey="name" searchPlaceholder="Search jobs..." onRowClick={selectJob} />

      {selectedJob && (
        <JobDetailPanel 
          job={selectedJob} 
          onClose={() => selectJob(null)} 
          onRetry={handleRetryJob}
          onCancel={handleCancelJob}
        />
      )}
    </div>
  );
}
