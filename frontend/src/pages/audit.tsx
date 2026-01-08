import { useState } from 'react';
import { useApiQuery } from '@/hooks/use-api-query';
import { PageLoadingState } from '@/components/loading-state';
import { PageErrorState } from '@/components/error-state';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  RefreshCw,
  Search,
  Download,
  Filter,
  Clock,
  User,
  Activity
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  user_id: string;
  user_email: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  status: 'success' | 'failure';
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  page_size: number;
}

// Action badge component
function ActionBadge({ action }: { action: string }) {
  const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    create: 'default',
    update: 'secondary',
    delete: 'destructive',
    login: 'outline',
    logout: 'outline',
    view: 'outline',
  };

  const variant = actionColors[action.toLowerCase()] || 'secondary';

  return (
    <Badge variant={variant}>
      {action}
    </Badge>
  );
}

// Audit content component
function AuditContent() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: '20',
    ...(searchQuery && { search: searchQuery }),
    ...(actionFilter !== 'all' && { action: actionFilter }),
  });

  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useApiQuery<AuditResponse>(`/api/v1/audit?${queryParams.toString()}`);

  if (isLoading) {
    return <PageLoadingState message="Loading audit trail..." />;
  }

  if (isError || !data) {
    return (
      <PageErrorState 
        error={error || 'Failed to load audit trail'} 
        onRetry={refetch}
        pageName="audit trail"
      />
    );
  }

  const { entries, total } = data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user, action, or resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {total} total entr{total !== 1 ? 'ies' : 'y'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit entries found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={entry.action} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.resource_type}</span>
                        {entry.resource_id && (
                          <span className="text-xs text-muted-foreground">
                            ({entry.resource_id.slice(0, 8)}...)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'success' ? 'outline' : 'destructive'}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.ip_address || '-'}
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
export default function Audit() {
  return (
    <ErrorBoundary>
      <AuditContent />
    </ErrorBoundary>
  );
}
