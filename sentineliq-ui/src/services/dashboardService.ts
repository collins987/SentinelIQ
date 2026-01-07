// ============================================================================
// Dashboard Service - Production-ready API service for dashboard data
// ============================================================================

import { api } from '../lib/api';
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

// API response types from backend
interface AnalyticsDashboardResponse {
  total_events: number;
  critical_events: number;
  blocked_events: number;
  detection_rate: number;
  avg_response_time: number;
  active_users: number;
}

interface RiskTimelineResponse {
  timeline: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>;
}

/**
 * Transform backend analytics response to frontend format
 */
function transformDashboardData(
  analyticsData: AnalyticsDashboardResponse,
  riskTimeline: RiskTimelineResponse['timeline']
): DashboardMetrics {
  const criticalCount = analyticsData.critical_events;
  const systemHealth: 'healthy' | 'degraded' | 'critical' = 
    criticalCount > 10 ? 'critical' : criticalCount > 5 ? 'degraded' : 'healthy';

  return {
    totalUsers: analyticsData.active_users || 0,
    activeUsers: analyticsData.active_users || 0,
    totalEvents: analyticsData.total_events || 0,
    highRiskEvents: analyticsData.critical_events || 0,
    successRate: analyticsData.detection_rate || 99.0,
    avgResponseTime: analyticsData.avg_response_time || 0,
    criticalAlerts: criticalCount,
    systemHealth,
    riskTrends: riskTimeline.map(t => ({
      date: t.date,
      critical: t.critical,
      high: t.high,
      medium: t.medium,
      low: t.low,
    })),
    eventsByCategory: [], // Will be populated from separate endpoint if needed
    recentActivity: [], // Will be populated from events endpoint
  };
}

export const dashboardService = {
  /**
   * Fetch dashboard metrics from the API
   */
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      // Fetch data from multiple endpoints in parallel
      const [analyticsResponse, timelineResponse] = await Promise.all([
        api.get<AnalyticsDashboardResponse>('/api/v1/analytics/dashboard'),
        api.get<RiskTimelineResponse>('/api/v1/analytics/risk-timeline').catch(() => ({ timeline: [] })),
      ]);

      return transformDashboardData(analyticsResponse, timelineResponse.timeline || []);
    } catch (error) {
      // Log error for debugging
      if (config.FEATURES.enableDebugLogging) {
        console.error('[DashboardService] Failed to fetch metrics:', error);
      }
      
      // Re-throw to let caller handle the error
      throw error;
    }
  },

  /**
   * Fetch recent activity/events
   */
  async getRecentActivity(limit: number = 10): Promise<DashboardMetrics['recentActivity']> {
    try {
      const response = await api.get<{ events: Array<{
        id: string;
        event_type: string;
        user_email: string;
        risk_level: string;
        timestamp: string;
      }> }>('/api/v1/events', { params: { limit } });

      return response.events.map(event => ({
        id: event.id,
        type: event.event_type,
        description: `${event.event_type} from ${event.user_email}`,
        timestamp: event.timestamp,
        severity: event.risk_level === 'critical' ? 'critical'
          : event.risk_level === 'high' ? 'error'
          : event.risk_level === 'medium' ? 'warning'
          : 'info',
      }));
    } catch (error) {
      if (config.FEATURES.enableDebugLogging) {
        console.error('[DashboardService] Failed to fetch activity:', error);
      }
      return [];
    }
  },

  /**
   * Refresh dashboard data
   */
  async refresh(): Promise<DashboardMetrics> {
    return this.getMetrics();
  },
};

export type { DashboardMetrics as DashboardData };
