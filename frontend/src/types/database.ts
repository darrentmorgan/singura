/**
 * Frontend Database Types - Import from shared-types package
 * Maintains shared-types architecture compatibility
 */

// Import all database types from shared-types package
export type {
  // Database operation types
  QueryParameter,
  QueryParameters,
  DatabaseFilter,
  FilterOperators,
  
  // Core entity records
  OrganizationRecord as Organization,
  ConnectionRecord as PlatformConnection,
  AutomationRecord as DiscoveredAutomation,
  UserRecord as User,
  AuditLogRecord as AuditLog,
  RiskAssessmentRecord as RiskAssessment,
  DiscoveryJobRecord as DiscoveryJob,
  WebhookRecord as Webhook,
  AlertRecord as Alert,
  APIKeyRecord as APIKey,
  ScheduledTaskRecord as ScheduledTask,
  ComplianceReportRecord as ComplianceReport,
  
  // Filter types
  OrganizationFilters,
  ConnectionFilters,
  AutomationFilters,
  UserFilters,
  AuditLogFilters,
  RiskAssessmentFilters,
  DiscoveryJobFilters,
  WebhookFilters,
  AlertFilters,
  APIKeyFilters,
  ScheduledTaskFilters,
  ComplianceReportFilters,
  
  // Common types
  UUID
} from '@saas-xray/shared-types';

// Also import for local use
import type {
  OrganizationRecord,
  ConnectionRecord,
  AutomationRecord,
  UserRecord
} from '@saas-xray/shared-types';

// Create aliases for convenience
export type Organization = OrganizationRecord;
export type PlatformConnection = ConnectionRecord;
export type DiscoveredAutomation = AutomationRecord;
export type User = UserRecord;

// Create input types for repositories
export type CreateOrganizationInput = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
export type UpdateOrganizationInput = Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>;

export type CreatePlatformConnectionInput = Omit<PlatformConnection, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePlatformConnectionInput = Partial<Omit<PlatformConnection, 'id' | 'created_at' | 'updated_at'>>;

export type CreateDiscoveredAutomationInput = Omit<DiscoveredAutomation, 'id' | 'updated_at'>;
export type UpdateDiscoveredAutomationInput = Partial<Omit<DiscoveredAutomation, 'id' | 'updated_at'>>;

export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;

// Encrypted credential types for OAuth storage
export interface EncryptedCredential {
  id: string;
  connection_id: string;
  encrypted_data: string;
  encryption_key_id: string;
  created_at: Date;
  updated_at: Date;
}

export type CreateEncryptedCredentialInput = Omit<EncryptedCredential, 'id' | 'created_at' | 'updated_at'>;