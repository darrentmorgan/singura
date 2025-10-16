-- Create audit_logs table for security and compliance logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity VARCHAR(20) DEFAULT 'low',
  category VARCHAR(50) DEFAULT 'general',
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Compound index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);

-- Partial index for critical events (without time constraint due to immutability requirement)
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent_critical ON audit_logs(timestamp DESC)
  WHERE severity IN ('high', 'critical');

-- Create a function to automatically delete old audit logs (retention: 90 days)
CREATE OR REPLACE FUNCTION delete_old_audit_logs() RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run the cleanup function daily (requires pg_cron extension)
-- Note: Uncomment the following if pg_cron is installed
-- SELECT cron.schedule('delete-old-audit-logs', '0 2 * * *', 'SELECT delete_old_audit_logs();');

-- Create a view for recent security events
CREATE OR REPLACE VIEW recent_security_events AS
SELECT
  id,
  timestamp,
  user_id,
  organization_id,
  action,
  resource_type,
  resource_id,
  severity,
  category,
  ip_address,
  metadata
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
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
  COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events,
  COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_events,
  COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_events,
  COUNT(CASE WHEN category = 'auth' THEN 1 END) as auth_events,
  COUNT(CASE WHEN category = 'connection' THEN 1 END) as connection_events,
  COUNT(CASE WHEN category = 'security' THEN 1 END) as security_events,
  COUNT(CASE WHEN category = 'admin' THEN 1 END) as admin_events
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY organization_id, DATE_TRUNC('hour', timestamp);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_audit_metrics_org_hour ON audit_metrics(organization_id, hour DESC);

-- Grant appropriate permissions
GRANT SELECT, INSERT ON audit_logs TO PUBLIC;
GRANT SELECT ON recent_security_events TO PUBLIC;
GRANT SELECT ON audit_metrics TO PUBLIC;