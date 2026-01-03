# ============================================================================
# Build Stage - Compile TypeScript and optimize assets
# ============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (with dependency caching layer)
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.cjs ./
COPY index.html ./

# Install dependencies
RUN npm install

# Copy source code and public assets
COPY src ./src
COPY public ./public

# Build the application with optimizations
RUN npm run build

# ============================================================================
# Runtime Stage - Minimal NGINX image for production
# ============================================================================
FROM nginx:1.25-alpine

# Install health check dependencies
RUN apk add --no-cache curl

# nginx user already exists in nginx:1.25-alpine
# Just ensure proper permissions for directories
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf
RUN chmod 644 /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Run NGINX master as root so it can write /var/run/nginx.pid.
# NGINX will drop privileges to the configured user for worker processes.

# Expose port
EXPOSE 5173

# Health check with improved reliability
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:5173/health || exit 1

# Override nginx base image entrypoint and start directly
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
