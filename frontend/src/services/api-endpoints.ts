/**
 * Central API endpoint definitions
 * UPDATE THESE TO MATCH YOUR ACTUAL BACKEND ROUTES
 */

export const API_ENDPOINTS = {
  // Health
  HEALTH: '/api/v1/health',
  
  // Authentication
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
  },
  
  // Dashboard
  DASHBOARD: {
    STATS: '/api/v1/dashboard/stats',
    // Alternative endpoints if your backend uses different routes:
    // STATS: '/api/v1/stats',
    // STATS: '/api/v1/dashboard',
  },
  
  // Jobs
  JOBS: {
    LIST: '/api/v1/jobs',
    DETAIL: (id: string) => `/api/v1/jobs/${id}`,
    TRIGGER: (id: string) => `/api/v1/jobs/${id}/trigger`,
  },
  
  // Users
  USERS: {
    LIST: '/api/v1/users',
    DETAIL: (id: string) => `/api/v1/users/${id}`,
  },
  
  // Audit
  AUDIT: {
    LIST: '/api/v1/audit',
    // Alternative: '/api/v1/audit-logs',
  },
  
  // Alerts
  ALERTS: {
    LIST: '/api/v1/alerts',
    DETAIL: (id: string) => `/api/v1/alerts/${id}`,
  },
} as const;
