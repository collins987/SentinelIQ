# SentinelIQ Frontend - Environment Configuration

## Overview

Each service can be configured using environment variables. This guide covers the configuration options for all 4 frontend services.

---

## Welcome Page (Port 5000)

### File: `frontend/welcome/.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000

# Portal Redirects (these can be customized for different environments)
NEXT_PUBLIC_ADMIN_LOGIN_URL=http://localhost:3000/login
NEXT_PUBLIC_ANALYST_LOGIN_URL=http://localhost:4100
NEXT_PUBLIC_VIEWER_LOGIN_URL=http://localhost:4000

# Welcome Page Configuration
NEXT_PUBLIC_APP_NAME=SentinelIQ
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
| `NEXT_PUBLIC_ADMIN_LOGIN_URL` | `http://localhost:3000/login` | Admin login redirect |
| `NEXT_PUBLIC_ANALYST_LOGIN_URL` | `http://localhost:4100` | Analyst login redirect |
| `NEXT_PUBLIC_VIEWER_LOGIN_URL` | `http://localhost:4000` | Viewer login redirect |
| `NEXT_PUBLIC_APP_NAME` | `SentinelIQ` | App display name |
| `NEXT_PUBLIC_APP_VERSION` | `2.0.0` | Version string |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Enable analytics tracking |

---

## Admin Dashboard (Port 3000)

### File: `frontend/.env.local`

```bash
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Authentication
VITE_TOKEN_STORAGE=localStorage
VITE_AUTH_REFRESH_INTERVAL=3600000

# Features
VITE_ENABLE_AUDIT_LOGS=true
VITE_ENABLE_GOVERNANCE=true
VITE_ENABLE_COMPLIANCE=true
VITE_ENABLE_ENFORCEMENT=true

# Security
VITE_SESSION_TIMEOUT=1800000
VITE_PASSWORD_MIN_LENGTH=8
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_TOKEN_STORAGE` | `localStorage` | Where to store tokens |
| `VITE_AUTH_REFRESH_INTERVAL` | `3600000` | Token refresh interval (ms) |
| `VITE_ENABLE_AUDIT_LOGS` | `true` | Enable audit logging feature |
| `VITE_ENABLE_GOVERNANCE` | `true` | Enable governance module |
| `VITE_ENABLE_ENFORCEMENT` | `true` | Enable enforcement module |
| `VITE_SESSION_TIMEOUT` | `1800000` | Session timeout (30 mins) |

---

## Analyst Dashboard (Port 4100)

### File: `frontend/analystdashboard/.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000

# Storage
NEXT_PUBLIC_TOKEN_STORAGE=sessionStorage

# Features
NEXT_PUBLIC_ENABLE_ALERTS=true
NEXT_PUBLIC_ENABLE_INVESTIGATIONS=true
NEXT_PUBLIC_ENABLE_INSIGHTS=true
NEXT_PUBLIC_ENABLE_SEARCH=true

# Data
NEXT_PUBLIC_AUTO_REFRESH_INTERVAL=30000
NEXT_PUBLIC_ALERTS_CACHE_TTL=60000

# Welcome Portal Integration
NEXT_PUBLIC_WELCOME_URL=http://localhost:5000/welcome
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` | API request timeout |
| `NEXT_PUBLIC_TOKEN_STORAGE` | `sessionStorage` | Where to store tokens |
| `NEXT_PUBLIC_ENABLE_ALERTS` | `true` | Enable alerts feature |
| `NEXT_PUBLIC_ENABLE_INVESTIGATIONS` | `true` | Enable investigations |
| `NEXT_PUBLIC_ENABLE_INSIGHTS` | `true` | Enable risk intelligence |
| `NEXT_PUBLIC_ENABLE_SEARCH` | `true` | Enable global search |
| `NEXT_PUBLIC_AUTO_REFRESH_INTERVAL` | `30000` | Auto-refresh interval (ms) |
| `NEXT_PUBLIC_WELCOME_URL` | `http://localhost:5000/welcome` | Welcome page URL |

---

## Viewer Dashboard (Port 4000)

### File: `frontend/userdashboard/.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000

# Storage
NEXT_PUBLIC_TOKEN_STORAGE=localStorage

# Features
NEXT_PUBLIC_ENABLE_REPORTS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PROFILE=true

# Data
NEXT_PUBLIC_AUTO_REFRESH_INTERVAL=60000
NEXT_PUBLIC_DATA_CACHE_TTL=300000

# Welcome Portal Integration
NEXT_PUBLIC_WELCOME_URL=http://localhost:5000/welcome
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` | API request timeout |
| `NEXT_PUBLIC_TOKEN_STORAGE` | `localStorage` | Token storage method |
| `NEXT_PUBLIC_ENABLE_REPORTS` | `true` | Enable reports feature |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `true` | Enable analytics |
| `NEXT_PUBLIC_ENABLE_PROFILE` | `true` | Enable user profile |
| `NEXT_PUBLIC_AUTO_REFRESH_INTERVAL` | `60000` | Auto-refresh interval |
| `NEXT_PUBLIC_WELCOME_URL` | `http://localhost:5000/welcome` | Welcome page URL |

---

## Production Configuration

### Welcome Page Production

```bash
# frontend/welcome/.env.production.local
NEXT_PUBLIC_API_URL=https://api.sentineliq.com
NEXT_PUBLIC_ADMIN_LOGIN_URL=https://sentineliq.com/admin/login
NEXT_PUBLIC_ANALYST_LOGIN_URL=https://sentineliq.com/analyst
NEXT_PUBLIC_VIEWER_LOGIN_URL=https://sentineliq.com/viewer
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Admin Dashboard Production

```bash
# frontend/.env.production.local
VITE_API_URL=https://api.sentineliq.com
VITE_SESSION_TIMEOUT=900000
```

### Analyst Dashboard Production

```bash
# frontend/analystdashboard/.env.production.local
NEXT_PUBLIC_API_URL=https://api.sentineliq.com
NEXT_PUBLIC_WELCOME_URL=https://sentineliq.com/welcome
```

### Viewer Dashboard Production

```bash
# frontend/userdashboard/.env.production.local
NEXT_PUBLIC_API_URL=https://api.sentineliq.com
NEXT_PUBLIC_WELCOME_URL=https://sentineliq.com/welcome
```

---

## Development vs Production

### Development Environment

```
Port 5000 → http://localhost:5000 (Welcome)
Port 3000 → http://localhost:3000 (Admin)
Port 4100 → http://localhost:4100 (Analyst)
Port 4000 → http://localhost:4000 (Viewer)
API       → http://localhost:8000 (Backend)
```

### Production Environment

```
Domain: https://sentineliq.com
- Welcome: /welcome
- Admin: /admin
- Analyst: /analyst
- Viewer: /viewer
API: https://api.sentineliq.com
```

---

## Docker Environment Variables

If using Docker, pass environment variables at runtime:

```bash
# Welcome Service
docker run -e NEXT_PUBLIC_API_URL=http://api:8000 \
           -p 5000:5000 \
           sentineliq-welcome

# Admin Service
docker run -e VITE_API_URL=http://api:8000 \
           -p 3000:3000 \
           sentineliq-admin

# Analyst Service
docker run -e NEXT_PUBLIC_API_URL=http://api:8000 \
           -p 4100:4100 \
           sentineliq-analyst

# Viewer Service
docker run -e NEXT_PUBLIC_API_URL=http://api:8000 \
           -p 4000:4000 \
           sentineliq-viewer
```

---

## Docker Compose Example

```yaml
version: '3.8'

services:
  welcome:
    build: ./frontend/welcome
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000
      NEXT_PUBLIC_ADMIN_LOGIN_URL: http://admin:3000/login
      NEXT_PUBLIC_ANALYST_LOGIN_URL: http://analyst:4100
      NEXT_PUBLIC_VIEWER_LOGIN_URL: http://viewer:4000
    ports:
      - "5000:5000"

  admin:
    build: ./frontend
    environment:
      VITE_API_URL: http://api:8000
    ports:
      - "3000:3000"

  analyst:
    build: ./frontend/analystdashboard
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000
      NEXT_PUBLIC_WELCOME_URL: http://welcome:5000/welcome
    ports:
      - "4100:4100"

  viewer:
    build: ./frontend/userdashboard
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000
      NEXT_PUBLIC_WELCOME_URL: http://welcome:5000/welcome
    ports:
      - "4000:4000"

  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/sentineliq
```

---

## Setting Up Environment Variables

### 1. Create .env.local Files

```bash
# Welcome
cp frontend/welcome/.env.example frontend/welcome/.env.local

# Admin
cp frontend/.env.example frontend/.env.local

# Analyst
cp frontend/analystdashboard/.env.example frontend/analystdashboard/.env.local

# Viewer
cp frontend/userdashboard/.env.example frontend/userdashboard/.env.local
```

### 2. Edit Each File

```bash
nano frontend/welcome/.env.local
nano frontend/.env.local
nano frontend/analystdashboard/.env.local
nano frontend/userdashboard/.env.local
```

### 3. Ensure Proper Permissions

```bash
chmod 600 frontend/**/.env.local
```

### 4. Restart Services

```bash
# Services will automatically reload with new environment variables
# (if using npm run dev with auto-reload enabled)
```

---

## Troubleshooting Configuration

### Variables Not Loading

1. Ensure file name is exactly `.env.local` (not `.env`)
2. Restart development server after changing variables
3. Check browser console for logging
4. Verify environment variable syntax (no spaces around `=`)

### CORS Issues

Add backend CORS configuration:

```python
# Backend example (FastAPI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000", "http://localhost:4100", "http://localhost:5000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API Connection Failed

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Verify backend is running on specified port
3. Check browser Network tab for requests
4. Verify CORS headers in response

---

## Security Best Practices

1. **Never commit .env files to git**
   ```bash
   echo ".env.local" >> .gitignore
   ```

2. **Use .env.example as template**
   ```bash
   cp .env.example .env.local
   ```

3. **Rotate secrets regularly** in production

4. **Use HTTPS in production** for all URLs

5. **Sensitive data should be in backend**, not frontend

6. **Use secure token storage**:
   - localStorage: Less secure, persists across tabs
   - sessionStorage: More secure, cleared on tab close
   - Cookies: Most secure with HttpOnly flag

---

## FAQ

**Q: Can I have different configs for different services?**
A: Yes, each service has its own .env.local file

**Q: How do I override environment variables?**
A: Modify the respective .env.local file and restart the service

**Q: Which variables are required?**
A: Minimum required: `NEXT_PUBLIC_API_URL` (or `VITE_API_URL`)

**Q: How do I use environment variables in code?**

Welcome/Analyst/Viewer (Next.js):
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

Admin (Vite):
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

**Last Updated**: March 2024
