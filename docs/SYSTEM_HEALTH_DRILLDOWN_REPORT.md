# System Health Drill-Down — Technical Analysis Report

## 1. Executive Summary

Transform the existing System Health page's four static service cards (Database, Redis, Kafka, Vault) into **clickable, interactive drill-down panels** that open rich detail views with circular gauges, real-time line/area charts, bar charts, and summarised KPIs — all using data already returned by the `/api/admin/dashboard/health` endpoint and supplemented by a new `/api/admin/dashboard/health/history` endpoint for time-series data.

---

## 2. Current State Analysis

### 2.1 Backend (`/api/admin/dashboard/health`)
Currently returns a **single point-in-time snapshot** per service:

| Service   | Fields Returned |
|-----------|----------------|
| Database  | status, latency_ms, connections_active, connections_max, pool_size, pool_checked_out, pool_overflow, pool_usage_percent, cache_hit_ratio, xact_commit, xact_rollback, deadlocks, slow_queries, db_size_mb |
| Redis     | status, latency_ms, memory_mb, memory_peak_mb, connected_clients, blocked_clients, uptime_seconds, cache_hit_rate, evicted_keys, total_keys, expired_keys, mem_fragmentation_ratio, keyspace |
| Kafka     | status, consumer_lag, partition_count, under_replicated_partitions, message_throughput_sec, active_producers, active_consumers, broker_uptime |
| Vault     | status, token_ttl, seal_status, mounts_enabled, lease_count, server_time |

### 2.2 Frontend (`SystemHealth.tsx`)
- Four service cards in a 2-column grid, each showing **10-12 text metrics**.
- Cards are **not clickable** — no drill-down interaction.
- The circular health gauge exists only at the top (overall health percent).
- **No charts/graphs** on the System Health page (Recharts is installed but unused here).

### 2.3 Available Libraries (already in `package.json`)
- **Recharts 2.10.4** — Line, Area, Bar, Pie, Radar, RadialBar charts
- **@headlessui/react 1.7.18** — Dialog, Transition for animated modals
- **@heroicons/react 2.1.1** — Icon library
- **clsx + tailwind-merge** — Dynamic class composition
- **date-fns 3.2.0** — Date formatting

> **No new dependencies required.** Everything can be built with existing packages.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID   | Requirement |
|------|-------------|
| FR-1 | Each service card must be clickable (cursor-pointer, hover effect) |
| FR-2 | Clicking a card opens a **full-width slide-over panel** (Dialog) with smooth Transition animation |
| FR-3 | Each panel contains: (a) status header with circular gauge, (b) KPI summary row, (c) 2–3 real-time charts, (d) detail metrics table |
| FR-4 | Circular gauges must use Recharts `RadialBarChart` or SVG for: pool usage %, cache hit ratio, memory usage, seal status |
| FR-5 | Time-series charts (Line/Area) for: latency over time, connections over time, throughput, memory trends |
| FR-6 | Bar charts for: transaction commits vs rollbacks, key distribution, partition counts |
| FR-7 | Auto-refresh every 30 seconds using RTK Query `pollingInterval` |
| FR-8 | Panel must be dismissible via close button, Escape key, and backdrop click |
| FR-9 | Responsive: panels stack vertically on mobile, charts resize via `ResponsiveContainer` |

### 3.2 Non-Functional Requirements

| ID    | Requirement |
|-------|-------------|
| NFR-1 | Animation: slide-in from right (300ms ease-out), fade backdrop |
| NFR-2 | Performance: lazy-load panel content only when opened |
| NFR-3 | Accessibility: focus trap in panel, Escape to close, aria labels |
| NFR-4 | Theme consistency: use existing dashboard color tokens (dashboard-bg, dashboard-card, sentinel-*, risk-*) |

---

## 4. Architecture Design

### 4.1 New Backend Endpoint

**`GET /api/admin/dashboard/health/history?service={name}&points=20`**

Returns the last N snapshots of health metrics for a specific service, enabling time-series charts. Data is collected by storing each `/health` poll result in a ring buffer (in-memory deque, max 60 points = 30 minutes at 30s intervals).

```python
# Response shape
{
  "service": "database",
  "points": [
    {
      "timestamp": "2026-03-10T13:30:00",
      "latency_ms": 0.7,
      "connections_active": 2,
      "pool_usage_percent": 20.0,
      "cache_hit_ratio": 100.0,
      "xact_commit": 52254,
      "xact_rollback": 264
    },
    ...
  ]
}
```

### 4.2 Frontend Component Tree

```
SystemHealth.tsx (existing — modified)
├── ServiceCard (clickable wrapper) × 4
│   └── onClick → setSelectedService('database' | 'redis' | 'kafka' | 'vault')
│
└── ServiceDetailPanel (new — HeadlessUI Dialog slide-over)
    ├── PanelHeader (service icon, name, status badge, close button)
    ├── GaugeRow (2–3 RadialBarChart circular gauges)
    ├── KPISummaryRow (4–6 stat boxes)
    ├── TimeSeriesChart (Recharts AreaChart for latency/throughput)
    ├── ComparisonChart (Recharts BarChart for commits/rollbacks or keys)
    └── DetailMetricsTable (full metrics in a clean table)
```

### 4.3 Per-Service Panel Design

#### Database Panel
| Section | Visualisation | Data Source |
|---------|--------------|-------------|
| Gauge 1 | **Pool Usage %** — RadialBar (green < 60%, yellow < 80%, red ≥ 80%) | `pool_usage_percent` |
| Gauge 2 | **Cache Hit Ratio %** — RadialBar (green ≥ 95%, yellow ≥ 80%, red < 80%) | `cache_hit_ratio` |
| Gauge 3 | **Connection Saturation %** — RadialBar | `connections_active / connections_max × 100` |
| KPI Row | Latency, DB Size, Deadlocks, Slow Queries | Point-in-time |
| Chart 1 | **Latency Trend** — AreaChart over last 30min | `/health/history` |
| Chart 2 | **Commits vs Rollbacks** — BarChart | `/health/history` |
| Table   | All raw metrics | Current snapshot |

#### Redis Panel
| Section | Visualisation | Data Source |
|---------|--------------|-------------|
| Gauge 1 | **Cache Hit Rate %** | `cache_hit_rate` |
| Gauge 2 | **Memory Usage** (used / peak) | `memory_mb / memory_peak_mb × 100` |
| Gauge 3 | **Fragmentation Ratio** (target ≤ 1.5) | `mem_fragmentation_ratio` |
| KPI Row | Connected Clients, Blocked, Evicted Keys, Uptime | Point-in-time |
| Chart 1 | **Memory Trend** — AreaChart | `/health/history` |
| Chart 2 | **Key Distribution** — BarChart (total, expired, evicted) | Current + history |
| Table   | All raw metrics + keyspace detail | Current snapshot |

#### Kafka Panel
| Section | Visualisation | Data Source |
|---------|--------------|-------------|
| Gauge 1 | **Consumer Lag** (0 = green, >100 = red) | `consumer_lag` |
| Gauge 2 | **Partition Health** | `partition_count` minus `under_replicated_partitions` |
| KPI Row | Producers, Consumers, Throughput, Broker Uptime | Point-in-time |
| Chart 1 | **Consumer Lag Trend** — AreaChart | `/health/history` |
| Chart 2 | **Throughput** — AreaChart | `/health/history` |
| Table   | All raw metrics | Current snapshot |

#### Vault Panel
| Section | Visualisation | Data Source |
|---------|--------------|-------------|
| Gauge 1 | **Token TTL** — countdown gauge (green > 30min, yellow > 5min, red < 5min) | `token_ttl` |
| Gauge 2 | **Seal Status** — binary (sealed/unsealed) | `seal_status` |
| KPI Row | Lease Count, Mounts, Server Time | Point-in-time |
| Chart 1 | **Token TTL Trend** — AreaChart | `/health/history` |
| Table   | Mounts list + all raw metrics | Current snapshot |

---

## 5. Implementation Plan

### Phase 1 — Backend History Endpoint
1. Add in-memory ring buffer (`collections.deque(maxlen=60)`) to `dashboard.py`
2. Each call to `GET /health` appends the snapshot to the buffer
3. New endpoint `GET /health/history?service=database&points=20`
4. Add RTK Query hook `useGetHealthHistoryQuery`

### Phase 2 — Circular Gauge Component
1. Create `<CircularGauge>` using Recharts `RadialBarChart`
2. Props: `value`, `max`, `label`, `color`, `thresholds`
3. Animated fill with gradient, center label

### Phase 3 — Service Detail Panel
1. Create `<ServiceDetailPanel>` using HeadlessUI `Dialog` + `Transition`
2. Slide-over from right, backdrop fade
3. Accepts `service: 'database' | 'redis' | 'kafka' | 'vault' | null`
4. Sub-components: GaugeRow, KPIRow, charts, table

### Phase 4 — Make Cards Clickable
1. Wrap each card in a `<button>` with hover/focus states
2. `onClick` sets `selectedService` state
3. Pass to `<ServiceDetailPanel>`

### Phase 5 — Charts & Data Binding
1. Latency/memory/lag AreaCharts bound to history data
2. Commits/rollbacks BarChart
3. Auto-refresh via `pollingInterval: 30000`

---

## 6. Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `backend/app/routes/dashboard.py` | Modify | Add health history ring buffer + endpoint |
| `frontend/src/services/dashboardApi.ts` | Modify | Add `useGetHealthHistoryQuery` + history types |
| `frontend/src/pages/SystemHealth.tsx` | Modify | Add click handlers + render `ServiceDetailPanel` |
| `frontend/src/components/health/CircularGauge.tsx` | Create | Reusable radial gauge component |
| `frontend/src/components/health/ServiceDetailPanel.tsx` | Create | The drill-down slide-over panel |
| `frontend/src/components/health/DatabaseDetail.tsx` | Create | Database-specific charts + KPIs |
| `frontend/src/components/health/RedisDetail.tsx` | Create | Redis-specific charts + KPIs |
| `frontend/src/components/health/KafkaDetail.tsx` | Create | Kafka-specific charts + KPIs |
| `frontend/src/components/health/VaultDetail.tsx` | Create | Vault-specific charts + KPIs |

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| In-memory history lost on API restart | Low — charts show "no data" gracefully | Buffer rebuilds within 10 min of restart |
| Large history payloads | Low — 60 points × ~500B = ~30KB | Limit `points` query param to max 60 |
| Chart render performance | Medium — 4 services × 3 charts | Lazy-load panel content; `React.memo` charts |
| Recharts bundle size | Already included — no increase | N/A |

---

*Report generated: 2026-03-10 | SentinelIQ System Health Enhancement*
