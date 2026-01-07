/**
 * Application Configuration
 * 
 * Centralized configuration module for feature flags, environment detection,
 * and runtime settings. Uses Vite's import.meta.env for environment variables.
 */

// ============================================
// Environment Detection
// ============================================

/** Current environment mode */
export const ENV = {
  /** True when running in development mode */
  isDevelopment: import.meta.env.DEV,
  /** True when running in production mode */
  isProduction: import.meta.env.PROD,
  /** Current mode string ('development' | 'production') */
  mode: import.meta.env.MODE,
} as const;

// ============================================
// Feature Flags
// ============================================

/** Feature flag configuration - can be overridden via environment variables */
export const FEATURES = {
  /** Enable mock data generation (disable in production with real API) */
  useMockData: import.meta.env.VITE_USE_MOCK_DATA !== 'false',
  /** Enable real-time WebSocket connections */
  enableWebSocket: import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false',
  /** Enable debug logging */
  enableDebugLogging: import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true',
  /** Enable analytics tracking */
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
} as const;

// ============================================
// API Configuration
// ============================================

/** API endpoint configuration */
export const API = {
  /** Base URL for API requests */
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  /** WebSocket URL for real-time updates */
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  /** API request timeout in milliseconds */
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
} as const;

// ============================================
// UI Configuration
// ============================================

/** UI-related configuration */
export const UI = {
  /** Default polling interval in milliseconds */
  pollingInterval: Number(import.meta.env.VITE_POLLING_INTERVAL) || 5000,
  /** Toast notification duration in milliseconds */
  toastDuration: 5000,
  /** Maximum items in activity feed */
  maxActivityItems: 50,
  /** Maximum items in notification list */
  maxNotifications: 100,
} as const;

// ============================================
// Hooks for React Components
// ============================================

/**
 * Hook to determine if mock data should be used
 * Returns true in development or when VITE_USE_MOCK_DATA is not 'false'
 * 
 * @returns boolean indicating if mock data mode is enabled
 * 
 * @example
 * ```tsx
 * const isMockMode = useMockData();
 * if (isMockMode) {
 *   // Use mock data
 * } else {
 *   // Fetch from real API
 * }
 * ```
 */
export function useMockData(): boolean {
  return FEATURES.useMockData;
}

/**
 * Hook to check if running in development mode
 * @returns boolean indicating development environment
 */
export function useIsDevelopment(): boolean {
  return ENV.isDevelopment;
}

/**
 * Hook to check if WebSocket is enabled
 * @returns boolean indicating WebSocket feature flag
 */
export function useWebSocketEnabled(): boolean {
  return FEATURES.enableWebSocket;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get a configuration value with optional default
 * @param key - Environment variable key (without VITE_ prefix)
 * @param defaultValue - Default value if not set
 */
export function getConfig(key: string, defaultValue: string = ''): string {
  return import.meta.env[`VITE_${key}`] || defaultValue;
}

/**
 * Log debug information (only in development or when debug is enabled)
 * @param args - Arguments to log
 */
export function debugLog(...args: unknown[]): void {
  if (FEATURES.enableDebugLogging) {
    console.log('[DEBUG]', ...args);
  }
}

// Configuration object export
export const config = {
  ENV,
  FEATURES,
  API,
  UI,
};

export default config;
