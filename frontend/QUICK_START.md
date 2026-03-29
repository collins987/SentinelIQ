# Quick Developer Guide - SentinelIQ Frontend

## 🎯 Start All Services (5 Minutes)

### Option 1: New Terminal Windows (Recommended for Development)

```bash
# Terminal 1: Welcome Page (Port 5000)
cd frontend/welcome
npm install
npm run dev

# Terminal 2: Admin Dashboard (Port 3000)
cd frontend
npm install
npm run dev

# Terminal 3: Analyst Dashboard (Port 4100)
cd frontend/analystdashboard
npm install
npm run dev

# Terminal 4: Viewer Dashboard (Port 4000)
cd frontend/userdashboard
npm install
npm run dev
```

### Option 2: Single Root Install + Individual Dev Servers

```bash
# From frontend root
npm install

# Then in separate terminals:
npm run dev                    # Admin (Port 3000)
cd welcome && npm run dev      # Welcome (Port 5000)
cd analystdashboard && npm run dev  # Analyst (Port 4100)
cd userdashboard && npm run dev     # Viewer (Port 4000)
```

---

## 📍 Access Points

| Service | URL | Credentials |
|---------|-----|---|
| **Welcome** | http://localhost:5000/welcome | N/A (entry point) |
| **Admin** | http://localhost:3000/login | admin@company.com / admin123 |
| **Analyst** | http://localhost:4100 | analyst@company.com / analyst123 |
| **Viewer** | http://localhost:4000 | viewer@company.com / viewer123 |

---

## 🔑 Login Credentials (Examples)

These are backend-validated. Update in your backend if different:

```
Admin:
  Email: admin@company.com
  Password: admin123

Analyst:
  Email: analyst@company.com
  Password: analyst123

Viewer:
  Email: viewer@company.com
  Password: viewer123
```

---

## 🧩 Key Files by Service

### Welcome Page
- `frontend/welcome/pages/welcome.tsx` - Main Welcome component
- `frontend/welcome/pages/globals.css` - Global styles

### Admin Dashboard
- `frontend/src/pages/Unauthorized.tsx` - 403 error page
- `frontend/src/App.tsx` - Main routing (includes Unauthorized route)

### Analyst Dashboard
- `frontend/analystdashboard/pages/dashboard.tsx` - Main dashboard
- `frontend/analystdashboard/src/components/ProtectedRoute.tsx` - RBAC protection

### Viewer Dashboard
- `frontend/userdashboard/pages/dashboard.tsx` - Main dashboard
- `frontend/userdashboard/src/components/ProtectedRoute.tsx` - RBAC protection

---

## 🎨 Styling

All services use **SentinelIQ Blue Theme**:

```
Primary:    #1E3A8A (Dark Blue)
Secondary:  #3B82F6 (Medium Blue)  
Accent:     #60A5FA (Light Blue)
Background: #F8FAFC (Light)
Text:       #0F172A (Almost black)
```

---

## 🔐 RBAC Flow

```
User → Welcome Page (Port 5000)
  ↓
User Selects Role
  ├→ Admin → http://localhost:3000/login
  ├→ Analyst → http://localhost:4100
  └→ Viewer → http://localhost:4000
  ↓
Login Success → Backend returns token + role
  ↓
Dashboard loads
  ├→ ProtectedRoute checks token
  ├→ ProtectedRoute checks user role
  └→ If allowed → Display dashboard
       Else → Redirect to /unauthorized
```

---

## 📝 Common Commands

```bash
# Install all dependencies
npm install

# Run Welcome page
cd welcome && npm run dev

# Run Admin dashboard
npm run dev

# Run Analyst dashboard
cd analystdashboard && npm run dev

# Run Viewer dashboard
cd userdashboard && npm run dev

# Build for production
npm run build

# Run production build
npm start
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### Cannot Connect to Backend

- Check if backend API is running (usually port 8000)
- Verify CORS headers in backend
- Check browser console for specific errors

### Login Not Working

- Verify backend is running
- Check credentials in backend user table
- Verify CORS configuration
- Check Network tab in DevTools

### Session Not Persisting

- Check if localStorage/sessionStorage is enabled
- Check Application tab in DevTools
- Verify token is being saved

---

## 🚀 Next Steps

1. **Start all 4 services** (see above)
2. **Visit Welcome Page** at http://localhost:5000/welcome
3. **Test each role**:
   - Click Admin Portal → Login → Verify dashboard
   - Click Analyst Portal → Login → Verify dashboard
   - Click Viewer Portal → Login → Verify dashboard
4. **Test RBAC**:
   - Try accessing admin dashboard as analyst (should show 403)
   - Try accessing analyst dashboard as admin (should show 403)
5. **Check responsive design** by resizing browser

---

## 📚 Architecture

```
SentinelIQ Frontend
├── Welcome (Port 5000)
│   └── Redirects to role-specific login systems
├── Admin (Port 3000)
│   └── System management dashboard
├── Analyst (Port 4100)
│   └── Threat analysis portal
└── Viewer (Port 4000)
    └── Self-service dashboard
```

Each service is **completely independent** and can be:
- Started/stopped individually
- Deployed separately
- Scaled independently
- Updated without affecting others

---

## 💡 Pro Tips

1. **Use concurrently for multiple services**:
   ```bash
   npm install -g concurrently
   concurrently "npm run dev" "cd welcome && npm run dev" "cd analystdashboard && npm run dev" "cd userdashboard && npm run dev"
   ```

2. **Use tmux/screen for persistent terminals**:
   ```bash
   tmux new-session -d -s welcome "cd frontend/welcome && npm run dev"
   tmux new-session -d -s admin "cd frontend && npm run dev"
   tmux new-session -d -s analyst "cd frontend/analystdashboard && npm run dev"
   tmux new-session -d -s viewer "cd frontend/userdashboard && npm run dev"
   ```

3. **Enable CORS in backend** for local development
4. **Use DevTools** to monitor:
   - Network requests
   - localStorage/sessionStorage
   - Console errors
   - Application lifecycle

---

**For detailed setup, see**: `FRONTEND_SETUP.md`
