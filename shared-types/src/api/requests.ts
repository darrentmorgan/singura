/**
 * API Request type definitions
 * All request types for the SaaS X-Ray API endpoints
 */

import { 
  UserRole, 
  UserStatus, 
  UserPreferences,
  OrganizationTier,
  OrganizationSettings,
  Platform,
  SyncConfiguration,
  ConnectionCapabilities,
  AuditEventType,
  AuditSeverity,
  AuditLogFilter
} from '../models';

/**
 * Base request with common properties
 */
export interface BaseRequest {
  /** Request correlation ID */
  requestId?: string;
  
  /** Client timestamp */
  timestamp?: Date;
}

/**
 * Pagination parameters for list requests
 */
export interface PaginationRequest {
  /** Page offset */
  offset?: number;
  
  /** Number of items per page */
  limit?: number;
  
  /** Sort field */
  sortBy?: string;
  
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Authentication and Authorization Requests
 */

export interface LoginRequest extends BaseRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface RegisterRequest extends BaseRequest {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  organizationTier: OrganizationTier;
}

export interface RefreshTokenRequest extends BaseRequest {
  refreshToken: string;
}

export interface PasswordResetRequest extends BaseRequest {
  email: string;
}

export interface PasswordResetConfirmRequest extends BaseRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest extends BaseRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * User Management Requests
 */

export interface CreateUserRequest extends BaseRequest {
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  sendInvitation?: boolean;
  temporaryPassword?: string;
}

export interface UpdateUserRequest extends BaseRequest {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  preferences?: Partial<UserPreferences>;
}

export interface GetUsersRequest extends BaseRequest, PaginationRequest {
  organizationId: string;
  status?: UserStatus;
  role?: UserRole;
  searchTerm?: string;
}

export interface InviteUserRequest extends BaseRequest {
  email: string;
  role: UserRole;
  organizationId: string;
  message?: string;
}

export interface AcceptInvitationRequest extends BaseRequest {
  token: string;
  password: string;
  name: string;
}

/**
 * Organization Management Requests
 */

export interface CreateOrganizationRequest extends BaseRequest {
  name: string;
  domain?: string;
  tier: OrganizationTier;
  adminUser: {
    email: string;
    name: string;
    password: string;
  };
}

export interface UpdateOrganizationRequest extends BaseRequest {
  name?: string;
  domain?: string;
  settings?: Partial<OrganizationSettings>;
}

export interface GetOrganizationUsageRequest extends BaseRequest {
  organizationId: string;
  period?: 'current' | 'last_month' | 'last_3_months';
}

/**
 * Platform Connection Requests
 */

export interface CreateConnectionRequest extends BaseRequest {
  platform: Platform;
  name: string;
  organizationId: string;
  oauth: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
    redirectUri: string;
  };
  syncConfig?: Partial<SyncConfiguration>;
}

export interface UpdateConnectionRequest extends BaseRequest {
  name?: string;
  syncConfig?: Partial<SyncConfiguration>;
  capabilities?: Partial<ConnectionCapabilities>;
}

export interface GetConnectionsRequest extends BaseRequest, PaginationRequest {
  organizationId: string;
  platform?: Platform;
  status?: string;
}

export interface OAuthAuthorizationRequest extends BaseRequest {
  connectionId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}

export interface OAuthCallbackRequest extends BaseRequest {
  connectionId: string;
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

export interface TestConnectionRequest extends BaseRequest {
  connectionId: string;
}

export interface RefreshConnectionTokensRequest extends BaseRequest {
  connectionId: string;
}

/**
 * Discovery and Automation Requests
 */

export interface StartDiscoveryRequest extends BaseRequest {
  connectionId: string;
  fullDiscovery?: boolean;
  targets?: ('automations' | 'users' | 'applications')[];
  filters?: Record<string, unknown>;
}

export interface GetDiscoveryStatusRequest extends BaseRequest {
  jobId: string;
}

export interface GetAutomationsRequest extends BaseRequest, PaginationRequest {
  organizationId: string;
  connectionId?: string;
  platform?: Platform;
  riskLevel?: string;
  automationType?: string;
  searchTerm?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface GetAutomationDetailsRequest extends BaseRequest {
  automationId: string;
}

export interface UpdateAutomationRequest extends BaseRequest {
  riskAssessment?: {
    manualRiskScore?: number;
    notes?: string;
    reviewedBy: string;
  };
  tags?: string[];
  status?: 'active' | 'archived' | 'ignored';
}

export interface BulkUpdateAutomationsRequest extends BaseRequest {
  automationIds: string[];
  updates: {
    tags?: string[];
    status?: 'active' | 'archived' | 'ignored';
    riskLevel?: string;
  };
}

/**
 * Analytics and Reporting Requests
 */

export interface GetDashboardDataRequest extends BaseRequest {
  organizationId: string;
  timeRange: '24h' | '7d' | '30d' | '90d';
  metrics?: string[];
}

export interface GetRiskAnalyticsRequest extends BaseRequest {
  organizationId: string;
  timeRange: '24h' | '7d' | '30d' | '90d';
  groupBy?: 'platform' | 'type' | 'risk_level';
}

export interface GetAutomationTrendsRequest extends BaseRequest {
  organizationId: string;
  timeRange: '7d' | '30d' | '90d' | '1y';
  platform?: Platform;
}

export interface GenerateReportRequest extends BaseRequest {
  organizationId: string;
  reportType: 'risk_assessment' | 'compliance' | 'automation_inventory' | 'security_summary';
  format: 'pdf' | 'csv' | 'json';
  filters?: {
    platforms?: Platform[];
    riskLevels?: string[];
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
  };
  includeSensitiveData?: boolean;
}

/**
 * Audit Log Requests
 */

export interface GetAuditLogsRequest extends BaseRequest, PaginationRequest {
  filter: AuditLogFilter;
}

export interface ExportAuditLogsRequest extends BaseRequest {
  filter: AuditLogFilter;
  format: 'csv' | 'json' | 'pdf';
  includeSensitiveData: boolean;
  reason: string;
}

export interface CreateAuditLogEntryRequest extends BaseRequest {
  organizationId: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  description: string;
  userId?: string;
  resource: {
    type: string;
    id: string;
    name: string;
  };
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Notification and Alert Requests
 */

export interface GetNotificationsRequest extends BaseRequest, PaginationRequest {
  organizationId: string;
  userId?: string;
  unreadOnly?: boolean;
  types?: string[];
}

export interface MarkNotificationReadRequest extends BaseRequest {
  notificationId: string;
}

export interface CreateAlertRuleRequest extends BaseRequest {
  organizationId: string;
  name: string;
  description?: string;
  conditions: {
    eventType: string;
    threshold?: number;
    timeWindow?: number;
    filters?: Record<string, unknown>;
  };
  actions: {
    email?: boolean;
    slack?: boolean;
    webhook?: string;
  };
}

export interface UpdateAlertRuleRequest extends BaseRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  conditions?: {
    eventType: string;
    threshold?: number;
    timeWindow?: number;
    filters?: Record<string, unknown>;
  };
  actions?: {
    email?: boolean;
    slack?: boolean;
    webhook?: string;
  };
}

/**
 * Settings and Configuration Requests
 */

export interface GetSettingsRequest extends BaseRequest {
  organizationId: string;
  section?: 'general' | 'security' | 'notifications' | 'integrations' | 'compliance';
}

export interface UpdateSettingsRequest extends BaseRequest {
  organizationId: string;
  settings: Partial<OrganizationSettings>;
}

export interface GetUserPreferencesRequest extends BaseRequest {
  userId: string;
}

export interface UpdateUserPreferencesRequest extends BaseRequest {
  preferences: Partial<UserPreferences>;
}

/**
 * API and Integration Requests
 */

export interface CreateAPIKeyRequest extends BaseRequest {
  organizationId: string;
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface UpdateAPIKeyRequest extends BaseRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  enabled?: boolean;
}

export interface GetAPIKeysRequest extends BaseRequest, PaginationRequest {
  organizationId: string;
  activeOnly?: boolean;
}

/**
 * Health and Status Requests
 */

export interface GetHealthStatusRequest extends BaseRequest {
  detailed?: boolean;
}

export interface GetSystemStatusRequest extends BaseRequest {
  organizationId: string;
}

export interface GetConnectionHealthRequest extends BaseRequest {
  connectionId: string;
}

/**
 * Search and Filter Requests
 */

export interface GlobalSearchRequest extends BaseRequest, PaginationRequest {
  organizationId: string;
  query: string;
  types?: ('automations' | 'users' | 'connections')[];
  filters?: Record<string, unknown>;
}

export interface AdvancedSearchRequest extends BaseRequest, PaginationRequest {
  organizationId: string;
  searchCriteria: {
    automations?: {
      name?: string;
      platform?: Platform;
      riskLevel?: string;
      type?: string;
      tags?: string[];
    };
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
    includeArchived?: boolean;
  };
}