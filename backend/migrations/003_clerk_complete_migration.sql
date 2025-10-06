-- ============================================================================
-- Migration 003: Complete Clerk Integration - UUID to VARCHAR Migration
-- Purpose: Convert ALL UUID columns to VARCHAR(255) for Clerk compatibility
-- Date: 2025-10-06
-- ============================================================================
-- This migration converts:
--   1. organizations.id: UUID -> VARCHAR(255)
--   2. platform_connections.id: UUID -> VARCHAR(255)
--   3. ALL organization_id columns: UUID -> VARCHAR(255)
--   4. ALL platform_connection_id columns: UUID -> VARCHAR(255)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop ALL foreign key constraints (must be done first)
-- ============================================================================

-- Drop FK constraints referencing organizations.id
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_organization_id_fkey;
ALTER TABLE automation_activities DROP CONSTRAINT IF EXISTS automation_activities_organization_id_fkey;
ALTER TABLE compliance_mappings DROP CONSTRAINT IF EXISTS compliance_mappings_organization_id_fkey;
ALTER TABLE cross_platform_integrations DROP CONSTRAINT IF EXISTS cross_platform_integrations_organization_id_fkey;
ALTER TABLE discovered_automations DROP CONSTRAINT IF EXISTS discovered_automations_organization_id_fkey;
ALTER TABLE discovery_runs DROP CONSTRAINT IF EXISTS discovery_runs_organization_id_fkey;
ALTER TABLE risk_assessments DROP CONSTRAINT IF EXISTS risk_assessments_organization_id_fkey;
ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_organization_id_fkey;

-- Drop FK constraints referencing platform_connections.id
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_platform_connection_id_fkey;
ALTER TABLE automation_activities DROP CONSTRAINT IF EXISTS automation_activities_platform_connection_id_fkey;
ALTER TABLE discovered_automations DROP CONSTRAINT IF EXISTS discovered_automations_platform_connection_id_fkey;
ALTER TABLE discovery_runs DROP CONSTRAINT IF EXISTS discovery_runs_platform_connection_id_fkey;
ALTER TABLE encrypted_credentials DROP CONSTRAINT IF EXISTS encrypted_credentials_platform_connection_id_fkey;

-- ============================================================================
-- STEP 2: Convert PRIMARY KEY columns to VARCHAR(255)
-- ============================================================================

-- Convert organizations.id (referenced by many tables)
ALTER TABLE organizations ALTER COLUMN id TYPE VARCHAR(255) USING id::text;

-- Convert platform_connections.id (referenced by many tables)
ALTER TABLE platform_connections ALTER COLUMN id TYPE VARCHAR(255) USING id::text;

-- ============================================================================
-- STEP 3: Convert ALL organization_id foreign key columns
-- ============================================================================

ALTER TABLE platform_connections ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;
ALTER TABLE audit_logs ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;
ALTER TABLE automation_activities ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;
ALTER TABLE compliance_mappings ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;
ALTER TABLE cross_platform_integrations ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;
ALTER TABLE discovered_automations ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;
ALTER TABLE discovery_runs ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;
ALTER TABLE risk_assessments ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

-- ============================================================================
-- STEP 4: Convert ALL platform_connection_id foreign key columns
-- ============================================================================

ALTER TABLE audit_logs ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;
ALTER TABLE automation_activities ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;
ALTER TABLE discovered_automations ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;
ALTER TABLE discovery_runs ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;
ALTER TABLE encrypted_credentials ALTER COLUMN platform_connection_id TYPE VARCHAR(255) USING platform_connection_id::text;

-- ============================================================================
-- STEP 5: Recreate ALL foreign key constraints with CASCADE
-- ============================================================================

-- FK constraints referencing organizations.id
ALTER TABLE platform_connections
    ADD CONSTRAINT platform_connections_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE automation_activities
    ADD CONSTRAINT automation_activities_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE compliance_mappings
    ADD CONSTRAINT compliance_mappings_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE cross_platform_integrations
    ADD CONSTRAINT cross_platform_integrations_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE discovered_automations
    ADD CONSTRAINT discovered_automations_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE discovery_runs
    ADD CONSTRAINT discovery_runs_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE risk_assessments
    ADD CONSTRAINT risk_assessments_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- FK constraints referencing platform_connections.id
ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id) REFERENCES platform_connections(id) ON DELETE SET NULL;

ALTER TABLE automation_activities
    ADD CONSTRAINT automation_activities_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id) REFERENCES platform_connections(id) ON DELETE CASCADE;

ALTER TABLE discovered_automations
    ADD CONSTRAINT discovered_automations_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id) REFERENCES platform_connections(id) ON DELETE CASCADE;

ALTER TABLE discovery_runs
    ADD CONSTRAINT discovery_runs_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id) REFERENCES platform_connections(id) ON DELETE CASCADE;

ALTER TABLE encrypted_credentials
    ADD CONSTRAINT encrypted_credentials_platform_connection_id_fkey
    FOREIGN KEY (platform_connection_id) REFERENCES platform_connections(id) ON DELETE CASCADE;

COMMIT;

-- ============================================================================
-- Verification (run after COMMIT)
-- ============================================================================
SELECT 'Migration 003 completed successfully!' as status;

-- Verify critical columns are now VARCHAR(255)
SELECT table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE (table_name = 'organizations' AND column_name = 'id')
   OR (table_name = 'platform_connections' AND column_name IN ('id', 'organization_id'))
ORDER BY table_name, column_name;
