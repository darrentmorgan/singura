/**
 * Migration: Create Behavioral Baselines Table
 * Purpose: Store organization-specific behavioral patterns for ML anomaly detection
 * Version: 011
 * Date: 2025-10-16
 *
 * Features:
 * - User-specific behavioral statistics
 * - Organization-scoped baselines
 * - JSONB statistics storage for flexibility
 * - Automatic timestamp management
 * - Indexes for performance
 */

-- Create behavioral_baselines table
CREATE TABLE IF NOT EXISTS behavioral_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  training_data_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT behavioral_baselines_user_org_unique UNIQUE (user_id, organization_id),
  CONSTRAINT behavioral_baselines_training_size_positive CHECK (training_data_size >= 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavioral_baselines_user_id
  ON behavioral_baselines(user_id);

CREATE INDEX IF NOT EXISTS idx_behavioral_baselines_organization_id
  ON behavioral_baselines(organization_id);

CREATE INDEX IF NOT EXISTS idx_behavioral_baselines_updated_at
  ON behavioral_baselines(updated_at DESC);

-- GIN index for JSONB stats queries
CREATE INDEX IF NOT EXISTS idx_behavioral_baselines_stats
  ON behavioral_baselines USING GIN (stats);

-- Add table comment
COMMENT ON TABLE behavioral_baselines IS 'Stores learned behavioral baselines for ML-based anomaly detection';

-- Add column comments
COMMENT ON COLUMN behavioral_baselines.id IS 'Primary key UUID';
COMMENT ON COLUMN behavioral_baselines.user_id IS 'User identifier (Clerk user ID)';
COMMENT ON COLUMN behavioral_baselines.organization_id IS 'Organization identifier (Clerk org ID)';
COMMENT ON COLUMN behavioral_baselines.stats IS 'JSONB containing behavioral statistics (meanEventsPerDay, stdDevEventsPerDay, typicalWorkHours, commonActions)';
COMMENT ON COLUMN behavioral_baselines.training_data_size IS 'Number of automation events used for training this baseline';
COMMENT ON COLUMN behavioral_baselines.created_at IS 'Timestamp when baseline was first created';
COMMENT ON COLUMN behavioral_baselines.updated_at IS 'Timestamp when baseline was last updated';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_behavioral_baselines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_behavioral_baselines_updated_at ON behavioral_baselines;
CREATE TRIGGER trigger_update_behavioral_baselines_updated_at
  BEFORE UPDATE ON behavioral_baselines
  FOR EACH ROW
  EXECUTE FUNCTION update_behavioral_baselines_updated_at();

-- Sample stats JSONB structure for documentation
COMMENT ON COLUMN behavioral_baselines.stats IS
  'JSONB structure example:
  {
    "meanEventsPerDay": 5.2,
    "stdDevEventsPerDay": 1.8,
    "typicalWorkHours": {
      "start": 9,
      "end": 17
    },
    "commonActions": [
      { "action": "file_access", "frequency": 0.45 },
      { "action": "email_send", "frequency": 0.30 }
    ]
  }';

-- Grant permissions (adjust based on your application user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON behavioral_baselines TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'Migration 011: behavioral_baselines table created successfully';
  RAISE NOTICE 'Table: behavioral_baselines';
  RAISE NOTICE 'Indexes: 4 (user_id, organization_id, updated_at, stats GIN)';
  RAISE NOTICE 'Triggers: 1 (auto-update updated_at)';
END $$;
