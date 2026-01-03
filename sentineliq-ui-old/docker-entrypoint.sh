#!/bin/sh
# SentinelIQ Frontend startup with environment variable support

# Source environment variables from .env if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Create environment config if not exists
if [ ! -f /usr/share/nginx/html/env-config.js ]; then
    cat > /usr/share/nginx/html/env-config.js << EOF
window.__ENV__ = {
  VITE_API_BASE_URL: '${VITE_API_BASE_URL:-http://localhost:8000}',
  VITE_API_TIMEOUT: '${VITE_API_TIMEOUT:-30000}',
  VITE_APP_NAME: '${VITE_APP_NAME:-SentinelIQ}',
  VITE_ENABLE_ANALYTICS: '${VITE_ENABLE_ANALYTICS:-true}',
  VITE_ENABLE_DEBUG_MODE: '${VITE_ENABLE_DEBUG_MODE:-false}',
  VITE_LOG_LEVEL: '${VITE_LOG_LEVEL:-info}',
  VITE_SECURE_COOKIES: '${VITE_SECURE_COOKIES:-true}',
  VITE_WEBSOCKET_URL: '${VITE_WEBSOCKET_URL:-ws://localhost:8000/ws}'
};
EOF
fi

# Start NGINX
exec nginx -g "daemon off;"
