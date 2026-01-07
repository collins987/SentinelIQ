import { useEffect, useState, useCallback } from 'react';
import { MetricCard } from '../components/ui/metric-card';
import { ActivityFeed } from '../components/dashboard/activity-feed';
import { JobQueueWidget } from '../components/dashboard/job-queue-widget';
import { SystemHealthWidget } from '../components/dashboard/system-health-widget';
import { AnalyticsChart } from '../components/dashboard/analytics-chart';
import { useDashboardStore, useEventsStore } from '../stores';
import { useWebSocket } from '../lib/websocket';
import { dashboardService, type DashboardMetrics } from '../services/dashboardService';
import { toast } from '../components/ui/toast';
import {
  Users,
  Activity,
  Zap,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export function DashboardPage() {
  const { setMetrics } = useDashboardStore();
  const { setEvents } = useEventsStore();
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket connection
  useWebSocket();

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getMetrics();
      setDashboardData(data);
      
      // Update stores for components that depend on them
      setMetrics({
        totalUsers: data.totalUsers,
        activeJobs: data.activeUsers,
        systemHealth: 'healthy',
        alertCount: data.highRiskEvents,
        apiRequests24h: data.totalEvents,
        errorRate: 100 - data.successRate,
        avgResponseTime: data.avgResponseTime,
      });
      
      // Transform activity for events store
      setEvents(data.recentActivity.map((activity: { type: string; severity: 'info' | 'warning' | 'error' | 'critical'; description: string; timestamp: string }, idx: number) => ({
        id: `event-${idx}`,
        type: activity.type,
        severity: activity.severity,
        message: activity.description,
        source: 'system',
        timestamp: activity.timestamp,
      })));
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMsg);
      toast('error', 'Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [setMetrics, setEvents]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time overview of your system's health and activity
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={loadDashboardData} className="text-sm font-medium hover:underline">
            Retry
          </button>
        </div>
      )}

      {isLoading && !dashboardData ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      ) : dashboardData ? (
        <>
          {/* Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={dashboardData.totalUsers.toLocaleString()}
              icon={Users}
              trend={{ value: 12.5, direction: 'up', label: 'from last month' }}
              loading={false}
            />
            <MetricCard
              title="Active Users"
              value={dashboardData.activeUsers.toLocaleString()}
              icon={Activity}
              trend={{ value: 8.3, direction: 'up', label: 'online now' }}
              loading={false}
            />
            <MetricCard
              title="Total Events"
              value={dashboardData.totalEvents.toLocaleString()}
              icon={Zap}
              trend={{ value: 15.2, direction: 'up', label: 'from last week' }}
              loading={false}
            />
            <MetricCard
              title="Avg Response Time"
              value={`${dashboardData.avgResponseTime}ms`}
              icon={Clock}
              trend={{ value: 5.1, direction: 'down', label: 'improvement' }}
              loading={false}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Risk Trends (30 Days)"
              data={dashboardData.riskTrends.map((d: { date: string; critical: number; high: number; medium: number; low: number }) => ({
                name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: d.high + d.critical,
                secondary: d.medium + d.low,
              }))}
              type="area"
              color="#3b82f6"
              secondaryColor="#10b981"
            />
            <AnalyticsChart
              title="Events by Category"
              data={dashboardData.eventsByCategory.map((c: { category: string; count: number }) => ({
                name: c.category,
                value: c.count,
              }))}
              type="bar"
              color="#8b5cf6"
            />
          </div>

          {/* Widgets Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            <ActivityFeed className="lg:col-span-1" maxItems={8} />
            <JobQueueWidget className="lg:col-span-1" />
            <SystemHealthWidget className="lg:col-span-1" />
          </div>
        </>
      ) : null}
    </div>
  );
}
