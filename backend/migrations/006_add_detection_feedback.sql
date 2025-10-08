-- ============================================================================
-- Migration 006: Detection Feedback System for Reinforcement Learning
-- Purpose: Enable user feedback on AI detections to improve accuracy over time
-- Date: 2025-10-08
-- Implementation: Reinforcement Learning Foundation
-- ============================================================================

-- ============================================================================
-- TABLE: detection_feedback
-- Purpose: Store user feedback on AI detections for reinforcement learning
-- Multi-tenant: Isolated by organization_id
-- Security: RLS policies enforce organizational boundaries
-- ============================================================================

CREATE TABLE IF NOT EXISTS detection_feedback (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Detection reference
  -- NOTE: detection_id is stored as VARCHAR to support multiple detection sources:
  --   - discovered_automations.id (UUID as string)
  --   - External detection system IDs
  --   - Cross-platform correlation IDs
  -- No FK constraint to allow flexible detection sources
  detection_id VARCHAR(255) NOT NULL,

  -- Feedback classification
  -- true_positive: User confirms this IS a shadow AI/unauthorized automation
  -- false_positive: User confirms this is NOT a shadow AI (legitimate tool)
  -- false_negative: User reports a MISSED detection (not found by system)
  -- uncertain: User is unsure or needs more investigation
  feedback_type VARCHAR(50) NOT NULL
    CHECK (feedback_type IN ('true_positive', 'false_positive', 'false_negative', 'uncertain')),

  -- Multi-tenant isolation (Clerk-based)
  user_id VARCHAR(255) NOT NULL,  -- Clerk user ID (e.g., user_2xxx...)
  organization_id VARCHAR(255) NOT NULL,  -- Clerk organization ID (e.g., org_2xxx...)

  -- User context and explanation
  comment TEXT,  -- Optional user explanation for the feedback

  -- Extensible metadata for ML features
  -- Examples:
  -- - User role/permissions at time of feedback
  -- - Detection confidence score when feedback was given
  -- - UI context (which view/filter was active)
  -- - Device/browser information
  -- - Time since detection was first shown to user
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  -- One feedback per user per detection (users can update their feedback)
  CONSTRAINT unique_feedback_per_user_detection UNIQUE (detection_id, user_id)
);

-- ============================================================================
-- INDEXES - Performance Optimization
-- ============================================================================

-- Primary lookup: Get all feedback for a specific detection
-- Use case: Display feedback summary on detection detail page
CREATE INDEX IF NOT EXISTS idx_detection_feedback_detection_id
  ON detection_feedback(detection_id);

-- Time-series queries per organization
-- Use case: "Show me all feedback from last 30 days for my org"
-- Use case: Trend analysis of feedback patterns over time
CREATE INDEX IF NOT EXISTS idx_detection_feedback_org_created
  ON detection_feedback(organization_id, created_at DESC);

-- Aggregate statistics per organization
-- Use case: "How many false positives vs true positives this month?"
-- Use case: Dashboard metrics and ML training data selection
CREATE INDEX IF NOT EXISTS idx_detection_feedback_org_type
  ON detection_feedback(organization_id, feedback_type);

-- User activity tracking
-- Use case: "Show me all feedback submitted by this user"
-- Use case: User contribution analytics
CREATE INDEX IF NOT EXISTS idx_detection_feedback_user_id
  ON detection_feedback(user_id, created_at DESC);

-- JSONB metadata queries
-- Use case: Query feedback by metadata properties (e.g., role, confidence_score)
-- GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_detection_feedback_metadata
  ON detection_feedback USING gin(metadata);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Multi-tenant Isolation
-- ============================================================================

-- Enable RLS to enforce multi-tenant isolation
ALTER TABLE detection_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see feedback from their organization
-- Relies on application setting 'app.current_organization_id' session variable
-- Backend MUST call: SET LOCAL app.current_organization_id = 'org_2xxx...'
-- before queries in each request
CREATE POLICY detection_feedback_org_isolation ON detection_feedback
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true));

-- Policy: Users can only insert feedback for their organization
CREATE POLICY detection_feedback_org_insert ON detection_feedback
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

-- Policy: Users can only update their own feedback within their organization
CREATE POLICY detection_feedback_org_update ON detection_feedback
  FOR UPDATE
  USING (
    organization_id = current_setting('app.current_organization_id', true)
    AND user_id = current_setting('app.current_user_id', true)
  );

-- Policy: Users can only delete their own feedback within their organization
CREATE POLICY detection_feedback_org_delete ON detection_feedback
  FOR DELETE
  USING (
    organization_id = current_setting('app.current_organization_id', true)
    AND user_id = current_setting('app.current_user_id', true)
  );

-- ============================================================================
-- TRIGGERS - Auto-update Timestamps
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_detection_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call update function before each row update
CREATE TRIGGER detection_feedback_updated_at
  BEFORE UPDATE ON detection_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_detection_feedback_updated_at();

-- ============================================================================
-- COMMENTS - Documentation
-- ============================================================================

COMMENT ON TABLE detection_feedback IS
  'User feedback on AI detections for reinforcement learning. Enables continuous improvement of detection accuracy through user corrections.';

COMMENT ON COLUMN detection_feedback.detection_id IS
  'Reference to detection (supports UUID strings and external IDs). No FK to allow flexible detection sources.';

COMMENT ON COLUMN detection_feedback.feedback_type IS
  'Classification: true_positive (confirmed threat), false_positive (legitimate), false_negative (missed), uncertain (needs review)';

COMMENT ON COLUMN detection_feedback.user_id IS
  'Clerk user ID who submitted feedback (format: user_2xxx...)';

COMMENT ON COLUMN detection_feedback.organization_id IS
  'Clerk organization ID for multi-tenant isolation (format: org_2xxx...)';

COMMENT ON COLUMN detection_feedback.metadata IS
  'Extensible JSONB for ML features: user_role, confidence_score, ui_context, device_info, time_to_feedback, etc.';

COMMENT ON CONSTRAINT unique_feedback_per_user_detection ON detection_feedback IS
  'Ensures one feedback per user per detection. Users can update (via UPDATE) but not create duplicates.';

-- ============================================================================
-- TESTING EXAMPLES
-- ============================================================================

-- Example 1: Insert feedback (true positive confirmation)
-- SET LOCAL app.current_organization_id = 'org_2NUll8KqFKEpZtwGP6oN7EuSMuG';
-- SET LOCAL app.current_user_id = 'user_2NUllHtAOEbKqAQJMZoZ2JkJQ5h';
--
-- INSERT INTO detection_feedback
--   (detection_id, feedback_type, user_id, organization_id, comment, metadata)
-- VALUES
--   (
--     'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--     'true_positive',
--     'user_2NUllHtAOEbKqAQJMZoZ2JkJQ5h',
--     'org_2NUll8KqFKEpZtwGP6oN7EuSMuG',
--     'This is definitely an unauthorized ChatGPT integration accessing our Slack channels',
--     '{"confidence_score": 0.85, "user_role": "security_admin", "time_to_feedback_seconds": 45}'::jsonb
--   );

-- Example 2: Query feedback for a specific detection
-- SELECT
--   feedback_type,
--   COUNT(*) as count,
--   AVG((metadata->>'confidence_score')::float) as avg_confidence
-- FROM detection_feedback
-- WHERE detection_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- GROUP BY feedback_type;

-- Example 3: Aggregate statistics for organization (last 30 days)
-- SET LOCAL app.current_organization_id = 'org_2NUll8KqFKEpZtwGP6oN7EuSMuG';
--
-- SELECT
--   feedback_type,
--   COUNT(*) as total_count,
--   COUNT(DISTINCT user_id) as unique_users,
--   COUNT(DISTINCT detection_id) as unique_detections
-- FROM detection_feedback
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY feedback_type
-- ORDER BY total_count DESC;

-- Example 4: Find detections with conflicting feedback (for review)
-- WITH feedback_summary AS (
--   SELECT
--     detection_id,
--     COUNT(DISTINCT feedback_type) as feedback_type_count,
--     array_agg(DISTINCT feedback_type) as feedback_types,
--     COUNT(*) as total_feedback
--   FROM detection_feedback
--   GROUP BY detection_id
-- )
-- SELECT *
-- FROM feedback_summary
-- WHERE feedback_type_count > 1  -- Multiple different feedback types
-- ORDER BY total_feedback DESC;

-- Example 5: Update existing feedback (user changes their mind)
-- SET LOCAL app.current_organization_id = 'org_2NUll8KqFKEpZtwGP6oN7EuSMuG';
-- SET LOCAL app.current_user_id = 'user_2NUllHtAOEbKqAQJMZoZ2JkJQ5h';
--
-- UPDATE detection_feedback
-- SET
--   feedback_type = 'false_positive',
--   comment = 'After investigation, this is a legitimate business tool approved by IT',
--   metadata = metadata || '{"reviewed_by": "IT_team", "approved": true}'::jsonb
-- WHERE detection_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
--   AND user_id = 'user_2NUllHtAOEbKqAQJMZoZ2JkJQ5h';

-- ============================================================================
-- PERFORMANCE VERIFICATION
-- ============================================================================

-- Test 1: Verify index usage for detection lookup
-- EXPLAIN ANALYZE
-- SELECT * FROM detection_feedback
-- WHERE detection_id = 'test-id';
-- Expected: Index Scan using idx_detection_feedback_detection_id

-- Test 2: Verify index usage for time-series query
-- EXPLAIN ANALYZE
-- SELECT * FROM detection_feedback
-- WHERE organization_id = 'org_2xxx'
--   AND created_at > NOW() - INTERVAL '30 days'
-- ORDER BY created_at DESC;
-- Expected: Index Scan using idx_detection_feedback_org_created

-- Test 3: Verify JSONB index usage
-- EXPLAIN ANALYZE
-- SELECT * FROM detection_feedback
-- WHERE metadata @> '{"user_role": "security_admin"}'::jsonb;
-- Expected: Bitmap Index Scan using idx_detection_feedback_metadata

-- ============================================================================
-- RLS POLICY VERIFICATION
-- ============================================================================

-- Test 1: Verify organizational isolation
-- SET LOCAL app.current_organization_id = 'org_A';
-- INSERT INTO detection_feedback (detection_id, feedback_type, user_id, organization_id)
-- VALUES ('det-1', 'true_positive', 'user-1', 'org_A');
--
-- SET LOCAL app.current_organization_id = 'org_B';
-- SELECT * FROM detection_feedback WHERE detection_id = 'det-1';
-- Expected: 0 rows (org_B cannot see org_A's feedback)

-- Test 2: Verify user can only update own feedback
-- SET LOCAL app.current_organization_id = 'org_A';
-- SET LOCAL app.current_user_id = 'user-2';
-- UPDATE detection_feedback
-- SET feedback_type = 'uncertain'
-- WHERE detection_id = 'det-1' AND user_id = 'user-1';
-- Expected: 0 rows updated (user-2 cannot update user-1's feedback)

-- ============================================================================
-- MIGRATION VALIDATION
-- ============================================================================

-- Verify table created successfully
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'detection_feedback'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE 'SUCCESS: detection_feedback table created';
  ELSE
    RAISE EXCEPTION 'FAILED: detection_feedback table not created';
  END IF;
END $$;

-- Verify indexes created successfully
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'detection_feedback';

  RAISE NOTICE 'Indexes created: %', index_count;

  IF index_count >= 5 THEN
    RAISE NOTICE 'SUCCESS: All indexes created';
  ELSE
    RAISE WARNING 'WARNING: Expected 5+ indexes, found %', index_count;
  END IF;
END $$;

-- Verify RLS enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'detection_feedback';

  IF rls_enabled THEN
    RAISE NOTICE 'SUCCESS: RLS enabled on detection_feedback';
  ELSE
    RAISE EXCEPTION 'FAILED: RLS not enabled on detection_feedback';
  END IF;
END $$;

-- Verify policies created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'detection_feedback';

  RAISE NOTICE 'RLS policies created: %', policy_count;

  IF policy_count >= 4 THEN
    RAISE NOTICE 'SUCCESS: All RLS policies created';
  ELSE
    RAISE WARNING 'WARNING: Expected 4 RLS policies, found %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- END MIGRATION 006
-- ============================================================================
