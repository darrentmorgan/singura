-- ============================================================================
-- Migration Tracking Table
-- Purpose: Track which migrations have been applied to prevent duplicate runs
-- Date: 2025-10-06
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

-- Record this migration
INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
VALUES ('000_create_migration_table', 0, true)
ON CONFLICT (migration_name) DO NOTHING;

COMMENT ON TABLE schema_migrations IS 'Tracks database migration history';
COMMENT ON COLUMN schema_migrations.migration_name IS 'Unique name of the migration file';
COMMENT ON COLUMN schema_migrations.checksum IS 'SHA-256 checksum of migration file (for verification)';
