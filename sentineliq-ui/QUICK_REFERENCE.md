# Quick Reference: Mock Data Toggle

## TL;DR - Enable/Disable Mock Data

### Development (Mock Data)
```bash
# Create .env.local
echo "VITE_ENABLE_MOCK_DATA=true" > sentineliq-ui/.env.local

# Run frontend only
cd sentineliq-ui
npm run dev
```
**Result:** UI shows fake data, no backend needed

---

### Production (Real API)
```bash
# Create .env.local
echo "VITE_ENABLE_MOCK_DATA=false" > sentineliq-ui/.env.local

# Start backend
docker-compose up -d

# Run frontend
cd sentineliq-ui
npm run dev
```
**Result:** UI fetches from `http://localhost:8000`

---

## Current Status

| Feature | Mock Mode | Real API Mode |
|---------|-----------|---------------|
| **Users CRUD** | ⚠️ In-memory only | ❌ Not integrated yet |
| **Audit Logs** | ⚠️ Fake entries | ❌ Not integrated yet |
| **Jobs Management** | ⚠️ Simulated | ❌ Not integrated yet |
| **Dashboard Metrics** | ⚠️ Random data | ❌ Not integrated yet |
| **Settings** | ⚠️ Local storage | ❌ Not integrated yet |

**Legend:**
- ⚠️ Works but doesn't persist
- ❌ Needs service layer implementation

---

## Files Created

### Configuration
- `src/lib/config.ts` - Environment detection
- `src/vite-env.d.ts` - TypeScript definitions
- `.env.example` - Environment variables

### Documentation
- `DATA_FLOW_AUDIT.md` - Detailed audit (650 lines)
- `API_INTEGRATION_GUIDE.md` - Integration guide (600 lines)
- `INTEGRATION_SUMMARY.md` - Executive summary (500 lines)
- `QUICK_REFERENCE.md` - This file

---

## Next Steps for Development Team

### 1. Create Service Layer (Priority 1)

**File:** `src/services/usersService.ts`

```typescript
import { config } from '../lib/config';
import { endpoints } from '../lib/api';
import { simulateApiDelay } from '../hooks/useActions';

const mockUsers = [...]; // Existing mock data

export const usersService = {
  async list() {
    if (config.enableMockData) {
      await simulateApiDelay();
      return mockUsers;
    }
    return await endpoints.users.list();
  },
  
  async create(data) {
    if (config.enableMockData) {
      await simulateApiDelay();
      const newUser = { ...data, id: crypto.randomUUID() };
      mockUsers.push(newUser);
      return newUser;
    }
    return await endpoints.users.create(data);
  },
  
  // ... update, delete methods
};
```

### 2. Update Components (Priority 2)

**File:** `src/pages/users.tsx`

**Before:**
```typescript
const [users, setUsers] = useState(mockUsers);

const handleCreate = async (data) => {
  await simulateApiDelay();
  const newUser = { ...data, id: crypto.randomUUID() };
  setUsers(prev => [...prev, newUser]);
};
```

**After:**
```typescript
import { usersService } from '../services/usersService';

const [users, setUsers] = useState([]);

useEffect(() => {
  loadUsers();
}, []);

const loadUsers = async () => {
  const data = await usersService.list();
  setUsers(data);
};

const handleCreate = async (data) => {
  const newUser = await usersService.create(data);
  setUsers(prev => [...prev, newUser]);
};
```

### 3. Test Integration (Priority 3)

```bash
# Test mock mode
VITE_ENABLE_MOCK_DATA=true npm run dev

# Test real API
docker-compose up
VITE_ENABLE_MOCK_DATA=false npm run dev
```

---

## Troubleshooting

### Issue: Config shows mock data disabled but UI still shows fake data

**Cause:** Components not updated to use service layer  
**Fix:** Implement service layer and update components

### Issue: Network errors when mock data is disabled

**Cause:** Backend not running  
**Fix:** Start backend with `docker-compose up`

### Issue: CORS errors

**Cause:** Backend CORS not configured for frontend URL  
**Fix:** Add to `app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Check Current Configuration

Open browser console:
```javascript
// Check if mock data is enabled
console.log('Mock data:', import.meta.env.VITE_ENABLE_MOCK_DATA);

// Check API URL
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
```

Look for startup logs:
```
[Config] Application Configuration: {
  environment: 'development',
  apiBaseUrl: 'http://localhost:8000',
  mockData: 'ENABLED',  // ← Check this
  realTime: 'ENABLED',
}
```

---

## Environment Variables Quick Reference

| Variable | Default | Values |
|----------|---------|--------|
| `VITE_ENABLE_MOCK_DATA` | `true` (dev) | `'true'` or `'false'` |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Any URL |
| `VITE_MOCK_API_DELAY` | `800` | Milliseconds |

---

## API Endpoints Available

```typescript
import { endpoints } from './lib/api';

// Users
endpoints.users.list()
endpoints.users.create(data)
endpoints.users.update(id, data)
endpoints.users.delete(id)

// Jobs
endpoints.jobs.list()
endpoints.jobs.retry(id)
endpoints.jobs.cancel(id)

// Audit
endpoints.audit.list()

// Dashboard
endpoints.dashboard.metrics()
endpoints.dashboard.recentActivity()

// Health
endpoints.health.status()
endpoints.health.services()
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/config.ts` | Environment configuration |
| `src/lib/api.ts` | API client (axios) |
| `src/hooks/useActions.ts` | Async action helpers |
| `.env.local` | Local environment overrides |
| `.env.example` | Environment variables template |

---

## Git History Safety

The following files should **NOT** be committed:
- `.env.local`
- `.env.production.local`
- Any file with real API keys

The following **should** be committed:
- `.env.example`
- `src/lib/config.ts`
- All documentation files

---

## Complete Documentation

For detailed information, see:

1. **DATA_FLOW_AUDIT.md** - Full audit report
   - All mock data sources identified
   - Backend endpoint inventory
   - Data flow diagrams
   - Risk assessment

2. **API_INTEGRATION_GUIDE.md** - Developer guide
   - Step-by-step integration
   - Code examples
   - Error handling patterns
   - Testing strategies

3. **INTEGRATION_SUMMARY.md** - Executive summary
   - High-level overview
   - Architecture diagrams
   - Implementation roadmap
   - Success criteria

---

**Last Updated:** January 6, 2026  
**Status:** ✅ Configuration Complete, ⏳ Integration Pending
