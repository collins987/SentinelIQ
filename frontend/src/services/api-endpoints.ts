/**
 * API Endpoint Configuration
 * UPDATE AFTER RUNNING: python discover-endpoints.py
 */

// Common endpoint patterns to try
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/api/v1/health',
  
  // Authentication endpoints (try multiple patterns)
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
  },
  
  // Dashboard - will try multiple patterns
  DASHBOARD: {
    STATS: '/api/v1/dashboard/stats',
    FALLBACKS: [
      '/api/v1/dashboard',
      '/api/v1/stats',
      '/dashboard/stats',
      '/dashboard',
    ],
  },
  
  // Jobs
  JOBS: {
    LIST: '/api/v1/jobs',
    DETAIL: (id: string) => `/api/v1/jobs/${id}`,
    TRIGGER: (id: string) => `/api/v1/jobs/${id}/trigger`,
    FALLBACKS: [
      '/api/v1/job',
      '/jobs',
      '/api/jobs',
    ],
  },
  
  // Users
  USERS: {
    LIST: '/api/v1/users',
    DETAIL: (id: string) => `/api/v1/users/${id}`,
    FALLBACKS: [
      '/api/v1/user',
      '/users',
      '/api/users',
    ],
  },
  
  // Audit trail
  AUDIT: {
    LIST: '/api/v1/audit',
    FALLBACKS: [
      '/api/v1/audit-logs',
      '/api/v1/logs',
      '/audit',
      '/api/audit',
    ],
  },
  
  // Alerts
  ALERTS: {
    LIST: '/api/v1/alerts',
    DETAIL: (id: string) => `/api/v1/alerts/${id}`,
  },
} as const;

// Helper to get endpoint with fallbacks
export function getEndpointWithFallbacks(
  primary: string,
  fallbacks: string[] = []
): string[] {
  return [primary, ...fallbacks];
}
