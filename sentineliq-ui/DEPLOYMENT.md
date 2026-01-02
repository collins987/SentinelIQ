# SentinelIQ Frontend - Best Practices Implementation

This frontend service follows production-ready best practices for security, performance, and reliability.

## 🏗️ Architecture

- **Framework**: React 18 + TypeScript + Vite
- **Server**: NGINX 1.25 Alpine (production-grade)
- **Build**: Multi-stage Docker build with optimizations
- **Security**: Non-root user, security headers, rate limiting

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

### Docker Build & Run
```bash
docker build -t sentineliq-frontend:latest .
docker run -p 5173:5173 sentineliq-frontend:latest
```

### With Docker Compose
```bash
docker-compose up -d frontend
```

## 📋 Best Practices Implemented

### 1. **Security**
- ✅ Non-root user execution (uid: 101)
- ✅ Security headers (CSP, X-Frame-Options, HSTS)
- ✅ Rate limiting (30 req/s general, 10 req/s API)
- ✅ Removed server tokens (no NGINX version disclosure)
- ✅ No world-writable directories
- ✅ Dropped dangerous Linux capabilities

### 2. **Performance**
- ✅ Gzip compression (6-level)
- ✅ Static asset caching (1 year for versioned files)
- ✅ Optimized NGINX worker processes
- ✅ TCP optimizations (tcp_nopush, tcp_nodelay)
- ✅ Connection reuse (keepalive)
- ✅ Minimal image size (~20MB)

### 3. **Reliability**
- ✅ Health checks (15s interval, 30s startup period)
- ✅ Graceful error handling (SPA fallback to index.html)
- ✅ API proxy with connection pooling
- ✅ Automatic log rotation
- ✅ Process monitoring via Docker

### 4. **Observability**
- ✅ Request logging with timing metrics
- ✅ Access logs with upstream response times
- ✅ Error logging with context
- ✅ Health endpoint for monitoring
- ✅ Request/response metrics

### 5. **Development Experience**
- ✅ .dockerignore for clean builds
- ✅ .env.example for configuration
- ✅ Docker layer caching optimization
- ✅ Clear build stages
- ✅ Development VS production separation

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Supported variables:
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8000)
- `VITE_API_TIMEOUT`: Request timeout in ms (default: 30000)
- `VITE_ENABLE_ANALYTICS`: Enable analytics tracking (default: true)
- `VITE_ENABLE_DEBUG_MODE`: Enable debug logging (default: false)
- `VITE_LOG_LEVEL`: Logging level - debug|info|warn|error (default: info)
- `VITE_SECURE_COOKIES`: Use secure cookies only (default: true)

### NGINX Configuration

The `nginx.conf` file includes:
- Security headers (CSP, X-Frame-Options, X-XSS-Protection)
- Gzip compression for text assets
- Rate limiting (configurable per endpoint)
- API proxy to backend
- SPA routing (fallback to index.html)
- Static asset caching strategy

## 📦 Docker Image Details

### Base Image: `nginx:1.25-alpine`
- ~40MB base
- Security updates included
- Alpine for minimal size

### Build Optimization
- Multi-stage build (builder → runtime)
- Only production dependencies in runtime
- Layer caching for faster rebuilds
- `.dockerignore` to exclude unnecessary files

### Image Size
- Build: ~150MB
- Runtime: ~20-30MB

## 🏥 Health Checks

Endpoint: `GET /health`

Response: `200 OK - healthy`

Interval: 15 seconds
Timeout: 5 seconds
Retries: 3
Start Period: 30 seconds

## 🔐 Security Headers

All requests receive:
- `Content-Security-Policy`: Restricts resource loading
- `X-Frame-Options: SAMEORIGIN`: Prevents clickjacking
- `X-Content-Type-Options: nosniff`: Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block`: Legacy XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin`: Controls referrer info
- `Permissions-Policy`: Disables geolocation, microphone, camera

## 📊 Rate Limiting

- **General endpoints**: 30 req/s (burst: 30)
- **API endpoints**: 10 req/s (burst: 20)
- **Static assets**: 30 req/s (burst: 50)

Configurable in `nginx.conf` under `limit_req_zone`.

## 🐛 Troubleshooting

### Container won't start
```bash
docker logs sentineliq_frontend
```

### Health check failing
```bash
docker exec sentineliq_frontend curl http://localhost:5173/health
```

### API requests timing out
- Check backend connectivity: `docker network inspect sentineliq_backend`
- Verify API is running: `docker logs sentineliq_api`
- Increase timeout in `VITE_API_TIMEOUT`

### High memory usage
- Monitor with: `docker stats sentineliq_frontend`
- Check for resource leaks in React components
- Review NGINX worker_connections setting

## 📈 Monitoring

### Logs
```bash
docker logs sentineliq_frontend -f
```

### Stats
```bash
docker stats sentineliq_frontend
```

### NGINX Status (requires additional module)
Configure stub_status in nginx.conf to monitor active connections.

## 🔄 Deployment Updates

### Update frontend code
```bash
git pull
docker-compose up -d --build frontend
```

### Zero-downtime deployment
```bash
docker-compose pull frontend
docker-compose up -d frontend
```

NGINX will gracefully reload with new code.

## 📚 Additional Resources

- [NGINX Best Practices](https://nginx.org/en/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Security](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: January 2, 2026
**Version**: 1.0.0
