# SentinelIQ - Data Flow & Mock Data Audit Report

**Date:** January 6, 2026  
**Status:** ⚠️ MOCK DATA IDENTIFIED - INTEGRATION REQUIRED

---

## Executive Summary

### Current State
The SentinelIQ frontend currently operates in **DEVELOPMENT MODE** with extensive mock data usage. While a fully functional API client (`src/lib/api.ts`) exists and backend endpoints are implemented, **frontend components are NOT integrated with the backend** and display only simulated data.

### Key Findings
✅ **Backend API:** Fully functional FastAPI backend with RESTful endpoints  
✅ **API Client:** Complete Axios-based client with typed endpoints  
❌ **Integration:** Frontend components bypass API client, use local mock data  
❌ **Data Persistence:** User inputs are not saved to database  
❌ **Real-time Updates:** Polling generates fake data instead of fetching from backend

---

## Mock Data Sources Identified

### 1. **Page-Level Mock Data** (Highest Priority)

| File | Mock Data | Lines | Impact |
|------|-----------|-------|--------|
| `audit.tsx` | `mockAuditEntries` | 29-34 | Audit trail shows fake entries |
| `dashboard.tsx` | `generateMockData()` | 19-59 | All dashboard metrics are simulated |
| `users.tsx` | `mockUsers` | 23-48 | User list is hardcoded |
| `roles.tsx` | `mockRoles` | 21-35 | Role management shows fake roles |
| `jobs.tsx` | `mockLogs` | 60-66 | Job logs are simulated |
| `health.tsx` | Mock latency data | 41+ | Service health is fabricated |

### 2. **Service-Level Mocks**

| Component | Mock Implementation | Purpose |
|-----------|---------------------|---------|
| `simulateApiDelay()` | `src/hooks/useActions.ts:47` | Simulates 800ms network delay |
| `useRealTimeData` | `src/hooks/useRealTimeData.ts` | Generates fake events every 5 seconds |
| `generateMockEvent()` | `src/hooks/useRealTimeData.ts:22` | Creates synthetic system events |

### 3. **Configuration**

Currently hardcoded in `App.tsx:39`:
```typescript
useRealTimeData({ enablePolling: true, pollingInterval: 5000, enableMockData: true });
```

---

## Backend API Endpoints (Available but Unused)

### Authentication
```typescript
POST   /api/v1/auth/login         // User login
POST   /api/v1/auth/logout        // User logout  
GET    /api/v1/auth/me            // Get current user
```

### Dashboard
```typescript
GET    /api/v1/dashboard/metrics          // System metrics
GET    /api/v1/dashboard/activity         // Recent activity
```

### Users
```typescript
GET    /api/v1/users                      // List users
GET    /api/v1/users/:id                  // Get user by ID
POST   /api/v1/users                      // Create user
PATCH  /api/v1/users/:id                  // Update user
DELETE /api/v1/users/:id                  // Delete user
```

### Jobs
```typescript
GET    /api/v1/jobs                       // List jobs
GET    /api/v1/jobs/:id                   // Get job details
POST   /api/v1/jobs/:id/cancel            // Cancel job
POST   /api/v1/jobs/:id/retry             // Retry job
GET    /api/v1/jobs/queues                // Get queue stats
```

### Audit Trail
```typescript
GET    /api/v1/audit                      // List audit entries
GET    /api/v1/audit/:id                  // Get audit details
```

### Events
```typescript
GET    /api/v1/events                     // List events
GET    /api/v1/events/stream              // Event stream (SSE)
POST   /api/v1/events/ingest              // Ingest event
```

### Health Monitoring
```typescript
GET    /api/v1/health                     // System health
GET    /api/v1/health/services            // Service health
GET    /health                            // Simple health check
```

### Analytics
```typescript
GET    /api/v1/analytics/overview         // Analytics overview
GET    /api/v1/analytics/timeseries/:metric  // Time-series data
```

---

## Data Flow Analysis

### Current (Mock) Flow
```
User Action → Component State Update → Mock Data Array → UI Re-render
                                ↓
                        simulateApiDelay(800ms)
                                ↓
                        Toast Notification
```

**Problem:** Data never leaves browser memory. No persistence, no backend communication.

### Intended (Production) Flow
```
User Action → Component Handler → API Client (axios)
                                        ↓
                                   HTTP Request
                                        ↓
                            Backend FastAPI Server
                                        ↓
                              Database (PostgreSQL)
                                        ↓
                            HTTP Response (JSON)
                                        ↓
                          Component State Update
                                        ↓
                                  UI Re-render
```

---

## Root Cause Analysis

### Why Mock Data Exists

1. **Development Speed:** Allows frontend work without waiting for backend
2. **Offline Development:** No backend required during UI development
3. **Demos:** Consistent data for screenshots/presentations
4. **Testing:** Predictable state for component testing

### Why Integration is Missing

1. **No Environment Detection:** Code doesn't check if backend is available
2. **Hardcoded Mocks:** Mock data in component files, not gated by flags
3. **Missing Error Handling:** No fallback when API calls fail
4. **Incomplete Migration:** API client built but never wired to components

---

## Proposed Solution

### Phase 1: Environment Detection (Completed ✅)

**File Created:** `src/lib/config.ts`

Centralized configuration with environment-based feature flags:
```typescript
export const config = {
  isDevelopment: import.meta.env.DEV,
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
};
```

### Phase 2: API Service Layer (Required)

Create service modules that abstract data source:

**Example:** `src/services/usersService.ts`
```typescript
import { config, useMockData } from '../lib/config';
import { endpoints } from '../lib/api';

export const usersService = {
  async list() {
    if (useMockData()) {
      // Return mock data in development
      await simulateApiDelay();
      return mockUsers;
    }
    
    // Production: Call real API
    return await endpoints.users.list();
  },
  
  async create(data) {
    if (useMockData()) {
      await simulateApiDelay();
      const newUser = { ...data, id: crypto.randomUUID() };
      return newUser;
    }
    
    return await endpoints.users.create(data);
  },
};
```

### Phase 3: Component Integration

Update components to use service layer:

**Before:**
```typescript
const [users, setUsers] = useState(mockUsers);

const handleAddUser = async (userData) => {
  await simulateApiDelay();
  const newUser = { ...userData, id: crypto.randomUUID() };
  setUsers(prev => [...prev, newUser]);
};
```

**After:**
```typescript
import { usersService } from '../services/usersService';

const [users, setUsers] = useState([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  loadUsers();
}, []);

const loadUsers = async () => {
  try {
    setIsLoading(true);
    const data = await usersService.list();
    setUsers(data);
  } catch (error) {
    toast('error', 'Failed to load users', error.message);
  } finally {
    setIsLoading(false);
  }
};

const handleAddUser = async (userData) => {
  try {
    const newUser = await usersService.create(userData);
    setUsers(prev => [...prev, newUser]);
    toast('success', 'User created');
  } catch (error) {
    toast('error', 'Failed to create user', error.message);
  }
};
```

### Phase 4: Environment Configuration

**Development Mode** (`.env.development`):
```bash
VITE_ENABLE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:8000
```

**Production Mode** (`.env.production`):
```bash
VITE_ENABLE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sentineliq.com
```

---

## Implementation Priority

### High Priority (Data Loss Risk)
1. **Users Management** - User CRUD operations not persisted
2. **Audit Trail** - Compliance data not recorded
3. **Roles & Permissions** - Security settings not saved

### Medium Priority (UX Impact)
4. **Jobs Management** - Job actions (retry/cancel) don't work
5. **Dashboard** - Metrics show fake data
6. **Settings** - User preferences not saved

### Low Priority (Display Only)
7. **Analytics** - Historical data still useful from backend
8. **Health Monitoring** - Can poll real services
9. **Activity Feed** - Can fetch real events

---

## Validation Checklist

Before marking integration complete, verify:

- [ ] `VITE_ENABLE_MOCK_DATA=false` switches to real API
- [ ] User creation persists to database
- [ ] User updates save correctly
- [ ] User deletion removes from database
- [ ] Role changes persist
- [ ] Audit entries are logged to database
- [ ] Job actions (retry/cancel) call backend
- [ ] Dashboard loads real metrics from `/api/v1/dashboard/metrics`
- [ ] Error handling shows meaningful messages
- [ ] Loading states display during API calls
- [ ] Empty states show when no data exists
- [ ] Network errors are caught and displayed
- [ ] Auth tokens are sent with requests
- [ ] 401 errors redirect to login
- [ ] WebSocket reconnects on disconnect

---

## API Response Examples

### GET /api/v1/users
**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/v1/users
```

**Response:**
```json
[
  {
    "id": "user-123",
    "email": "admin@sentineliq.io",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin",
    "email_verified": true,
    "last_login": "2026-01-06T10:30:00Z",
    "created_at": "2025-12-01T00:00:00Z"
  }
]
```

### POST /api/v1/users
**Request:**
```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "newuser@example.com",
       "first_name": "John",
       "last_name": "Doe",
       "password": "SecurePass123!",
       "role": "viewer"
     }' \
     http://localhost:8000/api/v1/users
```

**Response:**
```json
{
  "id": "user-456",
  "email": "newuser@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "viewer",
  "email_verified": false,
  "created_at": "2026-01-06T12:00:00Z"
}
```

### Error Response (400 Bad Request)
```json
{
  "detail": "Email already exists"
}
```

### Error Response (401 Unauthorized)
```json
{
  "detail": "Not authenticated"
}
```

---

## Next Steps

1. ✅ **Environment Configuration** - Created `src/lib/config.ts`
2. ⏳ **Create Service Layer** - Abstract API calls into services
3. ⏳ **Update Components** - Replace mock data with service calls
4. ⏳ **Add Error Handling** - Implement proper error boundaries
5. ⏳ **Test Integration** - Verify end-to-end data flow
6. ⏳ **Document APIs** - Complete API documentation
7. ⏳ **Deploy** - Configure production environment

---

## Developer Guide

### How to Enable Mock Data (Development)
```bash
# Create .env.local
echo "VITE_ENABLE_MOCK_DATA=true" > .env.local

# Run dev server
npm run dev
```

### How to Disable Mock Data (Test Real Backend)
```bash
# Update .env.local
echo "VITE_ENABLE_MOCK_DATA=false" > .env.local

# Ensure backend is running
cd ../
docker-compose up

# Run frontend
cd sentineliq-ui
npm run dev
```

### How to Check Current Mode
Open browser console:
```javascript
// Will show current configuration
// Look for: [Config] Application Configuration: { mockData: 'ENABLED' }
```

---

## Compliance & Security Notes

### Audit Trail Integrity
- Current mock audit entries are NOT compliance-valid
- Real backend stores audit logs with cryptographic integrity
- Deleting an audit entry in the UI only affects browser state
- Production must use append-only audit log

### Data Retention
- Mock data is lost on page refresh
- Real backend implements retention policies
- Backup and archival handled by database layer

### Access Control
- Mock mode bypasses all authentication
- Real backend enforces RBAC via JWT tokens
- Admin actions require elevated permissions

---

**Report Prepared By:** Senior Full-Stack Engineer  
**Review Status:** Pending Implementation  
**Risk Level:** ⚠️ MEDIUM - Data loss possible if users expect persistence
