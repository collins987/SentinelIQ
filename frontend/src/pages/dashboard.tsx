import { useApiQuery } from '@/hooks/use-api-query';
import { PageLoadingState } from '@/components/loading-state';
import { PageErrorState } from '@/components/error-state';
import { ErrorBoundary } from '@/components/error-boundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Shield, 
  Users 
} from 'lucide-react';

// Types for dashboard data
interface DashboardStats {
  total_alerts: number;
  active_alerts: number;
  resolved_alerts: number;
  total_jobs: number;
  running_jobs: number;
  total_users: number;
  active_users: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface DashboardData {
  stats: DashboardStats;
  recent_activity: RecentActivity[];
}

// Stat card component
function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  trend 
}: { 
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Dashboard content component
function DashboardContent() {
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useApiQuery<DashboardData>('/api/v1/dashboard/stats', {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <PageLoadingState message="Loading dashboard..." />;
  }

  if (isError || !data) {
    return (
      <PageErrorState 
        error={error || 'Failed to load dashboard data'} 
        onRetry={refetch}
        pageName="dashboard"
      />
    );
  }

  const { stats, recent_activity } = data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your security monitoring system
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Alerts"
          value={stats.total_alerts}
          description={`${stats.active_alerts} active`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Resolved"
          value={stats.resolved_alerts}
          description="Alerts resolved"
          icon={CheckCircle}
        />
        <StatCard
          title="Active Jobs"
          value={stats.running_jobs}
          description={`${stats.total_jobs} total`}
          icon={Activity}
        />
        <StatCard
          title="Users"
          value={stats.total_users}
          description={`${stats.active_users} active`}
          icon={Users}
        />
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system events and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {recent_activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            <div className="space-y-4">
              {recent_activity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="rounded-full bg-muted p-2">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                      {activity.user && (
                        <>
                          <span>•</span>
                          <span>{activity.user}</span>
                        </>
                      )}
                    </div>
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

// Export wrapped with error boundary
export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
