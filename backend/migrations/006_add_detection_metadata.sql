-- ============================================================================
-- Migration 006: Detection Metadata Storage
-- Purpose: Add detection metadata and risk history tracking to automations
-- Date: 2025-10-11
-- Implementation: Phase 1 - AI Provider Detection & Multi-Layered Detection
-- ============================================================================

-- Add detection_metadata JSONB column for storing detection algorithm results
ALTER TABLE discovered_automations
ADD COLUMN IF NOT EXISTS detection_metadata JSONB DEFAULT '{}'::jsonb;

-- Add risk_score_history JSONB column for tracking risk score changes over time
ALTER TABLE discovered_automations
ADD COLUMN IF NOT EXISTS risk_score_history JSONB DEFAULT '[]'::jsonb;

-- Create GIN indexes for JSONB query performance
CREATE INDEX IF NOT EXISTS idx_discovered_automations_detection_metadata
ON discovered_automations USING gin(detection_metadata);

CREATE INDEX IF NOT EXISTS idx_discovered_automations_risk_score_history
ON discovered_automations USING gin(risk_score_history);

-- Create specific indexes for common detection_metadata queries
CREATE INDEX IF NOT EXISTS idx_discovered_automations_ai_provider
ON discovered_automations ((detection_metadata->>'aiProvider'));

CREATE INDEX IF NOT EXISTS idx_discovered_automations_detection_confidence
ON discovered_automations (((detection_metadata->>'confidence')::numeric));

-- Add comments documenting the JSONB structure
COMMENT ON COLUMN discovered_automations.detection_metadata IS
'Detection algorithm metadata storage. Structure:
{
  "aiProvider": {
    "provider": "openai" | "anthropic" | "google_ai" | "cohere" | "huggingface" | "replicate" | "mistral" | "together_ai" | "unknown",
    "confidence": 0-100,
    "detectionMethods": ["api_endpoint", "user_agent", "oauth_scope", "ip_range", "webhook_pattern", "content_signature"],
    "evidence": {
      "matchedEndpoints": [...],
      "matchedUserAgents": [...],
      "matchedScopes": [...],
      "matchedSignatures": [...]
    },
    "model": "gpt-4" | "claude-3-opus" | etc.
  },
  "detectionPatterns": [
    {
      "patternType": "velocity" | "batch_operation" | "off_hours" | "timing_variance" | "permission_escalation" | "data_volume",
      "confidence": 0-100,
      "severity": "low" | "medium" | "high" | "critical",
      "evidence": {...},
      "detectedAt": "ISO timestamp"
    }
  ],
  "correlationData": {
    "relatedAutomations": [
      {
        "automationId": "uuid",
        "platform": "google_workspace" | "slack" | "microsoft_365",
        "similarityScore": 0-100,
        "correlationType": "same_ai_provider" | "similar_timing" | "data_flow_chain"
      }
    ],
    "crossPlatformChain": boolean,
    "chainConfidence": 0-100
  },
  "detectorConfiguration": {
    "enabledDetectors": ["velocity", "batch", "ai_provider", ...],
    "customThresholds": {
      "velocity": {"eventsPerSecond": 1.0},
      "batch": {"minSimilarity": 0.7}
    }
  },
  "lastUpdated": "ISO timestamp"
}';

COMMENT ON COLUMN discovered_automations.risk_score_history IS
'Historical risk score tracking. Array structure:
[
  {
    "timestamp": "ISO timestamp",
    "score": 0-100,
    "level": "low" | "medium" | "high" | "critical",
    "factors": [
      {
        "type": "data_access" | "external_api" | "ai_provider" | "permissions" | "activity",
        "score": 0-100,
        "description": "..."
      }
    ],
    "trigger": "initial_discovery" | "permission_change" | "activity_spike" | "manual_reassessment" | "detector_update"
  }
]
Maintains chronological history of risk assessments for trend analysis.';

-- ============================================================================
-- Helper Functions for Detection Metadata
-- ============================================================================

-- Function to append risk score to history
CREATE OR REPLACE FUNCTION append_risk_score_history(
  automation_id UUID,
  risk_score INTEGER,
  risk_level VARCHAR(20),
  risk_factors JSONB,
  trigger_reason VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  UPDATE discovered_automations
  SET risk_score_history = risk_score_history || jsonb_build_object(
    'timestamp', NOW(),
    'score', risk_score,
    'level', risk_level,
    'factors', risk_factors,
    'trigger', trigger_reason
  )::jsonb
  WHERE id = automation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION append_risk_score_history IS
'Append a new risk score entry to an automation''s risk_score_history array.
Used for tracking how risk scores evolve over time.';

-- Function to update AI provider detection metadata
CREATE OR REPLACE FUNCTION update_ai_provider_metadata(
  automation_id UUID,
  provider_data JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE discovered_automations
  SET detection_metadata = jsonb_set(
    COALESCE(detection_metadata, '{}'::jsonb),
    '{aiProvider}',
    provider_data,
    true
  )
  WHERE id = automation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_ai_provider_metadata IS
'Update the aiProvider section of detection_metadata.
Merges new provider data with existing detection metadata.';

-- Function to add detection pattern to metadata
CREATE OR REPLACE FUNCTION add_detection_pattern(
  automation_id UUID,
  pattern_data JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE discovered_automations
  SET detection_metadata = jsonb_set(
    COALESCE(detection_metadata, '{}'::jsonb),
    '{detectionPatterns}',
    COALESCE(detection_metadata->'detectionPatterns', '[]'::jsonb) || pattern_data,
    true
  )
  WHERE id = automation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_detection_pattern IS
'Append a new detection pattern result to the detectionPatterns array.
Used by velocity, batch operation, and other detectors.';

-- Function to update correlation data
CREATE OR REPLACE FUNCTION update_correlation_data(
  automation_id UUID,
  correlation_data JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE discovered_automations
  SET detection_metadata = jsonb_set(
    COALESCE(detection_metadata, '{}'::jsonb),
    '{correlationData}',
    correlation_data,
    true
  )
  WHERE id = automation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_correlation_data IS
'Update cross-platform correlation data for an automation.
Used to link related automations across different platforms.';

-- ============================================================================
-- Verification Queries
-- ============================================================================

DO $$
DECLARE
  automations_count INTEGER;
  metadata_columns_count INTEGER;
BEGIN
  -- Count total automations
  SELECT COUNT(*) INTO automations_count FROM discovered_automations;

  -- Verify new columns exist
  SELECT COUNT(*) INTO metadata_columns_count
  FROM information_schema.columns
  WHERE table_name = 'discovered_automations'
    AND column_name IN ('detection_metadata', 'risk_score_history');

  RAISE NOTICE 'Migration 006 Verification:';
  RAISE NOTICE '  Total automations: %', automations_count;
  RAISE NOTICE '  New columns added: % (expected: 2)', metadata_columns_count;

  IF metadata_columns_count = 2 THEN
    RAISE NOTICE '  ✅ Migration completed successfully';
  ELSE
    RAISE WARNING '  ⚠️  Expected 2 columns but found %', metadata_columns_count;
  END IF;
END $$;

-- Display sample detection_metadata structure
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Sample Detection Metadata Structure ===';
  RAISE NOTICE '{';
  RAISE NOTICE '  "aiProvider": {';
  RAISE NOTICE '    "provider": "openai",';
  RAISE NOTICE '    "confidence": 92,';
  RAISE NOTICE '    "detectionMethods": ["api_endpoint", "content_signature"],';
  RAISE NOTICE '    "evidence": {';
  RAISE NOTICE '      "matchedEndpoints": ["api.openai.com"],';
  RAISE NOTICE '      "matchedSignatures": ["gpt-4", "openai_api_key"]';
  RAISE NOTICE '    },';
  RAISE NOTICE '    "model": "gpt-4-turbo"';
  RAISE NOTICE '  },';
  RAISE NOTICE '  "detectionPatterns": [';
  RAISE NOTICE '    {';
  RAISE NOTICE '      "patternType": "velocity",';
  RAISE NOTICE '      "confidence": 85,';
  RAISE NOTICE '      "severity": "high",';
  RAISE NOTICE '      "evidence": {"eventsPerSecond": 2.5}';
  RAISE NOTICE '    }';
  RAISE NOTICE '  ]';
  RAISE NOTICE '}';
  RAISE NOTICE '';
END $$;
