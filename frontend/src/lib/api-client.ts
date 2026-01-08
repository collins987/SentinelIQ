import axios, { AxiosError, AxiosInstance } from 'axios';

// Get API URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

console.log('[SentinelIQ] API Base URL:', API_BASE_URL);

export class ApiError extends Error {
  status: number;
  code: string;
  
  constructor(message: string, status: number, code: string = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      console.error('[API] Network Error - Backend may be unreachable:', error.message);
      return Promise.reject(new ApiError(
        'Cannot connect to server. Please ensure the backend is running.',
        0,
        'NETWORK_ERROR'
      ));
    }

    const status = error.response.status;
    const data = error.response.data as { detail?: string; message?: string };

    console.error(`[API Error] ${status}:`, data);

    // Handle 401 - Unauthorized
    if (status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED'));
    }

    // Handle 403 - Forbidden
    if (status === 403) {
      return Promise.reject(new ApiError('You do not have permission for this action.', 403, 'FORBIDDEN'));
    }

    // Handle 404 - Not Found
    if (status === 404) {
      return Promise.reject(new ApiError('Resource not found.', 404, 'NOT_FOUND'));
    }

    // Handle 422 - Validation Error
    if (status === 422) {
      const message = data?.detail || 'Validation error';
      return Promise.reject(new ApiError(message, 422, 'VALIDATION_ERROR'));
    }

    // Handle 5xx - Server Errors
    if (status >= 500) {
      return Promise.reject(new ApiError('Server error. Please try again later.', status, 'SERVER_ERROR'));
    }

    // Generic error
    const message = data?.detail || data?.message || 'An error occurred';
    return Promise.reject(new ApiError(message, status, 'API_ERROR'));
  }
);

// API helper methods
export const api = {
  get: async <T>(url: string): Promise<T> => {
    const response = await apiClient.get<T>(url);
    return response.data;
  },

  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.post<T>(url, data);
    return response.data;
  },

  put: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.put<T>(url, data);
    return response.data;
  },

  patch: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.patch<T>(url, data);
    return response.data;
  },

  delete: async <T>(url: string): Promise<T> => {
    const response = await apiClient.delete<T>(url);
    return response.data;
  },
};

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/v1/health');
    return true;
  } catch {
    return false;
  }
};

export { apiClient };
export default api;
