-- ============================================================================
-- SaaS X-Ray Database Schema - Initial Migration
-- Version: 001
-- Created: 2025-08-25
-- Description: Initial database schema for multi-tenant SaaS platform detection
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Audit logs indexes
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_platform_connection_id ON audit_logs(platform_connection_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

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

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default organization for development
INSERT INTO organizations (name, domain, slug, plan_tier, max_connections)
VALUES ('Development Organization', 'dev.localhost', 'dev-org', 'enterprise', 100);

-- ============================================================================
-- SECURITY
-- ============================================================================

-- Enable Row Level Security on sensitive tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (these will be refined based on application auth requirements)
-- For now, create basic policies that allow all operations for development

-- Organizations: Users can only access their own organization
CREATE POLICY organizations_isolation ON organizations
    USING (true); -- Will be refined with actual auth context

-- Platform connections: Users can only access connections for their organization
CREATE POLICY platform_connections_isolation ON platform_connections
    USING (true); -- Will be refined with actual auth context

-- Encrypted credentials: Users can only access credentials for their organization's connections
CREATE POLICY encrypted_credentials_isolation ON encrypted_credentials
    USING (true); -- Will be refined with actual auth context

-- Audit logs: Users can only view audit logs for their organization
CREATE POLICY audit_logs_isolation ON audit_logs
    USING (true); -- Will be refined with actual auth context

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations using the SaaS X-Ray platform';
COMMENT ON TABLE platform_connections IS 'Connections to external SaaS platforms (Slack, Google, etc.)';
COMMENT ON TABLE encrypted_credentials IS 'Encrypted storage for OAuth tokens and API keys';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system events';

COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier for the organization';
COMMENT ON COLUMN organizations.plan_tier IS 'Subscription plan tier (free, pro, enterprise)';
COMMENT ON COLUMN organizations.max_connections IS 'Maximum number of platform connections allowed';

COMMENT ON COLUMN platform_connections.platform_workspace_id IS 'Workspace/team ID from the platform (e.g., Slack team ID)';
COMMENT ON COLUMN platform_connections.permissions_granted IS 'Array of OAuth scopes granted';
COMMENT ON COLUMN platform_connections.webhook_secret_id IS 'Reference to encrypted webhook secret';

COMMENT ON COLUMN encrypted_credentials.encryption_key_id IS 'Key ID used for encryption, enables key rotation';
COMMENT ON COLUMN encrypted_credentials.encrypted_value IS 'AES-256 encrypted credential value';

-- ============================================================================
-- END MIGRATION 001
-- ============================================================================