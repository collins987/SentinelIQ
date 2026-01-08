import { useApiQuery } from '@/hooks/use-api-query';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Users,
  WifiOff
} from 'lucide-react';

// Types - adjust these to match your actual backend response
interface DashboardStats {
  total_alerts?: number;
  active_alerts?: number;
  resolved_alerts?: number;
  total_jobs?: number;
  running_jobs?: number;
  total_users?: number;
  active_users?: number;
  // Add any other fields your backend returns
  [key: string]: unknown;
}

interface RecentActivity {
  id: string;
  type?: string;
  description?: string;
  message?: string;
  timestamp?: string;
  created_at?: string;
  user?: string;
  user_email?: string;
}

interface DashboardResponse {
  stats?: DashboardStats;
  recent_activity?: RecentActivity[];
  // Your backend might return data differently
  data?: DashboardStats;
  activities?: RecentActivity[];
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Error state
function DashboardError({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const isNetworkError = error?.message?.includes('connect') || error?.message?.includes('Network');
  
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Alert variant="destructive" className="max-w-lg">
        {isNetworkError ? <WifiOff className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <AlertTitle>{isNetworkError ? 'Connection Error' : 'Failed to Load Dashboard'}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">{error?.message || 'Unable to load dashboard data.'}</p>
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Stat card
function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon 
}: { 
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value ?? 0}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch, actualEndpoint } = useApiQuery<DashboardResponse>(
    API_ENDPOINTS.DASHBOARD.STATS,
    {
      fallbackEndpoints: API_ENDPOINTS.DASHBOARD.FALLBACKS,
    }
  );

  // Show which endpoint worked in dev mode
  if (import.meta.env.DEV && actualEndpoint) {
    console.log(`[Dashboard] Using endpoint: ${actualEndpoint}`);
  }

  // Handle loading
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Handle error
  if (isError) {
    return <DashboardError error={error} onRetry={refetch} />;
  }

  // Normalize data (handle different response structures)
  const stats: DashboardStats = data?.stats || data?.data || data || {};
  const activities: RecentActivity[] = data?.recent_activity || data?.activities || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Security monitoring overview</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Alerts"
          value={stats.total_alerts ?? 0}
          description={`${stats.active_alerts ?? 0} active`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Resolved"
          value={stats.resolved_alerts ?? 0}
          description="Alerts resolved"
          icon={CheckCircle}
        />
        <StatCard
          title="Active Jobs"
          value={stats.running_jobs ?? 0}
          description={`${stats.total_jobs ?? 0} total`}
          icon={Activity}
        />
        <StatCard
          title="Users"
          value={stats.total_users ?? 0}
          description={`${stats.active_users ?? 0} active`}
          icon={Users}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system events</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                  <div className="rounded-full bg-muted p-2">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.description || activity.message || 'Activity'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp || activity.created_at || '').toLocaleString()}
                      {(activity.user || activity.user_email) && ` • ${activity.user || activity.user_email}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
