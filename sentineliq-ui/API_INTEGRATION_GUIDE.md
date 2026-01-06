# API Integration Guide

## Quick Start

### 1. Enable/Disable Mock Data

Create a `.env.local` file:

```bash
# Development - Use mock data
VITE_ENABLE_MOCK_DATA=true

# Testing with real backend
VITE_ENABLE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000
```

### 2. Start Backend

```bash
cd /path/to/sentineliq
docker-compose up
```

### 3. Run Frontend

```bash
cd sentineliq-ui
npm install
npm run dev
```

---

## API Client Usage

### Available Endpoints

The API client (`src/lib/api.ts`) provides typed endpoints:

```typescript
import { endpoints } from '../lib/api';

// Authentication
await endpoints.auth.login({ email, password });
await endpoints.auth.logout();
const user = await endpoints.auth.me();

// Users
const users = await endpoints.users.list();
const user = await endpoints.users.get(userId);
await endpoints.users.create(userData);
await endpoints.users.update(userId, userData);
await endpoints.users.delete(userId);

// Jobs
const jobs = await endpoints.jobs.list({ status: 'running' });
await endpoints.jobs.retry(jobId);
await endpoints.jobs.cancel(jobId);

// Audit
const auditLogs = await endpoints.audit.list({ page: 1, limit: 50 });

// Dashboard
const metrics = await endpoints.dashboard.metrics();
const activity = await endpoints.dashboard.recentActivity();

// Health
const health = await endpoints.health.status();
const services = await endpoints.health.services();

// Analytics
const overview = await endpoints.analytics.overview();
const timeseries = await endpoints.analytics.timeseries('requests', { 
  days: 7 
});
```

---

## Integration Pattern

### Service Layer Pattern (Recommended)

Create a service that abstracts mock vs real data:

**File:** `src/services/usersService.ts`

```typescript
import { config } from '../lib/config';
import { endpoints } from '../lib/api';
import { simulateApiDelay } from '../hooks/useActions';
import type { User } from '../types';

// Mock data (only used in development)
const mockUsers: User[] = [
  { id: '1', email: 'admin@example.com', ... },
];

export const usersService = {
  /**
   * List all users
   */
  async list(): Promise<User[]> {
    if (config.enableMockData) {
      await simulateApiDelay();
      return mockUsers;
    }
    
    return await endpoints.users.list();
  },

  /**
   * Get user by ID
   */
  async get(id: string): Promise<User> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const user = mockUsers.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      return user;
    }
    
    return await endpoints.users.get(id);
  },

  /**
   * Create new user
   */
  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const newUser: User = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      mockUsers.push(newUser);
      return newUser;
    }
    
    return await endpoints.users.create(data);
  },

  /**
   * Update existing user
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const index = mockUsers.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      
      mockUsers[index] = { ...mockUsers[index], ...data };
      return mockUsers[index];
    }
    
    return await endpoints.users.update(id, data);
  },

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const index = mockUsers.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      mockUsers.splice(index, 1);
      return;
    }
    
    return await endpoints.users.delete(id);
  },
};
```

### Component Integration

**File:** `src/pages/users.tsx`

```typescript
import { useState, useEffect } from 'react';
import { usersService } from '../services/usersService';
import { toast } from '../components/ui/toast';
import type { User } from '../types';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersService.list();
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setError(message);
      toast('error', 'Load failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const newUser = await usersService.create(userData);
      setUsers(prev => [...prev, newUser]);
      toast('success', 'User created successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      toast('error', 'Create failed', message);
      throw err; // Re-throw to let form handle it
    }
  };

  const handleUpdateUser = async (id: string, data: Partial<User>) => {
    try {
      const updatedUser = await usersService.update(id, data);
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      toast('success', 'User updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      toast('error', 'Update failed', message);
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await usersService.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast('success', 'User deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      toast('error', 'Delete failed', message);
      throw err;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadUsers} />;
  }

  return (
    <div>
      <button onClick={() => loadUsers()}>Refresh</button>
      <UserList 
        users={users}
        onCreate={handleCreateUser}
        onUpdate={handleUpdateUser}
        onDelete={handleDeleteUser}
      />
    </div>
  );
}
```

---

## Error Handling

### API Errors

The API client (`src/lib/api.ts`) handles common errors:

- **401 Unauthorized:** Automatically redirects to `/login`
- **Network Errors:** Caught and returned as rejected promises
- **Validation Errors:** Returned from backend with details

### Example Error Handling

```typescript
try {
  await usersService.create(userData);
} catch (error) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 400) {
      // Validation error
      toast('error', 'Validation failed', error.response.data.detail);
    } else if (error.response?.status === 409) {
      // Conflict (e.g., email already exists)
      toast('error', 'Email already registered');
    } else {
      // Generic error
      toast('error', 'Failed to create user');
    }
  }
}
```

---

## Authentication

### Login Flow

```typescript
import { endpoints } from '../lib/api';

// 1. Login
const { access_token } = await endpoints.auth.login({
  email: 'user@example.com',
  password: 'password123',
});

// 2. Store token
localStorage.setItem('auth_token', access_token);

// 3. All subsequent requests will include the token automatically
// (handled by API client interceptor)
```

### Logout Flow

```typescript
// 1. Call logout endpoint
await endpoints.auth.logout();

// 2. Clear token
localStorage.removeItem('auth_token');

// 3. Redirect to login
window.location.href = '/login';
```

---

## WebSocket Integration (Real-time Updates)

### Connection

```typescript
import { config } from '../lib/config';

const ws = new WebSocket(`${config.wsUrl}/ws/events`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Update UI based on event type
  switch (data.type) {
    case 'job.completed':
      // Refresh jobs list
      break;
    case 'user.created':
      // Add user to list
      break;
  }
};
```

---

## Environment Variables

### Required Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_ENABLE_MOCK_DATA` | `true` (dev), `false` (prod) | Enable mock data |
| `VITE_WS_URL` | `ws://localhost:8000` | WebSocket URL |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_TIMEOUT` | `30000` | API request timeout (ms) |
| `VITE_MOCK_API_DELAY` | `800` | Mock API delay (ms) |
| `VITE_DEBUG_LOGGING` | `true` (dev) | Enable console logging |

---

## Testing

### Test with Mock Data

```bash
npm run dev
# Mock data enabled by default in development
```

### Test with Real Backend

```bash
# Terminal 1: Start backend
docker-compose up

# Terminal 2: Start frontend with real API
echo "VITE_ENABLE_MOCK_DATA=false" > .env.local
npm run dev
```

### Verify Integration

1. Open DevTools → Network tab
2. Perform an action (e.g., create user)
3. Check for HTTP requests to `http://localhost:8000/api/v1/...`
4. If mock data is enabled, no network requests will be made

---

## Troubleshooting

### Issue: No data appears

**Solution:** Check configuration
```javascript
// In browser console
console.log(import.meta.env.VITE_ENABLE_MOCK_DATA);
```

### Issue: CORS errors

**Solution:** Backend CORS configuration
```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: 401 Unauthorized

**Solution:** Check auth token
```javascript
// In browser console
console.log(localStorage.getItem('auth_token'));
```

---

## Production Deployment

### Build Configuration

**.env.production:**
```bash
VITE_ENABLE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sentineliq.com
VITE_WS_URL=wss://api.sentineliq.com
```

### Build Commands

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name app.sentineliq.com;

    root /var/www/sentineliq-ui/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Migration Checklist

To fully migrate from mock to real data:

- [ ] Create service layer for each data domain (users, jobs, audit, etc.)
- [ ] Update components to use service layer
- [ ] Add loading states for all API calls
- [ ] Add error handling for all API calls
- [ ] Implement empty states when no data exists
- [ ] Add retry mechanisms for failed requests
- [ ] Test all CRUD operations with real backend
- [ ] Verify WebSocket real-time updates
- [ ] Test authentication flow
- [ ] Test error scenarios (network failure, 401, 403, 500)
- [ ] Update environment configuration for production
- [ ] Document all API endpoints used
- [ ] Remove unused mock data arrays
- [ ] Add API integration tests

---

## Best Practices

1. **Always use service layer** - Don't call `endpoints` directly from components
2. **Handle loading states** - Show spinners during API calls
3. **Handle errors gracefully** - Show user-friendly error messages
4. **Implement optimistic updates** - Update UI immediately, rollback on error
5. **Cache when appropriate** - Use React Query or SWR for data caching
6. **Retry failed requests** - Implement exponential backoff for network errors
7. **Log errors** - Send errors to monitoring service (Sentry)
8. **Test both modes** - Ensure mock and real data paths work

---

For more information, see:
- [API Client Documentation](./api.ts)
- [Configuration Guide](./config.ts)
- [Data Flow Audit Report](./DATA_FLOW_AUDIT.md)
