-- ============================================================================
-- Vendor Grouping Feature - Migration
-- Created: 2025-01-30
-- Description: Add vendor-level grouping columns to discovered_automations
-- Rollback: DROP vendor_name, vendor_group columns and associated indexes
-- ============================================================================

-- Add vendor columns to discovered_automations
ALTER TABLE discovered_automations
  ADD COLUMN vendor_name VARCHAR(255),
  ADD COLUMN vendor_group VARCHAR(255);

-- Create indexes for vendor columns
CREATE INDEX idx_discovered_automations_vendor_name
  ON discovered_automations(vendor_name);

CREATE INDEX idx_discovered_automations_vendor_group
  ON discovered_automations(vendor_group);

-- Create composite index for platform + vendor queries
CREATE INDEX idx_discovered_automations_platform_vendor
  ON discovered_automations(platform_connection_id, vendor_group);

-- Add comments for documentation
COMMENT ON COLUMN discovered_automations.vendor_name IS 'Extracted vendor name from OAuth app display text (e.g., "Attio" from "Attio CRM")';
COMMENT ON COLUMN discovered_automations.vendor_group IS 'Platform-scoped vendor group identifier (e.g., "attio-google")';

-- ============================================================================
-- Rollback Strategy
-- ============================================================================
-- To rollback this migration:
-- DROP INDEX idx_discovered_automations_platform_vendor;
-- DROP INDEX idx_discovered_automations_vendor_group;
-- DROP INDEX idx_discovered_automations_vendor_name;
-- ALTER TABLE discovered_automations DROP COLUMN vendor_group;
-- ALTER TABLE discovered_automations DROP COLUMN vendor_name;
-- ============================================================================
