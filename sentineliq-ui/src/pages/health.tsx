import { useState, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useSystemHealthStore } from '../stores';
import { healthService } from '../services/healthService';
import { AnalyticsChart } from '../components/dashboard/analytics-chart';
import { Button } from '../components/ui/button';
import { toast } from '../components/ui/toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Server,
  Database,
  HardDrive,
  Cloud,
  Wifi,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cpu,
  MemoryStick,
  AlertCircle,
} from 'lucide-react';
import type { ServiceHealth, SystemStatus } from '../types';

const statusConfig: Record<SystemStatus, { color: string; bg: string; text: string; icon: React.ElementType }> = {
  healthy: { color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'Operational', icon: CheckCircle },
  degraded: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'Degraded', icon: AlertTriangle },
  critical: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', text: 'Critical', icon: XCircle },
  unknown: { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', text: 'Unknown', icon: RefreshCw },
};

const serviceIcons: Record<string, React.ElementType> = {
  api: Server,
  database: Database,
  redis: HardDrive,
  storage: Cloud,
  network: Wifi,
};

export function HealthPage() {
  const { services, overallStatus, lastCheck, setServices } = useSystemHealthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latencyData, setLatencyData] = useState<Array<{ name: string; value: number }>>([]);

  // Load health status on mount
  const loadHealthStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await healthService.getStatus();
      // setServices automatically updates overallStatus and lastCheck
      setServices(status.services);
      
      // Load latency history for chart
      const latency = await healthService.getLatencyHistory();
      setLatencyData(latency);
    } catch (err) {
      setError('Failed to load health status. Backend may be unavailable.');
      console.error('Error loading health status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setServices]);

  useEffect(() => {
    loadHealthStatus();
  }, [loadHealthStatus]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const status = await healthService.refresh();
      // setServices automatically updates overallStatus and lastCheck
      setServices(status.services);
      
      toast('success', 'Health check complete', 'All services have been checked');
    } catch (err) {
      toast('error', 'Health check failed', 'Could not refresh service status');
    } finally {
      setIsRefreshing(false);
    }
  }, [setServices]);

  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={loadHealthStatus}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor infrastructure and service health
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          isLoading={isRefreshing}
          loadingText="Checking..."
          leftIcon={<RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />}
        >
          Refresh Status
        </Button>
      </div>

      {/* Overall Status Banner */}
      <div className={cn('rounded-xl border p-6', overallStatus === 'healthy' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20' : overallStatus === 'degraded' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20' : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20')}>
        <div className="flex items-center gap-4">
          <div className={cn('rounded-full p-3', overallConfig.bg)}>
            <OverallIcon className={cn('h-8 w-8', overallConfig.color)} />
          </div>
          <div>
            <h2 className={cn('text-xl font-semibold', overallConfig.color)}>
              {overallStatus === 'healthy' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Partial System Degradation' : 'System Issues Detected'}
            </h2>
            {lastCheck && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last checked {formatDistanceToNow(new Date(lastCheck), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart title="API Latency (24h)" data={latencyData} type="area" color="#3b82f6" height={250} />
        <AnalyticsChart title="Request Volume" data={latencyData.map((d) => ({ ...d, value: d.value * 50 }))} type="bar" color="#10b981" height={250} />
      </div>

      {/* Resource Usage */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Resource Usage</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <ResourceGauge icon={Cpu} label="CPU Usage" value={45} color="blue" />
          <ResourceGauge icon={MemoryStick} label="Memory Usage" value={68} color="purple" />
          <ResourceGauge icon={HardDrive} label="Disk Usage" value={32} color="emerald" />
        </div>
      </div>

      {/* Uptime History */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">90-Day Uptime History</h3>
        </div>
        <div className="p-6">
          <div className="flex gap-0.5">
            {Array.from({ length: 90 }, (_, i) => {
              const status = Math.random() > 0.05 ? 'healthy' : Math.random() > 0.5 ? 'degraded' : 'critical';
              return (
                <div
                  key={i}
                  className={cn(
                    'h-8 w-1.5 rounded-sm transition-colors hover:opacity-80',
                    status === 'healthy' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  title={`Day ${90 - i}: ${statusConfig[status].text}`}
                />
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>90 days ago</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Operational</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Degraded</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Outage</span>
            </div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const config = statusConfig[service.status];
  const Icon = config.icon;
  const ServiceIcon = serviceIcons[service.name.toLowerCase()] || Server;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
            <ServiceIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
            <p className={cn('text-sm', config.color)}>{config.text}</p>
          </div>
        </div>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Latency</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{service.latency}ms</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Uptime</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{service.uptime}%</p>
        </div>
      </div>
    </div>
  );
}

function ResourceGauge({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-500',
    purple: 'text-purple-500 bg-purple-500',
    emerald: 'text-emerald-500 bg-emerald-500',
  };
  const colorClasses = colorMap[color] || colorMap.blue;

  return (
    <div className="text-center">
      <div className="relative mx-auto h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-gray-200 dark:text-gray-700"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={colorClasses.split(' ')[0]}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${value}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={cn('h-6 w-6', colorClasses.split(' ')[0])} />
          <span className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}%</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
