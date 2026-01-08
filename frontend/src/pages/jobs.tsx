import { useState } from 'react';
import { useApiQuery, useApiMutation } from '@/hooks/use-api-query';
import { PageLoadingState } from '@/components/loading-state';
import { PageErrorState } from '@/components/error-state';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

// Types
interface Job {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  created_at: string;
  updated_at: string;
  progress?: number;
  error_message?: string;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  page_size: number;
}

// Status badge component
function JobStatusBadge({ status }: { status: Job['status'] }) {
  const variants: Record<Job['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
    pending: { variant: 'secondary', icon: Clock },
    running: { variant: 'default', icon: Loader2 },
    completed: { variant: 'outline', icon: CheckCircle },
    failed: { variant: 'destructive', icon: XCircle },
    paused: { variant: 'secondary', icon: Pause },
  };

  const { variant, icon: Icon } = variants[status];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Jobs content component
function JobsContent() {
  const [page, setPage] = useState(1);
  
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useApiQuery<JobsResponse>(`/api/v1/jobs?page=${page}&page_size=10`, {
    refetchInterval: 10000, // Refresh every 10 seconds for job status updates
  });

  const { mutate: triggerJob, isLoading: isTriggering } = useApiMutation<Job, { jobId: string }>(
    'post',
    (vars) => `/api/v1/jobs/${vars.jobId}/trigger`,
    {
      onSuccess: () => refetch(),
    }
  );

  if (isLoading) {
    return <PageLoadingState message="Loading jobs..." />;
  }

  if (isError || !data) {
    return (
      <PageErrorState 
        error={error || 'Failed to load jobs'} 
        onRetry={refetch}
        pageName="jobs"
      />
    );
  }

  const { jobs, total } = data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Manage and monitor background jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </div>
      </div>

      {/* Jobs table */}
      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>
            {total} total job{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No jobs found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>{job.type}</TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      {job.progress !== undefined ? `${job.progress}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(job.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {job.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => triggerJob({ jobId: job.id })}
                            disabled={isTriggering}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {job.status === 'running' && (
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export wrapped with error boundary
export default function Jobs() {
  return (
    <ErrorBoundary>
      <JobsContent />
    </ErrorBoundary>
  );
}
