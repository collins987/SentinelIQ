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
COPY postcss.config.js ./
COPY index.html ./

# Install dependencies with clean cache
RUN npm ci --only=production && \
    npm ci --only=dev

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

# Create non-root user for security
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -c "nginx user" -G nginx nginx

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf
RUN chmod 644 /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Create necessary directories with correct permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 5173

# Health check with improved reliability
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:5173/health || exit 1

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]

