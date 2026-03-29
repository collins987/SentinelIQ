# SentinelIQ Frontend System - Architecture & Setup Guide

## 🎯 Overview

The SentinelIQ frontend is a **complete, production-ready system** with 4 independent, containerized services running on different ports:

| Service | Port | Purpose | Technology |
|---------|------|---------|-----------|
| **Welcome Page** | 5000 | Central entry point with role selection | Next.js 14 |
| **Admin Dashboard** | 3000 | Admin portal with system management | Vite + React 18 |
| **Analyst Dashboard** | 4100 | Threat analysis and investigations | Next.js 14 |
| **Viewer Dashboard** | 4000 | User dashboard for self-service | Next.js 14 |

## 📦 Architecture

```
frontend/
├── welcome/                    # Port 5000 - Welcome Portal
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx          (redirect to /welcome)
│   │   ├── welcome.tsx        (main Welcome page)
│   │   └── globals.css
│   ├── src/
│   │   ├── components/
│   │   │   └── WelcomePage.module.css
│   │   ├── styles/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
│
├── admin/                      # Port 3000 - Admin Portal (existing)
│   └── [current structure]
│
├── analystdashboard/          # Port 4100 - Analyst Dashboard (updated with RBAC)
│   ├── pages/
│   │   ├── index.tsx          (login page)
│   │   ├── dashboard.tsx      (main dashboard)
│   │   └── unauthorized.tsx   (403 page - NEW)
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx (NEW)
│   │   └── styles/
│   │       └── Unauthorized.module.css (NEW)
│   ├── package.json
│   └── next.config.js
│
├── userdashboard/             # Port 4000 - Viewer Dashboard (updated with RBAC)
│   ├── pages/
│   │   └── unauthorized.tsx   (403 page - NEW)
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx (NEW)
│   │   └── styles/
│   │       └── Unauthorized.module.css (NEW)
│   ├── package.json
│   └── next.config.js
│
├── src/                        # Admin shared components
│   ├── pages/
│   │   └── Unauthorized.tsx    (403 page - NEW)
│   │   └── Unauthorized.module.css (NEW)
│   ├── components/
│   └── ...
│
├── package.json               (workspace root)
├── vite.config.ts             (admin)
├── tsconfig.json
└── README.md                  (this file)
```

---

## ✨ Key Features

### 🎨 Welcome Page (Port 5000)

Located at: `http://localhost:5000/welcome`

**Features:**
- ✅ Pixel-accurate, modern UI design
- ✅ SentinelIQ blue color theme (#1E3A8A, #3B82F6)
- ✅ Responsive layout (Desktop, Tablet, Mobile)
- ✅ Navigation bar with logo & menu
- ✅ Hero section with two-column layout
- ✅ Role selection with 3 portal cards:
  - Admin Portal → http://localhost:3000/login
  - Analyst Workspace → http://localhost:4100
  - Viewer Dashboard → http://localhost:4000
- ✅ Smooth animations & hover effects
- ✅ Footer with links

### 🔐 Role-Based Access Control (RBAC)

All dashboards enforce RBAC through:

1. **ProtectedRoute Component**
   - Checks authentication status
   - Verifies user role matches allowed roles
   - Redirects unauthorized users

2. **Unauthorized Page (/unauthorized)**
   - Displayed when users lack permissions
   - Provides links to Welcome Page or go back
   - Professional 403 error handling

3. **Session Management**
   - localStorage (Admin)
   - sessionStorage (Analyst)
   - localStorage (Viewer)
   - Persists across page refreshes

### 🎨 Color System - SentinelIQ Blue

```css
Primary:        #1E3A8A (Dark Blue)
Secondary:      #3B82F6 (Medium Blue)
Accent:         #60A5FA (Light Blue)
Background:     #F8FAFC (Soft Background)
Text Primary:   #0F172A
Text Secondary: #475569
Text Light:     #64748B
Border:         #E2E8F0
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ (LTS recommended)
- npm or yarn
- Git

### Installation Steps

#### 1. **Install Dependencies for All Services**

```bash
cd /path/to/frontend

# Install workspace dependencies
npm install

# This installs:
# - Welcome page dependencies
# - Admin dashboard dependencies
# - Analyst dashboard dependencies
# - Viewer dashboard dependencies
```

Alternatively, install each service individually:

```bash
# Welcome Page
cd welcome
npm install

# Admin Dashboard
cd ../
npm install

# Analyst Dashboard
cd analystdashboard
npm install

# Viewer Dashboard
cd ../userdashboard
npm install
```

#### 2. **Start All 4 Services**

You'll need **4 separate terminal windows** (or use a terminal manager like tmux):

**Terminal 1 - Welcome Page (Port 5000):**
```bash
cd frontend/welcome
npm run dev
# Visit: http://localhost:5000/welcome
```

**Terminal 2 - Admin Dashboard (Port 3000):**
```bash
cd frontend
npm run dev
# Visit: http://localhost:3000/login
```

**Terminal 3 - Analyst Dashboard (Port 4100):**
```bash
cd frontend/analystdashboard
npm run dev
# Visit: http://localhost:4100
```

**Terminal 4 - Viewer Dashboard (Port 4000):**
```bash
cd frontend/userdashboard
npm run dev
# Visit: http://localhost:4000
```

---

## 📍 URLs & Access Points

### Welcome Page (Central Entry)
```
http://localhost:5000/welcome
```
- Primary entry point for all users
- Displays 3 role selection options
- Redirects to respective login portals

### Admin Dashboard
```
Login:      http://localhost:3000/login
Dashboard:  http://localhost:3000/admin
Unauthorized: http://localhost:3000/unauthorized
```
- Admin-only portal
- Role enforcement: `admin`
- Manages system, users, governance

### Analyst Dashboard
```
Login:      http://localhost:4100
Dashboard:  http://localhost:4100/dashboard
Unauthorized: http://localhost:4100/unauthorized
```
- Analyst-only portal
- Role enforcement: `analyst`
- Threat analysis and investigations

### Viewer Dashboard
```
Login:      http://localhost:4000
Dashboard:  http://localhost:4000/dashboard
Unauthorized: http://localhost:4000/unauthorized
```
- Viewer/User-only portal
- Role enforcement: `viewer`
- Self-service reports and analytics

---

## 🔒 RBAC Implementation

### How RBAC Works

1. **User Logs In** → Backend authenticates & returns:
   - `token` (JWT or session)
   - `role` (admin, analyst, viewer)
   - `user` (user details)

2. **Token Stored** → localStorage or sessionStorage depending on dashboard

3. **ProtectedRoute Checks**:
   - Is token present? → No = Redirect to login
   - Does role match allowedRoles? → No = Redirect to /unauthorized
   - Yes to both → Allow access

4. **Direct URL Access Prevention**:
   - Cannot directly access `/admin` without admin role
   - Cannot directly access `/analyst` without analyst role
   - Cannot directly access `/viewer` without viewer role

### Example: ProtectedRoute Usage

```typescript
// Analyst Dashboard protective example
function Dashboard() {
  return (
    <ProtectedRoute allowedRoles={['analyst']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
```

### Components Reference

#### ProtectedRoute.tsx
- **Location**: `src/components/ProtectedRoute.tsx` (each dashboard)
- **Props**:
  - `children: React.ReactNode` - Component to protect
  - `allowedRoles?: string[]` - Roles with access (default per dashboard)
- **Behavior**: Redirects unauthorized users to `/unauthorized`

#### Unauthorized.tsx
- **Location**: `pages/unauthorized.tsx` (each dashboard)
- **Displays**: 403 error with action buttons
- **Actions**:
  - Return to Welcome Page (clears session)
  - Go Back (navigation history)

---

## 🛠️ Build & Deployment

### Development Build

Each service uses Next.js or Vite with hot reload:

```bash
npm run dev
```

### Production Build

```bash
# Welcome Page
cd welcome
npm run build
npm run start

# Admin Dashboard
npm run build
npm run start

# Analyst Dashboard
cd ../analystdashboard
npm run build
npm run start

# Viewer Dashboard
cd ../userdashboard
npm run build
npm run start
```

### Docker Deployment (Optional)

If using Docker Compose (as referenced in project):

```yaml
services:
  welcome:
    build: ./frontend/welcome
    ports:
      - "5000:5000"
    environment:
      - NEXT_PUBLIC_API=http://localhost:8000

  admin:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000

  analyst:
    build: ./frontend/analystdashboard
    ports:
      - "4100:4100"
    environment:
      - NEXT_PUBLIC_API=http://localhost:8000

  viewer:
    build: ./frontend/userdashboard
    ports:
      - "4000:4000"
    environment:
      - NEXT_PUBLIC_API=http://localhost:8000
```

---

## 📝 File Structure Summary

### Welcome Page Files
- `pages/welcome.tsx` - Main Welcome component
- `pages/index.tsx` - Root redirect (/welcome)
- `pages/globals.css` - Global styles
- `src/components/WelcomePage.module.css` - Welcome styling

### Admin Dashboard Files
- `src/pages/Unauthorized.tsx` - 403 error page (NEW)
- `src/pages/Unauthorized.module.css` - 403 styling (NEW)
- Updated `src/App.tsx` to include unauthorized route

### Analyst Dashboard Files
- `pages/unauthorized.tsx` - 403 error page (NEW)
- `src/components/ProtectedRoute.tsx` - Route protection (NEW)
- `src/styles/Unauthorized.module.css` - 403 styling (NEW)

### Viewer Dashboard Files
- `pages/unauthorized.tsx` - 403 error page (NEW)
- `src/components/ProtectedRoute.tsx` - Route protection (NEW)
- `src/styles/Unauthorized.module.css` - 403 styling (NEW)

---

## 🎨 Customization

### Color Scheme

To change colors globally, update:

**Welcome Page**: `pages/globals.css`
```css
:root {
  --primary: #1E3A8A;
  --secondary: #3B82F6;
  --accent: #60A5FA;
  /* ... more colors ... */
}
```

### Ports

To change ports, update `package.json` scripts:

**Welcome**:
```json
"dev": "next dev -p 5000"
```

**Admin**: Edit `vite.config.ts`
```typescript
server: { port: 3000 }
```

**Analyst**:
```json
"dev": "next dev -p 4100"
```

**Viewer**:
```json
"dev": "next dev -p 4000"
```

### Fonts

Global font defined in:
- Welcome: `pages/_document.tsx`
- Analyst/Viewer: `next.config.js` or `globals.css`

Change from "Poppins" to your preferred font.

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Welcome page loads at http://localhost:5000/welcome
- [ ] All role buttons redirect correctly
- [ ] Admin login works, redirects to admin dashboard
- [ ] Analyst login works, redirects to analyst dashboard
- [ ] Viewer login works, redirects to viewer dashboard
- [ ] Non-admin user accessing /admin shows /unauthorized
- [ ] Non-analyst user accessing /analyst shows /unauthorized
- [ ] Non-viewer user accessing /viewer shows /unauthorized
- [ ] Return to Welcome button clears session & navigates correctly
- [ ] Session persists after page refresh
- [ ] Navigation menu functions properly
- [ ] All animations smooth & responsive

---

## 🐛 Troubleshooting

### Port Already in Use

If a port is already in use:

```bash
# Find process using port (e.g., 5000)
# Windows
netstat -ano | findstr:5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Session Not Persisting

Check browser DevTools:
- Ensure localStorage/sessionStorage is not blocked
- Check for secure cookie settings in production

### CORS Issues

Verify API endpoints in:
- `analystdashboard/src/services/api.ts`
- `userdashboard/src/services/api.ts`

### Component Not Found

Ensure import paths are correct:
- Use relative paths: `../path/to/component`
- Or set up tsconfig path aliases

---

## 📚 Technology Stack

- **Framework**: Next.js 14 (3 dashboards), Vite (Admin)
- **UI**: React 18, CSS Modules
- **Styling**: CSS Variables, Tailwind CSS (where applicable)
- **State Management**: Redux (Admin), Context API (Analyst/Viewer)
- **Routing**: Next.js Router, React Router
- **Authentication**: JWT tokens, localStorage/sessionStorage
- **Charts**: Recharts
- **Animation**: Framer Motion

---

## 📖 Documentation

For detailed information about each service:

- [Welcome Page README](./welcome/README.md)
- [Analyst Dashboard (upcoming)](./analystdashboard/README.md)
- [Viewer Dashboard (upcoming)](./userdashboard/README.md)

---

## 🔄 Workflow

### Standard User Journey

1. **User visits** http://localhost:5000/welcome
2. **Lands on** Welcome Page with 3 role options
3. **Selects role** → Redirected to appropriate login
4. **Logs in** → Backend authenticates
5. **Dashboard loads** with role-based features
6. **Session persists** across navigation
7. **Unauthorized access blocked** via ProtectedRoute
8. **Logout** clears session & returns to Welcome

---

## 🤝 Contributing

When adding new features:

1. Maintain separate port configuration
2. Use consistent blue color scheme
3. Apply ProtectedRoute to new dashboard routes
4. Test with all 3 roles
5. Ensure responsive design
6. Document changes in component comments

---

## 📝 License

Proprietary - SentinelIQ Platform © 2024

---

## 🚀 Quick Start (TL;DR)

```bash
# Terminal 1
cd frontend/welcome && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev

# Terminal 3
cd frontend/analystdashboard && npm install && npm run dev

# Terminal 4
cd frontend/userdashboard && npm install && npm run dev

# Then visit:
# http://localhost:5000/welcome  ← Welcome Page (central entry)
# http://localhost:3000/login    ← Admin login
# http://localhost:4100          ← Analyst login
# http://localhost:4000          ← Viewer login
```

---

**Last Updated**: March 2024  
**Version**: 2.0.0 (Full RBAC System)
