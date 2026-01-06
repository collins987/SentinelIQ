# Frontend Implementation Guide - SentinelIQ UI

## Overview

This guide covers the complete frontend implementation for SentinelIQ, a multi-role fraud detection platform with 6 distinct user personas.

## What Has Been Created

### Project Structure
```
sentineliq-ui/
├── Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── vite.config.ts            # Vite build configuration
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tailwind.config.js        # Tailwind CSS setup
│   ├── postcss.config.js         # PostCSS configuration
│   └── .env.{development,production}
│
├── Source Code (src/)
│   ├── types.ts                  # 45+ TypeScript interfaces
│   ├── mockData.ts               # Synthetic fraud data
│   ├── App.tsx                   # Main router with 6 protected routes
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Tailwind + custom styles
│   │
│   ├── services/
│   │   ├── api.ts                # Axios instance with interceptors
│   │   ├── index.ts              # API endpoints (20+ methods)
│   │   └── socket.ts             # WebSocket service for real-time
│   │
│   ├── stores/
│   │   ├── authStore.ts          # Auth state + login/logout
│   │   └── incidentStore.ts      # Incident management state
│   │
│   ├── layouts/
│   │   └── index.tsx             # DashboardLayout, PortalLayout, AuthLayout
│   │
│   ├── components/
│   │   ├── shell/
│   │   │   └── Navbar.tsx        # Navigation with role-based menu
│   │   ├── analyst/
│   │   │   ├── TriageQueue.tsx   # Transaction list with SLA timer
│   │   │   └── TransactionDetails.tsx # Approve/Reject/Step-up panel
│   │   └── graphs/
│   │       └── SpiderwebGraph.tsx # Cytoscape.js fraud ring visualization
│   │
│   └── pages/
│       ├── analyst/
│       │   ├── TriagePage.tsx    # Main analyst workbench
│       │   └── GraphPage.tsx     # Link analysis page
│       ├── enduser/
│       │   └── PortalPage.tsx    # Security center + panic button
│       ├── soc/
│       │   └── DashboardPage.tsx # Attack map + system health
│       ├── datascientist/
│       │   └── LabPage.tsx       # Shadow mode + rule editor
│       ├── developer/
│       │   └── PortalPage.tsx    # API keys + webhook logs
│       └── compliance/
│           └── AuditPage.tsx     # Audit logs + evidence export
│
└── Public Assets
    └── public/
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Build** | Vite | Fast dev server, optimized production builds |
| **Framework** | React 18 | UI library with hooks |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Components** | Tremor | Pre-built dashboard components |
| **State Mgmt** | Zustand | Lightweight state management |
| **API Client** | Axios | HTTP requests with interceptors |
| **Routing** | React Router v6 | Client-side navigation |
| **Graphs** | Cytoscape.js | Network/fraud ring visualization |
| **Charts** | Recharts | Interactive data visualization |
| **Editors** | Monaco Editor | In-browser YAML editor |
| **Type Safety** | TypeScript | Static type checking |

## Feature Implementation Details

### 1. Role-Based Access Control (RBAC)

**Location**: `src/App.tsx`, `src/stores/authStore.ts`

- 6 distinct user roles with protected routes
- Role-based navigation sidebar
- Permission checking utilities
- Mock authentication for development

```typescript
// Quick login for demo
Login as Analyst → /analyst/triage
Login as SOC Responder → /soc/attack-map
Login as Data Scientist → /datascientist/rules
Login as Compliance → /compliance/audit
```

### 2. Analyst Workbench (Most Critical)

**Location**: `src/pages/analyst/`, `src/components/analyst/`

**Components**:
- **TriageQueue** (`TriageQueue.tsx`)
  - Split-view transaction list
  - SLA countdown timers (critical/warning/ok states)
  - Sort by risk, SLA, or time
  - Risk-level color coding

- **TransactionDetails** (`TransactionDetails.tsx`)
  - Full transaction information
  - Risk score visualization
  - Flagged rules display
  - Three-mode UX: View → Approve → Confirm
  - Notes field for approvals
  - Step-up auth request button

- **SpiderwebGraph** (`src/components/graphs/SpiderwebGraph.tsx`)
  - Cytoscape.js visualization
  - Node types: Users (circles), IPs (squares), Devices (triangles)
  - Risk-level color gradient
  - Multi-select with Ctrl+Click
  - Interactive node expansion
  - Connection frequency indicators

**Data Flow**:
```
Mock Data (mockData.ts)
    ↓
useIncidentStore (Zustand)
    ↓
TriageQueue + TransactionDetails + SpiderwebGraph (Components)
```

### 3. SOC Responder Dashboard

**Location**: `src/pages/soc/DashboardPage.tsx`

**Features**:
- Real-time system metrics (latency, error rate, block rate)
- Threshold-based alerts (flashes red if error > 1%)
- Live attack map simulation with geographic indicators
- Critical alerts feed with severity levels
- Dark mode optimized for war rooms

**Metrics Simulated**:
- Risk Engine Latency: 145ms (Green/Yellow/Red thresholds)
- Error Rate: 0.02% (auto-updates every 2 seconds)
- Active Block Rate: 12 users/min
- Queue Depth: 23 pending transactions

### 4. End-User Security Portal

**Location**: `src/pages/enduser/PortalPage.tsx`

**Features**:
- **Trust Score Widget**: 0-100 speedometer visualization
- **Panic Button**: Floating red shield with pulse animation
  - Confirms before execution
  - Immediately revokes all tokens
  - Freezes transfers
  - Logs out all other devices
  
- **Active Sessions**: Device management
  - Display device name, location, IP
  - Last activity timestamp
  - Revoke button per session

- **Activity Feed**: "Was This You?" timeline
  - Password changes
  - Large transfers
  - Yes/No confirmation buttons

### 5. Data Scientist Lab

**Location**: `src/pages/datascientist/LabPage.tsx`

**Features**:
- **Shadow Mode Comparator**
  - Live rule vs. experimental rule line graphs
  - Side-by-side comparison
  - Impact warnings (1000% false positive increase)

- **Rule Editor**
  - In-browser YAML editor
  - Syntax validation
  - Conditions, actions, variables help text

- **Replay Tool**
  - Test against historical data
  - Shows: transactions tested, blocks, block rate, false positives
  - Comparison to current rule
  - Recommendations for tuning

### 6. Developer Portal

**Location**: `src/pages/developer/PortalPage.tsx`

**Features**:
- **API Keys Management**
  - List active keys with last used timestamps
  - Generate new keys with permissions
  - View expiry dates
  - Revoke functionality

- **Webhook Replay Console**
  - Log of all sent webhooks
  - Status codes (200 Green, 500 Red)
  - Retry button for failed deliveries
  - Full payload inspection
  - Delivery attempt counter

### 7. Compliance Station

**Location**: `src/pages/compliance/AuditPage.tsx`

**Features**:
- **Immutable Explorer**
  - Datagrid of audit logs
  - SHA-256 hash verification per row
  - Green shield icon for chain verified logs
  
- **Filters**
  - By user, action, date range
  - Search PII access
  - Export results

- **Evidence Export**
  - Signed PDF generation
  - Includes: access logs, rule changes, security incidents
  - Date range selection

## API Integration

The frontend integrates with the FastAPI backend. Key endpoint groups:

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/panic-mode
```

### Transactions
```
GET    /api/transactions
GET    /api/transactions/{id}
POST   /api/transactions/{id}/approve
POST   /api/transactions/{id}/reject
POST   /api/transactions/{id}/step-up-auth
```

### Graph/Link Analysis
```
GET /api/graph/entities/{type}/{id}
GET /api/graph/risk-network/{txnId}
GET /api/graph/expand/{nodeType}/{nodeId}
```

### Rules
```
GET    /api/rules
POST   /api/rules/test
POST   /api/rules/compare
POST   /api/rules/replay
```

### System
```
GET /api/metrics/system-health
GET /api/metrics/realtime-stream-url
```

**See** `src/services/index.ts` for complete API client.

## Quick Start

### 1. Install Dependencies
```bash
cd sentineliq-ui
npm install
```

### 2. Start Development Server
```bash
npm run dev
# Server at http://localhost:5173
```

### 3. Login
- Select any role from demo buttons
- Redirects to appropriate dashboard
- Mock data loads automatically

### 4. Build for Production
```bash
npm run build
npm run preview
```

## Environment Configuration

### Development (`.env.development`)
```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=SentinelIQ
```

### Production (`.env.production`)
```
VITE_API_URL=https://api.sentineliq.com/api
VITE_WS_URL=wss://api.sentineliq.com/ws
VITE_APP_NAME=SentinelIQ
```

## Mock Data

All pages use realistic mock data from `src/mockData.ts`:

- **50 synthetic transactions** with varying risk levels
- **10 graph nodes** (users, IPs, devices) representing fraud rings
- **Mock API keys** with expiry and permissions
- **Audit logs** with hash verification
- **Alert history** with severity levels
- **Webhook logs** with success/failure status

This allows full feature testing without backend data.

## CSS & Styling

### Tailwind Integration
- Dark mode support (class-based)
- Custom risk level colors
- Responsive grid layouts
- Hover and active states

### Custom Classes
```css
.panic-button-pulse    /* Red shield animation */
.sla-critical          /* Red SLA timer */
.sla-warning           /* Yellow SLA timer */
.sla-ok                /* Green SLA timer */
.node-highlight        /* Graph node selection */
.node-suspicious       /* Red graph node */
.node-flagged          /* Yellow graph node */
```

## State Management (Zustand)

### Auth Store (`stores/authStore.ts`)
```typescript
useAuthStore.setState({
  user,
  isAuthenticated,
  error,
  login(),
  logout(),
  hasPermission(),
  hasRole()
})
```

### Incident Store (`stores/incidentStore.ts`)
```typescript
useIncidentStore.setState({
  incidents,
  selectedIncident,
  filters,
  fetchIncidents(),
  approveIncident(),
  rejectIncident(),
  requestVerification()
})
```

## File Organization

```
Component Hierarchy
├── App (Router)
│   ├── LoginPage (AuthLayout)
│   └── Protected Routes
│       ├── AnalystTriagePage (DashboardLayout)
│       │   ├── TriageQueue
│       │   └── TransactionDetails
│       ├── AnalystGraphPage (DashboardLayout)
│       │   └── SpiderwebGraph
│       ├── EndUserPortalPage (PortalLayout)
│       ├── SOCDashboardPage (DashboardLayout)
│       ├── DataScientistLabPage (DashboardLayout)
│       ├── DeveloperPortalPage (DashboardLayout)
│       └── ComplianceAuditPage (DashboardLayout)
```

## Connecting to Backend

1. **Ensure backend is running**:
   ```bash
   cd ../
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Update `.env.development`**:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

3. **Replace mock data calls**:
   ```typescript
   // Before (mock)
   setIncidents(mockTransactions)
   
   // After (real API)
   const data = await apis.transaction.getAll()
   setIncidents(data)
   ```

4. **Test API integration**:
   - Open browser DevTools → Network
   - Click approve/reject button
   - Watch for HTTP requests to `/api/transactions/{id}/approve`

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentineliq-ui
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: ui
        image: sentineliq-ui:latest
        ports:
        - containerPort: 5173
        env:
        - name: VITE_API_URL
          value: https://api.sentineliq.com/api
```

## Performance Optimization

1. **Code Splitting**: Route-based lazy loading (built-in with Vite)
2. **Asset Compression**: Handled by Vite
3. **CSS Purging**: Tailwind removes unused CSS
4. **Image Optimization**: Use WebP format
5. **Caching**: Browser caching + service workers

## Troubleshooting

### Issue: "Cannot find module '@/types'"
**Solution**: Check `tsconfig.json` paths configuration
```json
"paths": {
  "@/*": ["src/*"]
}
```

### Issue: Tailwind classes not showing
**Solution**: Rebuild CSS
```bash
npm run build
npm run dev
```

### Issue: API 404 errors
**Solution**: 
1. Verify backend running on port 8000
2. Check CORS headers in backend
3. Verify endpoint paths match backend routes

### Issue: Graph nodes not displaying
**Solution**: Check browser console for Cytoscape errors
```javascript
// Verify Cytoscape loaded
console.log(cytoscape)
```

## Next Steps

1. **Connect to Real Backend**
   - Replace mock data with API calls
   - Test full flow: login → transaction approval → graph navigation

2. **Add WebSocket Real-Time Updates**
   - Implement socket.ts service
   - Subscribe to real-time alerts
   - Auto-refresh incident list

3. **Enhance UI/UX**
   - Mobile responsiveness
   - Keyboard shortcuts for analysts
   - Advanced filtering
   - Custom dashboard widgets

4. **Testing**
   - Unit tests (Jest + React Testing Library)
   - E2E tests (Cypress)
   - Accessibility audits

5. **Analytics & Monitoring**
   - User behavior tracking
   - Performance metrics
   - Error reporting

## Resources

- [React 18 Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Tremor Components](https://www.tremor.so)
- [Cytoscape.js](https://js.cytoscape.org)
- [Zustand Docs](https://github.com/pmndrs/zustand)

## Support

For questions or integration issues:
1. Check [sentineliq-ui/README.md](./README.md)
2. Review backend [../app/routes/](../app/routes/) implementations
3. Test with mock data first
4. Enable browser DevTools Network tab for debugging

---

**Frontend Implementation Complete** ✅
- 6 complete role-based dashboards
- 20+ React components
- Type-safe API integration
- Mock data for testing
- Production-ready Vite config

Ready to connect to backend APIs!
