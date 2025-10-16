-- Migration: Add organization metadata tracking
-- Purpose: Store organization-level metadata for analytics and feature customization
-- Date: 2025-10-16

-- Create organization metadata table
CREATE TABLE IF NOT EXISTS organization_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(255) UNIQUE NOT NULL,
  organization_size VARCHAR(50), -- 'small' (1-50), 'medium' (51-500), 'large' (501-5000), 'enterprise' (5000+), 'unknown'
  industry_vertical VARCHAR(100), -- 'technology', 'healthcare', 'finance', 'education', 'retail', 'manufacturing', etc.
  employee_count INTEGER,
  company_name VARCHAR(255),
  company_website VARCHAR(500),
  timezone VARCHAR(100) DEFAULT 'UTC',
  country VARCHAR(100),
  state_province VARCHAR(100),
  metadata JSONB DEFAULT '{}', -- Additional flexible metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_org_metadata_org_id ON organization_metadata(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_metadata_size ON organization_metadata(organization_size);
CREATE INDEX IF NOT EXISTS idx_org_metadata_vertical ON organization_metadata(industry_vertical);

-- Note: Indexes for discovered_automations will be added when that table is created
-- CREATE INDEX IF NOT EXISTS idx_automations_connection_id ON discovered_automations(platform_connection_id);
-- CREATE INDEX IF NOT EXISTS idx_automations_org_connection ON discovered_automations(organization_id, platform_connection_id);

-- Create update trigger for updated_at (if function exists)
-- CREATE OR REPLACE TRIGGER update_organization_metadata_updated_at
--   BEFORE UPDATE ON organization_metadata
--   FOR EACH ROW
--   EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE organization_metadata IS 'Stores organization-level metadata for analytics and customization';
COMMENT ON COLUMN organization_metadata.organization_id IS 'Clerk organization ID (unique identifier)';
COMMENT ON COLUMN organization_metadata.organization_size IS 'Size category: small/medium/large/enterprise/unknown';
COMMENT ON COLUMN organization_metadata.industry_vertical IS 'Industry sector the organization belongs to';
COMMENT ON COLUMN organization_metadata.employee_count IS 'Actual number of employees if known';
COMMENT ON COLUMN organization_metadata.metadata IS 'Flexible JSONB field for additional metadata';

-- Insert default metadata for existing organizations (if any)
-- Note: This can be run later once discovered_automations table exists
-- INSERT INTO organization_metadata (organization_id, organization_size, industry_vertical)
-- SELECT DISTINCT
--   organization_id,
--   'unknown' as organization_size,
--   'unknown' as industry_vertical
-- FROM discovered_automations
-- WHERE NOT EXISTS (
--   SELECT 1 FROM organization_metadata om
--   WHERE om.organization_id = discovered_automations.organization_id
-- )
-- ON CONFLICT (organization_id) DO NOTHING;