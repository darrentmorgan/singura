/**
 * API Response type definitions
 * All response types for the SaaS X-Ray API endpoints
 */

import {
  User,
  Organization,
  OrganizationUsage,
  OrganizationFeatures,
  PlatformConnection,
  Automation,
  AuditLogEntry,
  AuditLogSummary,
  DiscoveryResult,
  UserInvitation,
  UserSession,
  UserActivity,
  ConnectionHealth,
  AutomationAlert
} from '../models';

/**
 * Generic API response wrapper
 */
export interface APIResponse<T = unknown> {
  /** Response status */
  success: boolean;
  
  /** Response data */
  data?: T;
  
  /** Error information */
  error?: APIError;
  
  /** Response metadata */
  meta?: ResponseMetadata;
  
  /** Request correlation ID */
  requestId?: string;
  
  /** Response timestamp */
  timestamp: Date;
}

/**
 * API error information
 */
export interface APIError {
  /** Error code */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Detailed error information */
  details?: Record<string, unknown>;
  
  /** Field-specific validation errors */
  fieldErrors?: FieldError[];
  
  /** Stack trace (development only) */
  stackTrace?: string;
}

/**
 * Field validation error
 */
export interface FieldError {
  /** Field name */
  field: string;
  
  /** Error message */
  message: string;
  
  /** Invalid value provided */
  value?: unknown;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /** Pagination information */
  pagination?: PaginationMeta;
  
  /** Performance metrics */
  performance?: {
    /** Request processing time in ms */
    processingTime: number;
    
    /** Database query time in ms */
    dbQueryTime?: number;
    
    /** External API call time in ms */
    externalApiTime?: number;
  };
  
  /** Cache information */
  cache?: {
    /** Whether response was served from cache */
    cached: boolean;
    
    /** Cache expiration time */
    expiresAt?: Date;
  };
  
  /** API version */
  version: string;
  
  /** Rate limiting information */
  rateLimit?: {
    /** Requests remaining in current window */
    remaining: number;
    
    /** Total requests allowed in window */
    limit: number;
    
    /** Window reset time */
    resetAt: Date;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page offset */
  offset: number;
  
  /** Items per page */
  limit: number;
  
  /** Total items available */
  total: number;
  
  /** Whether there are more pages */
  hasMore: boolean;
  
  /** Next page offset */
  nextOffset?: number;
  
  /** Previous page offset */
  previousOffset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  meta: ResponseMetadata & {
    pagination: PaginationMeta;
  };
}

/**
 * Authentication and Authorization Responses
 */

export interface LoginResponse {
  /** JWT access token */
  accessToken: string;
  
  /** Refresh token */
  refreshToken: string;
  
  /** Token expiration time */
  expiresAt: Date;
  
  /** User information */
  user: User;
  
  /** Organization information */
  organization: Organization;
  
  /** User permissions */
  permissions: string[];
  
  /** Whether MFA is required */
  mfaRequired: boolean;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresAt: Date;
}

export interface RegisterResponse {
  /** Created user */
  user: User;
  
  /** Created organization */
  organization: Organization;
  
  /** Access tokens */
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

/**
 * User Management Responses
 */

export interface GetUsersResponse extends PaginatedResponse<User> {
  data: (User & {
    /** Last login information */
    lastLogin?: Date;
    
    /** User activity status */
    isActive: boolean;
    
    /** Number of active sessions */
    activeSessions: number;
  })[];
}

export interface CreateUserResponse {
  user: User;
  invitation?: UserInvitation;
  temporaryPassword?: string;
}

export interface GetUserResponse {
  user: User;
  sessions: UserSession[];
  recentActivity: UserActivity[];
  permissions: string[];
}

/**
 * Organization Management Responses
 */

export interface GetOrganizationResponse {
  organization: Organization;
  usage: OrganizationUsage;
  features: OrganizationFeatures;
  limits: {
    users: { current: number; max: number };
    connections: { current: number; max: number };
    apiCalls: { current: number; max: number };
    storage: { currentMB: number; maxMB: number };
  };
}

export interface GetOrganizationStatsResponse {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalConnections: number;
    activeConnections: number;
    totalAutomations: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    platformBreakdown: Array<{
      platform: string;
      connections: number;
      automations: number;
    }>;
  };
  trends: {
    userGrowth: Array<{ date: Date; count: number }>;
    automationGrowth: Array<{ date: Date; count: number }>;
    riskTrends: Array<{ date: Date; riskScore: number }>;
  };
}

/**
 * Platform Connection Responses
 */

export interface GetConnectionsResponse extends PaginatedResponse<PlatformConnection> {
  data: (PlatformConnection & {
    /** Last sync status */
    lastSyncStatus: 'success' | 'failed' | 'in_progress';
    
    /** Automation count */
    automationCount: number;
    
    /** Health status */
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  })[];
}

export interface CreateConnectionResponse {
  connection: PlatformConnection;
  authorizationUrl: string;
  state: string;
}

export interface OAuthCallbackResponse {
  connection: PlatformConnection;
  success: boolean;
  redirectUrl?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  health: ConnectionHealth;
  capabilities: string[];
  error?: string;
}

/**
 * Discovery and Automation Responses
 */

export interface StartDiscoveryResponse {
  discoveryJob: DiscoveryResult;
  estimatedDuration: number;
  message: string;
}

export interface GetAutomationsResponse extends PaginatedResponse<Automation> {
  data: (Automation & {
    /** Connection name for display */
    connectionName: string;
    
    /** Platform display name */
    platformName: string;
    
    /** Whether automation is new (discovered in last 24h) */
    isNew: boolean;
    
    /** Whether risk has increased recently */
    riskIncreased: boolean;
  })[];
  
  /** Summary statistics */
  summary: {
    totalCount: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    platformDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
  };
}

export interface GetAutomationDetailsResponse {
  automation: Automation;
  riskHistory: Array<{
    date: Date;
    score: number;
    changes: string[];
  }>;
  relatedAutomations: Array<{
    id: string;
    name: string;
    platform: string;
    riskScore: number;
    relationship: 'same_user' | 'same_app' | 'data_flow';
  }>;
  complianceImpact: {
    gdprRelevant: boolean;
    soc2Relevant: boolean;
    customRequirements: string[];
  };
}

/**
 * Analytics and Reporting Responses
 */

export interface GetDashboardDataResponse {
  overview: {
    totalAutomations: number;
    criticalRiskAutomations: number;
    averageRiskScore: number;
    newAutomationsLast7Days: number;
    riskTrend: 'increasing' | 'decreasing' | 'stable';
  };
  
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  
  platformBreakdown: Array<{
    platform: string;
    count: number;
    averageRisk: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  recentActivity: Array<{
    type: 'automation_discovered' | 'risk_changed' | 'connection_added';
    description: string;
    timestamp: Date;
    automationId?: string;
    connectionId?: string;
  }>;
  
  alerts: AutomationAlert[];
  
  charts: {
    riskTrends: Array<{ date: Date; score: number }>;
    discoveryTrends: Array<{ date: Date; count: number }>;
    platformGrowth: Array<{ date: Date; platform: string; count: number }>;
  };
}

export interface GetRiskAnalyticsResponse {
  riskMetrics: {
    averageRiskScore: number;
    riskScoreChange: number;
    highRiskAutomations: number;
    riskTrend: 'improving' | 'degrading' | 'stable';
  };
  
  riskFactors: Array<{
    factor: string;
    count: number;
    averageImpact: number;
    examples: string[];
  }>;
  
  platformRisks: Array<{
    platform: string;
    averageRisk: number;
    criticalCount: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  complianceRisks: {
    gdprViolations: number;
    dataExposureRisks: number;
    unauthorizedAccess: number;
  };
}

export interface GenerateReportResponse {
  reportId: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt: Date;
  metadata: {
    format: string;
    size?: number;
    pageCount?: number;
    generatedAt: Date;
  };
}

/**
 * Audit Log Responses
 */

export interface GetAuditLogsResponse extends PaginatedResponse<AuditLogEntry> {
  summary: AuditLogSummary;
}

export interface ExportAuditLogsResponse {
  exportId: string;
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt: Date;
  recordCount: number;
}

/**
 * Notification and Alert Responses
 */

export interface GetNotificationsResponse extends PaginatedResponse<{
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}> {
  unreadCount: number;
}

export interface GetAlertRulesResponse extends PaginatedResponse<{
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  triggerCount: number;
  lastTriggered?: Date;
  createdAt: Date;
}> {}

/**
 * Settings and Configuration Responses
 */

export interface GetSettingsResponse {
  settings: Organization['settings'];
  availableFeatures: string[];
  limits: Record<string, number>;
}

export interface GetSystemStatusResponse {
  status: 'operational' | 'degraded' | 'maintenance' | 'offline';
  services: Array<{
    name: string;
    status: 'operational' | 'degraded' | 'offline';
    responseTime?: number;
    lastCheck: Date;
  }>;
  connections: Array<{
    id: string;
    name: string;
    platform: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastSync?: Date;
  }>;
  performance: {
    apiResponseTime: number;
    dbResponseTime: number;
    errorRate: number;
  };
}

/**
 * API and Integration Responses
 */

export interface GetAPIKeysResponse extends PaginatedResponse<{
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: string[];
  lastUsed?: Date;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}> {}

export interface CreateAPIKeyResponse {
  apiKey: {
    id: string;
    name: string;
    key: string; // Only returned once
    permissions: string[];
    expiresAt?: Date;
  };
  warning: string; // Security warning about storing the key
}

/**
 * Health and Status Responses
 */

export interface GetHealthStatusResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  uptime: number;
  
  services: {
    database: { status: 'up' | 'down'; responseTime: number };
    redis: { status: 'up' | 'down'; responseTime: number };
    externalAPIs: Array<{
      name: string;
      status: 'up' | 'down';
      responseTime: number;
    }>;
  };
  
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
}

/**
 * Search and Filter Responses
 */

export interface GlobalSearchResponse {
  results: {
    automations: Array<{
      id: string;
      name: string;
      platform: string;
      riskScore: number;
      snippet: string;
    }>;
    connections: Array<{
      id: string;
      name: string;
      platform: string;
      status: string;
    }>;
    users: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>;
  };
  
  totalResults: number;
  searchQuery: string;
  searchTime: number;
}

/**
 * Bulk Operation Responses
 */

export interface BulkOperationResponse {
  operationId: string;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  errors?: Array<{
    itemId: string;
    error: string;
  }>;
  completedAt?: Date;
}