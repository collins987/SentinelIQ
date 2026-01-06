/**
 * Health Service
 * Monitors system health and performance metrics with mock/real API switching
 */

import { config } from '../lib/config';
import { endpoints } from '../lib/api';
import { simulateApiDelay } from '../hooks/useActions';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    api: ServiceHealth;
    queue: ServiceHealth;
  };
  metrics: {
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  recentErrors: {
    timestamp: string;
    service: string;
    error: string;
    count: number;
  }[];
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency: number;
  lastCheck: string;
  message?: string;
}

/**
 * Generate mock health status
 */
function generateMockHealth(): HealthStatus {
  const now = new Date().toISOString();
  const uptime = 7 * 24 * 3600 + Math.floor(Math.random() * 86400); // 7+ days

  return {
    status: 'healthy',
    uptime,
    version: '2.5.1',
    services: {
      database: {
        status: 'up',
        latency: Math.floor(Math.random() * 20) + 5,
        lastCheck: now,
      },
      redis: {
        status: 'up',
        latency: Math.floor(Math.random() * 10) + 2,
        lastCheck: now,
      },
      api: {
        status: 'up',
        latency: Math.floor(Math.random() * 50) + 10,
        lastCheck: now,
      },
      queue: {
        status: 'up',
        latency: Math.floor(Math.random() * 30) + 5,
        lastCheck: now,
      },
    },
    metrics: {
      requestsPerMinute: Math.floor(Math.random() * 500) + 200,
      avgResponseTime: Math.floor(Math.random() * 200) + 100,
      errorRate: Math.random() * 2,
      cpuUsage: Math.random() * 60 + 20,
      memoryUsage: Math.random() * 50 + 30,
    },
    recentErrors: [],
  };
}

let cachedHealth: HealthStatus | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

export const healthService = {
  /**
   * Get current system health status
   */
  async getStatus(): Promise<HealthStatus> {
    if (config.enableMockData) {
      await simulateApiDelay();
      
      // Cache for a few seconds to simulate real-time monitoring
      const now = Date.now();
      if (cachedHealth && now - lastFetchTime < CACHE_DURATION) {
        // Add slight variance to metrics
        return {
          ...cachedHealth,
          metrics: {
            ...cachedHealth.metrics,
            requestsPerMinute: Math.floor(cachedHealth.metrics.requestsPerMinute * (0.95 + Math.random() * 0.1)),
            avgResponseTime: Math.floor(cachedHealth.metrics.avgResponseTime * (0.95 + Math.random() * 0.1)),
            cpuUsage: Math.max(0, Math.min(100, cachedHealth.metrics.cpuUsage + (Math.random() - 0.5) * 10)),
            memoryUsage: Math.max(0, Math.min(100, cachedHealth.metrics.memoryUsage + (Math.random() - 0.5) * 5)),
          },
        };
      }

      cachedHealth = generateMockHealth();
      lastFetchTime = now;
      return { ...cachedHealth };
    }

    try {
      return await endpoints.health.status() as HealthStatus;
    } catch (error) {
      console.error('[healthService] Failed to fetch health status:', error);
      throw new Error('Failed to load system health status');
    }
  },

  /**
   * Get service-specific health check
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const health = cachedHealth || generateMockHealth();
      const service = health.services[serviceName as keyof typeof health.services];
      
      if (!service) {
        throw new Error(`Unknown service: ${serviceName}`);
      }
      
      return { ...service };
    }

    try {
      const health = await endpoints.health.status() as HealthStatus;
      const service = health.services[serviceName as keyof typeof health.services];
      
      if (!service) {
        throw new Error(`Unknown service: ${serviceName}`);
      }
      
      return service;
    } catch (error) {
      console.error(`[healthService] Failed to fetch health for ${serviceName}:`, error);
      throw new Error(`Failed to load ${serviceName} health status`);
    }
  },

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<HealthStatus['metrics']> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const health = cachedHealth || generateMockHealth();
      return { ...health.metrics };
    }

    try {
      const health = await endpoints.health.status() as HealthStatus;
      return health.metrics;
    } catch (error) {
      console.error('[healthService] Failed to fetch metrics:', error);
      throw new Error('Failed to load performance metrics');
    }
  },

  /**
   * Clear cache (force fresh data)
   */
  clearCache(): void {
    cachedHealth = null;
    lastFetchTime = 0;
  },
};
