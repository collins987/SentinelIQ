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
import { RefreshCw, AlertTriangle, Clock, User, Activity } from 'lucide-react';

interface AuditEntry {
  id: string;
  action?: string;
  event?: string;
  event_type?: string;
  resource_type?: string;
  resource?: string;
  user_id?: string;
  user_email?: string;
  user?: string;
  ip_address?: string;
  timestamp?: string;
  created_at?: string;
  status?: string;
  details?: Record<string, unknown>;
}

interface AuditResponse {
  entries?: AuditEntry[];
  data?: AuditEntry[];
  items?: AuditEntry[];
  logs?: AuditEntry[];
  total?: number;
  count?: number;
}

function AuditLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <Card>
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Audit() {
  const { data, isLoading, isError, error, refetch } = useApiQuery<AuditResponse>(
    API_ENDPOINTS.AUDIT.LIST,
    {
      fallbackEndpoints: API_ENDPOINTS.AUDIT.FALLBACKS,
    }
  );

  if (isLoading) return <AuditLoading />;

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Audit Trail</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error?.message || 'Unable to load audit logs.'}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const entries: AuditEntry[] = data?.entries || data?.data || data?.items || data?.logs || (Array.isArray(data) ? data : []);
  const total = data?.total || data?.count || entries.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">System activity logs</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>{total} entr{total !== 1 ? 'ies' : 'y'}</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No audit entries</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(entry.timestamp || entry.created_at || '').toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.user_email || entry.user || entry.user_id || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {entry.action || entry.event || entry.event_type || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.resource_type || entry.resource || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'success' ? 'outline' : 'destructive'}>
                        {entry.status || 'success'}
                      </Badge>
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
