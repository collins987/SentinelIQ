import { useApiQuery } from '@/hooks/use-api-query';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, Pause, Play } from 'lucide-react';

// Types
interface Job {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  job_type?: string;
  status: string;
  progress?: number;
  created_at?: string;
  updated_at?: string;
  error_message?: string;
}

interface JobsResponse {
  jobs?: Job[];
  data?: Job[];
  items?: Job[];
  total?: number;
  count?: number;
}

// Loading skeleton component
function JobsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
    pending: { variant: 'secondary', icon: Clock },
    running: { variant: 'default', icon: Loader2 },
    completed: { variant: 'outline', icon: CheckCircle },
    success: { variant: 'outline', icon: CheckCircle },
    failed: { variant: 'destructive', icon: XCircle },
    error: { variant: 'destructive', icon: XCircle },
    paused: { variant: 'secondary', icon: Pause },
  };

  const config = statusConfig[status.toLowerCase()] || { variant: 'secondary' as const, icon: Clock };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status.toLowerCase() === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </Badge>
  );
}

// Jobs content component
function JobsContent() {
  const { data, isLoading, isError, error, refetch } = useApiQuery<JobsResponse>(
    API_ENDPOINTS.JOBS.LIST,
    {
      fallbackEndpoints: API_ENDPOINTS.JOBS.FALLBACKS,
    }
  );

  if (isLoading) return <JobsLoading />;

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Jobs</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error?.message || 'Unable to load jobs data.'}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Normalize response
  const jobs: Job[] = data?.jobs || data?.data || data?.items || (Array.isArray(data) ? data : []);
  const total = data?.total || data?.count || jobs.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage background jobs</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Jobs table */}
      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>
            {total} job{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No jobs found</p>
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
                    <TableCell className="font-medium">{job.name || job.title || job.id}</TableCell>
                    <TableCell>{job.type || job.job_type || '-'}</TableCell>
                    <TableCell><StatusBadge status={job.status} /></TableCell>
                    <TableCell>{job.progress !== undefined ? `${job.progress}%` : '-'}</TableCell>
                    <TableCell>{job.created_at ? new Date(job.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
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
    <JobsContent />
  );
}
