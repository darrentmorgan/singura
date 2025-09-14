-- ============================================================================
-- SaaS X-Ray Supabase Migration - Initial Schema
-- Version: 001
-- Created: 2025-09-14
-- Description: Complete database schema migration from PostgreSQL to Supabase
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Platform types supported by the system
CREATE TYPE platform_type_enum AS ENUM (
    'slack',
    'google',
    'microsoft',
    'hubspot',
    'salesforce',
    'notion',
    'asana',
    'jira'
);

-- Connection status for platform connections
CREATE TYPE connection_status_enum AS ENUM (
    'active',
    'inactive',
    'error',
    'expired',
    'pending'
);

-- Types of encrypted credentials we store
CREATE TYPE credential_type_enum AS ENUM (
    'access_token',
    'refresh_token',
    'api_key',
    'webhook_secret'
);

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

-- Organizations table - Multi-tenant support
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    plan_tier VARCHAR(50) DEFAULT 'free',
    max_connections INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform connections table - Track connected SaaS platforms
CREATE TABLE platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform_type platform_type_enum NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    platform_workspace_id VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    status connection_status_enum DEFAULT 'pending',
    permissions_granted JSONB DEFAULT '[]',
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    webhook_url VARCHAR(500),
    webhook_secret_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique connection per organization/platform/user combination
    CONSTRAINT unique_platform_connection UNIQUE (organization_id, platform_type, platform_user_id, platform_workspace_id)
);

-- Encrypted credentials table - Secure OAuth token storage
CREATE TABLE encrypted_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    credential_type credential_type_enum NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_key_id VARCHAR(100) NOT NULL DEFAULT 'default',
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique credential type per connection
    CONSTRAINT unique_credential_per_connection UNIQUE (platform_connection_id, credential_type)
);

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

-- Audit log table - Track all important system events
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    platform_connection_id UUID REFERENCES platform_connections(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- auth, connection, sync, error, admin
    actor_id VARCHAR(255), -- User ID who performed the action
    actor_type VARCHAR(50), -- system, user, api_key
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback table - Store user feedback and system improvements
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(255), -- User identifier

    -- Feedback details
    feedback_type VARCHAR(50) NOT NULL, -- 'bug_report', 'feature_request', 'improvement', 'compliment'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Context
    page_url VARCHAR(500),
    user_agent TEXT,
    browser_info JSONB DEFAULT '{}',

    -- Status tracking
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'acknowledged', 'in_progress', 'resolved', 'closed'
    assigned_to VARCHAR(255),
    resolution TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organizations indexes
CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- Platform connections indexes
CREATE INDEX idx_platform_connections_org_id ON platform_connections(organization_id);
CREATE INDEX idx_platform_connections_platform_type ON platform_connections(platform_type);
CREATE INDEX idx_platform_connections_status ON platform_connections(status);
CREATE INDEX idx_platform_connections_org_platform ON platform_connections(organization_id, platform_type);
CREATE INDEX idx_platform_connections_last_sync ON platform_connections(last_sync_at);
CREATE INDEX idx_platform_connections_expires ON platform_connections(expires_at) WHERE expires_at IS NOT NULL;

-- Encrypted credentials indexes
CREATE INDEX idx_encrypted_credentials_connection_id ON encrypted_credentials(platform_connection_id);
CREATE INDEX idx_encrypted_credentials_type ON encrypted_credentials(credential_type);
CREATE INDEX idx_encrypted_credentials_expires ON encrypted_credentials(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_encrypted_credentials_key_id ON encrypted_credentials(encryption_key_id);

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

-- Audit logs indexes
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_platform_connection_id ON audit_logs(platform_connection_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- User feedback indexes
CREATE INDEX idx_user_feedback_org_id ON user_feedback(organization_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at);
CREATE INDEX idx_user_feedback_priority ON user_feedback(priority);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_connections_updated_at
    BEFORE UPDATE ON platform_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encrypted_credentials_updated_at
    BEFORE UPDATE ON encrypted_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_user_feedback_updated_at
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically log platform connection changes
CREATE OR REPLACE FUNCTION log_platform_connection_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            organization_id, platform_connection_id, event_type, event_category,
            actor_type, resource_type, resource_id, event_data
        ) VALUES (
            NEW.organization_id, NEW.id, 'platform_connection_created', 'connection',
            'system', 'platform_connection', NEW.id::text,
            jsonb_build_object(
                'platform_type', NEW.platform_type,
                'display_name', NEW.display_name,
                'status', NEW.status
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO audit_logs (
                organization_id, platform_connection_id, event_type, event_category,
                actor_type, resource_type, resource_id, event_data
            ) VALUES (
                NEW.organization_id, NEW.id, 'platform_connection_status_changed', 'connection',
                'system', 'platform_connection', NEW.id::text,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'platform_type', NEW.platform_type
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            organization_id, platform_connection_id, event_type, event_category,
            actor_type, resource_type, resource_id, event_data
        ) VALUES (
            OLD.organization_id, OLD.id, 'platform_connection_deleted', 'connection',
            'system', 'platform_connection', OLD.id::text,
            jsonb_build_object(
                'platform_type', OLD.platform_type,
                'display_name', OLD.display_name
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for platform connection audit logging
CREATE TRIGGER audit_platform_connections
    AFTER INSERT OR UPDATE OR DELETE ON platform_connections
    FOR EACH ROW EXECUTE FUNCTION log_platform_connection_changes();

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
-- ROW LEVEL SECURITY SETUP
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (to be refined with Supabase auth context)
-- These policies will be updated to work with Supabase's auth.users() function

CREATE POLICY organizations_policy ON organizations
    FOR ALL USING (true);

CREATE POLICY platform_connections_policy ON platform_connections
    FOR ALL USING (true);

CREATE POLICY encrypted_credentials_policy ON encrypted_credentials
    FOR ALL USING (true);

CREATE POLICY discovery_runs_policy ON discovery_runs
    FOR ALL USING (true);

CREATE POLICY discovered_automations_policy ON discovered_automations
    FOR ALL USING (true);

CREATE POLICY risk_assessments_policy ON risk_assessments
    FOR ALL USING (true);

CREATE POLICY cross_platform_integrations_policy ON cross_platform_integrations
    FOR ALL USING (true);

CREATE POLICY automation_activities_policy ON automation_activities
    FOR ALL USING (true);

CREATE POLICY compliance_mappings_policy ON compliance_mappings
    FOR ALL USING (true);

CREATE POLICY audit_logs_policy ON audit_logs
    FOR ALL USING (true);

CREATE POLICY user_feedback_policy ON user_feedback
    FOR ALL USING (true);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default organizations for different environments
INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES
    ('Demo Organization', 'demo.saasxray.com', 'demo-org', 'enterprise', 1000),
    ('Staging Organization', 'staging.saasxray.com', 'staging-org', 'enterprise', 1000),
    ('Development Organization', 'dev.localhost', 'dev-org', 'enterprise', 100);

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations using the SaaS X-Ray platform';
COMMENT ON TABLE platform_connections IS 'Connections to external SaaS platforms (Slack, Google, etc.)';
COMMENT ON TABLE encrypted_credentials IS 'Encrypted storage for OAuth tokens and API keys';
COMMENT ON TABLE discovery_runs IS 'Tracks discovery job executions across platforms';
COMMENT ON TABLE discovered_automations IS 'Stores all discovered automations with their metadata';
COMMENT ON TABLE risk_assessments IS 'Risk analysis and scoring for discovered automations';
COMMENT ON TABLE cross_platform_integrations IS 'Cross-platform automation integrations and data flows';
COMMENT ON TABLE automation_activities IS 'Activity tracking and execution history for automations';
COMMENT ON TABLE compliance_mappings IS 'Maps automations to compliance framework requirements';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system events';
COMMENT ON TABLE user_feedback IS 'User feedback collection for system improvements';

-- Table-specific comments
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier for the organization';
COMMENT ON COLUMN organizations.plan_tier IS 'Subscription plan tier (free, pro, enterprise)';
COMMENT ON COLUMN organizations.max_connections IS 'Maximum number of platform connections allowed';

COMMENT ON COLUMN platform_connections.platform_workspace_id IS 'Workspace/team ID from the platform (e.g., Slack team ID)';
COMMENT ON COLUMN platform_connections.permissions_granted IS 'Array of OAuth scopes granted';
COMMENT ON COLUMN platform_connections.webhook_secret_id IS 'Reference to encrypted webhook secret';

COMMENT ON COLUMN encrypted_credentials.encryption_key_id IS 'Key ID used for encryption, enables key rotation';
COMMENT ON COLUMN encrypted_credentials.encrypted_value IS 'AES-256 encrypted credential value';

COMMENT ON COLUMN discovered_automations.external_id IS 'Platform-specific unique identifier for the automation';
COMMENT ON COLUMN discovered_automations.trigger_type IS 'How this automation is triggered (event, schedule, manual, etc.)';
COMMENT ON COLUMN discovered_automations.data_access_patterns IS 'JSON array describing what data this automation can access';

COMMENT ON COLUMN risk_assessments.risk_score IS 'Overall risk score from 0-100, calculated from component scores';
COMMENT ON COLUMN risk_assessments.confidence_level IS 'Confidence in the risk assessment from 0-100';

COMMENT ON COLUMN cross_platform_integrations.confidence_score IS 'Confidence that this integration actually exists (0-100)';
COMMENT ON COLUMN cross_platform_integrations.data_flow IS 'JSON array describing data flow between platforms';

-- ============================================================================
-- END MIGRATION 001
-- ============================================================================