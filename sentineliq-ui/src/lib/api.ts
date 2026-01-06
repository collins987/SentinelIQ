import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from './config';

// Create axios instance with defaults
const api: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle network errors gracefully
    if (!error.response) {
      console.error('[API] Network error:', error.message);
      return Promise.reject(new Error('Network error - please check your connection'));
    }

    // Handle 401 - redirect to login
    if (error.response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    // Handle other errors
    const message = (error.response.data as { detail?: string })?.detail || error.message;
    return Promise.reject(new Error(message));
  }
);

// API Endpoints
export const endpoints = {
  // Auth
  auth: {
    login: (data: { email: string; password: string }) =>
      api.post('/api/v1/auth/login', data),
    logout: () => api.post('/api/v1/auth/logout'),
    me: () => api.get('/api/v1/auth/me'),
  },

  // Dashboard
  dashboard: {
    metrics: () => api.get('/api/v1/dashboard/metrics'),
    activity: () => api.get('/api/v1/dashboard/activity'),
  },

  // Users
  users: {
    list: () => api.get('/api/v1/users'),
    get: (id: string) => api.get(`/api/v1/users/${id}`),
    create: (data: unknown) => api.post('/api/v1/users', data),
    update: (id: string, data: unknown) => api.patch(`/api/v1/users/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/users/${id}`),
  },

  // Jobs
  jobs: {
    list: () => api.get('/api/v1/jobs'),
    get: (id: string) => api.get(`/api/v1/jobs/${id}`),
    cancel: (id: string) => api.post(`/api/v1/jobs/${id}/cancel`),
    retry: (id: string) => api.post(`/api/v1/jobs/${id}/retry`),
    queues: () => api.get('/api/v1/jobs/queues'),
  },

  // Audit
  audit: {
    list: () => api.get('/api/v1/audit'),
    get: (id: string) => api.get(`/api/v1/audit/${id}`),
  },

  // Events
  events: {
    list: () => api.get('/api/v1/events'),
    ingest: (data: unknown) => api.post('/api/v1/events/ingest', data),
  },

  // Health
  health: {
    check: () => api.get('/health'),
    status: () => api.get('/api/v1/health'),
    services: () => api.get('/api/v1/health/services'),
  },

  // Analytics
  analytics: {
    overview: () => api.get('/api/v1/analytics/overview'),
    timeseries: (metric: string) => api.get(`/api/v1/analytics/timeseries/${metric}`),
  },
};

export default api;
