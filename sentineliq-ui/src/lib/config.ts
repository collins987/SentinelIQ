/**
 * Application Configuration
 * Centralized config with environment detection and feature flags
 */

export const config = {
  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,

  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',

  // Feature Flags
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',

  // App Info
  appName: import.meta.env.VITE_APP_NAME || 'SentinelIQ',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
} as const;

/**
 * Helper to check if mock data should be used
 * Returns true only if explicitly enabled AND in development
 */
export function useMockData(): boolean {
  return config.enableMockData && config.isDevelopment;
}

/**
 * Simulate API delay for mock data (development only)
 */
export async function simulateApiDelay(ms: number = 800): Promise<void> {
  if (useMockData()) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Log configuration on startup (development only)
if (config.isDevelopment) {
  console.log('[Config] Application Configuration:', {
    mode: config.mode,
    apiBaseUrl: config.apiBaseUrl,
    mockData: config.enableMockData ? 'ENABLED' : 'DISABLED',
  });
}

export default config;
