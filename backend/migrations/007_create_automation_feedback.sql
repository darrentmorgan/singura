/**
 * Migration 007: Create Automation Feedback System
 *
 * Purpose: User feedback capture for detection accuracy and ML training
 * Phase 2: Feedback System
 *
 * Features:
 * - Thumbs up/down feedback mechanism
 * - Automation state snapshots for ML training
 * - Detection accuracy tracking
 * - ML training data preparation
 */

-- ==============================================
-- 1. Create automation_feedback table
-- ==============================================

CREATE TABLE IF NOT EXISTS automation_feedback (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    automation_id UUID NOT NULL REFERENCES discovered_automations(id) ON DELETE CASCADE,
    organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- User information
    user_id VARCHAR(255) NOT NULL, -- Clerk user ID
    user_email VARCHAR(255) NOT NULL,

    -- Feedback classification
    feedback_type VARCHAR(50) NOT NULL CHECK (
        feedback_type IN (
            'correct_detection',
            'false_positive',
            'false_negative',
            'incorrect_classification',
            'incorrect_risk_score',
            'incorrect_ai_provider'
        )
    ),
    sentiment VARCHAR(20) NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    comment TEXT,

    -- Snapshots for ML training (JSONB for flexibility)
    automation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    detection_snapshot JSONB DEFAULT '{}'::jsonb,

    -- Suggested corrections from user
    suggested_corrections JSONB DEFAULT '{}'::jsonb,

    -- ML training metadata
    ml_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'acknowledged', 'resolved', 'archived')
    ),

    -- Resolution (if addressed)
    resolution JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_resolved_at CHECK (
        (status = 'resolved' AND resolved_at IS NOT NULL) OR
        (status != 'resolved')
    )
);

-- ==============================================
-- 2. Create indexes for efficient queries
-- ==============================================

-- Query by automation
CREATE INDEX idx_automation_feedback_automation_id
ON automation_feedback(automation_id);

-- Query by organization
CREATE INDEX idx_automation_feedback_organization_id
ON automation_feedback(organization_id);

-- Query by user
CREATE INDEX idx_automation_feedback_user_id
ON automation_feedback(user_id);

-- Query by feedback type
CREATE INDEX idx_automation_feedback_feedback_type
ON automation_feedback(feedback_type);

-- Query by sentiment
CREATE INDEX idx_automation_feedback_sentiment
ON automation_feedback(sentiment);

-- Query by status
CREATE INDEX idx_automation_feedback_status
ON automation_feedback(status);

-- Time-based queries
CREATE INDEX idx_automation_feedback_created_at
ON automation_feedback(created_at DESC);

-- ML training queries
CREATE INDEX idx_automation_feedback_ml_training
ON automation_feedback((ml_metadata->>'useForTraining'))
WHERE (ml_metadata->>'useForTraining')::boolean = true;

-- GIN indexes for JSONB queries
CREATE INDEX idx_automation_feedback_automation_snapshot
ON automation_feedback USING gin(automation_snapshot);

CREATE INDEX idx_automation_feedback_detection_snapshot
ON automation_feedback USING gin(detection_snapshot);

CREATE INDEX idx_automation_feedback_ml_metadata
ON automation_feedback USING gin(ml_metadata);

-- ==============================================
-- 3. Create updated_at trigger
-- ==============================================

CREATE OR REPLACE FUNCTION update_automation_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_automation_feedback_updated_at
    BEFORE UPDATE ON automation_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_feedback_updated_at();

-- ==============================================
-- 4. Helper functions for feedback operations
-- ==============================================

/**
 * Acknowledge feedback
 * Sets acknowledged_at timestamp and updates status
 */
CREATE OR REPLACE FUNCTION acknowledge_feedback(
    feedback_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE automation_feedback
    SET status = 'acknowledged',
        acknowledged_at = NOW(),
        updated_at = NOW()
    WHERE id = feedback_id
      AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

/**
 * Resolve feedback
 * Sets resolved_at timestamp and updates status
 */
CREATE OR REPLACE FUNCTION resolve_feedback(
    feedback_id UUID,
    resolution_data JSONB
) RETURNS VOID AS $$
BEGIN
    UPDATE automation_feedback
    SET status = 'resolved',
        resolution = resolution_data,
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = feedback_id
      AND status IN ('pending', 'acknowledged');
END;
$$ LANGUAGE plpgsql;

/**
 * Archive old feedback
 * Archives feedback older than specified days
 */
CREATE OR REPLACE FUNCTION archive_old_feedback(
    days_old INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE automation_feedback
    SET status = 'archived',
        updated_at = NOW()
    WHERE status = 'resolved'
      AND resolved_at < NOW() - (days_old || ' days')::INTERVAL
      AND status != 'archived';

    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

/**
 * Get feedback statistics for organization
 */
CREATE OR REPLACE FUNCTION get_feedback_statistics(
    org_id UUID
) RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'totalFeedback', (
            SELECT COUNT(*)
            FROM automation_feedback
            WHERE organization_id = org_id
        ),
        'bySentiment', (
            SELECT json_build_object(
                'positive', COUNT(*) FILTER (WHERE sentiment = 'positive'),
                'negative', COUNT(*) FILTER (WHERE sentiment = 'negative'),
                'neutral', COUNT(*) FILTER (WHERE sentiment = 'neutral')
            )
            FROM automation_feedback
            WHERE organization_id = org_id
        ),
        'byStatus', (
            SELECT json_build_object(
                'pending', COUNT(*) FILTER (WHERE status = 'pending'),
                'acknowledged', COUNT(*) FILTER (WHERE status = 'acknowledged'),
                'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
                'archived', COUNT(*) FILTER (WHERE status = 'archived')
            )
            FROM automation_feedback
            WHERE organization_id = org_id
        ),
        'detectionAccuracy', (
            SELECT json_build_object(
                'correctDetections', COUNT(*) FILTER (WHERE feedback_type = 'correct_detection'),
                'falsePositives', COUNT(*) FILTER (WHERE feedback_type = 'false_positive'),
                'falseNegatives', COUNT(*) FILTER (WHERE feedback_type = 'false_negative'),
                'accuracyRate', ROUND(
                    (COUNT(*) FILTER (WHERE feedback_type = 'correct_detection')::numeric /
                     NULLIF(COUNT(*), 0)::numeric) * 100,
                    2
                )
            )
            FROM automation_feedback
            WHERE organization_id = org_id
        )
    ) INTO stats;

    RETURN stats;
END;
$$ LANGUAGE plpgsql;

/**
 * Get ML training samples
 * Returns feedback samples marked for ML training
 */
CREATE OR REPLACE FUNCTION get_ml_training_samples(
    org_id UUID DEFAULT NULL,
    sample_limit INTEGER DEFAULT 100
) RETURNS TABLE (
    sample_id UUID,
    features JSONB,
    label JSONB,
    training_weight NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        af.id as sample_id,
        af.ml_metadata->'features' as features,
        af.ml_metadata->'label' as label,
        (af.ml_metadata->>'trainingWeight')::numeric as training_weight,
        af.created_at
    FROM automation_feedback af
    WHERE (org_id IS NULL OR af.organization_id = org_id)
      AND (af.ml_metadata->>'useForTraining')::boolean = true
      AND af.status IN ('acknowledged', 'resolved')
    ORDER BY af.created_at DESC
    LIMIT sample_limit;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 5. Add comments for documentation
-- ==============================================

COMMENT ON TABLE automation_feedback IS
'User feedback on automation detection accuracy for ML training and system improvement';

COMMENT ON COLUMN automation_feedback.automation_snapshot IS
'Complete automation state snapshot at time of feedback for ML training';

COMMENT ON COLUMN automation_feedback.detection_snapshot IS
'Detection metadata snapshot for comparing detection accuracy';

COMMENT ON COLUMN automation_feedback.ml_metadata IS
'ML training metadata including features, labels, and training weights';

COMMENT ON COLUMN automation_feedback.suggested_corrections IS
'User-suggested corrections to improve detection accuracy';

COMMENT ON FUNCTION get_ml_training_samples IS
'Retrieve feedback samples prepared for ML model training';

-- ==============================================
-- 6. Grant permissions (adjust as needed)
-- ==============================================

-- Grant read/write access to application role
-- GRANT SELECT, INSERT, UPDATE, DELETE ON automation_feedback TO app_role;
-- GRANT USAGE ON SEQUENCE automation_feedback_id_seq TO app_role;
