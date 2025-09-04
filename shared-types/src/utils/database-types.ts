/**
 * Strongly typed database operation types
 * Replaces all 'any' types in database operations
 */

import { UUID } from './common';

/**
 * Query parameter types - replaces any[]
 */
export type QueryParameter = string | number | boolean | Date | null;
export type QueryParameters = QueryParameter[];

/**
 * Database filter operators
 */
export interface FilterOperators {
  gt?: QueryParameter;
  gte?: QueryParameter;
  lt?: QueryParameter;
  lte?: QueryParameter;
  like?: string;
  not?: QueryParameter;
  in?: QueryParameter[];
  between?: [QueryParameter, QueryParameter];
}

/**
 * Generic filter type for database queries
 */
export type DatabaseFilter<T> = {
  [K in keyof T]?: T[K] | FilterOperators | QueryParameter[];
};

/**
 * Insert clause builder result
 */
export interface InsertClause {
  columns: string;
  values: QueryParameters;
  placeholders: string;
}

/**
 * Update clause builder result  
 */
export interface UpdateClause {
  setClause: string;
  params: QueryParameters;
}

/**
 * Where clause builder result
 */
export interface WhereClause {
  whereClause: string;
  params: QueryParameters;
}

/**
 * Pagination clause builder result
 */
export interface PaginationClause {
  limit: number;
  offset: number;
  orderBy: string;
}

/**
 * Audit log database record
 */
export interface AuditLogRecord {
  id: UUID;
  organization_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/**
 * Audit log filter parameters
 */
export interface AuditLogFilters {
  organization_id?: string;
  user_id?: string;
  action?: string | string[];
  resource_type?: string | string[];
  resource_id?: string;
  start_date?: Date;
  end_date?: Date;
  ip_address?: string;
}

/**
 * Connection database record
 */
export interface ConnectionRecord {
  id: UUID;
  organization_id: string;
  platform_type: string;
  platform_user_id: string;
  platform_workspace_id?: string;
  display_name: string;
  status: string;
  permissions_granted?: Record<string, unknown>;
  last_sync_at?: Date;
  last_error?: string;
  expires_at?: Date;
  metadata?: Record<string, unknown>;
  webhook_url?: string;
  webhook_secret_id?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Connection filter parameters
 */
export interface ConnectionFilters {
  organization_id?: string;
  platform_type?: string | string[];
  platform_user_id?: string;
  platform_workspace_id?: string;
  display_name?: FilterOperators;
  status?: string | string[];
  last_sync_at?: FilterOperators;
  expires_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * Automation database record
 */
export interface AutomationRecord {
  id: UUID;
  organization_id: string;
  connection_id: string;
  platform_type: string;
  platform_automation_id: string;
  name: string;
  description?: string;
  automation_type: string;
  status: string;
  risk_score: number;
  risk_level: string;
  permissions: Record<string, unknown>;
  metadata: Record<string, unknown>;
  discovered_at: Date;
  last_seen_at: Date;
  updated_at: Date;
}

/**
 * Automation filter parameters
 */
export interface AutomationFilters {
  organization_id?: string;
  connection_id?: string | string[];
  platform_type?: string | string[];
  automation_type?: string | string[];
  status?: string | string[];
  risk_level?: string | string[];
  risk_score?: FilterOperators;
  discovered_at?: FilterOperators;
  last_seen_at?: FilterOperators;
  name?: FilterOperators;
}

/**
 * Discovery job database record
 */
export interface DiscoveryJobRecord {
  id: UUID;
  organization_id: string;
  connection_id?: string;
  job_type: string;
  status: string;
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  results_summary?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Discovery job filter parameters
 */
export interface DiscoveryJobFilters {
  organization_id?: string;
  connection_id?: string;
  job_type?: string | string[];
  status?: string | string[];
  started_at?: FilterOperators;
  completed_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * Risk assessment database record
 */
export interface RiskAssessmentRecord {
  id: UUID;
  organization_id: string;
  automation_id: string;
  risk_score: number;
  risk_level: string;
  risk_factors: Record<string, unknown>[];
  gdpr_concerns: string[];
  data_sensitivity: Record<string, unknown>;
  assessed_at: Date;
  created_at: Date;
}

/**
 * Risk assessment filter parameters
 */
export interface RiskAssessmentFilters {
  organization_id?: string;
  automation_id?: string | string[];
  risk_level?: string | string[];
  risk_score?: FilterOperators;
  assessed_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * Organization database record
 */
export interface OrganizationRecord {
  id: UUID;
  name: string;
  domain?: string;
  slug: string;
  plan_tier?: string;
  max_connections?: number;
  settings?: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Organization filter parameters
 */
export interface OrganizationFilters {
  name?: FilterOperators;
  domain?: string;
  slug?: FilterOperators;
  plan_tier?: string | string[];
  max_connections?: FilterOperators;
  is_active?: boolean;
  created_at?: FilterOperators;
}

/**
 * User database record
 */
export interface UserRecord {
  id: UUID;
  organization_id: string;
  email: string;
  name?: string;
  role: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * User filter parameters
 */
export interface UserFilters {
  organization_id?: string;
  email?: FilterOperators;
  name?: FilterOperators;
  role?: string | string[];
  is_active?: boolean;
  last_login_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * Webhook database record
 */
export interface WebhookRecord {
  id: UUID;
  organization_id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  is_active: boolean;
  last_triggered_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Webhook filter parameters
 */
export interface WebhookFilters {
  organization_id?: string;
  name?: FilterOperators;
  url?: FilterOperators;
  is_active?: boolean;
  events?: FilterOperators;
  last_triggered_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * Alert database record
 */
export interface AlertRecord {
  id: UUID;
  organization_id: string;
  automation_id?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  status: string;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Alert filter parameters
 */
export interface AlertFilters {
  organization_id?: string;
  automation_id?: string;
  alert_type?: string | string[];
  severity?: string | string[];
  status?: string | string[];
  acknowledged_by?: string;
  acknowledged_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * API Key database record
 */
export interface APIKeyRecord {
  id: UUID;
  organization_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  permissions: string[];
  is_active: boolean;
  expires_at?: Date;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * API Key filter parameters
 */
export interface APIKeyFilters {
  organization_id?: string;
  name?: FilterOperators;
  key_prefix?: string;
  is_active?: boolean;
  expires_at?: FilterOperators;
  last_used_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * Scheduled task database record
 */
export interface ScheduledTaskRecord {
  id: UUID;
  organization_id?: string;
  task_type: string;
  schedule_expression: string;
  next_run_at: Date;
  last_run_at?: Date;
  is_enabled: boolean;
  configuration?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Scheduled task filter parameters
 */
export interface ScheduledTaskFilters {
  organization_id?: string;
  task_type?: string | string[];
  is_enabled?: boolean;
  next_run_at?: FilterOperators;
  last_run_at?: FilterOperators;
  created_at?: FilterOperators;
}

/**
 * Compliance report database record
 */
export interface ComplianceReportRecord {
  id: UUID;
  organization_id: string;
  report_type: string;
  title: string;
  generated_at: Date;
  data: Record<string, unknown>;
  file_path?: string;
  created_by?: string;
  created_at: Date;
}

/**
 * Compliance report filter parameters
 */
export interface ComplianceReportFilters {
  organization_id?: string;
  report_type?: string | string[];
  generated_at?: FilterOperators;
  created_by?: string;
  created_at?: FilterOperators;
}