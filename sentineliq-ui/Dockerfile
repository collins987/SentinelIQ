# ============================================================================
# Build Stage - Compile TypeScript and optimize assets
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (with dependency caching layer)
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.cjs ./
COPY index.html ./

# Install dependencies
RUN npm ci

# Copy source code and public assets
COPY . .

# Build the application with optimizations
RUN npm run build

# ============================================================================
# Runtime Stage - Minimal NGINX image for production
# ============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install serve for production
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Health check with improved reliability
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5173/ || exit 1

# Start the server
CMD ["serve", "-s", "dist", "-l", "5173"]

# ============================================================================
# Development Stage - For development environment
# ============================================================================
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
