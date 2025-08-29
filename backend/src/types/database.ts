/**
 * TypeScript interfaces for SaaS X-Ray database schema
 * Generated from migration 001_initial_schema.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PlatformType = 
  | 'slack'
  | 'google'
  | 'microsoft'
  | 'hubspot'
  | 'salesforce'
  | 'notion'
  | 'asana'
  | 'jira';

export type ConnectionStatus = 
  | 'active'
  | 'inactive'
  | 'error'
  | 'expired'
  | 'pending';

export type CredentialType = 
  | 'access_token'
  | 'refresh_token'
  | 'api_key'
  | 'webhook_secret';

export type PlanTier = 'free' | 'pro' | 'enterprise';

export type EventCategory = 'auth' | 'connection' | 'sync' | 'error' | 'admin';

export type ActorType = 'system' | 'user' | 'api_key';

// Discovery-related enums
export type AutomationType = 
  | 'workflow'
  | 'bot'
  | 'integration'
  | 'webhook'
  | 'scheduled_task'
  | 'trigger'
  | 'script'
  | 'service_account';

export type AutomationStatus = 
  | 'active'
  | 'inactive'
  | 'paused'
  | 'error'
  | 'unknown';

export type RiskLevel = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type DiscoveryStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  slug: string;
  settings: Record<string, any>;
  is_active: boolean;
  plan_tier: PlanTier;
  max_connections: number;
  created_at: Date;
  updated_at: Date;
}

export interface PlatformConnection {
  id: string;
  organization_id: string;
  platform_type: PlatformType;
  platform_user_id: string;
  platform_workspace_id: string | null;
  display_name: string;
  status: ConnectionStatus;
  permissions_granted: string[];
  last_sync_at: Date | null;
  last_error: string | null;
  expires_at: Date | null;
  metadata: Record<string, any>;
  webhook_url: string | null;
  webhook_secret_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EncryptedCredential {
  id: string;
  platform_connection_id: string;
  credential_type: CredentialType;
  encrypted_value: string;
  encryption_key_id: string;
  expires_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  platform_connection_id: string | null;
  event_type: string;
  event_category: EventCategory;
  actor_id: string | null;
  actor_type: ActorType;
  resource_type: string | null;
  resource_id: string | null;
  event_data: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// ============================================================================
// DISCOVERY INTERFACES
// ============================================================================

export interface DiscoveryRun {
  id: string;
  organization_id: string;
  platform_connection_id: string;
  status: DiscoveryStatus;
  started_at: Date;
  completed_at: Date | null;
  duration_ms: number | null;
  automations_found: number;
  errors_count: number;
  warnings_count: number;
  metadata: Record<string, any>;
  error_details: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DiscoveredAutomation {
  id: string;
  organization_id: string;
  platform_connection_id: string;
  discovery_run_id: string;
  external_id: string;
  name: string;
  description: string | null;
  automation_type: AutomationType;
  status: AutomationStatus;
  trigger_type: string | null;
  actions: string[];
  permissions_required: string[];
  data_access_patterns: string[];
  owner_info: Record<string, any>;
  last_modified_at: Date | null;
  last_triggered_at: Date | null;
  execution_frequency: string | null;
  platform_metadata: Record<string, any>;
  first_discovered_at: Date;
  last_seen_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RiskAssessment {
  id: string;
  automation_id: string;
  organization_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  permission_risk_score: number;
  data_access_risk_score: number;
  activity_risk_score: number;
  ownership_risk_score: number;
  risk_factors: string[];
  compliance_issues: string[];
  security_concerns: string[];
  recommendations: string[];
  assessment_version: string;
  assessed_at: Date;
  assessor_type: string;
  confidence_level: number;
  created_at: Date;
  updated_at: Date;
}

export interface CrossPlatformIntegration {
  id: string;
  organization_id: string;
  name: string;
  integration_type: string;
  source_automation_id: string | null;
  target_automation_id: string | null;
  related_automations: string[];
  data_flow: Record<string, any>[];
  data_types: string[];
  confidence_score: number;
  last_detected_at: Date;
  detection_method: string | null;
  risk_level: RiskLevel;
  risk_factors: string[];
  created_at: Date;
  updated_at: Date;
}

export interface AutomationActivity {
  id: string;
  automation_id: string;
  organization_id: string;
  platform_connection_id: string;
  activity_type: string;
  activity_timestamp: Date;
  execution_duration_ms: number | null;
  execution_status: string | null;
  records_processed: number | null;
  data_volume_bytes: number | null;
  error_message: string | null;
  error_code: string | null;
  activity_metadata: Record<string, any>;
  created_at: Date;
}

export interface ComplianceMapping {
  id: string;
  automation_id: string;
  organization_id: string;
  framework: string;
  requirement_id: string;
  requirement_description: string | null;
  compliance_status: string;
  evidence: string[];
  gaps: string[];
  remediation_actions: string[];
  last_assessed_at: Date;
  next_assessment_due: Date | null;
  assessor_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// INPUT/CREATE INTERFACES
// ============================================================================

export interface CreateOrganizationInput {
  name: string;
  domain?: string;
  slug: string;
  settings?: Record<string, any>;
  plan_tier?: PlanTier;
  max_connections?: number;
}

export interface UpdateOrganizationInput {
  name?: string;
  domain?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
  plan_tier?: PlanTier;
  max_connections?: number;
}

export interface CreatePlatformConnectionInput {
  organization_id: string;
  platform_type: PlatformType;
  platform_user_id: string;
  platform_workspace_id?: string;
  display_name: string;
  permissions_granted: string[];
  expires_at?: Date;
  metadata?: Record<string, any>;
  webhook_url?: string;
}

export interface UpdatePlatformConnectionInput {
  display_name?: string;
  status?: ConnectionStatus;
  permissions_granted?: string[];
  last_sync_at?: Date;
  last_error?: string;
  expires_at?: Date;
  metadata?: Record<string, any>;
  webhook_url?: string;
}

export interface CreateEncryptedCredentialInput {
  platform_connection_id: string;
  credential_type: CredentialType;
  encrypted_value: string;
  encryption_key_id?: string;
  expires_at?: Date;
  metadata?: Record<string, any>;
}

export interface CreateAuditLogInput {
  organization_id?: string;
  platform_connection_id?: string;
  event_type: string;
  event_category: EventCategory;
  actor_id?: string;
  actor_type: ActorType;
  resource_type?: string;
  resource_id?: string;
  event_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// QUERY INTERFACES
// ============================================================================

export interface OrganizationFilters {
  is_active?: boolean;
  plan_tier?: PlanTier;
  domain?: string;
  slug?: string;
}

export interface PlatformConnectionFilters {
  organization_id?: string;
  platform_type?: PlatformType;
  status?: ConnectionStatus;
  expires_before?: Date;
  last_sync_before?: Date;
  last_sync_after?: Date;
}

export interface EncryptedCredentialFilters {
  platform_connection_id?: string;
  credential_type?: CredentialType;
  expires_before?: Date;
  encryption_key_id?: string;
}

export interface AuditLogFilters {
  organization_id?: string;
  platform_connection_id?: string;
  event_type?: string;
  event_category?: EventCategory;
  actor_id?: string;
  actor_type?: ActorType;
  resource_type?: string;
  resource_id?: string;
  created_after?: Date;
  created_before?: Date;
}

// ============================================================================
// RESULT/RESPONSE INTERFACES
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// ============================================================================
// PLATFORM-SPECIFIC INTERFACES
// ============================================================================

export interface SlackConnectionMetadata {
  team_id: string;
  team_name: string;
  bot_user_id?: string;
  user_id: string;
  scope: string;
  authed_user?: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
}

export interface GoogleConnectionMetadata {
  email: string;
  domain?: string;
  workspace_domain?: string;
  scopes: string[];
  token_type: string;
}

export interface MicrosoftConnectionMetadata {
  tenant_id: string;
  user_principal_name: string;
  display_name: string;
  scopes: string[];
  id_token_claims?: Record<string, any>;
}

// ============================================================================
// ERROR INTERFACES
// ============================================================================

export interface DatabaseError {
  code: string;
  message: string;
  detail?: string;
  hint?: string;
  table?: string;
  column?: string;
  constraint?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OmitTimestamps<T> = Omit<T, 'created_at' | 'updated_at'>;

export type CreateInput<T> = OmitTimestamps<Omit<T, 'id'>>;

export type UpdateInput<T> = Partial<OmitTimestamps<Omit<T, 'id'>>>;

// ============================================================================
// DATABASE CONNECTION TYPES
// ============================================================================

export interface DatabaseConnection {
  query<T = any>(text: string, params?: any[]): Promise<DatabaseQueryResult<T>>;
  release(): void;
}

export interface DatabaseQueryResult<T = any> {
  rows: T[];
  rowCount: number | null;
  command: string;
}

export interface TransactionCallback<T> {
  (client: DatabaseConnection): Promise<T>;
}

// ============================================================================
// EXPORT ALL TYPES FOR CONVENIENCE
// ============================================================================

export * from './database';