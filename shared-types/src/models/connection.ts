/**
 * Platform Connection domain model types
 * Types for OAuth connections to various SaaS platforms
 */

/**
 * Supported SaaS platforms
 */
export type Platform = 'slack' | 'google' | 'microsoft' | 'github' | 'atlassian' | 'notion';

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'expired' | 'pending';

/**
 * OAuth flow state
 */
export type OAuthState = 'pending' | 'authorized' | 'failed' | 'expired';

/**
 * Core Platform Connection entity
 */
export interface PlatformConnection {
  /** Unique connection identifier */
  id: string;
  
  /** Platform this connection is for */
  platform: Platform;
  
  /** Connection display name */
  name: string;
  
  /** Current connection status */
  status: ConnectionStatus;
  
  /** Organization that owns this connection */
  organizationId: string;
  
  /** User who created the connection */
  createdBy: string;
  
  /** OAuth configuration */
  oauth: OAuthConfiguration;
  
  /** Connection capabilities */
  capabilities: ConnectionCapabilities;
  
  /** Last successful sync */
  lastSyncAt?: Date;
  
  /** Next scheduled sync */
  nextSyncAt?: Date;
  
  /** Sync configuration */
  syncConfig: SyncConfiguration;
  
  /** Health check information */
  health: ConnectionHealth;
  
  /** Connection metadata */
  metadata: ConnectionMetadata;
  
  /** Creation and update timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth configuration for platform connection
 */
export interface OAuthConfiguration {
  /** Client ID for the OAuth app */
  clientId: string;
  
  /** OAuth scopes granted */
  scopes: string[];
  
  /** Redirect URI used in OAuth flow */
  redirectUri: string;
  
  /** Current OAuth state */
  state: OAuthState;
  
  /** Token information (stored encrypted) */
  tokenInfo: TokenInfo;
  
  /** OAuth app information */
  appInfo?: OAuthAppInfo;
}

/**
 * OAuth token information
 */
export interface TokenInfo {
  /** When tokens were issued */
  issuedAt: Date;
  
  /** When access token expires */
  expiresAt?: Date;
  
  /** Token scope */
  scope: string[];
  
  /** Whether refresh token is available */
  hasRefreshToken: boolean;
  
  /** Last successful token refresh */
  lastRefreshAt?: Date;
  
  /** Token status */
  status: 'valid' | 'expired' | 'revoked';
}

/**
 * OAuth app information
 */
export interface OAuthAppInfo {
  /** App name on the platform */
  name: string;
  
  /** App description */
  description?: string;
  
  /** App developer/organization */
  developer: string;
  
  /** App website */
  website?: string;
  
  /** App privacy policy URL */
  privacyPolicyUrl?: string;
  
  /** When app was authorized */
  authorizedAt: Date;
}

/**
 * Connection capabilities and features
 */
export interface ConnectionCapabilities {
  /** Can discover automations */
  canDiscoverAutomations: boolean;
  
  /** Can monitor real-time events */
  canMonitorRealTime: boolean;
  
  /** Can access audit logs */
  canAccessAuditLogs: boolean;
  
  /** Can list users */
  canListUsers: boolean;
  
  /** Can list applications */
  canListApplications: boolean;
  
  /** Can access file metadata */
  canAccessFiles: boolean;
  
  /** Supported automation types */
  supportedAutomationTypes: string[];
  
  /** API rate limits */
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

/**
 * Sync configuration
 */
export interface SyncConfiguration {
  /** Enable automatic sync */
  enabled: boolean;
  
  /** Sync frequency in minutes */
  frequencyMinutes: number;
  
  /** Full sync frequency in hours (for complete re-discovery) */
  fullSyncFrequencyHours: number;
  
  /** Incremental sync enabled */
  incrementalSync: boolean;
  
  /** What to sync */
  syncTargets: {
    automations: boolean;
    users: boolean;
    applications: boolean;
    auditLogs: boolean;
  };
  
  /** Sync filters */
  filters?: {
    /** Only sync specific users */
    userIds?: string[];
    
    /** Only sync specific channels/workspaces */
    workspaceIds?: string[];
    
    /** Date range for audit logs */
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
  };
}

/**
 * Connection health monitoring
 */
export interface ConnectionHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Last health check */
  lastCheckAt: Date;
  
  /** Health check results */
  checks: HealthCheck[];
  
  /** Error information if unhealthy */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    occurredAt: Date;
  };
  
  /** Performance metrics */
  performance: {
    /** Average response time in ms */
    avgResponseTime: number;
    
    /** Success rate percentage */
    successRate: number;
    
    /** Requests in last hour */
    requestsLastHour: number;
    
    /** Errors in last hour */
    errorsLastHour: number;
  };
}

/**
 * Individual health check
 */
export interface HealthCheck {
  /** Check type */
  type: 'token_validity' | 'api_connectivity' | 'permissions' | 'rate_limits';
  
  /** Check status */
  status: 'pass' | 'fail' | 'warn';
  
  /** Check message */
  message: string;
  
  /** Check timestamp */
  timestamp: Date;
  
  /** Additional check data */
  data?: Record<string, unknown>;
}

/**
 * Connection metadata and statistics
 */
export interface ConnectionMetadata {
  /** Platform-specific workspace/org info */
  workspace?: {
    id: string;
    name: string;
    domain: string;
    url?: string;
  };
  
  /** Discovery statistics */
  stats: {
    /** Total automations discovered */
    totalAutomations: number;
    
    /** Automations by type */
    automationsByType: Record<string, number>;
    
    /** Risk distribution */
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    
    /** Last discovery summary */
    lastDiscovery?: {
      timestamp: Date;
      newAutomations: number;
      updatedAutomations: number;
      errors: number;
    };
  };
  
  /** Platform version/API info */
  platformInfo?: {
    version: string;
    features: string[];
    limits: Record<string, number>;
  };
}


/**
 * Discovery result
 */
export interface DiscoveryResult {
  /** Discovery job ID */
  jobId: string;
  
  /** Connection ID */
  connectionId: string;
  
  /** Discovery status */
  status: 'running' | 'completed' | 'failed';
  
  /** Discovery progress */
  progress: {
    current: number;
    total: number;
    stage: string;
  };
  
  /** Discovery results */
  results?: {
    automationsFound: number;
    usersFound: number;
    applicationsFound: number;
    errors: string[];
  };
  
  /** Discovery timestamps */
  startedAt: Date;
  completedAt?: Date;
}