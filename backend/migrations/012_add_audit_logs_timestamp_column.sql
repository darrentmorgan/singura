-- ============================================================================
-- Add timestamp column to audit_logs table
-- Version: 012
-- Created: 2025-10-28
-- Description: Add separate timestamp column for audit event time, distinct
--              from created_at which tracks row creation. This aligns with
--              compliance requirements for accurate audit event timestamps.
-- ============================================================================

-- Add timestamp column for audit event time (defaults to NOW for existing rows)
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add missing columns from spec (if they don't exist)
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'low';

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS correlation_id UUID;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS action VARCHAR(100);

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);

-- Partial index for critical events
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent_critical ON audit_logs(timestamp DESC)
  WHERE severity IN ('high', 'critical');

-- Update existing rows: copy created_at to timestamp for historical accuracy
UPDATE audit_logs SET timestamp = created_at WHERE timestamp IS NULL;

-- Create a function to automatically delete old audit logs (retention: 90 days)
CREATE OR REPLACE FUNCTION delete_old_audit_logs() RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a view for recent security events
CREATE OR REPLACE VIEW recent_security_events AS
SELECT
  id,
  timestamp,
  user_id,
  organization_id,
  event_type,
  action,
  resource_type,
  resource_id,
  severity,
  category,
  ip_address,
  metadata,
  event_data
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND severity IN ('medium', 'high', 'critical')
ORDER BY timestamp DESC;

-- Create a materialized view for audit metrics (refresh every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_metrics AS
SELECT
  organization_id,
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT actor_id) as unique_actors,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
  COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events,
  COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_events,
  COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_events,
  COUNT(CASE WHEN category = 'auth' OR event_category = 'auth' THEN 1 END) as auth_events,
  COUNT(CASE WHEN category = 'connection' OR event_category = 'connection' THEN 1 END) as connection_events,
  COUNT(CASE WHEN category = 'security' OR event_category = 'security' THEN 1 END) as security_events,
  COUNT(CASE WHEN category = 'admin' OR event_category = 'admin' THEN 1 END) as admin_events
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY organization_id, DATE_TRUNC('hour', timestamp);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_audit_metrics_org_hour ON audit_metrics(organization_id, hour DESC);

-- Grant appropriate permissions (idempotent)
GRANT SELECT, INSERT ON audit_logs TO PUBLIC;
GRANT SELECT ON recent_security_events TO PUBLIC;
GRANT SELECT ON audit_metrics TO PUBLIC;

-- Add comment to document the dual timestamp columns
COMMENT ON COLUMN audit_logs.timestamp IS 'Audit event timestamp - when the audited action occurred';
COMMENT ON COLUMN audit_logs.created_at IS 'Row creation timestamp - when the audit log entry was created';
