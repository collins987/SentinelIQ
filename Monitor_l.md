# SentinelIQ Logs & Implementation Gaps Report

Generated: 2026-03-25
Scope: Fresh run after `docker compose up --build -d`, plus service log review.

## Executive Summary

The platform now boots successfully and the API is reachable, but several features are partially implemented or running in degraded mode. The main functional gaps are around Vault Transit, monitoring stack provisioning, and operational resilience around startup sequencing/retries.

## What I Observed (From Fresh Logs)

### 1. Vault Transit encryption is not actually enabled
Evidence from API logs:
- `Failed to create transit key sentineliq-pii: no handler for route \"transit/keys/sentineliq-pii\"`
- Then app logs: `Vault Transit engine ready for PII encryption`

Assessment:
- The log message claims readiness, but Transit engine/key creation failed.
- PII encryption path is likely not fully implemented in dev mode startup.

Impact:
- Any feature depending on Vault Transit for encryption may silently fall back or operate without intended cryptographic guarantees.

How to implement/fix:
1. Enable Transit engine before key creation:
- `vault secrets enable transit` (or API equivalent in startup bootstrap).
2. Create key idempotently:
- `vault write -f transit/keys/sentineliq-pii`.
3. Change app logging semantics:
- Only log "ready" when enable + key create/check succeed.
- Log degraded mode explicitly otherwise.
4. Add startup health gate:
- Expose `vault_transit_ready` in `/health/detailed`.

---

### 2. Vault token renewal warnings are expected in dev mode but noisy
Evidence from API logs:
- `Failed to renew Vault token: lease is not renewable`

Assessment:
- You run Vault in dev mode (`server -dev`), where renewal behavior differs.
- This is not fatal but pollutes logs and obscures real issues.

Impact:
- Operational noise and alert fatigue.

How to implement/fix:
1. In dev profile, disable token renewal background task or suppress non-actionable warnings.
2. In non-dev/prod profile, use renewable tokens/AppRole and keep renewal enabled.
3. Add environment switch:
- `VAULT_MODE=dev|prod` and branch logic accordingly.

---

### 3. MinIO/WORM path is now correctly implemented
Evidence from API logs:
- `MinIO client initialized: minio:9000`
- `Bucket sentineliq-audit-logs already exists`
- `MinIO WORM storage connected for audit archival`

Assessment:
- This previously broken area is now functioning correctly.

What was done:
- API compose env pinned to `MINIO_ENDPOINT=minio:9000`.
- WORM client default endpoint fixed to container DNS.
- Vault MinIO secret seeding updated to avoid stale endpoint drift.

---

### 4. Kafka startup race can still produce transient churn
Evidence from previous and recent logs:
- Earlier runs showed `Unable connect to \"kafka:29092\"` and consumer join/leave churn.
- Fresh rebuilt run is mostly healthy and consumers subscribe, but race conditions are still possible if services restart in different order.

Assessment:
- Functionality is present, but startup robustness is not fully hardened.

Impact:
- Intermittent startup warnings; brief consumer instability after stack restarts.

How to implement/fix:
1. Add application-level retry/backoff for all Kafka consumers/producers.
2. Delay consumer worker start until broker readiness check passes.
3. Add explicit readiness endpoint and use it in compose healthcheck for API.
4. Optionally separate API web process from background consumers into distinct services for clearer lifecycle control.

---

### 5. Monitoring stack has incomplete provisioning
Evidence from logs:
- `postgres_exporter` warning: missing `postgres_exporter.yml`.
- Grafana errors: missing provisioning directories:
  - `/etc/grafana/provisioning/plugins`
  - `/etc/grafana/provisioning/alerting`
- Promtail/Loki startup transient errors:
  - `connect: connection refused`
  - `500 ... empty ring`

Assessment:
- Core metrics/logging eventually come up, but provisioning is incomplete and initial pipeline behavior is degraded.

Impact:
- Partial observability configuration; alerting/plugins not fully provisioned; noisy startup.

How to implement/fix:
1. Postgres exporter:
- Mount valid exporter config file or remove reference to missing file.
2. Grafana:
- Create and mount expected provisioning directories/files for plugins/alerting.
3. Loki/Promtail:
- Ensure single-binary Loki config is aligned with deployment mode.
- Keep Promtail retries but reduce noise with startup delay or health dependency.

---

### 6. Vault service itself is intentionally non-production
Evidence:
- Vault logs: `WARNING! dev mode is enabled! ... runs entirely in-memory`.

Assessment:
- Intended for local development, not production-ready.

Impact:
- Secrets are ephemeral; restart behavior differs from real deployment.

How to implement/fix:
1. Keep dev mode for local only.
2. Add documented production Vault profile with persistent storage and auth method.
3. Add clear README note differentiating dev vs production security guarantees.

## Feature Completeness Matrix

| Area | Current State | Completeness |
|---|---|---|
| API startup / routing | Stable after fixes | High |
| MinIO WORM archival | Working in-container | High |
| Vault KV secrets loading | Working | High |
| Vault Transit encryption | Not actually operational | Medium-Low |
| Kafka event consumers | Working but startup race-prone | Medium |
| Grafana provisioning | Missing dirs/files | Medium-Low |
| Postgres exporter config | Missing config file | Medium-Low |
| Loki/Promtail startup behavior | Eventually works, noisy/transient errors | Medium |

## Priority Action Plan

### P1 (Do next)
1. Fix Vault Transit bootstrap + truthful readiness logging.
2. Add Kafka readiness/backoff so consumer startup is deterministic.
3. Complete monitoring provisioning (Grafana + postgres exporter configs).

### P2
1. Split dev/prod Vault behavior and suppress dev-only non-actionable warnings.
2. Improve health endpoints to reflect subsystem readiness (Vault transit, Kafka consumer, WORM archival).

### P3
1. Separate background workers from API process for cleaner failure domains.
2. Add structured startup report at boot summarizing subsystem states.

## Commands Used For Verification

```bash
docker compose up --build -d
docker compose ps
docker logs --tail 260 sentineliq_api
docker logs --tail 120 sentineliq_kafka
docker logs --tail 120 sentineliq_vault
docker compose logs --no-color --since 30m
```

## Final Notes

- Your manual deletions were left unchanged, as requested.
- The core app now starts and serves, but observability and some security-hardening pieces still need implementation work to be production-grade.
