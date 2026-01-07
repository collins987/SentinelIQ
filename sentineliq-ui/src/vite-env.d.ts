/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_WS_URL: string;
  readonly VITE_USE_MOCK_DATA: string;
  readonly VITE_ENABLE_WEBSOCKET: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_DEBUG: string;
  readonly VITE_POLLING_INTERVAL: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
