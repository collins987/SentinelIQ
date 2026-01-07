# SentinelIQ Full-Stack Debugging Prompt

## System Overview

**Application**: SentinelIQ - Fintech Risk & Security Intelligence Platform  
**Architecture**: React/TypeScript Frontend + FastAPI/Python Backend + PostgreSQL + Redis  
**Deployment**: Docker Compose with multiple services  
**Date**: January 7, 2026

---

## Critical Issues to Resolve

### Frontend UI Failures

| Page | Error Message | Expected Behavior |
|------|---------------|-------------------|
| **Dashboard** | "Network error" | Display metrics from `/analytics/dashboard` |
| **Jobs** | "Failed to load jobs. Please try again" | List background jobs from `/api/v1/jobs` |
| **System Health** | "Failed to load health status. Backend may be unavailable" | Show service health from `/health` |
| **Users** | "Network error" | List users from `/users` |
| **Audit Trail** | Blank dark blue page (no content renders) | Display audit logs from `/admin/audit-logs` |

---

## KNOWN ROOT CAUSES IDENTIFIED

### 1. **CORS Middleware Missing** (CRITICAL - FIXED)
The FastAPI backend was missing CORSMiddleware, causing browsers to block all cross-origin requests from `localhost:5173` to `localhost:8000`.

**Fix Applied** in `app/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://sentineliq_frontend:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
```

### 2. **Missing `/users` List Endpoint** (CRITICAL - FIXED)
The frontend calls `GET /users` but the backend only had `GET /users/me`. A list endpoint was missing.

**Fix Applied** in `app/routes/users.py`:
- Added `GET /users` - List users with pagination
- Added `GET /users/{user_id}` - Get single user
- Added `PATCH /users/{user_id}` - Update user
- Added `DELETE /users/{user_id}` - Delete user

---

## Architecture & File Structure

```
sentineliq/
├── app/                          # FastAPI Backend
│   ├── main.py                   # App entry, middleware, routes
│   ├── config.py                 # Configuration
│   ├── database.py               # DB connection
│   ├── dependencies.py           # Auth dependencies
│   ├── models.py                 # SQLAlchemy models
│   ├── api/
│   │   ├── auth.py               # /auth/* routes
│   │   └── users.py              # /users/* routes (OLD)
│   ├── routes/
│   │   ├── admin.py              # /admin/* routes
│   │   ├── analytics.py          # /analytics/* routes
│   │   ├── advanced_analytics.py # /analytics/advanced/* routes
│   │   ├── jobs.py               # /api/v1/jobs/* routes
│   │   ├── users.py              # /users/* routes
│   │   └── ...
│   └── services/
│       └── ...
├── sentineliq-ui/                # React Frontend
│   ├── src/
│   │   ├── App.tsx               # Router setup
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios client (BASE_URL config)
│   │   │   └── config.ts         # Frontend configuration
│   │   ├── services/
│   │   │   ├── dashboardService.ts
│   │   │   ├── healthService.ts
│   │   │   ├── userService.ts
│   │   │   ├── auditService.ts
│   │   │   └── jobService.ts
│   │   ├── pages/
│   │   │   ├── dashboard.tsx
│   │   │   ├── health.tsx
│   │   │   ├── users.tsx
│   │   │   ├── audit.tsx
│   │   │   └── jobs.tsx
│   │   └── stores/
│   │       └── authStore.ts      # Authentication state
│   ├── vite.config.ts            # Vite dev server config
│   └── Dockerfile
├── docker-compose.yml            # Service orchestration
├── Dockerfile                    # Backend Dockerfile
├── requirements.txt              # Python dependencies
└── monitoring/
    ├── prometheus.yml
    └── blackbox.yml
```

---

## Debugging Checklist

### Phase 1: Verify Backend API Routes

**Task**: Confirm all required backend routes exist and return correct responses.

1. **List all registered FastAPI routes**:
   ```python
   # In app/main.py - temporarily add:
   for route in app.routes:
       print(f"{route.methods} {route.path}")
   ```

2. **Verify route prefixes match frontend expectations**:

   | Frontend Service | Expected Endpoint | Backend Router File | Router Prefix |
   |-----------------|-------------------|---------------------|---------------|
   | dashboardService | `/analytics/dashboard` | routes/analytics.py | `/analytics` |
   | dashboardService | `/analytics/advanced/risk-timeline` | routes/advanced_analytics.py | `/analytics/advanced` |
   | healthService | `/health` | main.py (direct) | N/A |
   | userService | `/users` | routes/users.py | `/users` |
   | userService | `/admin/users/{id}/disable` | routes/admin.py | `/admin` |
   | auditService | `/admin/audit-logs` | routes/admin.py | `/admin` |
   | jobService | `/api/v1/jobs` | routes/jobs.py | `/api/v1/jobs` |

3. **Test each endpoint directly**:
   ```bash
   # From inside Docker network or with port mapping
   curl -X GET http://localhost:8000/health
   curl -X GET http://localhost:8000/analytics/dashboard -H "Authorization: Bearer <token>"
   curl -X GET http://localhost:8000/admin/audit-logs -H "Authorization: Bearer <token>"
   curl -X GET http://localhost:8000/api/v1/jobs -H "Authorization: Bearer <token>"
   curl -X GET http://localhost:8000/users -H "Authorization: Bearer <token>"
   ```

---

### Phase 2: Verify Frontend API Client Configuration

**Task**: Confirm frontend is calling correct URLs with proper authentication.

1. **Check `lib/api.ts` base URL**:
   ```typescript
   // Should be: http://localhost:8000 for dev, or Docker service name
   baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
   ```

2. **Check environment variables in docker-compose.yml**:
   ```yaml
   frontend:
     environment:
       VITE_API_BASE_URL: http://localhost:8000  # Must be accessible from browser!
   ```

   ⚠️ **CRITICAL**: `VITE_API_BASE_URL` must be the URL the **browser** can reach, NOT the Docker internal network name.

3. **Verify each service file uses correct paths** (no `/api/v1/` prefix unless backend has it):
   - `dashboardService.ts` → `/analytics/dashboard`, `/analytics/advanced/risk-timeline`
   - `healthService.ts` → `/health`
   - `userService.ts` → `/users`, `/admin/users/...`
   - `auditService.ts` → `/admin/audit-logs`
   - `jobService.ts` → `/api/v1/jobs`

4. **Check authentication header is being attached**:
   ```typescript
   // In api.ts interceptor - verify token is read from localStorage
   const token = localStorage.getItem('auth_token');
   if (token) {
     config.headers.Authorization = `Bearer ${token}`;
   }
   ```

---

### Phase 3: CORS Configuration

**Task**: Ensure backend allows requests from frontend origin.

1. **Check FastAPI CORS middleware** (should be in `main.py`):
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Check TrustedHostMiddleware** isn't blocking requests:
   ```python
   app.add_middleware(
       TrustedHostMiddleware,
       allowed_hosts=["localhost", "127.0.0.1", "sentineliq_api", "*"]  # Add "*" for dev
   )
   ```

---

### Phase 4: Docker Network & Service Communication

**Task**: Verify containers can communicate and ports are mapped correctly.

1. **Check docker-compose service names and ports**:
   ```yaml
   services:
     api:
       container_name: sentineliq_api
       ports:
         - "8000:8000"  # Host:Container
     
     frontend:
       container_name: sentineliq_frontend
       ports:
         - "5173:5173"
       environment:
         # Browser accesses API via HOST port, not Docker network!
         VITE_API_BASE_URL: http://localhost:8000
   ```

2. **Test inter-container communication**:
   ```bash
   docker exec sentineliq_frontend wget -qO- http://sentineliq_api:8000/health
   ```

3. **Test host-to-container communication**:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:5173/
   ```

---

### Phase 5: Authentication Flow

**Task**: Verify user is authenticated and token is valid.

1. **Check if login works and token is stored**:
   - Open browser DevTools → Application → Local Storage
   - Look for `auth_token` key after login

2. **Verify token format and expiration**:
   ```javascript
   // In browser console:
   const token = localStorage.getItem('auth_token');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('Token expires:', new Date(payload.exp * 1000));
   ```

3. **Check backend token validation**:
   - Verify `get_current_user` dependency in `dependencies.py`
   - Ensure JWT secret matches between token creation and validation

---

### Phase 6: Database & Data Availability

**Task**: Confirm database has required data and queries work.

1. **Check database connection**:
   ```bash
   docker exec sentineliq_postgres psql -U <user> -d <db> -c "SELECT 1;"
   ```

2. **Verify tables exist**:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

3. **Check for seed data**:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM audit_log;
   ```

---

### Phase 7: Error Analysis from Logs

**Task**: Extract and analyze actual errors from Docker logs.

1. **Get backend logs**:
   ```bash
   docker logs sentineliq_api --tail 200 2>&1 | grep -E "(ERROR|Exception|Traceback|404|500)"
   ```

2. **Get frontend logs**:
   ```bash
   docker logs sentineliq_frontend --tail 100
   ```

3. **Common errors and fixes**:

   | Error Pattern | Root Cause | Fix |
   |--------------|------------|-----|
   | `404 Not Found` on OPTIONS | Route doesn't exist or CORS not configured | Add CORS middleware, verify route exists |
   | `401 Unauthorized` | Token missing/expired/invalid | Check auth flow, token storage |
   | `h11.LocalProtocolError: Too little data` | Middleware modifying response incorrectly | Check custom middleware |
   | `Connection refused` | Service not running or wrong host | Check Docker network, port mapping |
   | `WebSocket not supported` | Missing websockets library | Add `uvicorn[standard]` to requirements |

---

### Phase 8: Browser Network Analysis

**Task**: Use browser DevTools to identify exact failure points.

1. **Open DevTools → Network tab**
2. **Reload each failing page and look for**:
   - Red (failed) requests
   - Request URL (is it correct?)
   - Response status code
   - Response body (error message)
   - Request headers (is Authorization present?)

3. **Check Console tab for JavaScript errors**

---

## Specific Files to Analyze

Please read and analyze these files for configuration issues:

### Backend
1. `app/main.py` - Route registration, middleware order, CORS setup
2. `app/dependencies.py` - `get_current_user`, `require_role` functions
3. `app/routes/admin.py` - `/admin/audit-logs` endpoint
4. `app/routes/analytics.py` - `/analytics/dashboard` endpoint
5. `app/routes/jobs.py` - `/api/v1/jobs` endpoint
6. `app/routes/users.py` - `/users` endpoints

### Frontend
1. `sentineliq-ui/src/lib/api.ts` - Axios configuration, interceptors
2. `sentineliq-ui/src/services/*.ts` - API endpoint paths
3. `sentineliq-ui/src/pages/*.tsx` - Component error handling
4. `sentineliq-ui/src/stores/authStore.ts` - Token management

### Configuration
1. `docker-compose.yml` - Service definitions, environment variables
2. `sentineliq-ui/vite.config.ts` - Dev server proxy settings
3. `.env` - Environment variables (if exists)

---

## Expected Fixes

After analysis, implement fixes for:

1. **Route Path Alignment**: Ensure frontend service paths match backend router prefixes exactly
2. **CORS Configuration**: Add proper CORSMiddleware to FastAPI
3. **Environment Variables**: Fix `VITE_API_BASE_URL` for browser access (not Docker internal)
4. **Authentication**: Verify token is being sent with requests
5. **Error Handling**: Add proper try/catch and error states in React components
6. **Middleware Order**: Ensure CORS middleware runs before other middleware

---

## Validation Steps

After applying fixes:

1. Rebuild containers: `docker compose down && docker compose up --build`
2. Clear browser cache and localStorage
3. Login with valid credentials
4. Test each page:
   - [ ] Dashboard loads with metrics
   - [ ] Jobs page shows empty list (no error)
   - [ ] Health page shows service status
   - [ ] Users page lists users
   - [ ] Audit trail shows log entries

---

## Command Reference

```bash
# Rebuild everything
docker compose down -v && docker compose up --build

# View API routes
docker exec sentineliq_api python -c "from app.main import app; [print(f'{r.methods} {r.path}') for r in app.routes]"

# Test API directly
curl -v http://localhost:8000/health
curl -v http://localhost:8000/docs  # Swagger UI

# Check container networking
docker network inspect sentineliq_backend

# View real-time logs
docker compose logs -f api frontend
```

---

## Additional Context

- The backend uses FastAPI with SQLAlchemy ORM
- Authentication is JWT-based with tokens stored in localStorage
- The frontend uses Zustand for state management
- Vite dev server proxies `/api` requests to backend in development
- Production build uses static file serving (not Vite proxy)
