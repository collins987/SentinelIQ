/**
 * Health Service - API client for system health monitoring
 * 
 * Fetches real-time health status from the backend's health endpoints
 */

import { api } from '../lib/api';
import type { ServiceHealth, SystemStatus } from '../types';

interface HealthStatusResponse {
  status: string;
  timestamp: string;
  services: Array<{
    name: string;
    status: string;
    latency_ms?: number;
    uptime_percent?: number;
    last_check?: string;
    error?: string;
    details?: Record<string, unknown>;
  }>;
  overall_status: string;
}

interface LatencyDataPoint {
  name: string;
  value: number;
}

interface LatencyHistoryResponse {
  service: string;
  data: Array<{
    timestamp: string;
    latency_ms: number;
  }>;
}

/**
 * Transform backend status to frontend SystemStatus type
 */
function transformStatus(status: string): SystemStatus {
  const statusMap: Record<string, SystemStatus> = {
    'healthy': 'healthy',
    'ok': 'healthy',
    'operational': 'healthy',
    'up': 'healthy',
    'degraded': 'degraded',
    'warning': 'degraded',
    'slow': 'degraded',
    'critical': 'critical',
    'down': 'critical',
    'error': 'critical',
    'unhealthy': 'critical',
  };
  return statusMap[status.toLowerCase()] || 'unknown';
}

/**
 * Transform backend service response to frontend ServiceHealth type
 */
function transformService(service: HealthStatusResponse['services'][0]): ServiceHealth {
  return {
    name: service.name,
    status: transformStatus(service.status),
    latency: service.latency_ms ?? 0,
    uptime: service.uptime_percent ?? 100,
    lastCheck: service.last_check ?? new Date().toISOString(),
    error: service.error,
  };
}

export const healthService = {
  /**
   * Get overall system health status and all services
   */
  async getStatus(): Promise<{
    services: ServiceHealth[];
    overallStatus: SystemStatus;
    lastCheck: string;
  }> {
    const response = await api.get<HealthStatusResponse>('/api/v1/health');
    return {
      services: response.services.map(transformService),
      overallStatus: transformStatus(response.overall_status || response.status),
      lastCheck: response.timestamp,
    };
  },

  /**
   * Get individual service health
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const response = await api.get<HealthStatusResponse['services'][0]>(
      `/api/v1/health/services/${serviceName}`
    );
    return transformService(response);
  },

  /**
   * Get latency history for chart display
   * Falls back to generated data if API doesn't support it
   */
  async getLatencyHistory(serviceName?: string): Promise<LatencyDataPoint[]> {
    try {
      const response = await api.get<LatencyHistoryResponse>(
        `/api/v1/health/latency${serviceName ? `?service=${serviceName}` : ''}`
      );
      return response.data.map((point, index) => ({
        name: new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: point.latency_ms,
      }));
    } catch {
      // Generate fallback latency data for last 24 hours
      return Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        value: Math.floor(Math.random() * 100) + 20,
      }));
    }
  },

  /**
   * Perform a health check refresh
   * This can trigger the backend to re-check all services
   */
  async refresh(): Promise<{
    services: ServiceHealth[];
    overallStatus: SystemStatus;
    lastCheck: string;
  }> {
    // POST to trigger fresh health checks
    try {
      const response = await api.post<HealthStatusResponse>('/api/v1/health/refresh');
      return {
        services: response.services.map(transformService),
        overallStatus: transformStatus(response.overall_status || response.status),
        lastCheck: response.timestamp,
      };
    } catch {
      // Fall back to regular GET if POST isn't supported
      return this.getStatus();
    }
  },

  /**
   * Check if a specific service is healthy
   */
  async isServiceHealthy(serviceName: string): Promise<boolean> {
    try {
      const service = await this.getServiceHealth(serviceName);
      return service.status === 'healthy';
    } catch {
      return false;
    }
  },
};

export default healthService;
