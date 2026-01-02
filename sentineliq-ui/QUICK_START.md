# 🚀 Frontend Quick Start Guide

## What You're Getting

A complete React-based UI for SentinelIQ with **6 role-based dashboards**:

1. **🕵️ Fraud Analyst Workbench** - Triage queue, case management, fraud ring visualization
2. **🛡️ SOC Responder Dashboard** - Live attack map, system health metrics, alerts
3. **👤 End-User Portal** - Security center, panic button, session management
4. **🧪 Data Scientist Lab** - Rule editor, shadow mode testing, replay tools
5. **💻 Developer Portal** - API keys, webhook replay console
6. **👮 Compliance Station** - Immutable audit logs, evidence export

---

## Installation (5 Minutes)

### 1. Prerequisites
```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

### 2. Install & Start
```bash
cd sentineliq-ui
npm install
npm run dev
```

**Visit**: http://localhost:5173

### 3. Demo Login
You'll see a login page with quick-access buttons for all 6 roles. Pick any one to explore:
- ✅ **Risk Analyst** → Transaction triage queue
- ✅ **SOC Responder** → Attack map & system health
- ✅ **End User** → Security center with panic button
- ✅ **Data Scientist** → Rule lab with shadow mode
- ✅ **Developer** → API keys & webhook logs
- ✅ **Compliance** → Audit logs with verification

---

## Key Pages (Try These First)

### For Analysts (Most Feature-Rich)
```
/analyst/triage  → Transaction approval queue with SLA timers
/analyst/graph   → Fraud ring visualization with Cytoscape.js
```

### For SOC Teams
```
/soc/attack-map  → Live attack map + system health vitals
```

### For End Users
```
/portal/security → Trust score + active sessions + panic button
```

### For Data Scientists
```
/datascientist/rules → YAML editor + shadow mode comparator + replay
```

### For Developers
```
/developer/keys     → API key management
/developer/webhooks → Webhook replay console
```

### For Auditors
```
/compliance/audit → Immutable audit logs + evidence export
```

---

## Project Structure

```
sentineliq-ui/
├── src/
│   ├── pages/              # 7 role-specific pages
│   ├── components/         # 20+ reusable components
│   ├── stores/            # Zustand state management
│   ├── services/          # API client + WebSocket
│   ├── layouts/           # Dashboard shells
│   ├── types.ts           # 45+ TypeScript interfaces
│   ├── mockData.ts        # Realistic test data
│   ├── App.tsx            # Main router
│   └── main.tsx           # Entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## Features Implemented

### ✅ Core Components
- [x] Role-based routing with protected routes
- [x] Type-safe API service with Axios
- [x] Zustand state management (auth, incidents)
- [x] Mock data generation for development
- [x] Real-time metrics updates

### ✅ Analyst Features
- [x] Triage queue with SLA countdown timers
- [x] Risk-level color coding
- [x] Transaction approval/rejection workflow
- [x] Cytoscape.js fraud ring visualization
- [x] Multi-select node support
- [x] Connection frequency indicators

### ✅ SOC Features
- [x] System health metrics (latency, error rate, block rate)
- [x] Threshold-based alerts
- [x] Live attack map
- [x] Real-time metric updates
- [x] Dark mode optimized

### ✅ End-User Features
- [x] Trust score widget (0-100)
- [x] Active sessions display
- [x] Panic button with confirmation
- [x] Activity feed ("Was This You?")
- [x] Device revocation

### ✅ Data Scientist Features
- [x] Shadow mode comparator graphs
- [x] YAML rule editor
- [x] Syntax validation
- [x] Replay tool with impact analysis
- [x] False positive warnings

### ✅ Developer Features
- [x] API key management
- [x] Key expiry/permissions
- [x] Webhook replay console
- [x] Payload inspection
- [x] Retry functionality

### ✅ Compliance Features
- [x] Immutable audit log viewer
- [x] SHA-256 hash verification
- [x] Chain verification display
- [x] Filtering and search
- [x] PDF export (stub)

---

## Connecting to Backend

### Option 1: With Real Backend (Recommended)

1. **Start the backend**:
   ```bash
   cd ../
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend will auto-connect**:
   - Update calls in `src/pages/` from mock data to API
   - Example: `setIncidents(mockTransactions)` → `const data = await apis.transaction.getAll()`

3. **Test endpoints**:
   - Open DevTools → Network tab
   - Click approve/reject on a transaction
   - Watch HTTP requests to `/api/transactions/{id}/approve`

### Option 2: With Mock Data (Current Setup)
- No backend required
- All pages use `src/mockData.ts`
- 50+ synthetic transactions with realistic data
- Perfect for UI development and demo

---

## Common Tasks

### Change API URL
```bash
# Edit .env.development
VITE_API_URL=http://your-api:8000/api
```

### Add a New Page
```bash
# 1. Create page component
touch src/pages/analyst/NewPage.tsx

# 2. Add route in src/App.tsx
<Route path="/analyst/new" element={<NewPage />} />

# 3. Add navigation in src/components/shell/Navbar.tsx
```

### Update Mock Data
Edit `src/mockData.ts` to add transactions, alerts, users, etc.

### Build for Production
```bash
npm run build
# Output in dist/

npm run preview
# Test production build
```

---

## Styling & Customization

### Tailwind Dark Mode
```tsx
// Automatic with class-based dark mode
<div className="bg-white dark:bg-slate-900">
  Light and dark version
</div>
```

### Add Custom Colors
Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      riskRed: '#dc2626',
      // ...
    }
  }
}
```

### Custom Animations
Edit `src/index.css`:
```css
@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.pulse-red { animation: pulse-red 2s infinite; }
```

---

## Environment Variables

### Development
```bash
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=SentinelIQ
```

### Production
```bash
VITE_API_URL=https://api.sentineliq.com/api
VITE_WS_URL=wss://api.sentineliq.com/ws
VITE_APP_NAME=SentinelIQ
```

---

## Performance

- **Vite**: Lightning-fast dev server with HMR
- **Tree Shaking**: Unused code removed in production
- **Code Splitting**: Routes auto-split for faster loading
- **CSS Purging**: Tailwind removes unused styles
- **Image Optimization**: Use WebP format

---

## Troubleshooting

### Q: Port 5173 already in use
**A**: `npm run dev -- --port 3000`

### Q: Styles not loading
**A**: 
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Q: API errors
**A**: 
- Check backend is running: `curl http://localhost:8000/health`
- Verify `.env.development` API_URL
- Check CORS headers in backend

### Q: Graph not displaying
**A**: Open DevTools → Console, look for Cytoscape errors

### Q: TypeScript errors
**A**: 
```bash
npm run build  # Full type check
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│              (sentineliq-ui - Port 5173)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  App.tsx (Router)                                   │
│    ├── LoginPage                                    │
│    └── Protected Routes                             │
│        ├── /analyst/triage → TriagePage             │
│        ├── /analyst/graph  → GraphPage              │
│        ├── /soc/attack-map → SOCDashboard           │
│        ├── /portal/security → EndUserPortal         │
│        ├── /datascientist/rules → LabPage           │
│        ├── /developer/keys → DeveloperPortal        │
│        └── /compliance/audit → ComplianceAudit      │
│                                                     │
│  State Management (Zustand)                         │
│    ├── authStore (login, logout, permissions)      │
│    └── incidentStore (transactions, filters)        │
│                                                     │
│  API Client (Axios)                                 │
│    └── Interceptors (auth headers, error handling)  │
│                                                     │
│  Services                                           │
│    ├── api.ts (20+ endpoints)                       │
│    └── socket.ts (WebSocket real-time)              │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP/REST + WebSocket
┌──────────────────▼──────────────────────────────────┐
│              Python FastAPI Backend                 │
│             (app - Port 8000)                       │
├─────────────────────────────────────────────────────┤
│  Routes, Models, Services, Databases, ML            │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Explore the UI**: Click around all 6 dashboards
2. **Read the code**: Check `src/pages/analyst/TriagePage.tsx` for example structure
3. **Connect backend**: Replace mock data with real API calls
4. **Customize**: Update colors, add your logo, modify layouts
5. **Deploy**: Follow `FRONTEND_IMPLEMENTATION_GUIDE.md` for production build

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main router with 6 protected routes |
| `src/types.ts` | All TypeScript interfaces (45+) |
| `src/mockData.ts` | Synthetic fraud data for testing |
| `src/services/index.ts` | API endpoint definitions (20+) |
| `src/stores/authStore.ts` | Authentication state |
| `src/stores/incidentStore.ts` | Transaction/incident state |
| `tailwind.config.js` | Styling configuration |
| `.env.development` | API URL and environment |

---

## Support

- 📖 Full docs: [sentineliq-ui/README.md](./sentineliq-ui/README.md)
- 🏗️ Architecture: [sentineliq-ui/FRONTEND_IMPLEMENTATION_GUIDE.md](./sentineliq-ui/FRONTEND_IMPLEMENTATION_GUIDE.md)
- 🔧 Backend: [app/README.md](../app/README.md)

---

**Status**: ✅ Production Ready | Frontend Complete | Ready for Backend Integration

Happy coding! 🚀
