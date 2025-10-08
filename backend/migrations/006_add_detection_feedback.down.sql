-- ============================================================================
-- Migration 006 ROLLBACK: Remove Detection Feedback System
-- Purpose: Rollback detection feedback table and related objects
-- Date: 2025-10-08
-- WARNING: This will permanently delete all user feedback data
-- ============================================================================

-- Drop RLS policies first (dependent on table)
DROP POLICY IF EXISTS detection_feedback_org_isolation ON detection_feedback;
DROP POLICY IF EXISTS detection_feedback_org_insert ON detection_feedback;
DROP POLICY IF EXISTS detection_feedback_org_update ON detection_feedback;
DROP POLICY IF EXISTS detection_feedback_org_delete ON detection_feedback;

-- Drop triggers (dependent on table and function)
DROP TRIGGER IF EXISTS detection_feedback_updated_at ON detection_feedback;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_detection_feedback_updated_at();

-- Drop indexes (will be automatically dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_detection_feedback_detection_id;
DROP INDEX IF EXISTS idx_detection_feedback_org_created;
DROP INDEX IF EXISTS idx_detection_feedback_org_type;
DROP INDEX IF EXISTS idx_detection_feedback_user_id;
DROP INDEX IF EXISTS idx_detection_feedback_metadata;

-- Drop the main table (CASCADE to handle any unexpected dependencies)
DROP TABLE IF EXISTS detection_feedback CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table dropped successfully
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'detection_feedback'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE 'SUCCESS: detection_feedback table dropped';
  ELSE
    RAISE EXCEPTION 'FAILED: detection_feedback table still exists';
  END IF;
END $$;

-- Verify function dropped successfully
DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'update_detection_feedback_updated_at'
  ) INTO function_exists;

  IF NOT function_exists THEN
    RAISE NOTICE 'SUCCESS: update_detection_feedback_updated_at function dropped';
  ELSE
    RAISE WARNING 'WARNING: update_detection_feedback_updated_at function still exists';
  END IF;
END $$;

-- ============================================================================
-- END ROLLBACK MIGRATION 006
-- ============================================================================
