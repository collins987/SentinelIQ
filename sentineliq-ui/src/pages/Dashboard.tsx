import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { JobQueueWidget } from '@/components/dashboard/job-queue-widget';
import { SystemHealthWidget } from '@/components/dashboard/system-health-widget';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import { useDashboardStore, useEventsStore, useJobsStore, useSystemHealthStore } from '@/stores';
import { useWebSocket } from '@/lib/websocket';
import {
  Users,
  Activity,
  Server,
  AlertTriangle,
  Zap,
  Clock,
} from 'lucide-react';

// Mock data generator for demo
const generateMockData = () => ({
  metrics: {
    totalUsers: 2847,
    activeJobs: 12,
    systemHealth: 'healthy' as const,
    alertCount: 3,
    apiRequests24h: 45892,
    errorRate: 0.12,
    avgResponseTime: 124,
  },
  chartData: Array.from({ length: 7 }, (_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.floor(Math.random() * 5000) + 2000,
    secondary: Math.floor(Math.random() * 1000) + 500,
  })),
  events: [
    { id: '1', type: 'user.login', severity: 'info' as const, message: 'User admin@example.com logged in', source: 'auth', timestamp: new Date().toISOString() },
    { id: '2', type: 'job.completed', severity: 'info' as const, message: 'Report generation job completed successfully', source: 'job', timestamp: new Date(Date.now() - 60000).toISOString() },
    { id: '3', type: 'api.error', severity: 'error' as const, message: 'Rate limit exceeded for IP 192.168.1.100', source: 'api', timestamp: new Date(Date.now() - 120000).toISOString() },
    { id: '4', type: 'system.alert', severity: 'warning' as const, message: 'High memory usage detected on worker-01', source: 'system', timestamp: new Date(Date.now() - 180000).toISOString() },
  ],
  jobs: [
    { id: 'j1', name: 'Generate Monthly Report', type: 'report', status: 'running' as const, progress: 67, createdAt: new Date().toISOString(), retryCount: 0, maxRetries: 3, queue: 'default' },
    { id: 'j2', name: 'Send Email Notifications', type: 'notification', status: 'pending' as const, progress: 0, createdAt: new Date().toISOString(), retryCount: 0, maxRetries: 3, queue: 'email' },
    { id: 'j3', name: 'Data Sync - External API', type: 'sync', status: 'completed' as const, progress: 100, createdAt: new Date(Date.now() - 300000).toISOString(), retryCount: 0, maxRetries: 3, queue: 'sync' },
    { id: 'j4', name: 'Cleanup Old Sessions', type: 'maintenance', status: 'failed' as const, progress: 45, createdAt: new Date(Date.now() - 600000).toISOString(), retryCount: 2, maxRetries: 3, queue: 'maintenance', error: 'Connection timeout' },
  ],
  services: [
    { name: 'API', status: 'healthy' as const, latency: 45, uptime: 99.98, lastCheck: new Date().toISOString() },
    { name: 'Database', status: 'healthy' as const, latency: 12, uptime: 99.99, lastCheck: new Date().toISOString() },
    { name: 'Redis', status: 'healthy' as const, latency: 2, uptime: 100, lastCheck: new Date().toISOString() },
    { name: 'Storage', status: 'degraded' as const, latency: 230, uptime: 98.5, lastCheck: new Date().toISOString() },
  ],
});

export function DashboardPage() {
  const { setMetrics, metrics, isLoading } = useDashboardStore();
  const { setEvents } = useEventsStore();
  const { setJobs } = useJobsStore();
  const { setServices } = useSystemHealthStore();
  const [chartData, setChartData] = useState<Array<{ name: string; value: number; secondary?: number }>>([]);

  // Initialize WebSocket connection
  useWebSocket();

  // Load initial data
  useEffect(() => {
    const mockData = generateMockData();
    setMetrics(mockData.metrics);
    setEvents(mockData.events);
    setJobs(mockData.jobs);
    setServices(mockData.services);
    setChartData(mockData.chartData);
  }, [setMetrics, setEvents, setJobs, setServices]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real-time overview of your system's health and activity
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers.toLocaleString() ?? '-'}
          icon={Users}
          trend={{ value: 12.5, direction: 'up', label: 'from last month' }}
          loading={isLoading}
        />
        <MetricCard
          title="Active Jobs"
          value={metrics?.activeJobs ?? '-'}
          icon={Activity}
          trend={{ value: 3, direction: 'up', label: 'running now' }}
          loading={isLoading}
        />
        <MetricCard
          title="API Requests (24h)"
          value={metrics?.apiRequests24h.toLocaleString() ?? '-'}
          icon={Zap}
          trend={{ value: 8.2, direction: 'up', label: 'from yesterday' }}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${metrics?.avgResponseTime ?? '-'}ms`}
          icon={Clock}
          trend={{ value: 5.1, direction: 'down', label: 'improvement' }}
          loading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart
          title="API Requests"
          data={chartData}
          type="area"
          color="#3b82f6"
          secondaryColor="#10b981"
        />
        <AnalyticsChart
          title="Error Rate"
          data={chartData.map((d) => ({ ...d, value: Math.floor(d.value / 100) }))}
          type="bar"
          color="#ef4444"
        />
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ActivityFeed className="lg:col-span-1" maxItems={8} />
        <JobQueueWidget className="lg:col-span-1" />
        <SystemHealthWidget className="lg:col-span-1" />
      </div>
    </div>
  );
}
