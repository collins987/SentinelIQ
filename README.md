# SentinelIQ - Enterprise Risk & Security Intelligence Platform

Advanced event-driven fraud detection, real-time risk assessment, and comprehensive security monitoring for financial institutions. Complete with **production-grade backend + React frontend UI**.

---

## 🎯 What's Inside

**Backend** (`/app`) → The "Porsche Engine"
- Real-time fraud detection with 22+ features
- Rule-based + ML-powered risk scoring  
- Event-driven architecture with Redis streams
- Immutable audit logging & compliance
- GraphQL + REST APIs

**Frontend** (`/sentineliq-ui`) → The "Dashboard & Steering Wheel"  
- 6 role-based dashboards for different personas
- React 18 + Vite + Tailwind + Tremor
- Fraud ring visualization with Cytoscape.js
- Real-time metrics and system health
- API key management, webhook logs, and more

---

## Overview

SentinelIQ is a production-grade platform designed for fintech companies to detect, prevent, and respond to fraud and security threats in real-time. The architecture combines a powerful Python backend with an intuitive React frontend, providing both the computational engine and the user interface different personas need.

### Core Problems Solved

- **Real-time fraud prevention** - Millisecond-level decision latency prevents fraud before it happens
- **Multi-dimensional risk** - Rules, velocity, behavior, and ML models combined for sophisticated detection
- **Regulatory compliance** - Immutable audit trails, PII protection, and automated compliance reports
- **Operational efficiency** - Automated decisions and accurate alerting reduce security team burden
- **Enterprise security** - RBAC, encryption, hardened defaults, and comprehensive logging

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local development)

### Launch

```bash
git clone <repo>
cd sentineliq
docker compose up --build

# API documentation: http://localhost:8000/docs
# Grafana dashboards: http://localhost:3000 (admin:admin)
```

### Health Check
```bash
curl http://localhost:8000/health
# Response: {"status": "ok"}
```

---

## Features (22 Total)

### Foundation (Features 1-7)
| # | Feature | Capabilities |
|---|---------|--------------|
| **1** | Event Processing | Redis Streams, event validation, enrichment, persistence |
| **2** | Risk Scoring Rules | 100+ YAML rules, dynamic reloading, hot-swap without restart |
| **3** | Audit Logging | Immutable event trails, MinIO archival, GDPR-ready retention |
| **4** | Auth & RBAC | JWT tokens, multi-tenancy, organization isolation |
| **5** | Monitoring | Prometheus metrics, Loki logs, Grafana dashboards |
| **6** | Security Headers | OWASP compliance, DNS rebinding protection, vault integration |
| **7** | Multi-Tenancy | Org-scoped isolation, scalable for SaaS deployments |

### API & Analytics (Features 8-16)
| # | Feature | Capabilities |
|---|---------|--------------|
| **8** | Rate Limiting | Redis-backed sliding window, 429 responses, configurable per-endpoint |
| **9** | Webhooks | HMAC signing, exponential backoff retry, delivery tracking |
| **10** | Alerts | Slack/PagerDuty/webhook integration, priority-based routing |
| **11** | Analytics | Time-series, velocity trends, cohort analysis, rule performance metrics |
| **12** | Rule Management | CRUD, A/B testing, performance comparison, safe deployment |
| **13** | Search | Full-text, multi-filter, facets, autocomplete, sub-100ms latency |
| **14** | GraphQL API | Type-safe queries, nested data, schema introspection |
| **15** | ML Integration | Anomaly detection, risk prediction, configurable sensitivity |
| **16** | Mobile SDKs | iOS/Android/Web, batch submission, device registration |

### Enterprise (Features 17-22) - Milestone 1 & 2 ⭐
| # | Feature | Capabilities |
|---|---------|--------------|
| **17** | 6-Role RBAC | Admin/Analyst/Officer/Responder/Scientist/Engineer, 25+ permissions, decorator-based |
| **18** | PII Scrubbing | Auto-mask SSN/CC/email/phone, GDPR/HIPAA compliant, recursive JSON |
| **19** | Transactional Outbox | Zero-loss event delivery, atomic commits, exponential backoff, 7-day cleanup |
| **20** | Shadow Mode | Risk-free rule testing, precision/recall metrics, F1-score automation |
| **21** | Link Analysis | Fraud ring detection, 5-connection types, hub identification, network analysis |
| **22** | Crypto Audit | SHA-256 chaining, tamper detection, compliance reports, MinIO archival |

---

## Use Cases

- **Digital Banking** - Detect compromised accounts before fund theft; multi-factor risk assessment
- **Payment Processors** - Identify fraud at authorization; reduce chargebacks; PCI-DSS compliance
- **Crypto Exchanges** - Monitor suspicious withdrawals; sanctioned entity detection; AML/CFT
- **Lending Platforms** - Detect synthetic identity fraud; verify borrower legitimacy at origination
- **Fintech Startups** - Compete with legacy institutions; reduce ops burden with automated decisions
- **Enterprise Compliance** - Unified fraud/security/compliance visibility; quick investigation; audit reports
- **Milestone 1 & 2 Enhancements** - Shadow mode for safe rule testing, graph analysis for fraud rings, immutable logs for auditors, zero-loss guarantee, secure RBAC, privacy protection

---

## Architecture

### Technology Stack

- **Framework**: FastAPI (async Python web framework)
- **Database**: PostgreSQL (relational data, audit logs)
- **Cache/Event Streaming**: Redis (event streams, rate limiting)
- **Object Storage**: MinIO (immutable log archival)
- **Secrets Management**: HashiCorp Vault (encrypted configuration)
- **Monitoring**: 
  - Prometheus (metrics collection)
  - Loki (log aggregation)
  - Grafana (visualization)
- **Containerization**: Docker & Docker Compose
- **Email**: Mailhog (development) / SMTP (production)

### Core Components

```
├── app/
│   ├── routes/              # HTTP endpoint handlers
│   │   ├── auth.py         # Authentication endpoints
│   │   ├── users.py        # User management
│   │   ├── admin.py        # Admin operations
│   │   ├── events.py       # Event streaming
│   │   ├── analytics.py    # Analytics & reporting
│   │   └── password_reset.py # Password recovery
│   ├── services/           # Business logic
│   │   ├── risk_engine.py  # Risk scoring & fraud detection
│   │   ├── auth_service.py # Authentication logic
│   │   ├── email_service.py# Email delivery
│   │   ├── redis_stream.py # Event processing
│   │   └── alerts.py       # Alert generation
│   ├── core/               # Infrastructure
│   │   ├── db.py          # Database connection
│   │   ├── security.py    # Encryption & hashing
│   │   ├── logging.py     # Structured logging
│   │   └── auth_utils.py  # JWT & token utilities
│   ├── models/             # Data models
│   └── schemas/            # Request/response validation
├── rules/
│   └── fraud_rules.yaml    # Configurable risk rules
└── docker-compose.yml      # Full stack orchestration
```

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local development)
- PostgreSQL client (optional, for debugging)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/sentineliq.git
cd sentineliq

# Build and start all services
docker compose up --build

# API will be available at http://localhost:8000
# Documentation at http://localhost:8000/docs
# Grafana at http://localhost:3000 (admin:admin)
```

### Health Check
```bash
curl http://localhost:8000/health
# Response: {"status": "ok"}
```

### API Documentation
FastAPI auto-generates OpenAPI (Swagger) documentation. Visit `http://localhost:8000/docs` to explore all endpoints interactively.

---

## Key Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Authenticate and receive JWT token
- `POST /auth/refresh` - Refresh expired token
- `POST /auth/logout` - Revoke token

### User Management
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user settings
- `POST /users/password/reset-request` - Request password reset
- `POST /users/password/reset` - Complete password reset

### Risk & Events
- `POST /events/stream` - Submit events for risk analysis
- `GET /analytics/dashboard` - View risk metrics and trends

### Admin
- `GET /admin/users` - List all users
- `DELETE /admin/users/{user_id}` - Deactivate user

### 🆕 Shadow Mode (Milestone 1 & 2)
- `POST /api/v1/shadow-mode/evaluate` - Log rule evaluation without blocking
- `POST /api/v1/shadow-mode/label/{id}` - Label actual fraud outcome (ground truth)
- `GET /api/v1/shadow-mode/accuracy/{rule_id}` - Get accuracy metrics (precision, recall, F1)
- `GET /api/v1/shadow-mode/trends/{rule_id}` - Get daily accuracy trends
- `GET /api/v1/shadow-mode/pending-labels` - List unlabeled evaluations

### 🆕 Link Analysis (Milestone 1 & 2)
- `GET /api/v1/link-analysis/user/{user_id}` - Find connected users (fraud network)
- `GET /api/v1/link-analysis/ring/{user_id}` - Analyze fraud ring (size, risk, hubs)
- `GET /api/v1/link-analysis/hubs` - List top hub users in fraud networks
- `GET /api/v1/link-analysis/graph/{user_id}` - Get Cytoscape.js visualization data
- `POST /api/v1/link-analysis/flag-ring` - Flag suspicious group for blocking

### 🆕 Audit & Compliance (Milestone 1 & 2)
- `GET /api/v1/audit/logs` - Query immutable audit logs
- `GET /api/v1/audit/verify` - Verify chain integrity (detect tampering)
- `GET /api/v1/audit/compliance-report` - Generate compliance report (SOC 2, PCI-DSS, GDPR)
- `GET /api/v1/audit/stats` - Get audit statistics (event counts, actor summaries)

---

## Configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://user:password@postgres:5432/sentineliq
REDIS_URL=redis://redis:6379
VAULT_ADDR=http://vault:8200
JWT_SECRET=your-secret-key-here
EMAIL_FROM=noreply@sentineliq.com
```

### Fraud Rules
Customize fraud detection rules in `rules/fraud_rules.yaml` without redeploying:
```yaml
rules:
  hard_rules:
    - id: "sanctioned_region"
      name: "Sanctioned Region Access"
      conditions:
        country_code:
          in: ["KP", "IR", "SY", "CU"]
      action: "block"
```

---

## Compliance & Security

- **PCI-DSS**: Immutable audit logging, encrypted secrets management
- **OFAC Compliance**: Sanctions list checking in hard rules
- **GDPR**: Data retention policies, user data export capabilities
- **SOC 2**: Comprehensive audit trails, monitoring, and alerting
- **HIPAA-Ready**: Encrypted data at rest and in transit

---

## Monitoring & Observability

### Metrics Available
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Authentication success/failure rates
- Risk event volumes
- Database query performance

### View Metrics
```bash
# Prometheus metrics endpoint
curl http://localhost:9090/metrics

# Grafana dashboards
http://localhost:3000
```

### Logs
Logs are aggregated in Loki and queryable via Grafana. Key log types:
- Application logs (request/response)
- Risk decisions (fraud alerts)
- Audit logs (user actions)
- System events (startup/shutdown)

---

## Development & Testing

```bash
# Run unit tests
docker compose run --rm api pytest tests/

# View API documentation
http://localhost:8000/docs

# Access PostgreSQL CLI
docker compose exec postgres psql -U sentineliq

# Monitor Redis events
docker compose exec redis redis-cli XREAD COUNT 10 STREAMS events 0
```

---

## Production Deployment

### Recommended Architecture
- **Kubernetes** for orchestration
- **Managed PostgreSQL** (AWS RDS, Google Cloud SQL)
- **Managed Redis** (AWS ElastiCache)
- **Object Storage** (AWS S3, Google Cloud Storage)
- **Secret Management** (AWS Secrets Manager, HashiCorp Vault)
- **Load Balancing** (NGINX, AWS ALB)
- **CDN** for static assets

### Security Considerations
- Enable HTTPS/TLS for all endpoints
- Rotate JWT secrets regularly
- Use strong database passwords and network isolation
- Enable WAF (Web Application Firewall) rules
- Implement rate limiting per API client
- Monitor for suspicious patterns in logs

---

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes with clear messages
3. Write tests for new functionality
4. Submit a pull request

## Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [SYSTEM_ARCHITECTURE_AND_OPERATIONS.md](./SYSTEM_ARCHITECTURE_AND_OPERATIONS.md) | System design, deployment architecture, operations procedures | 60 min |
| [MILESTONE_1_2_IMPLEMENTATION.md](./MILESTONE_1_2_IMPLEMENTATION.md) | Step-by-step implementation guide with 70+ test cases | 120 min |
| [MILESTONE_1_2_REFINED.md](./MILESTONE_1_2_REFINED.md) | Complete business context and requirements | 90 min |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) | Kubernetes, cloud deployment, production checklist | 45 min |
| [OPERATOR_RUNBOOK.md](./OPERATOR_RUNBOOK.md) | Daily operations, troubleshooting, incident response | 40 min |
| [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md) | Local development, testing, debugging | 30 min |

**API Documentation**: Visit `http://localhost:8000/docs` for interactive Swagger/OpenAPI documentation

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Roadmap

- [x] Machine learning model integration for behavioral anomaly detection
- [x] Advanced analytics dashboard with drill-down capabilities
- [x] GraphQL API support
- [x] Webhook notifications for risk events
- [x] Mobile SDK for app-based authentication
- [x] Third-party integrations (Slack, PagerDuty)
- [x] Runtime rule reloading without downtime
- [x] Full-text search with advanced filtering
- [x] Rate limiting and API abuse prevention
- [ ] Real-time data pipeline to data warehouses
- [ ] Custom metric builders for organizations
- [ ] Advanced ML model training capabilities
- [ ] Federated learning for multi-org collaboration

---

**SentinelIQ: Protecting Financial Systems in Real-Time** 🛡️