-- ============================================================================
-- Migration: Convert platform_connections.id from UUID to VARCHAR(255)
-- Purpose: Enable Clerk authentication with string-based organization/connection IDs
-- Date: 2025-10-04
-- ============================================================================

BEGIN;

-- Step 1: Drop ALL foreign key constraints that reference platform_connections.id
-- ============================================================================
ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_platform_connection_id_fkey;

ALTER TABLE automation_activities
    DROP CONSTRAINT IF EXISTS automation_activities_platform_connection_id_fkey;

ALTER TABLE discovered_automations
    DROP CONSTRAINT IF EXISTS discovered_automations_platform_connection_id_fkey;

ALTER TABLE discovery_runs
    DROP CONSTRAINT IF EXISTS discovery_runs_platform_connection_id_fkey;

ALTER TABLE encrypted_credentials
    DROP CONSTRAINT IF EXISTS encrypted_credentials_platform_connection_id_fkey;

-- Step 2: Convert platform_connections.id from UUID to VARCHAR(255)
-- ============================================================================
ALTER TABLE platform_connections
    ALTER COLUMN id TYPE VARCHAR(255) USING id::text;

-- Step 3: Convert all foreign key columns from UUID to VARCHAR(255)
-- ============================================================================
ALTER TABLE audit_logs
    ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;

ALTER TABLE automation_activities
    ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;

ALTER TABLE discovered_automations
    ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;

ALTER TABLE discovery_runs
    ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;

ALTER TABLE encrypted_credentials
    ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;

-- Step 4: Recreate all foreign key constraints with ON DELETE CASCADE
-- ============================================================================
ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id)
    REFERENCES platform_connections(id)
    ON DELETE CASCADE;

ALTER TABLE automation_activities
    ADD CONSTRAINT automation_activities_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id)
    REFERENCES platform_connections(id)
    ON DELETE CASCADE;

ALTER TABLE discovered_automations
    ADD CONSTRAINT discovered_automations_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id)
    REFERENCES platform_connections(id)
    ON DELETE CASCADE;

ALTER TABLE discovery_runs
    ADD CONSTRAINT discovery_runs_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id)
    REFERENCES platform_connections(id)
    ON DELETE CASCADE;

ALTER TABLE encrypted_credentials
    ADD CONSTRAINT encrypted_credentials_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id)
    REFERENCES platform_connections(id)
    ON DELETE CASCADE;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify platform_connections.id is now VARCHAR(255)
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'platform_connections'
    AND column_name IN ('id', 'organization_id');

-- Verify all FK columns are now VARCHAR(255)
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('audit_logs', 'automation_activities', 'discovered_automations', 'discovery_runs', 'encrypted_credentials')
    AND column_name = 'platform_connection_id'
ORDER BY table_name;

-- Verify all FK constraints were recreated
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'platform_connections'
    AND ccu.column_name = 'id'
ORDER BY tc.table_name;
