// ============================================================================
// SentinelIQ API Service - Complete Backend Integration
// ============================================================================

import { 
  User, RiskEvent, DashboardStats, RiskTimeline, VelocityTrend,
  CohortAnalysis, ShadowAccuracy, AccuracyTrend, ShadowEvaluation,
  FraudRing, GraphData, MLModelStatus, AnomalyDetectionResult,
  RiskPrediction, FraudRule, RuleStats, RuleVersion, AuditLog,
  Webhook, IntegrationStatus, Alert, SearchQuery, SearchResult,
  ApiResponse, PaginatedResponse, RiskLevel
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ===== AUTH =====
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/users/me');
  }

  // ===== ANALYTICS DASHBOARD =====
  async getDashboard(): Promise<DashboardStats> {
    return this.request('/analytics/dashboard');
  }

  async getUsersAnalytics(): Promise<{
    users_by_role: Record<string, number>;
    email_verification: { verified: number; unverified: number };
    active_users: number;
  }> {
    return this.request('/analytics/users');
  }

  async getLoginAnalytics(hours = 24): Promise<{
    login_stats: { total: number; successful: number; failed: number };
    failed_attempts: Array<{ user_id: string; count: number }>;
  }> {
    return this.request(`/analytics/login?hours=${hours}`);
  }

  async getSessionAnalytics(): Promise<{
    active_sessions: number;
    avg_session_duration: number;
    sessions_by_device: Record<string, number>;
  }> {
    return this.request('/analytics/sessions');
  }

  async getAuditAnalytics(hours = 24): Promise<{
    total_events: number;
    events_by_type: Record<string, number>;
    top_actors: Array<{ user_id: string; count: number }>;
  }> {
    return this.request(`/analytics/audit?hours=${hours}`);
  }

  async getUserActivity(userId: string): Promise<{
    recent_events: RiskEvent[];
    login_history: Array<{ timestamp: string; ip: string; success: boolean }>;
    risk_summary: { avg_score: number; max_score: number; events_count: number };
  }> {
    return this.request(`/analytics/user/${userId}`);
  }

  // ===== ADVANCED ANALYTICS =====
  async getRiskTimeline(
    days = 30,
    granularity: 'hourly' | 'daily' | 'weekly' = 'daily'
  ): Promise<RiskTimeline> {
    return this.request(`/analytics/advanced/risk-timeline?days=${days}&granularity=${granularity}`);
  }

  async getVelocityTrends(hours = 72, stepMinutes = 30): Promise<VelocityTrend[]> {
    return this.request(`/analytics/advanced/velocity-trends?hours=${hours}&step_minutes=${stepMinutes}`);
  }

  async drillDownEvents(params: {
    risk_level?: string;
    user_id?: string;
    days?: number;
    limit?: number;
  }): Promise<{ events: RiskEvent[]; total: number }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/analytics/advanced/drill-down/events?${query}`);
  }

  async drillDownRule(
    ruleName: string,
    days = 30,
    limit = 50
  ): Promise<{
    rule_name: string;
    total_triggers: number;
    events: RiskEvent[];
    effectiveness: { true_positives: number; false_positives: number };
  }> {
    return this.request(`/analytics/advanced/drill-down/rule/${ruleName}?days=${days}&limit=${limit}`);
  }

  async getCohortAnalysis(days = 30): Promise<CohortAnalysis[]> {
    return this.request(`/analytics/advanced/cohorts/analysis?days=${days}`);
  }

  async getCohortBehavior(
    cohort: string,
    days = 30
  ): Promise<{
    cohort: string;
    behavior_patterns: Record<string, any>;
    common_triggers: string[];
  }> {
    return this.request(`/analytics/advanced/cohorts/${cohort}/behavior?days=${days}`);
  }

  async compareUsers(
    userIdA: string,
    userIdB: string,
    days = 30
  ): Promise<{
    user_a: { id: string; risk_profile: any };
    user_b: { id: string; risk_profile: any };
    comparison: any;
  }> {
    return this.request(
      `/analytics/advanced/compare/users?user_id_a=${userIdA}&user_id_b=${userIdB}&days=${days}`
    );
  }

  // ===== SHADOW MODE =====
  async logShadowEvaluation(data: {
    rule_id: string;
    event_id: string;
    user_id: string;
    would_have_blocked: boolean;
    confidence_score: number;
  }): Promise<{ result_id: string }> {
    const params = new URLSearchParams({
      rule_id: data.rule_id,
      event_id: data.event_id,
      user_id: data.user_id,
      would_have_blocked: String(data.would_have_blocked),
      confidence_score: String(data.confidence_score),
    });
    return this.request(`/api/v1/shadow-mode/evaluate?${params}`, { method: 'POST' });
  }

  async labelShadowResult(
    resultId: string,
    actualFraud: boolean
  ): Promise<{ status: string }> {
    return this.request(`/api/v1/shadow-mode/label/${resultId}?actual_fraud=${actualFraud}`, {
      method: 'POST',
    });
  }

  async getShadowAccuracy(
    ruleId: string,
    timeWindowHours = 48
  ): Promise<ShadowAccuracy> {
    return this.request(
      `/api/v1/shadow-mode/accuracy/${ruleId}?time_window_hours=${timeWindowHours}`
    );
  }

  async getShadowTrends(ruleId: string, days = 7): Promise<{ trends: AccuracyTrend[] }> {
    return this.request(`/api/v1/shadow-mode/trends/${ruleId}?days=${days}`);
  }

  async getPendingLabels(limit = 10): Promise<{
    pending_count: number;
    results: ShadowEvaluation[];
  }> {
    return this.request(`/api/v1/shadow-mode/pending-labels?limit=${limit}`);
  }

  // ===== LINK ANALYSIS =====
  async getUserLinks(
    userId: string,
    connectionTypes?: string[]
  ): Promise<{
    user_id: string;
    connection_count: number;
    connections: any[];
  }> {
    const params = connectionTypes ? `?connection_types=${connectionTypes.join(',')}` : '';
    return this.request(`/api/v1/link-analysis/user/${userId}${params}`);
  }

  async analyzeFraudRing(userId: string): Promise<FraudRing> {
    return this.request(`/api/v1/link-analysis/ring/${userId}`);
  }

  async getTopHubs(limit = 20): Promise<{ top_hubs: any[] }> {
    return this.request(`/api/v1/link-analysis/hubs?limit=${limit}`);
  }

  async getGraphData(userId: string): Promise<GraphData> {
    return this.request(`/api/v1/link-analysis/graph/${userId}`);
  }

  async flagRing(
    userIds: string[],
    reason: string
  ): Promise<{ status: string; user_count: number }> {
    return this.request('/api/v1/link-analysis/flag-ring', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds, reason }),
    });
  }

  // ===== ML MODELS =====
  async detectAnomalies(
    userId: string,
    features: {
      login_frequency: number;
      device_count: number;
      location_changes: number;
      failed_attempts: number;
      api_calls: number;
    },
    sensitivity: 'strict' | 'normal' | 'loose' = 'normal'
  ): Promise<AnomalyDetectionResult> {
    return this.request(`/ml/anomalies/detect?user_id=${userId}&sensitivity=${sensitivity}`, {
      method: 'POST',
      body: JSON.stringify(features),
    });
  }

  async predictUserRisk(userId: string): Promise<RiskPrediction> {
    return this.request(`/ml/risk/predict/${userId}`);
  }

  async getMLModelsStatus(): Promise<{ models: MLModelStatus[] }> {
    return this.request('/ml/models/status');
  }

  // ===== RULES MANAGEMENT =====
  async reloadRules(force = false): Promise<{
    status: string;
    version: string;
    changes: string[];
  }> {
    return this.request('/rules/reload', {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }

  async getCurrentRules(): Promise<{ version: string; rules: FraudRule[] }> {
    return this.request('/rules/current');
  }

  async getRuleStats(): Promise<{ stats: RuleStats }> {
    return this.request('/rules/stats');
  }

  async getRuleHistory(): Promise<{ history: RuleVersion[] }> {
    return this.request('/rules/history');
  }

  // ===== AUDIT LOGS =====
  async getAuditLogs(params: {
    event_type?: string;
    actor_id?: string;
    resource_type?: string;
    limit?: number;
  }): Promise<{ total: number; logs: AuditLog[] }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/v1/audit/logs?${query}`);
  }

  async verifyAuditChain(startId?: string, endId?: string): Promise<{
    is_valid: boolean;
    checked_count: number;
    errors: string[];
  }> {
    const params = new URLSearchParams();
    if (startId) params.set('start_id', startId);
    if (endId) params.set('end_id', endId);
    return this.request(`/api/v1/audit/verify?${params}`);
  }

  async exportAuditLogs(
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob> {
    const response = await fetch(
      `${API_BASE}/api/v1/audit/export?start_date=${startDate}&end_date=${endDate}&format=${format}`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );
    return response.blob();
  }

  // ===== INTEGRATIONS =====
  async createWebhook(data: {
    url: string;
    description?: string;
    event_types?: string[];
    min_risk_level?: RiskLevel;
  }): Promise<Webhook> {
    return this.request('/integrations/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listWebhooks(): Promise<Webhook[]> {
    return this.request('/integrations/webhooks');
  }

  async updateWebhook(
    webhookId: string,
    data: Partial<Webhook>
  ): Promise<Webhook> {
    return this.request(`/integrations/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    return this.request(`/integrations/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  async testWebhook(webhookId: string): Promise<{ success: boolean; response_time_ms: number }> {
    return this.request(`/integrations/webhooks/${webhookId}/test`, {
      method: 'POST',
    });
  }

  async configureSlack(webhookUrl: string, channel?: string): Promise<{ status: string }> {
    return this.request('/integrations/slack/configure', {
      method: 'POST',
      body: JSON.stringify({ webhook_url: webhookUrl, channel }),
    });
  }

  async configurePagerDuty(apiKey: string, serviceId: string): Promise<{ status: string }> {
    return this.request('/integrations/pagerduty/configure', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey, service_id: serviceId }),
    });
  }

  async getIntegrationStatus(): Promise<IntegrationStatus> {
    return this.request('/integrations/status');
  }

  // ===== ALERTS =====
  async getAlerts(params?: {
    type?: string;
    acknowledged?: boolean;
    limit?: number;
  }): Promise<Alert[]> {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
    return this.request(`/analytics/alerts${query}`);
  }

  async acknowledgeAlert(alertId: string): Promise<{ status: string }> {
    return this.request(`/analytics/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  // ===== SEARCH =====
  async searchEvents(query: SearchQuery): Promise<SearchResult<RiskEvent>> {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.risk_level) query.risk_level.forEach(l => params.append('risk_level', l));
    if (query.recommended_action) query.recommended_action.forEach(a => params.append('action', a));
    if (query.user_id) params.set('user_id', query.user_id);
    if (query.days) params.set('days', String(query.days));
    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    
    return this.request(`/search/events?${params}`);
  }

  async searchByUser(userId: string, days = 30, limit = 50): Promise<SearchResult<RiskEvent>> {
    return this.request(`/search/events/by-user/${userId}?days=${days}&limit=${limit}`);
  }

  async searchByRiskLevel(
    riskLevel: RiskLevel,
    days = 30,
    limit = 50
  ): Promise<SearchResult<RiskEvent>> {
    return this.request(`/search/events/by-risk-level/${riskLevel}?days=${days}&limit=${limit}`);
  }

  // ===== USERS MANAGEMENT =====
  async listUsers(params?: {
    role?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<User>> {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
    return this.request(`/users${query}`);
  }

  async getUser(userId: string): Promise<User> {
    return this.request(`/users/${userId}`);
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async blockUser(userId: string, reason: string): Promise<{ status: string }> {
    return this.request(`/admin/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unblockUser(userId: string): Promise<{ status: string }> {
    return this.request(`/admin/users/${userId}/unblock`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
export default api;
