<p align="center">
  <img src="https://img.shields.io/badge/Platform-Enterprise%20Security-blue?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/Python-3.11+-green?style=for-the-badge&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

<h1 align="center">🛡️ SentinelIQ</h1>

<p align="center">
  <strong>Enterprise Risk & Security Intelligence Platform</strong><br>
  Real-time fraud detection, risk assessment, and security monitoring for financial institutions
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Overview

SentinelIQ is a production-grade security intelligence platform designed for fintech companies to detect, prevent, and respond to fraud and security threats in real-time. The system combines a high-performance Python backend with an intuitive React frontend, delivering millisecond-level decision latency and comprehensive risk visibility.

### Why SentinelIQ?

| Challenge | Solution |
|-----------|----------|
| **Fraud happens in milliseconds** | Sub-100ms risk decisions prevent fraud before completion |
| **Single-point detection fails** | Multi-dimensional analysis: rules + velocity + behavior + ML |
| **Compliance is complex** | Built-in GDPR, PCI-DSS, SOC 2, and HIPAA compliance |
| **Alert fatigue overwhelms teams** | Intelligent prioritization reduces noise by 80% |
| **Fraud networks are invisible** | Graph analysis exposes connected bad actors |

---

## Features

### 🔒 Core Security (Features 1-7)

| Feature | Description |
|---------|-------------|
| **Event Processing** | Redis Streams-based ingestion with validation, enrichment, and persistence |
| **Risk Scoring Engine** | 100+ configurable YAML rules with hot-reload capability |
| **Immutable Audit Logs** | Cryptographically chained audit trails with MinIO archival |
| **Authentication & RBAC** | JWT tokens, multi-tenancy, organization-level isolation |
| **Observability Stack** | Prometheus metrics, Loki logs, Grafana dashboards |
| **Security Hardening** | OWASP headers, DNS rebinding protection, Vault integration |
| **Multi-Tenancy** | Complete organization isolation for SaaS deployments |

### 📊 API & Analytics (Features 8-16)

| Feature | Description |
|---------|-------------|
| **Rate Limiting** | Redis-backed sliding window with configurable thresholds |
| **Webhooks** | HMAC-signed payloads with exponential backoff retry |
| **Alert Integrations** | Slack, PagerDuty, email with priority-based routing |
| **Analytics Engine** | Time-series analysis, velocity trends, cohort comparisons |
| **Rule Management** | CRUD operations, A/B testing, performance metrics |
| **Advanced Search** | Full-text search with facets, filters, autocomplete |
| **GraphQL API** | Type-safe queries with schema introspection |
| **ML Integration** | Anomaly detection, risk prediction, configurable sensitivity |

### 🏢 Enterprise (Features 17-22)

| Feature | Description |
|---------|-------------|
| **6-Role RBAC** | Admin, Analyst, Compliance Officer, SOC Responder, Data Scientist, Developer |
| **PII Protection** | Auto-masking for SSN, credit cards, emails, phones |
| **Transactional Outbox** | Zero-loss event delivery with atomic commits |
| **Shadow Mode** | Risk-free rule testing with precision/recall metrics |
| **Link Analysis** | Fraud ring detection with network visualization |
| **Crypto Audit** | SHA-256 hash chaining with tamper detection |

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sentineliq.git
cd sentineliq

# Start all services
docker compose up --build
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **API** | http://localhost:8000 | — |
| **API Docs** | http://localhost:8000/docs | — |
| **Frontend** | http://localhost:5173 | — |
| **Grafana** | http://localhost:3000 | admin / admin |

### Verify Installation

```bash
curl http://localhost:8000/health
# {"status": "ok", "timestamp": "2026-01-05T..."}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SentinelIQ Platform                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   React UI  │────▶│   FastAPI   │────▶│    Redis    │                   │
│  │  (Vite/TS)  │     │   Backend   │     │   Streams   │                   │
│  └─────────────┘     └──────┬──────┘     └─────────────┘                   │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ PostgreSQL  │     │    MinIO    │     │    Vault    │                   │
│  │  Database   │     │   Storage   │     │   Secrets   │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Observability Stack                              │   │
│  │   Prometheus (Metrics)  •  Loki (Logs)  •  Grafana (Dashboards)     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, Pydantic |
| **Database** | PostgreSQL 15 |
| **Cache/Streaming** | Redis 7 |
| **Object Storage** | MinIO |
| **Secrets** | HashiCorp Vault |
| **Monitoring** | Prometheus, Loki, Grafana |
| **Containerization** | Docker, Docker Compose |

### Project Structure

```
sentineliq/
├── app/                    # Backend application
│   ├── routes/            # API endpoint handlers
│   ├── services/          # Business logic layer
│   ├── core/              # Infrastructure & utilities
│   ├── models/            # Database models
│   └── schemas/           # Request/response validation
├── sentineliq-ui/         # React frontend
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Route pages
│       ├── stores/        # Zustand state management
│       └── hooks/         # Custom React hooks
├── rules/                 # YAML fraud detection rules
├── migrations/            # Database migrations
├── monitoring/            # Grafana/Prometheus configs
├── tests/                 # Test suites
└── docker-compose.yml     # Service orchestration
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Authenticate & receive JWT |
| `POST` | `/auth/refresh` | Refresh expired token |
| `POST` | `/auth/logout` | Revoke token |

### Risk & Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/events/stream` | Submit events for risk analysis |
| `GET` | `/analytics/dashboard` | View risk metrics and trends |

### Shadow Mode

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/shadow-mode/evaluate` | Test rules without blocking |
| `POST` | `/api/v1/shadow-mode/label/{id}` | Label actual fraud outcome |
| `GET` | `/api/v1/shadow-mode/accuracy/{rule_id}` | Get precision/recall/F1 metrics |

### Link Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/link-analysis/user/{id}` | Find connected users |
| `GET` | `/api/v1/link-analysis/ring/{id}` | Analyze fraud ring |
| `GET` | `/api/v1/link-analysis/hubs` | List top hub users |
| `GET` | `/api/v1/link-analysis/graph/{id}` | Get visualization data |

### Audit & Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/audit/logs` | Query immutable audit logs |
| `GET` | `/api/v1/audit/verify` | Verify chain integrity |
| `GET` | `/api/v1/audit/compliance-report` | Generate compliance report |

> 📖 **Full API Documentation**: Visit `http://localhost:8000/docs` for interactive Swagger UI

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/sentineliq

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-256-bit-secret
VAULT_ADDR=http://vault:8200

# Email
EMAIL_FROM=noreply@sentineliq.com
SMTP_HOST=mailhog
SMTP_PORT=1025
```

### Fraud Rules

Rules are defined in `rules/fraud_rules.yaml` and can be modified without redeployment:

```yaml
rules:
  hard_rules:
    - id: "sanctioned_region"
      name: "Sanctioned Region Access"
      conditions:
        country_code:
          in: ["KP", "IR", "SY", "CU"]
      action: "block"
      
  soft_rules:
    - id: "high_velocity"
      name: "High Transaction Velocity"
      conditions:
        transactions_per_hour:
          gt: 50
      risk_score: 35
```

---

## Compliance & Security

SentinelIQ is designed to meet enterprise compliance requirements:

| Standard | Implementation |
|----------|----------------|
| **PCI-DSS** | Encrypted secrets, immutable audit logs, access controls |
| **GDPR** | PII masking, data retention policies, right to erasure |
| **SOC 2** | Comprehensive audit trails, monitoring, alerting |
| **HIPAA** | Encryption at rest and in transit, access logging |
| **OFAC** | Sanctions list checking in hard rules |

---

## Development

### Running Tests

```bash
# Run all tests
docker compose run --rm api pytest tests/ -v

# Run specific test file
docker compose run --rm api pytest tests/test_rbac.py -v

# Run with coverage
docker compose run --rm api pytest tests/ --cov=app --cov-report=html
```

### Local Development

```bash
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd sentineliq-ui && npm install

# Start backend (dev mode)
uvicorn app.main:app --reload

# Start frontend (dev mode)
cd sentineliq-ui && npm run dev
```

### Database Access

```bash
# PostgreSQL CLI
docker compose exec postgres psql -U sentineliq

# Monitor Redis streams
docker compose exec redis redis-cli XREAD COUNT 10 STREAMS events 0
```

---

## Production Deployment

### Recommended Stack

| Component | Recommendation |
|-----------|----------------|
| **Orchestration** | Kubernetes (EKS, GKE, AKS) |
| **Database** | Managed PostgreSQL (RDS, Cloud SQL) |
| **Cache** | Managed Redis (ElastiCache, Memorystore) |
| **Storage** | S3, Cloud Storage, Azure Blob |
| **Secrets** | AWS Secrets Manager, HashiCorp Vault |
| **Load Balancer** | ALB, Cloud Load Balancing, NGINX |

### Security Checklist

- [ ] Enable HTTPS/TLS on all endpoints
- [ ] Configure WAF rules
- [ ] Rotate JWT secrets regularly
- [ ] Enable database encryption at rest
- [ ] Configure network isolation (VPC)
- [ ] Set up log retention policies
- [ ] Enable DDoS protection
- [ ] Configure backup schedules

---

## Documentation

| Document | Description |
|----------|-------------|
| [API Docs](http://localhost:8000/docs) | Interactive Swagger/OpenAPI documentation |
| [Frontend Guide](./FRONTEND_BEST_PRACTICES.md) | React development best practices |

---

## Roadmap

### Completed ✅

- [x] Real-time fraud detection engine
- [x] 6-role RBAC system
- [x] GraphQL API support
- [x] Shadow mode for safe rule testing
- [x] Link analysis for fraud rings
- [x] Immutable audit logging
- [x] Slack/PagerDuty integrations
- [x] Full-text search
- [x] ML anomaly detection

### Planned 🚀

- [ ] Real-time data warehouse pipeline
- [ ] Custom metric builder UI
- [ ] Advanced ML model training
- [ ] Federated learning for multi-org
- [ ] Mobile app for alerts
- [ ] Natural language rule builder

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>SentinelIQ</strong> — Protecting Financial Systems in Real-Time 🛡️
</p>

<p align="center">
  <sub>Built with ❤️ for the fintech security community</sub>
</p>
