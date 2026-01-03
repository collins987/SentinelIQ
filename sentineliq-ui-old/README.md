# SentinelIQ Frontend UI

A comprehensive React-based fraud detection platform interface with role-based dashboards for analysts, SOC responders, data scientists, developers, end users, and compliance auditors.

## Features

### 🎯 Role-Based Interfaces (6 Personas)

#### 1. **Risk Analyst Workbench**
- **Triage Queue**: Split-view list of flagged transactions with SLA timers
- **Risk Scoring**: Visual indicators (High/Medium/Low/Critical)
- **Spiderweb Graph**: Link analysis showing fraud rings and connected entities
- **Case Management**: Approve/Reject/Step-Up Auth decisions with notes

#### 2. **SOC Responder Dashboard**
- **Live Attack Map**: Real-time geopolitical visualization
- **System Health Vitals**: Latency, error rates, block rates with threshold alerts
- **Critical Alerts Feed**: Real-time attack notifications
- **Dark Mode**: Optimized for 24/7 war room environments

#### 3. **End-User Security Portal**
- **Trust Score Widget**: Security score visualization (0-100)
- **Active Sessions**: Device management with revocation
- **Panic Button**: Emergency account lockdown with one click
- **Activity Feed**: "Was This You?" confirmations for sensitive actions

#### 4. **Data Scientist Lab**
- **Shadow Mode Comparator**: Live vs. Experimental rule comparison graphs
- **Rule Editor**: In-browser YAML editor with syntax validation
- **Replay Tool**: Test rules against historical data
- **Impact Analysis**: False positive vs. true positive trade-offs

#### 5. **Developer Portal**
- **API Keys Management**: Generate, revoke, view expiry
- **Webhook Replay Console**: Retry failed deliveries, view payloads
- **Webhook Logs**: Full audit trail with status codes
- **Sandbox Testing**: Isolated development environment

#### 6. **Compliance Station**
- **Immutable Explorer**: Datagrid of audit logs with chain verification
- **Evidence Export**: Signed PDF reports for auditors
- **Hash Verification**: SHA-256 integrity validation per row
- **Filters**: Search by user, action, date range, PII access

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Tremor UI Components
- **State Management**: Zustand
- **API Client**: Axios
- **Graph Visualization**: Cytoscape.js
- **Charts**: Recharts
- **Code Editor**: Monaco Editor
- **Routing**: React Router v6
- **Type Safety**: TypeScript

## Project Structure

```
sentineliq-ui/
├── src/
│   ├── components/
│   │   ├── analyst/          # Triage queue, transaction details
│   │   ├── graphs/           # Cytoscape spiderweb visualization
│   │   ├── charts/           # Tremor chart components
│   │   └── shell/            # Navbar, sidebar, layout shells
│   ├── pages/
│   │   ├── analyst/          # Analyst workbench pages
│   │   ├── soc/              # War room dashboard
│   │   ├── enduser/          # Security portal
│   │   ├── datascientist/    # Rule lab
│   │   ├── developer/        # API/webhook portal
│   │   └── compliance/       # Audit logs
│   ├── layouts/              # DashboardLayout, PortalLayout, AuthLayout
│   ├── stores/               # Zustand stores (auth, incidents)
│   ├── services/             # API client, WebSocket service
│   ├── types.ts              # TypeScript interfaces
│   ├── mockData.ts           # Synthetic fraud data
│   ├── App.tsx               # Main router
│   ├── main.tsx              # React entry point
│   └── index.css             # Tailwind + custom styles
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
cd sentineliq-ui
npm install
```

### Development Server

```bash
npm run dev
```

Server runs at `http://localhost:5173`

### Demo Login Roles

The login page provides quick-access buttons for all 6 roles:

1. **Risk Analyst** → `/analyst/triage` (Transaction triage queue)
2. **SOC Responder** → `/soc/attack-map` (Attack map & system health)
3. **End User** → `/portal/security` (Security center)
4. **Data Scientist** → `/datascientist/rules` (Rule lab)
5. **Developer** → `/developer/keys` (API keys & webhooks)
6. **Compliance** → `/compliance/audit` (Audit logs)

## Key Features Implemented

### ✅ Core Components
- [x] Role-based routing with protected routes
- [x] Type-safe API service with Axios
- [x] Zustand state management (auth, incidents)
- [x] Mock data generation for development
- [x] Real-time metrics updates

### ✅ UI Interfaces
- [x] Analyst triage queue with SLA timer
- [x] Cytoscape graph visualization for link analysis
- [x] SOC dashboard with system health metrics
- [x] End-user security center with panic button
- [x] Data scientist rule editor and shadow mode
- [x] Developer webhook replay console
- [x] Compliance audit log viewer

### ✅ Styling
- [x] Tailwind CSS with dark mode support
- [x] Tremor component library integration
- [x] Responsive grid layouts
- [x] Custom animations (panic button pulse)
- [x] Risk level color coding

## API Integration

The frontend expects the backend to provide these endpoints:

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/panic-mode

GET    /api/transactions
POST   /api/transactions/:id/approve
POST   /api/transactions/:id/reject
POST   /api/transactions/:id/step-up-auth

GET    /api/alerts
POST   /api/alerts/:id/acknowledge

GET    /api/graph/entities/:type/:id
GET    /api/graph/risk-network/:txnId

GET    /api/rules
POST   /api/rules/test
POST   /api/rules/compare
POST   /api/rules/replay

GET    /api/webhooks/logs
POST   /api/webhooks/logs/:id/retry

GET    /api/api-keys
POST   /api/api-keys
DELETE /api/api-keys/:id

GET    /api/audit-logs
GET    /api/audit-logs/export/evidence

GET    /api/metrics/system-health
GET    /api/metrics/realtime-stream-url
```

See [../app/routes/](../app/routes/) for FastAPI implementation.

## Build & Deployment

### Production Build

```bash
npm run build
```

Outputs optimized bundle to `dist/` directory.

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "run", "preview"]
```

## Environment Variables

### Development (`.env.development`)
```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

### Production (`.env.production`)
```
VITE_API_URL=https://api.sentineliq.com/api
VITE_WS_URL=wss://api.sentineliq.com/ws
```

## Testing

Mock data is provided in `src/mockData.ts` for development:

- **50+ sample transactions** with risk levels
- **10+ graph nodes** (users, IPs, devices)
- **Realistic audit logs** for compliance testing
- **API keys and webhook logs** for developer testing

To use real backend data, update `mockData.ts` calls to actual API endpoints.

## Key Pages & Routes

| Route | Component | Role |
|-------|-----------|------|
| `/analyst/triage` | TriagePage | Analyst |
| `/analyst/graph` | GraphPage | Analyst |
| `/soc/attack-map` | SOCDashboard | SOC Responder |
| `/portal/security` | EndUserPortal | End User |
| `/datascientist/rules` | DataScientistLab | Data Scientist |
| `/developer/keys` | DeveloperPortal | Developer |
| `/compliance/audit` | ComplianceAudit | Compliance |

## Future Enhancements

- [ ] WebSocket integration for real-time alerts
- [ ] PDF export functionality with signatures
- [ ] Advanced filtering and search
- [ ] Custom dashboard widgets
- [ ] Mobile-responsive optimization
- [ ] Dark mode refinements
- [ ] Keyboard shortcuts for analysts
- [ ] Multi-language support

## Troubleshooting

### Port 5173 already in use
```bash
npm run dev -- --port 3000
```

### API connection errors
- Ensure backend is running on `localhost:8000`
- Check CORS headers in backend
- Verify `.env.development` settings

### Tailwind styles not loading
```bash
npm run build:css
npm run dev
```

## Contributing

1. Create feature branch: `git checkout -b feature/analyst-enhancements`
2. Commit changes: `git commit -m "Add x feature"`
3. Push to branch: `git push origin feature/analyst-enhancements`
4. Open pull request

## License

Proprietary - SentinelIQ Fraud Detection Platform

## Support

For questions or issues:
- Check the [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)
- Review [LOCAL_TESTING_GUIDE.md](../LOCAL_TESTING_GUIDE.md)
- See backend [README.md](../README.md)

---

**Last Updated**: January 2, 2026
