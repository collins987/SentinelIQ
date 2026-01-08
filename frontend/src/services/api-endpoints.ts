/**
 * API Endpoint Configuration - Auto-generated from backend
 * Backend OpenAPI discovered on: 2024
 */

export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    LOGOUT_ALL: '/auth/logout-all-devices',
    REFRESH: '/auth/token/refresh',
    PASSWORD_RESET_REQUEST: '/auth/password-reset/request',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset/confirm',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  
  // Dashboard - using admin dashboard as primary
  DASHBOARD: {
    STATS: '/admin/dashboard',
    ANALYTICS: '/analytics/dashboard',
  },
  
  // Jobs
  JOBS: {
    LIST: '/api/v1/jobs',
    DETAIL: (id: string) => `/api/v1/jobs/${id}`,
    QUEUES: '/api/v1/jobs/queues',
    LOGS: (id: string) => `/api/v1/jobs/${id}/logs`,
    CANCEL: (id: string) => `/api/v1/jobs/${id}/cancel`,
    RETRY: (id: string) => `/api/v1/jobs/${id}/retry`,
    STATS: '/api/v1/jobs/stats',
  },
  
  // Users
  USERS: {
    LIST: '/users/',
    ME: '/users/me',
    DETAIL: (id: string) => `/users/${id}`,
    ANALYTICS: '/analytics/users',
    USER_ANALYTICS: (id: string) => `/analytics/user/${id}`,
    // Admin actions
    CHANGE_ROLE: (id: string) => `/admin/users/${id}/change-role`,
    ENABLE: (id: string) => `/admin/users/${id}/enable`,
    DISABLE: (id: string) => `/admin/users/${id}/disable`,
  },
  
  // Audit Trail
  AUDIT: {
    LIST: '/api/v1/audit/logs',
    ADMIN_LOGS: '/admin/audit-logs',
    ANALYTICS: '/analytics/audit',
    LOGIN_ANALYTICS: '/analytics/login',
    STATS: '/api/v1/audit/stats',
    COMPLIANCE_REPORT: '/api/v1/audit/compliance-report',
    VERIFY: '/api/v1/audit/verify',
  },
  
  // Alerts
  ALERTS: {
    LIST: '/analytics/alerts',
  },
  
  // Analytics
  ANALYTICS: {
    SESSIONS: '/analytics/sessions',
    FORBIDDEN_ACCESS: '/analytics/forbidden-access',
    TRENDS: '/analytics/advanced/trends',
    VELOCITY_TRENDS: '/analytics/advanced/velocity-trends',
    RISK_TIMELINE: '/analytics/advanced/risk-timeline',
    RULE_PERFORMANCE: '/analytics/advanced/rule-performance',
    COHORTS: '/analytics/advanced/cohorts/analysis',
    COHORT_BEHAVIOR: (cohort: string) => `/analytics/advanced/cohorts/${cohort}/behavior`,
  },
  
  // Search
  SEARCH: {
    EVENTS: '/search/events',
    BY_USER: (userId: string) => `/search/events/by-user/${userId}`,
    BY_RULE: (ruleName: string) => `/search/events/by-rule/${ruleName}`,
    BY_RISK: (riskLevel: string) => `/search/events/by-risk-level/${riskLevel}`,
    FACETS: '/search/facets',
  },
  
  // Rules
  RULES: {
    CURRENT: '/rules/current',
    HISTORY: '/rules/history',
    STATS: '/rules/stats',
    VALIDATE: '/rules/validate',
    RELOAD: '/rules/reload',
    ROLLBACK: (version: string) => `/rules/rollback/${version}`,
  },
  
  // Integrations
  INTEGRATIONS: {
    STATUS: '/integrations/status',
    WEBHOOKS: '/integrations/webhooks',
    WEBHOOK_DETAIL: (id: string) => `/integrations/webhooks/${id}`,
    SLACK_CONFIGURE: '/integrations/slack/configure',
    PAGERDUTY_CONFIGURE: '/integrations/pagerduty/configure',
  },
  
  // Machine Learning
  ML: {
    MODELS_STATUS: '/ml/models/status',
    DETECT_ANOMALIES: '/ml/anomalies/detect',
    RISK_PREDICT: (userId: string) => `/ml/risk/predict/${userId}`,
  },
  
  // Link Analysis
  LINK_ANALYSIS: {
    USER: (userId: string) => `/api/v1/link-analysis/user/${userId}`,
    GRAPH: (userId: string) => `/api/v1/link-analysis/graph/${userId}`,
    RING: (userId: string) => `/api/v1/link-analysis/ring/${userId}`,
    HUBS: '/api/v1/link-analysis/hubs',
    FLAG_RING: '/api/v1/link-analysis/flag-ring',
  },
} as const;

// Helper function for endpoints with fallbacks
export function getDashboardEndpoint(): string[] {
  return [
    API_ENDPOINTS.DASHBOARD.STATS,
    API_ENDPOINTS.DASHBOARD.ANALYTICS,
  ];
}

export function getAuditEndpoint(): string[] {
  return [
    API_ENDPOINTS.AUDIT.LIST,
    API_ENDPOINTS.AUDIT.ADMIN_LOGS,
    API_ENDPOINTS.AUDIT.ANALYTICS,
  ];
}
