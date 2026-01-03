import { cn } from '@/lib/utils';
import { useSystemHealthStore } from '@/stores';
import { formatDistanceToNow } from 'date-fns';
import {
  Server,
  Database,
  Cloud,
  HardDrive,
  Wifi,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import type { ServiceHealth, SystemStatus } from '@/types';

const statusConfig: Record<SystemStatus, { color: string; bg: string; icon: React.ElementType }> = {
  healthy: { color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle },
  degraded: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: AlertTriangle },
  critical: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
  unknown: { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', icon: RefreshCw },
};

const serviceIcons: Record<string, React.ElementType> = {
  api: Server,
  database: Database,
  redis: HardDrive,
  storage: Cloud,
  network: Wifi,
};

interface SystemHealthWidgetProps {
  className?: string;
}

export function SystemHealthWidget({ className }: SystemHealthWidgetProps) {
  const { services, overallStatus, lastCheck } = useSystemHealthStore();

  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">System Health</h3>
        </div>
        <a href="/health" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
          Details <ChevronRight className="h-4 w-4" />
        </a>
      </div>

      {/* Overall Status */}
      <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', overallConfig.bg)}>
            <OverallIcon className={cn('h-6 w-6', overallConfig.color)} />
          </div>
          <div>
            <p className={cn('text-lg font-semibold capitalize', overallConfig.color)}>
              {overallStatus === 'healthy' ? 'All Systems Operational' : `System ${overallStatus}`}
            </p>
            {lastCheck && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last checked {formatDistanceToNow(new Date(lastCheck), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {services.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm">Loading services...</span>
          </div>
        ) : (
          services.map((service) => <ServiceItem key={service.name} service={service} />)
        )}
      </div>
    </div>
  );
}

function ServiceItem({ service }: { service: ServiceHealth }) {
  const config = statusConfig[service.status];
  const StatusIcon = config.icon;
  const ServiceIcon = serviceIcons[service.name.toLowerCase()] || Server;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-shrink-0 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
        <ServiceIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</p>
          <StatusIcon className={cn('h-4 w-4', config.color)} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {service.uptime.toFixed(2)}% uptime
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{service.latency}ms</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">latency</p>
      </div>
    </div>
  );
}
