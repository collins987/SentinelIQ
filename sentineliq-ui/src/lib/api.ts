import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

interface RequestTracker {
  id: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  status?: number;
  error?: string;
}

class APIClient {
  private client: AxiosInstance;
  private activeRequests: Map<string, RequestTracker> = new Map();
  private requestHistory: RequestTracker[] = [];
  private maxHistory = 100;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const requestId = crypto.randomUUID();
        config.headers['X-Request-ID'] = requestId;

        const tracker: RequestTracker = {
          id: requestId,
          method: config.method?.toUpperCase() || 'GET',
          url: config.url || '',
          startTime: Date.now(),
        };
        this.activeRequests.set(requestId, tracker);

        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['X-Request-ID'] as string;
        this.completeRequest(requestId, response.status);
        return response;
      },
      (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-ID'] as string;
        if (requestId) {
          this.completeRequest(requestId, error.response?.status, error.message);
        }

        // Handle specific error cases
        if (error.response?.status === 401) {
          // Unauthorized - redirect to login
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }

  private completeRequest(id: string, status?: number, error?: string) {
    const tracker = this.activeRequests.get(id);
    if (tracker) {
      tracker.endTime = Date.now();
      tracker.status = status;
      tracker.error = error;
      
      this.requestHistory.unshift(tracker);
      if (this.requestHistory.length > this.maxHistory) {
        this.requestHistory.pop();
      }
      
      this.activeRequests.delete(id);
    }
  }

  // API Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Utility methods
  getActiveRequests(): RequestTracker[] {
    return Array.from(this.activeRequests.values());
  }

  getRequestHistory(): RequestTracker[] {
    return [...this.requestHistory];
  }

  getAverageLatency(): number {
    const completed = this.requestHistory.filter((r) => r.endTime);
    if (completed.length === 0) return 0;
    
    const totalLatency = completed.reduce(
      (sum, r) => sum + (r.endTime! - r.startTime),
      0
    );
    return Math.round(totalLatency / completed.length);
  }
}

export const api = new APIClient();

// Typed API endpoints
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
    recentActivity: () => api.get('/api/v1/dashboard/activity'),
  },

  // Jobs
  jobs: {
    list: (params?: Record<string, unknown>) =>
      api.get('/api/v1/jobs', { params }),
    get: (id: string) => api.get(`/api/v1/jobs/${id}`),
    cancel: (id: string) => api.post(`/api/v1/jobs/${id}/cancel`),
    retry: (id: string) => api.post(`/api/v1/jobs/${id}/retry`),
    queues: () => api.get('/api/v1/jobs/queues'),
  },

  // Events
  events: {
    list: (params?: Record<string, unknown>) =>
      api.get('/api/v1/events', { params }),
    stream: () => api.get('/api/v1/events/stream'),
  },

  // System Health
  health: {
    status: () => api.get('/api/v1/health'),
    services: () => api.get('/api/v1/health/services'),
  },

  // Users
  users: {
    list: (params?: Record<string, unknown>) =>
      api.get('/api/v1/users', { params }),
    get: (id: string) => api.get(`/api/v1/users/${id}`),
    create: (data: unknown) => api.post('/api/v1/users', data),
    update: (id: string, data: unknown) => api.patch(`/api/v1/users/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/users/${id}`),
  },

  // Audit
  audit: {
    list: (params?: Record<string, unknown>) =>
      api.get('/api/v1/audit', { params }),
    get: (id: string) => api.get(`/api/v1/audit/${id}`),
  },

  // Analytics
  analytics: {
    overview: () => api.get('/api/v1/analytics/overview'),
    timeseries: (metric: string, params?: Record<string, unknown>) =>
      api.get(`/api/v1/analytics/timeseries/${metric}`, { params }),
  },
};
