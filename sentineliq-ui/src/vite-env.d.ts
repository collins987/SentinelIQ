/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  
  // API Configuration
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT?: string;
  
  // Feature Flags
  readonly VITE_ENABLE_MOCK_DATA?: string;
  readonly VITE_ENABLE_REAL_TIME?: string;
  readonly VITE_DEBUG_LOGGING?: string;
  
  // Mock Data Settings
  readonly VITE_MOCK_API_DELAY?: string;
  readonly VITE_POLLING_INTERVAL?: string;
  
  // External Services
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
