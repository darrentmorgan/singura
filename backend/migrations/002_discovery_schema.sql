-- ============================================================================
-- SaaS X-Ray Discovery Schema - Migration 002
-- Version: 002
-- Created: 2025-08-27
-- Description: Tables for automation discovery, risk scoring, and analytics
-- ============================================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Types of automations we can discover
CREATE TYPE automation_type_enum AS ENUM (
    'workflow',
    'bot', 
    'integration',
    'webhook',
    'scheduled_task',
    'trigger',
    'script',
    'service_account'
);

-- Status of discovered automations
CREATE TYPE automation_status_enum AS ENUM (
    'active',
    'inactive', 
    'paused',
    'error',
    'unknown'
);

-- Risk levels for automations
CREATE TYPE risk_level_enum AS ENUM (
    'low',
    'medium',
    'high', 
    'critical'
);

-- Discovery job status
CREATE TYPE discovery_status_enum AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Discovery runs table - Track discovery job executions
CREATE TABLE discovery_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform_connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    status discovery_status_enum DEFAULT 'pending',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    automations_found INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    error_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered automations table - Store all discovered automations
CREATE TABLE discovered_automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform_connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    discovery_run_id UUID NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
    
    -- Automation identification
    external_id VARCHAR(255) NOT NULL, -- Platform's internal ID for this automation
    name VARCHAR(500) NOT NULL,
    description TEXT,
    automation_type automation_type_enum NOT NULL,
    status automation_status_enum DEFAULT 'unknown',
    
    -- Automation details
    trigger_type VARCHAR(100),
    actions JSONB DEFAULT '[]', -- Array of action types
    permissions_required JSONB DEFAULT '[]', -- Array of required permissions
    data_access_patterns JSONB DEFAULT '[]', -- What data this automation accesses
    
    -- Ownership and governance
    owner_info JSONB DEFAULT '{}', -- Owner details from platform
    last_modified_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,
    execution_frequency VARCHAR(50), -- 'daily', 'hourly', 'on_demand', etc.
    
    -- Platform-specific metadata
    platform_metadata JSONB DEFAULT '{}',
    
    -- Discovery metadata
    first_discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique automation per platform connection
    CONSTRAINT unique_automation_per_connection UNIQUE (platform_connection_id, external_id)
);

-- Risk assessments table - Store risk scores and analysis
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    automation_id UUID NOT NULL REFERENCES discovered_automations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Risk scoring
    risk_level risk_level_enum NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- Risk factors
    permission_risk_score INTEGER DEFAULT 0 CHECK (permission_risk_score >= 0 AND permission_risk_score <= 100),
    data_access_risk_score INTEGER DEFAULT 0 CHECK (data_access_risk_score >= 0 AND data_access_risk_score <= 100),
    activity_risk_score INTEGER DEFAULT 0 CHECK (activity_risk_score >= 0 AND activity_risk_score <= 100),
    ownership_risk_score INTEGER DEFAULT 0 CHECK (ownership_risk_score >= 0 AND ownership_risk_score <= 100),
    
    -- Detailed risk analysis
    risk_factors JSONB DEFAULT '[]', -- Array of identified risk factors
    compliance_issues JSONB DEFAULT '[]', -- Array of compliance concerns
    security_concerns JSONB DEFAULT '[]', -- Array of security issues
    recommendations JSONB DEFAULT '[]', -- Array of recommended actions
    
    -- Assessment metadata
    assessment_version VARCHAR(20) DEFAULT '1.0',
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    assessor_type VARCHAR(50) DEFAULT 'system', -- 'system', 'manual', 'external'
    confidence_level INTEGER DEFAULT 80 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-platform integrations table - Track integrations between platforms
CREATE TABLE cross_platform_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Integration identification
    name VARCHAR(500) NOT NULL,
    integration_type VARCHAR(100) NOT NULL, -- 'data_sync', 'workflow', 'authentication', etc.
    
    -- Connected automations
    source_automation_id UUID REFERENCES discovered_automations(id) ON DELETE SET NULL,
    target_automation_id UUID REFERENCES discovered_automations(id) ON DELETE SET NULL,
    related_automations JSONB DEFAULT '[]', -- Array of automation IDs
    
    -- Data flow information
    data_flow JSONB DEFAULT '[]', -- Array of data flow definitions
    data_types JSONB DEFAULT '[]', -- Types of data being transferred
    
    -- Integration metadata
    confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    last_detected_at TIMESTAMPTZ DEFAULT NOW(),
    detection_method VARCHAR(100), -- How this integration was detected
    
    -- Risk information
    risk_level risk_level_enum DEFAULT 'medium',
    risk_factors JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation activities table - Track automation execution and activity
CREATE TABLE automation_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    automation_id UUID NOT NULL REFERENCES discovered_automations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform_connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(100) NOT NULL, -- 'execution', 'trigger', 'error', 'modification'
    activity_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Execution information
    execution_duration_ms INTEGER,
    execution_status VARCHAR(50), -- 'success', 'failure', 'timeout', 'cancelled'
    
    -- Data processed
    records_processed INTEGER,
    data_volume_bytes BIGINT,
    
    -- Error information
    error_message TEXT,
    error_code VARCHAR(100),
    
    -- Activity metadata
    activity_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance mappings table - Map automations to compliance requirements
CREATE TABLE compliance_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    automation_id UUID NOT NULL REFERENCES discovered_automations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Compliance framework
    framework VARCHAR(50) NOT NULL, -- 'SOC2', 'GDPR', 'HIPAA', 'PCI_DSS', 'ISO27001'
    requirement_id VARCHAR(100) NOT NULL, -- Framework-specific requirement ID
    requirement_description TEXT,
    
    -- Compliance status
    compliance_status VARCHAR(50) DEFAULT 'unknown', -- 'compliant', 'non_compliant', 'partially_compliant', 'unknown'
    
    -- Evidence and gaps
    evidence JSONB DEFAULT '[]', -- Array of evidence supporting compliance
    gaps JSONB DEFAULT '[]', -- Array of identified gaps
    remediation_actions JSONB DEFAULT '[]', -- Array of recommended actions
    
    -- Assessment details
    last_assessed_at TIMESTAMPTZ DEFAULT NOW(),
    next_assessment_due TIMESTAMPTZ,
    assessor_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique mapping per automation and requirement
    CONSTRAINT unique_compliance_mapping UNIQUE (automation_id, framework, requirement_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Discovery runs indexes
CREATE INDEX idx_discovery_runs_org_id ON discovery_runs(organization_id);
CREATE INDEX idx_discovery_runs_connection_id ON discovery_runs(platform_connection_id);
CREATE INDEX idx_discovery_runs_status ON discovery_runs(status);
CREATE INDEX idx_discovery_runs_started_at ON discovery_runs(started_at);

-- Discovered automations indexes
CREATE INDEX idx_discovered_automations_org_id ON discovered_automations(organization_id);
CREATE INDEX idx_discovered_automations_connection_id ON discovered_automations(platform_connection_id);
CREATE INDEX idx_discovered_automations_discovery_run ON discovered_automations(discovery_run_id);
CREATE INDEX idx_discovered_automations_type ON discovered_automations(automation_type);
CREATE INDEX idx_discovered_automations_status ON discovered_automations(status);
CREATE INDEX idx_discovered_automations_external_id ON discovered_automations(external_id);
CREATE INDEX idx_discovered_automations_name ON discovered_automations USING gin(to_tsvector('english', name));
CREATE INDEX idx_discovered_automations_last_seen ON discovered_automations(last_seen_at);
CREATE INDEX idx_discovered_automations_active ON discovered_automations(is_active);

-- Risk assessments indexes
CREATE INDEX idx_risk_assessments_automation_id ON risk_assessments(automation_id);
CREATE INDEX idx_risk_assessments_org_id ON risk_assessments(organization_id);
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_risk_score ON risk_assessments(risk_score);
CREATE INDEX idx_risk_assessments_assessed_at ON risk_assessments(assessed_at);

-- Cross-platform integrations indexes
CREATE INDEX idx_cross_platform_integrations_org_id ON cross_platform_integrations(organization_id);
CREATE INDEX idx_cross_platform_integrations_source ON cross_platform_integrations(source_automation_id);
CREATE INDEX idx_cross_platform_integrations_target ON cross_platform_integrations(target_automation_id);
CREATE INDEX idx_cross_platform_integrations_type ON cross_platform_integrations(integration_type);
CREATE INDEX idx_cross_platform_integrations_risk ON cross_platform_integrations(risk_level);

-- Automation activities indexes  
CREATE INDEX idx_automation_activities_automation_id ON automation_activities(automation_id);
CREATE INDEX idx_automation_activities_org_id ON automation_activities(organization_id);
CREATE INDEX idx_automation_activities_connection_id ON automation_activities(platform_connection_id);
CREATE INDEX idx_automation_activities_timestamp ON automation_activities(activity_timestamp);
CREATE INDEX idx_automation_activities_type ON automation_activities(activity_type);
CREATE INDEX idx_automation_activities_status ON automation_activities(execution_status);

-- Compliance mappings indexes
CREATE INDEX idx_compliance_mappings_automation_id ON compliance_mappings(automation_id);
CREATE INDEX idx_compliance_mappings_org_id ON compliance_mappings(organization_id);
CREATE INDEX idx_compliance_mappings_framework ON compliance_mappings(framework);
CREATE INDEX idx_compliance_mappings_status ON compliance_mappings(compliance_status);
CREATE INDEX idx_compliance_mappings_assessed_at ON compliance_mappings(last_assessed_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Triggers for updated_at columns
CREATE TRIGGER update_discovery_runs_updated_at 
    BEFORE UPDATE ON discovery_runs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discovered_automations_updated_at 
    BEFORE UPDATE ON discovered_automations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_assessments_updated_at 
    BEFORE UPDATE ON risk_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_platform_integrations_updated_at 
    BEFORE UPDATE ON cross_platform_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_mappings_updated_at 
    BEFORE UPDATE ON compliance_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update last_seen_at when automation is re-discovered
CREATE OR REPLACE FUNCTION update_automation_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automation_last_seen_trigger
    BEFORE UPDATE ON discovered_automations
    FOR EACH ROW EXECUTE FUNCTION update_automation_last_seen();

-- Function to calculate and update discovery run statistics
CREATE OR REPLACE FUNCTION update_discovery_run_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the discovery run statistics when automations are added
    UPDATE discovery_runs 
    SET 
        automations_found = (
            SELECT COUNT(*) 
            FROM discovered_automations 
            WHERE discovery_run_id = NEW.discovery_run_id
        ),
        updated_at = NOW()
    WHERE id = NEW.discovery_run_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discovery_run_stats_trigger
    AFTER INSERT ON discovered_automations
    FOR EACH ROW EXECUTE FUNCTION update_discovery_run_stats();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_automations ENABLE ROW LEVEL SECURITY;  
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_mappings ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (to be refined with actual auth context)
CREATE POLICY discovery_runs_isolation ON discovery_runs
    USING (true); -- Will be refined with actual auth context

CREATE POLICY discovered_automations_isolation ON discovered_automations
    USING (true); -- Will be refined with actual auth context

CREATE POLICY risk_assessments_isolation ON risk_assessments
    USING (true); -- Will be refined with actual auth context

CREATE POLICY cross_platform_integrations_isolation ON cross_platform_integrations
    USING (true); -- Will be refined with actual auth context

CREATE POLICY automation_activities_isolation ON automation_activities
    USING (true); -- Will be refined with actual auth context

CREATE POLICY compliance_mappings_isolation ON compliance_mappings
    USING (true); -- Will be refined with actual auth context

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE discovery_runs IS 'Tracks discovery job executions across platforms';
COMMENT ON TABLE discovered_automations IS 'Stores all discovered automations with their metadata';
COMMENT ON TABLE risk_assessments IS 'Risk analysis and scoring for discovered automations';
COMMENT ON TABLE cross_platform_integrations IS 'Cross-platform automation integrations and data flows';
COMMENT ON TABLE automation_activities IS 'Activity tracking and execution history for automations';
COMMENT ON TABLE compliance_mappings IS 'Maps automations to compliance framework requirements';

COMMENT ON COLUMN discovered_automations.external_id IS 'Platform-specific unique identifier for the automation';
COMMENT ON COLUMN discovered_automations.trigger_type IS 'How this automation is triggered (event, schedule, manual, etc.)';
COMMENT ON COLUMN discovered_automations.data_access_patterns IS 'JSON array describing what data this automation can access';

COMMENT ON COLUMN risk_assessments.risk_score IS 'Overall risk score from 0-100, calculated from component scores';
COMMENT ON COLUMN risk_assessments.confidence_level IS 'Confidence in the risk assessment from 0-100';

COMMENT ON COLUMN cross_platform_integrations.confidence_score IS 'Confidence that this integration actually exists (0-100)';
COMMENT ON COLUMN cross_platform_integrations.data_flow IS 'JSON array describing data flow between platforms';

-- ============================================================================
-- END MIGRATION 002
-- ============================================================================