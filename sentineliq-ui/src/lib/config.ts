/**
 * Application Configuration
 * Centralized environment-based configuration for development/production modes
 */

export interface AppConfig {
  // Environment
  isDevelopment: boolean;
  isProduction: boolean;
  
  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;
  
  // Feature Flags
  enableMockData: boolean;
  enableRealTimeUpdates: boolean;
  enableDebugLogging: boolean;
  
  // Mock Data Settings
  mockApiDelay: number; // milliseconds
  pollingInterval: number; // milliseconds
}

/**
 * Get current environment configuration
 */
export const config: AppConfig = {
  // Environment Detection
  isDevelopment: import.meta.env.DEV || import.meta.env.MODE === 'development',
  isProduction: import.meta.env.PROD || import.meta.env.MODE === 'production',
  
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  
  // Feature Flags (can be overridden via env vars)
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true' || import.meta.env.DEV,
  enableRealTimeUpdates: import.meta.env.VITE_ENABLE_REAL_TIME !== 'false', // enabled by default
  enableDebugLogging: import.meta.env.VITE_DEBUG_LOGGING === 'true' || import.meta.env.DEV,
  
  // Mock Data Settings
  mockApiDelay: parseInt(import.meta.env.VITE_MOCK_API_DELAY || '800'),
  pollingInterval: parseInt(import.meta.env.VITE_POLLING_INTERVAL || '5000'),
};

/**
 * Log current configuration (only in development)
 */
if (config.isDevelopment && config.enableDebugLogging) {
  console.log('[Config] Application Configuration:', {
    environment: config.isDevelopment ? 'development' : 'production',
    apiBaseUrl: config.apiBaseUrl,
    mockData: config.enableMockData ? 'ENABLED' : 'DISABLED',
    realTime: config.enableRealTimeUpdates ? 'ENABLED' : 'DISABLED',
  });
}

/**
 * Check if we should use mock data
 * This can be used throughout the app to conditionally show mock vs real data
 */
export const useMockData = (): boolean => {
  return config.enableMockData;
};

/**
 * Get API delay for mock operations
 */
export const getMockDelay = (): number => {
  return config.mockApiDelay;
};
