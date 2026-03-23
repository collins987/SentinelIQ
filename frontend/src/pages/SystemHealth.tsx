import { useState } from 'react';
import { useGetSystemHealthQuery, useGetSystemMetricsQuery } from '../services/dashboardApi';
import type { ServiceName } from '../services/dashboardApi';
import { useAppSelector } from '../store/hooks';
import { formatNumber } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ServiceDetailPanel from '../components/health/ServiceDetailPanel';
import clsx from 'clsx';
import {
  ServerIcon,
  CircleStackIcon,
  CpuChipIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  SignalIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function SystemHealth() {
  const { selectedTimeRange } = useAppSelector((state) => state.dashboard);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [selectedService, setSelectedService] = useState<ServiceName | null>(null);
  
  const { data: health, isLoading: healthLoading, error: healthError } = useGetSystemHealthQuery(undefined, { skip: !isAuthenticated, pollingInterval: 30000 });
  const { data: metrics, isLoading: metricsLoading } = useGetSystemMetricsQuery(selectedTimeRange, { skip: !isAuthenticated });
  
  const isLoading = healthLoading || metricsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  const statusConfig = {
    healthy: {
      icon: CheckCircleIcon,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      label: 'All Systems Operational',
    },
    degraded: {
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      label: 'Performance Degraded',
    },
    critical: {
      icon: XCircleIcon,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      label: 'Critical Issues Detected',
    },
  };
  
  const currentStatus = health?.status ? statusConfig[health.status] : statusConfig.healthy;
  const StatusIcon = currentStatus.icon;
  
  const serviceIcons: Record<string, typeof ServerIcon> = {
    database: CircleStackIcon,
    redis: CpuChipIcon,
    kafka: SignalIcon,
    vault: GlobeAltIcon,
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ServerIcon className="h-8 w-8 text-sentinel-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">System Health</h1>
            <p className="text-gray-400 mt-1">
              Monitor infrastructure and service health
            </p>
          </div>
        </div>
        
        <span className="text-sm text-gray-400">
          Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
        </span>
      </div>
      
      {/* Overall Status */}
      <div className={clsx('card', currentStatus.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StatusIcon className={clsx('h-12 w-12', currentStatus.color)} />
            <div>
              <h2 className={clsx('text-2xl font-bold', currentStatus.color)}>
                {currentStatus.label}
              </h2>
              <p className="text-gray-400 mt-1">
                Overall health: {health?.overall_health_percent ?? 0}%
              </p>
            </div>
          </div>
          
          {/* Health Percentage Gauge */}
          <div className="w-32 h-32 relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-dashboard-border"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                className={health?.status === 'healthy' ? 'text-green-500' : health?.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'}
                strokeWidth="8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                style={{
                  strokeDasharray: `${(health?.overall_health_percent ?? 0) * 2.51} 251`,
                  transition: 'stroke-dasharray 0.5s ease',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{health?.overall_health_percent ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Services Grid - Detailed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Card */}
        {health?.services?.database && (() => {
          const svc = health.services.database;
          const isHealthy = svc.status === 'healthy';
          const isUnavailable = svc.status === 'not_configured' || svc.status === 'unavailable';
          return (
            <button onClick={() => setSelectedService('database')} className="card text-left cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CircleStackIcon className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium text-white">Database</h3>
                </div>
                <span className={clsx('w-3 h-3 rounded-full', isHealthy && 'bg-green-500 animate-pulse', isUnavailable && 'bg-gray-500', !isHealthy && !isUnavailable && 'bg-yellow-500 animate-pulse')} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-400">Status</span><span className={clsx('text-sm font-medium', isHealthy ? 'text-green-400' : isUnavailable ? 'text-gray-500' : 'text-yellow-400')}>{svc.status.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Latency</span><span className="text-sm text-white">{svc.latency_ms ?? '-'}ms</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Active Connections</span><span className="text-sm text-white">{svc.connections_active ?? '-'}/{svc.connections_max ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Pool Usage</span><span className="text-sm text-white">{svc.pool_usage_percent ?? '-'}%</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Cache Hit Ratio</span><span className="text-sm text-white">{svc.cache_hit_ratio ?? '-'}%</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Transactions</span><span className="text-sm text-white">{formatNumber(svc.xact_commit ?? 0)} committed</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Rollbacks</span><span className="text-sm text-white">{formatNumber(svc.xact_rollback ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Deadlocks</span><span className={clsx('text-sm', (svc.deadlocks ?? 0) > 0 ? 'text-red-400' : 'text-white')}>{svc.deadlocks ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Slow Queries</span><span className={clsx('text-sm', (svc.slow_queries ?? 0) > 0 ? 'text-yellow-400' : 'text-white')}>{svc.slow_queries ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">DB Size</span><span className="text-sm text-white">{svc.db_size_mb ?? '-'} MB</span></div>
              </div>
              <div className="flex items-center gap-1 text-gray-500 group-hover:text-blue-400 transition-colors mt-3">
                <span className="text-xs">View details</span><ChevronRightIcon className="h-3 w-3" />
              </div>
              {svc.error && <p className="text-xs text-red-400 mt-1">{svc.error}</p>}
            </button>
          );
        })()}

        {/* Redis Card */}
        {health?.services?.redis && (() => {
          const svc = health.services.redis;
          const isHealthy = svc.status === 'healthy';
          const isUnavailable = svc.status === 'not_configured' || svc.status === 'unavailable';
          return (
            <button onClick={() => setSelectedService('redis')} className="card text-left cursor-pointer hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CpuChipIcon className="h-5 w-5 text-red-400" />
                  <h3 className="font-medium text-white">Redis</h3>
                </div>
                <span className={clsx('w-3 h-3 rounded-full', isHealthy && 'bg-green-500 animate-pulse', isUnavailable && 'bg-gray-500', !isHealthy && !isUnavailable && 'bg-yellow-500 animate-pulse')} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-400">Status</span><span className={clsx('text-sm font-medium', isHealthy ? 'text-green-400' : isUnavailable ? 'text-gray-500' : 'text-yellow-400')}>{svc.status.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Latency</span><span className="text-sm text-white">{svc.latency_ms ?? '-'}ms</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Memory Used</span><span className="text-sm text-white">{svc.memory_mb ?? '-'} MB</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Peak Memory</span><span className="text-sm text-white">{svc.memory_peak_mb ?? '-'} MB</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Cache Hit Rate</span><span className="text-sm text-white">{svc.cache_hit_rate ?? '-'}%</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Connected Clients</span><span className="text-sm text-white">{svc.connected_clients ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Blocked Clients</span><span className={clsx('text-sm', (svc.blocked_clients ?? 0) > 0 ? 'text-yellow-400' : 'text-white')}>{svc.blocked_clients ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Evicted Keys</span><span className={clsx('text-sm', (svc.evicted_keys ?? 0) > 0 ? 'text-yellow-400' : 'text-white')}>{svc.evicted_keys ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Total Keys</span><span className="text-sm text-white">{svc.total_keys ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Expired Keys</span><span className="text-sm text-white">{svc.expired_keys ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Fragmentation</span><span className={clsx('text-sm', (svc.mem_fragmentation_ratio ?? 1) > 1.5 ? 'text-yellow-400' : 'text-white')}>{svc.mem_fragmentation_ratio ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Uptime</span><span className="text-sm text-white">{svc.uptime_seconds ? `${Math.floor(svc.uptime_seconds / 3600)}h ${Math.floor((svc.uptime_seconds % 3600) / 60)}m` : '-'}</span></div>
              </div>
              <div className="flex items-center gap-1 text-gray-500 group-hover:text-red-400 transition-colors mt-3">
                <span className="text-xs">View details</span><ChevronRightIcon className="h-3 w-3" />
              </div>
              {svc.error && <p className="text-xs text-red-400 mt-1">{svc.error}</p>}
            </button>
          );
        })()}

        {/* Kafka Card */}
        {health?.services?.kafka && (() => {
          const svc = health.services.kafka;
          const isHealthy = svc.status === 'healthy';
          const isUnavailable = svc.status === 'not_configured' || svc.status === 'unavailable';
          return (
            <button onClick={() => setSelectedService('kafka')} className="card text-left cursor-pointer hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SignalIcon className="h-5 w-5 text-orange-400" />
                  <h3 className="font-medium text-white">Kafka</h3>
                </div>
                <span className={clsx('w-3 h-3 rounded-full', isHealthy && 'bg-green-500 animate-pulse', isUnavailable && 'bg-gray-500', !isHealthy && !isUnavailable && 'bg-yellow-500 animate-pulse')} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-400">Status</span><span className={clsx('text-sm font-medium', isHealthy ? 'text-green-400' : isUnavailable ? 'text-gray-500' : 'text-yellow-400')}>{svc.status.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Consumer Lag</span><span className={clsx('text-sm', (svc.consumer_lag ?? 0) > 100 ? 'text-yellow-400' : 'text-white')}>{svc.consumer_lag ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Partitions</span><span className="text-sm text-white">{svc.partition_count ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Under-replicated</span><span className={clsx('text-sm', (svc.under_replicated_partitions ?? 0) > 0 ? 'text-red-400' : 'text-white')}>{svc.under_replicated_partitions ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Active Producers</span><span className="text-sm text-white">{svc.active_producers ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Active Consumers</span><span className="text-sm text-white">{svc.active_consumers ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Throughput</span><span className="text-sm text-white">{svc.message_throughput_sec != null ? `${svc.message_throughput_sec} msg/s` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Broker Uptime</span><span className="text-sm text-white">{svc.broker_uptime ? `${Math.floor(svc.broker_uptime / 3600)}h` : '-'}</span></div>
              </div>
              <div className="flex items-center gap-1 text-gray-500 group-hover:text-orange-400 transition-colors mt-3">
                <span className="text-xs">View details</span><ChevronRightIcon className="h-3 w-3" />
              </div>
              {svc.error && <p className="text-xs text-red-400 mt-1">{svc.error}</p>}
            </button>
          );
        })()}

        {/* Vault Card */}
        {health?.services?.vault && (() => {
          const svc = health.services.vault;
          const isHealthy = svc.status === 'healthy';
          const isUnavailable = svc.status === 'not_configured' || svc.status === 'unavailable';
          return (
            <button onClick={() => setSelectedService('vault')} className="card text-left cursor-pointer hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-5 w-5 text-purple-400" />
                  <h3 className="font-medium text-white">Vault</h3>
                </div>
                <span className={clsx('w-3 h-3 rounded-full', isHealthy && 'bg-green-500 animate-pulse', isUnavailable && 'bg-gray-500', !isHealthy && !isUnavailable && 'bg-yellow-500 animate-pulse')} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-400">Status</span><span className={clsx('text-sm font-medium', isHealthy ? 'text-green-400' : isUnavailable ? 'text-gray-500' : 'text-yellow-400')}>{svc.status.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Seal Status</span><span className={clsx('text-sm', svc.seal_status === true ? 'text-red-400' : svc.seal_status === false ? 'text-green-400' : 'text-gray-500')}>{svc.seal_status === true ? 'Sealed' : svc.seal_status === false ? 'Unsealed' : '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Token TTL</span><span className={clsx('text-sm', (svc.token_ttl ?? 0) < 300 && svc.token_ttl != null ? 'text-yellow-400' : 'text-white')}>{svc.token_ttl != null ? `${Math.floor(svc.token_ttl / 60)}m ${svc.token_ttl % 60}s` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-400">Lease Count</span><span className="text-sm text-white">{svc.lease_count ?? '-'}</span></div>
                <div className="flex justify-between col-span-2"><span className="text-sm text-gray-400">Mounts Enabled</span><span className="text-sm text-white truncate max-w-[220px]" title={svc.mounts_enabled?.join(', ')}>{svc.mounts_enabled ? svc.mounts_enabled.join(', ') : '-'}</span></div>
              </div>
              <div className="flex items-center gap-1 text-gray-500 group-hover:text-purple-400 transition-colors mt-3">
                <span className="text-xs">View details</span><ChevronRightIcon className="h-3 w-3" />
              </div>
              {svc.error && <p className="text-xs text-red-400 mt-1">{svc.error}</p>}
            </button>
          );
        })()}
      </div>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency */}
        <div className="card">
          <h3 className="card-title mb-4">Response Latency</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-green-400">{metrics?.latency.p50_ms ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">P50 (ms)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-yellow-400">{metrics?.latency.p95_ms ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">P95 (ms)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-red-400">{metrics?.latency.p99_ms ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">P99 (ms)</p>
            </div>
          </div>
        </div>
        
        {/* Throughput */}
        <div className="card">
          <h3 className="card-title mb-4">Throughput</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-sentinel-400">
                {metrics?.throughput.requests_per_second ?? 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">Requests/sec</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-white">
                {formatNumber(metrics?.throughput.total_requests ?? 0)}
              </p>
              <p className="text-sm text-gray-400 mt-1">Total Requests</p>
            </div>
          </div>
        </div>
        
        {/* Errors */}
        <div className="card">
          <h3 className="card-title mb-4">Error Rates</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-yellow-400">
                {metrics?.errors.rate_percent ?? 0}%
              </p>
              <p className="text-sm text-gray-400 mt-1">Error Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-orange-400">{metrics?.errors.count_4xx ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">4xx Errors</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-red-400">{metrics?.errors.count_5xx ?? 0}</p>
              <p className="text-sm text-gray-400 mt-1">5xx Errors</p>
            </div>
          </div>
        </div>
        
        {/* Database */}
        <div className="card">
          <h3 className="card-title mb-4">Database Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-sentinel-400">
                {metrics?.database.avg_query_ms ?? 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">Avg Query (ms)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-yellow-400">
                {metrics?.database.slow_queries ?? 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">Slow Queries</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-dashboard-bg">
              <p className="text-3xl font-bold text-white">
                {metrics?.database.connections_used ?? 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">Connections</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Detail Slide-Over Panel */}
      <ServiceDetailPanel
        service={selectedService}
        data={selectedService && health?.services ? health.services[selectedService] : undefined}
        onClose={() => setSelectedService(null)}
      />
    </div>
  );
}
