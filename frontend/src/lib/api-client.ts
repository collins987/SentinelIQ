import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create axios instance with defaults
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Request interceptor - attach auth token
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log request in development
      if (import.meta.env.DEV) {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors globally
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (import.meta.env.DEV) {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (error: AxiosError) => {
      // Network error (no response)
      if (!error.response) {
        console.error('[API Network Error] Backend unreachable:', error.message);
        throw new ApiError(
          'Unable to connect to the server. Please check your connection and try again.',
          0,
          'NETWORK_ERROR'
        );
      }

      const { status, data } = error.response;
      
      // Handle specific status codes
      if (status === 401) {
        console.warn('[API Auth Error] Token expired or invalid');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
      }

      if (status === 403) {
        throw new ApiError('You do not have permission to perform this action.', 403, 'FORBIDDEN');
      }

      if (status === 404) {
        throw new ApiError('The requested resource was not found.', 404, 'NOT_FOUND');
      }

      if (status >= 500) {
        console.error('[API Server Error]', data);
        throw new ApiError('Server error. Please try again later.', status, 'SERVER_ERROR', data);
      }

      // Generic error
      const message = (data as { detail?: string })?.detail || 'An unexpected error occurred.';
      throw new ApiError(message, status, 'API_ERROR', data);
    }
  );

  return client;
};

export const apiClient = createApiClient();

// Typed API methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    apiClient.get<T>(url, config).then(res => res.data),
  
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    apiClient.post<T>(url, data, config).then(res => res.data),
  
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    apiClient.put<T>(url, data, config).then(res => res.data),
  
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    apiClient.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    apiClient.delete<T>(url, config).then(res => res.data),
};

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/v1/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

export default api;
