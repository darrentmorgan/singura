-- ============================================================================
-- Migration: FINAL Complete Clerk Integration - Convert ALL UUIDs to VARCHAR(255)
-- Purpose: Enable Clerk authentication with string-based organization/connection IDs
-- Date: 2025-10-04
-- ============================================================================
-- Scope:
--   1. organizations.id: UUID -> VARCHAR(255)
--   2. ALL organization_id columns: UUID -> VARCHAR(255)
--   3. platform_connections.id: UUID -> VARCHAR(255) (already done)
--   4. ALL platform_connection_id columns: UUID -> VARCHAR(255) (already done)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Drop ALL FK constraints referencing organizations.id
-- ============================================================================

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_organization_id_fkey;

ALTER TABLE automation_activities
    DROP CONSTRAINT IF EXISTS automation_activities_organization_id_fkey;

ALTER TABLE compliance_mappings
    DROP CONSTRAINT IF EXISTS compliance_mappings_organization_id_fkey;

ALTER TABLE cross_platform_integrations
    DROP CONSTRAINT IF EXISTS cross_platform_integrations_organization_id_fkey;

ALTER TABLE discovered_automations
    DROP CONSTRAINT IF EXISTS discovered_automations_organization_id_fkey;

ALTER TABLE discovery_runs
    DROP CONSTRAINT IF EXISTS discovery_runs_organization_id_fkey;

ALTER TABLE risk_assessments
    DROP CONSTRAINT IF EXISTS risk_assessments_organization_id_fkey;

-- Also drop FK from platform_connections if it exists
ALTER TABLE platform_connections
    DROP CONSTRAINT IF EXISTS platform_connections_organization_id_fkey;

-- ============================================================================
-- PART 2: Convert organizations.id from UUID to VARCHAR(255)
-- ============================================================================

ALTER TABLE organizations
    ALTER COLUMN id TYPE VARCHAR(255) USING id::text;

-- ============================================================================
-- PART 3: Convert ALL organization_id columns from UUID to VARCHAR(255)
-- ============================================================================

ALTER TABLE audit_logs
    ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

ALTER TABLE automation_activities
    ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

ALTER TABLE compliance_mappings
    ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

ALTER TABLE cross_platform_integrations
    ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

ALTER TABLE discovered_automations
    ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

ALTER TABLE discovery_runs
    ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

ALTER TABLE risk_assessments
    ALTER COLUMN organization_id TYPE VARCHAR(255) USING organization_id::text;

-- platform_connections.organization_id was already VARCHAR(255) from previous migration

-- ============================================================================
-- PART 4: Recreate ALL FK constraints with ON DELETE CASCADE
-- ============================================================================

ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

ALTER TABLE automation_activities
    ADD CONSTRAINT automation_activities_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

ALTER TABLE compliance_mappings
    ADD CONSTRAINT compliance_mappings_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

ALTER TABLE cross_platform_integrations
    ADD CONSTRAINT cross_platform_integrations_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

ALTER TABLE discovered_automations
    ADD CONSTRAINT discovered_automations_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

ALTER TABLE discovery_runs
    ADD CONSTRAINT discovery_runs_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

ALTER TABLE risk_assessments
    ADD CONSTRAINT risk_assessments_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

ALTER TABLE platform_connections
    ADD CONSTRAINT platform_connections_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify organizations.id is now VARCHAR(255)
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'organizations'
    AND column_name = 'id';

-- Verify ALL organization_id columns are now VARCHAR(255)
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE column_name = 'organization_id'
ORDER BY table_name;

-- Verify all FK constraints on organization_id were recreated with CASCADE
SELECT
    tc.table_name,
    kcu.column_name,
    rc.delete_rule,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'organization_id'
ORDER BY tc.table_name;

-- Summary: Show all critical Clerk-compatible columns
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE (table_name = 'organizations' AND column_name = 'id')
    OR (table_name = 'platform_connections' AND column_name IN ('id', 'organization_id'))
    OR column_name IN ('organization_id', 'platform_connection_id')
ORDER BY table_name, column_name;
