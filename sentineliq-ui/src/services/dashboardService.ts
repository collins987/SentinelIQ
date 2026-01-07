// ============================================================================
// Dashboard Service - API calls for dashboard data
// ============================================================================

import config from '../lib/config';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  highRiskEvents: number;
  successRate: number;
  avgResponseTime: number;
  criticalAlerts: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  riskTrends: Array<{ date: string; critical: number; high: number; medium: number; low: number }>;
  eventsByCategory: Array<{ category: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }>;
}

// Mock data for development
const mockDashboardData: DashboardMetrics = {
  totalUsers: 2847,
  activeUsers: 423,
  totalEvents: 45892,
  highRiskEvents: 156,
  successRate: 99.2,
  avgResponseTime: 124,
  criticalAlerts: 3,
  systemHealth: 'healthy',
  riskTrends: [
    { date: '2025-12-01', critical: 2, high: 12, medium: 28, low: 45 },
    { date: '2025-12-02', critical: 1, high: 8, medium: 32, low: 52 },
    { date: '2025-12-03', critical: 3, high: 15, medium: 25, low: 38 },
    { date: '2025-12-04', critical: 0, high: 10, medium: 30, low: 48 },
    { date: '2025-12-05', critical: 2, high: 18, medium: 22, low: 42 },
    { date: '2025-12-06', critical: 1, high: 9, medium: 35, low: 55 },
    { date: '2025-12-07', critical: 2, high: 14, medium: 28, low: 41 },
  ],
  eventsByCategory: [
    { category: 'Authentication', count: 1250 },
    { category: 'Data Access', count: 890 },
    { category: 'System', count: 456 },
    { category: 'Security', count: 234 },
  ],
  recentActivity: [
    { id: '1', type: 'user.login', description: 'User admin@example.com logged in', timestamp: new Date().toISOString(), severity: 'info' },
    { id: '2', type: 'job.completed', description: 'Report generation completed', timestamp: new Date(Date.now() - 60000).toISOString(), severity: 'info' },
    { id: '3', type: 'api.error', description: 'Rate limit exceeded for IP 192.168.1.100', timestamp: new Date(Date.now() - 120000).toISOString(), severity: 'error' },
    { id: '4', type: 'system.alert', description: 'High memory usage on worker-01', timestamp: new Date(Date.now() - 180000).toISOString(), severity: 'warning' },
  ],
};

export const dashboardService = {
  /**
   * Fetch dashboard metrics from the API
   */
  async getMetrics(): Promise<DashboardMetrics> {
    // Use mock data in development or when configured
    if (config.FEATURES.useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      return mockDashboardData;
    }

    const response = await fetch(`${config.API.baseUrl}/dashboard/metrics`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard metrics: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Refresh dashboard data
   */
  async refresh(): Promise<DashboardMetrics> {
    return this.getMetrics();
  },
};

export type { DashboardMetrics as DashboardData };
