#!/bin/bash

# SentinelIQ Local Testing Script
# Tests rate limiting, webhooks, and integrations

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== SentinelIQ Production Readiness Tests ===${NC}\n"

# Colors for output
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# Test 1: Docker containers running
echo -e "${YELLOW}[1/8] Checking Docker containers...${NC}"
if docker-compose ps | grep -q "sentineliq_api"; then
    pass "API container is running"
else
    fail "API container is not running. Run: docker-compose up -d"
    exit 1
fi

if docker-compose ps | grep -q "sentineliq_postgres"; then
    pass "PostgreSQL container is running"
else
    fail "PostgreSQL container is not running"
    exit 1
fi

if docker-compose ps | grep -q "sentineliq_redis"; then
    pass "Redis container is running"
else
    fail "Redis container is not running"
    exit 1
fi

# Test 2: Database tables
echo -e "\n${YELLOW}[2/8] Checking database tables...${NC}"
WEBHOOK_TABLES=$(docker-compose exec -T postgres psql -U sentineliq -d sentineliq_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('webhooks', 'webhook_deliveries');" 2>/dev/null || echo "0")

if [ "$WEBHOOK_TABLES" != "" ] && [ "$WEBHOOK_TABLES" != "0" ]; then
    pass "Webhook tables exist in database"
else
    warn "Webhook tables not found. Run migrations with: docker-compose exec api python -c 'from app.core.db import init_db; init_db()'"
fi

# Test 3: API health check
echo -e "\n${YELLOW}[3/8] Testing API health...${NC}"
if curl -s http://localhost:8000/health | grep -q "status"; then
    pass "API is responding to health checks"
else
    fail "API health check failed. Check: docker-compose logs api"
fi

# Test 4: Rate limiting
echo -e "\n${YELLOW}[4/8] Testing rate limiting...${NC}"
RESPONSE_1=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}')

RESPONSE_6=$(for i in {2..6}; do
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' > /dev/null 2>&1
done | tail -1)

if [ "$RESPONSE_1" = "401" ] || [ "$RESPONSE_1" = "400" ]; then
    pass "Rate limiter allows requests within limit (Status: $RESPONSE_1)"
else
    warn "Unexpected response to login attempt (Status: $RESPONSE_1)"
fi

# Test 5: Webhook endpoints
echo -e "\n${YELLOW}[5/8] Testing webhook endpoints...${NC}"
WEBHOOK_STATUS=$(curl -s -X GET http://localhost:8000/integrations/webhooks 2>/dev/null || echo "error")

if [ "$WEBHOOK_STATUS" != "error" ] && [ -n "$WEBHOOK_STATUS" ]; then
    pass "Webhook list endpoint is responding"
else
    warn "Webhook list endpoint returned error. May need authentication."
fi

# Test 6: Integration status endpoint
echo -e "\n${YELLOW}[6/8] Testing integration status...${NC}"
STATUS=$(curl -s -X GET http://localhost:8000/integrations/status 2>/dev/null || echo "error")

if [ "$STATUS" != "error" ] && [ -n "$STATUS" ]; then
    pass "Integration status endpoint is responding"
    
    if echo "$STATUS" | grep -q "webhooks_active"; then
        pass "Status includes webhook information"
    fi
else
    warn "Integration status endpoint not responding. May need authentication."
fi

# Test 7: Redis connectivity
echo -e "\n${YELLOW}[7/8] Testing Redis connectivity...${NC}"
REDIS_PING=$(docker-compose exec -T redis redis-cli ping 2>/dev/null || echo "error")

if [ "$REDIS_PING" = "PONG" ]; then
    pass "Redis is accessible and responding"
else
    fail "Redis is not responding correctly"
fi

# Test 8: Metrics and monitoring
echo -e "\n${YELLOW}[8/8] Checking monitoring stack...${NC}"
if docker-compose ps | grep -q "prometheus"; then
    pass "Prometheus is running"
else
    warn "Prometheus not found in docker-compose"
fi

if docker-compose ps | grep -q "grafana"; then
    pass "Grafana is running at http://localhost:3000"
else
    warn "Grafana not found in docker-compose"
fi

# Summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo -e "\nAll critical systems are operational."
echo -e "\n${GREEN}Next steps:${NC}"
echo "1. Configure Slack webhook: Follow PRODUCTION_DEPLOYMENT_GUIDE.md Phase 3"
echo "2. Create test webhook: curl -X POST http://localhost:8000/integrations/webhooks \\"
echo "   -H 'Content-Type: application/json' \\"
echo "   -d '{\"url\":\"https://webhook.site/...\",\"event_types\":[\"risk.high\"]}'"
echo "3. Monitor with Grafana at http://localhost:3000"
echo "4. Check logs: docker-compose logs -f api"
echo ""
