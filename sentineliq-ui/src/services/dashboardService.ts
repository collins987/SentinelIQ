/**
 * Dashboard Service
 * Aggregates metrics and analytics data with mock/real API switching
 */

import { config } from '../lib/config';
import { endpoints } from '../lib/api';
import { simulateApiDelay } from '../hooks/useActions';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  highRiskEvents: number;
  avgResponseTime: number;
  successRate: number;
  recentActivity: {
    timestamp: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  eventsByCategory: {
    category: string;
    count: number;
  }[];
  riskTrends: {
    date: string;
    low: number;
    medium: number;
    high: number;
    critical: number;
  }[];
}

/**
 * Generate realistic mock dashboard data
 */
function generateMockData(): DashboardMetrics {
  const now = Date.now();
  const categories = ['Authentication', 'Payment', 'Access', 'Data Change', 'API'];
  const activityTypes = [
    'User login',
    'Password reset',
    'Payment processed',
    'Access denied',
    'Data export',
    'API call',
  ];

  return {
    totalUsers: 1247,
    activeUsers: 892,
    totalEvents: 45231,
    highRiskEvents: 127,
    avgResponseTime: 234,
    successRate: 98.7,
    recentActivity: Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(now - i * 300000).toISOString(),
      type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
      description: `${activityTypes[Math.floor(Math.random() * activityTypes.length)]} from 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      severity: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
    })),
    eventsByCategory: categories.map((category) => ({
      category,
      count: Math.floor(Math.random() * 10000) + 1000,
    })),
    riskTrends: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(now - (29 - i) * 86400000).toISOString().split('T')[0],
      low: Math.floor(Math.random() * 500) + 200,
      medium: Math.floor(Math.random() * 200) + 50,
      high: Math.floor(Math.random() * 50) + 10,
      critical: Math.floor(Math.random() * 10) + 1,
    })),
  };
}

// Cache for mock data to maintain consistency during a session
let cachedMockData: DashboardMetrics | null = null;

export const dashboardService = {
  /**
   * Get all dashboard metrics
   */
  async getMetrics(): Promise<DashboardMetrics> {
    if (config.enableMockData) {
      await simulateApiDelay();
      
      // Generate once and cache to prevent constant regeneration
      if (!cachedMockData) {
        cachedMockData = generateMockData();
      }
      
      // Add some variance to active metrics
      return {
        ...cachedMockData,
        activeUsers: Math.floor(cachedMockData.activeUsers * (0.95 + Math.random() * 0.1)),
        avgResponseTime: Math.floor(cachedMockData.avgResponseTime * (0.9 + Math.random() * 0.2)),
      };
    }

    try {
      return await endpoints.dashboard.metrics() as DashboardMetrics;
    } catch (error) {
      console.error('[dashboardService] Failed to fetch dashboard metrics:', error);
      throw new Error('Failed to load dashboard data from server');
    }
  },

  /**
   * Get recent activity stream
   */
  async getRecentActivity(limit: number = 20): Promise<DashboardMetrics['recentActivity']> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const data = cachedMockData || generateMockData();
      return data.recentActivity.slice(0, limit);
    }

    try {
      const data = await endpoints.dashboard.metrics() as DashboardMetrics;
      return data.recentActivity?.slice(0, limit) || [];
    } catch (error) {
      console.error('[dashboardService] Failed to fetch recent activity:', error);
      throw new Error('Failed to load recent activity');
    }
  },

  /**
   * Get risk trends for specified period
   */
  async getRiskTrends(days: number = 30): Promise<DashboardMetrics['riskTrends']> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const data = cachedMockData || generateMockData();
      return data.riskTrends.slice(-days);
    }

    try {
      const data = await endpoints.dashboard.metrics() as DashboardMetrics;
      return data.riskTrends?.slice(-days) || [];
    } catch (error) {
      console.error('[dashboardService] Failed to fetch risk trends:', error);
      throw new Error('Failed to load risk trend data');
    }
  },

  /**
   * Refresh cached data (force regeneration for mock mode)
   */
  refresh(): void {
    if (config.enableMockData) {
      cachedMockData = null;
    }
  },
};
