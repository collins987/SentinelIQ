import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MetricCard } from '@/components/ui/metric-card';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
} from 'lucide-react';

const generateTimeSeriesData = (days: number) =>
  Array.from({ length: days }, (_, i) => ({
    name: `Day ${i + 1}`,
    value: Math.floor(Math.random() * 10000) + 5000,
    secondary: Math.floor(Math.random() * 3000) + 1000,
  }));

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const chartData = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return generateTimeSeriesData(days);
  }, [dateRange]);

  const topEndpoints = [
    { path: '/api/v1/users', method: 'GET', calls: 45892, avgLatency: 45, errorRate: 0.1 },
    { path: '/api/v1/auth/login', method: 'POST', calls: 23451, avgLatency: 120, errorRate: 0.5 },
    { path: '/api/v1/events', method: 'GET', calls: 18234, avgLatency: 89, errorRate: 0.2 },
    { path: '/api/v1/jobs', method: 'GET', calls: 12567, avgLatency: 67, errorRate: 0.1 },
    { path: '/api/v1/health', method: 'GET', calls: 9823, avgLatency: 12, errorRate: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">System performance and usage metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  dateRange === range ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400'
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Requests" value="1.2M" icon={Activity} trend={{ value: 12.5, direction: 'up', label: 'vs last period' }} />
        <MetricCard title="Avg Response Time" value="89ms" icon={Clock} trend={{ value: 8.2, direction: 'down', label: 'improvement' }} />
        <MetricCard title="Error Rate" value="0.12%" icon={TrendingUp} trend={{ value: 2.1, direction: 'down', label: 'reduction' }} />
        <MetricCard title="Active Users" value="2,847" icon={Users} trend={{ value: 15.3, direction: 'up', label: 'growth' }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart title="Request Volume" data={chartData} type="area" color="#3b82f6" secondaryColor="#10b981" height={300} />
        <AnalyticsChart title="Response Time Distribution" data={chartData.map((d) => ({ ...d, value: Math.floor(d.value / 100) }))} type="bar" color="#8b5cf6" height={300} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Top API Endpoints</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {topEndpoints.map((endpoint, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30')}>
                    {endpoint.method}
                  </span>
                  <span className="font-mono text-sm text-gray-900 dark:text-white">{endpoint.path}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{endpoint.calls.toLocaleString()} calls</span>
                  <span className="text-gray-500">{endpoint.avgLatency}ms</span>
                  <span className={cn(endpoint.errorRate > 0.3 ? 'text-red-500' : 'text-emerald-500')}>{endpoint.errorRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Geographic Distribution</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { country: 'United States', percentage: 45, requests: '540K' },
                { country: 'Germany', percentage: 22, requests: '264K' },
                { country: 'United Kingdom', percentage: 15, requests: '180K' },
                { country: 'Japan', percentage: 10, requests: '120K' },
                { country: 'Other', percentage: 8, requests: '96K' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 dark:text-white">{item.country}</span>
                    <span className="text-gray-500">{item.requests} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
