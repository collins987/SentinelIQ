# SentinelIQ

## 1. Project Overview

SentinelIQ is a fraud and risk intelligence platform for financial workflows.
It provides real-time risk scoring, security monitoring, and investigation support.
The project includes a FastAPI backend, PostgreSQL, Redis, and role-based dashboards.

## 2. System Startup Commands

```bash
# Build images and start all Docker services
docker compose up --build

# Start all services in detached mode (optional)
docker compose up -d

# Stop and remove running containers
docker compose down
```

## 3. Service Access URLs

- Welcome Page -> http://localhost:5000
- Admin Dashboard -> http://localhost:3000
- Analyst Dashboard -> http://localhost:4100
- Viewer Dashboard -> http://localhost:4000
- Backend API -> http://localhost:8000
- API Docs (Swagger) -> http://localhost:8000/docs

## 4. Database Access (PostgreSQL)

```bash
# Open a PostgreSQL shell inside the running Postgres container
docker exec -it sentineliq_postgres psql -U sentineliq -d sentineliq
```

```bash
# Connect with local psql client (if installed locally)
psql -h localhost -p 5432 -U sentineliq -d sentineliq
```

## 5. PostgreSQL Commands (Essential Only)

```sql
-- List all tables in the current schema
\dt

-- Describe table structure (columns, types, indexes)
\d table_name

-- View sample rows from a table
SELECT * FROM table_name LIMIT 10;

-- List all databases
\l

-- Switch to a different database
\c database_name

-- Exit psql
\q
```

## 6. Important Ports

- 5000 -> Welcome Page
- 3000 -> Admin Dashboard
- 4100 -> Analyst Dashboard
- 4000 -> Viewer Dashboard
- 8000 -> Backend API
- 5432 -> PostgreSQL

## 7. Useful Development Commands

```bash
# Show running containers
docker ps

# Show logs for a specific container
docker logs sentineliq_api

# Follow logs in real time for a specific container
docker logs -f sentineliq_api

# Restart all services after changes
docker compose up --build
```

```bash
# Start Welcome frontend (port 5000)
cd frontend/welcome
npm install
npm run dev

# Start Admin frontend (port 3000)
cd frontend
npm install
npm run dev

# Start Analyst frontend (port 4100)
cd frontend/analystdashboard
npm install
npm run dev

# Start Viewer frontend (port 4000)
cd frontend/userdashboard
npm install
npm run dev
```
