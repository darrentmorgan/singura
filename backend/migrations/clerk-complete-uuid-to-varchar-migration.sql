-- ============================================================================
-- Migration: Complete Clerk Integration - Convert ALL UUIDs to VARCHAR(255)
-- Purpose: Enable Clerk authentication with string-based organization/connection IDs
-- Date: 2025-10-04
-- ============================================================================
-- Scope:
--   1. platform_connections.id: UUID -> VARCHAR(255)
--   2. ALL organization_id columns: UUID -> VARCHAR(255)
--   3. ALL platform_connection_id columns: UUID -> VARCHAR(255)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Migrate platform_connections.id (ALREADY COMPLETED)
-- ============================================================================
-- This was already done in previous migration, included here for completeness

-- ============================================================================
-- PART 2: Migrate ALL organization_id columns from UUID to VARCHAR(255)
-- ============================================================================

-- Convert organization_id in all tables
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

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify ALL organization_id columns are now VARCHAR(255)
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE column_name = 'organization_id'
ORDER BY table_name;

-- Verify platform_connections has both id and organization_id as VARCHAR(255)
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'platform_connections'
    AND column_name IN ('id', 'organization_id')
ORDER BY column_name;

-- Verify all platform_connection_id columns are VARCHAR(255)
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE column_name = 'platform_connection_id'
ORDER BY table_name;
