-- Migration: Create webhook tables
-- Date: 2025-12-31
-- Purpose: Add webhook delivery infrastructure for external integrations

CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR NOT NULL PRIMARY KEY,
    org_id VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    secret_key VARCHAR NOT NULL,
    event_types JSON DEFAULT '[]',
    min_risk_level VARCHAR DEFAULT 'low',
    description VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    last_delivered_at TIMESTAMP,
    last_error VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR NOT NULL PRIMARY KEY,
    webhook_id VARCHAR NOT NULL,
    event_id VARCHAR NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 4,
    status_code INTEGER,
    is_successful BOOLEAN DEFAULT FALSE,
    response_body VARCHAR,
    response_time_ms INTEGER,
    next_retry_at TIMESTAMP,
    last_error_message VARCHAR,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_webhooks_org_id ON webhooks(org_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event_id ON webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);
CREATE INDEX idx_webhook_deliveries_is_successful ON webhook_deliveries(is_successful);
