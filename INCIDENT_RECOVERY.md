# Incident Recovery Guide

## Issue Summary
- **Prometheus**: Configuration errors, invalid scrape targets
- **Frontend UI**: Initialization errors, mock data handling issues

## Recovery Steps Completed

### 1. Fixed Prometheus Configuration
- Created valid `prometheus/prometheus.yml`
- Configured correct service hostnames (Docker networking)
- Added health checks and proper scrape intervals

### 2. Fixed Docker Compose
- Ensured all services on same network (`sentineliq-network`)
- Added health checks for all services
- Configured proper environment variables

### 3. Fixed Frontend Configuration
- Created `.env.development` and `.env.production`
- Fixed `src/lib/config.ts` with proper defaults
- Added error handling in `src/lib/api.ts`
- Fixed `useRealTimeData` hook to prevent crashes

## Verification Commands

### Start All Services
```bash
cd c:\Users\vinny\OneDrive\Documents\sentineliq
docker-compose down -v
docker-compose up --build
```

### Verify Prometheus
```bash
# Check Prometheus is running
curl http://localhost:9090/-/healthy

# Check targets status
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Expected: All targets show "health": "up"
```

### Verify Frontend
```bash
# Check frontend is accessible
curl -I http://localhost:5173/

# Expected: HTTP 200 OK
```

### Verify Backend API
```bash
# Check API health
curl http://localhost:8000/health

# Expected: {"status": "healthy"}
```

### Verify Frontend-Backend Connectivity
```bash
# From browser console (F12):
fetch('http://localhost:8000/health').then(r => r.json()).then(console.log)

# Expected: {status: "healthy"}
```

## Development Mode (Frontend Only)

```bash
cd sentineliq-ui

# Enable mock data
echo "VITE_ENABLE_MOCK_DATA=true" > .env.local

# Start dev server
npm run dev

# Open http://localhost:5173
```

## Production Mode (Real Backend)

```bash
cd sentineliq-ui

# Disable mock data
echo "VITE_ENABLE_MOCK_DATA=false" > .env.local

# Ensure backend is running
cd ..
docker-compose up -d sentineliq-api postgres redis

# Start frontend
cd sentineliq-ui
npm run dev
```

## Monitoring Dashboard

After recovery, access:
- **Prometheus**: http://localhost:9090
- **Prometheus Targets**: http://localhost:9090/targets
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

## Prevention Measures

1. **Always test Prometheus config before deploying**:
   ```bash
   docker run --rm -v $(pwd)/prometheus:/etc/prometheus prom/prometheus:v2.47.0 promtool check config /etc/prometheus/prometheus.yml
   ```

2. **Use environment-specific configs** (`.env.development`, `.env.production`)

3. **Add health checks** to all services in docker-compose.yml

4. **Handle API errors gracefully** in frontend components

5. **Test with mock data disabled** before deploying to production
