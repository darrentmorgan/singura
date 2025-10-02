/**
 * AI Platform Connector Interface
 *
 * Extended connector interface for AI platforms (ChatGPT, Claude, Gemini)
 * with specialized methods for audit log retrieval and usage analytics.
 *
 * @module connectors/ai-platform-connector
 */

import {
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult,
  UsageAnalytics,
  AIDateRange,
  AIPlatform
} from '../platforms/ai-platforms';

import { OAuthCredentials } from '../oauth/credentials';

/**
 * AI Platform Connector interface
 *
 * Defines methods for connecting to and retrieving data from AI platforms
 * (ChatGPT, Claude, Gemini) with specialized audit log and analytics capabilities.
 *
 * Note: This interface focuses on AI-specific functionality. For integration with
 * existing PlatformConnector, implement both interfaces in the backend connector.
 */
export interface AIPlatformConnector {
  /** Platform identifier */
  platform: AIPlatform;
  /**
   * Get audit logs specific to AI platform usage
   *
   * @param query - Query parameters for filtering audit logs
   * @returns Normalized AI audit logs with pagination support
   */
  getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult>;

  /**
   * Get usage analytics and metrics for the platform
   *
   * @param period - Time range for analytics
   * @returns Aggregated usage statistics
   */
  getUsageAnalytics(period: AIDateRange): Promise<UsageAnalytics>;

  /**
   * Validate AI platform API credentials and permissions
   *
   * @returns Validation result with permission details
   */
  validateAICredentials(): Promise<AICredentialValidation>;

  /**
   * Get real-time connection status
   *
   * @returns Current connection health and sync status
   */
  getConnectionStatus?(): Promise<AIConnectionStatus>;

  /**
   * Sync audit logs incrementally
   *
   * @param since - Sync logs since this timestamp
   * @returns Sync result with new log count
   */
  syncAuditLogs?(since: Date): Promise<AISyncResult>;
}

/**
 * AI credential validation result
 */
export interface AICredentialValidation {
  /** Whether credentials are valid */
  isValid: boolean;

  /** Platform being validated */
  platform: AIPlatform;

  /** Whether all required permissions are granted */
  hasRequiredPermissions: boolean;

  /** Missing permissions */
  missingPermissions: string[];

  /** When credentials expire (if applicable) */
  expiresAt?: Date;

  /** Last validation check */
  lastChecked: Date;

  /** Validation errors */
  errors?: string[];

  /** API rate limit information */
  rateLimits?: {
    remaining: number;
    limit: number;
    resetAt: Date;
  };
}

/**
 * AI platform connection status
 */
export interface AIConnectionStatus {
  /** Platform */
  platform: AIPlatform;

  /** Connection state */
  state: 'connected' | 'disconnected' | 'error' | 'rate_limited';

  /** Last successful API call */
  lastSuccessfulCall?: Date;

  /** Last sync timestamp */
  lastSync?: Date;

  /** Next scheduled sync */
  nextSync?: Date;

  /** Connection health score (0-100) */
  healthScore: number;

  /** Current error (if any) */
  currentError?: string;

  /** Retry count (if in error state) */
  retryCount?: number;

  /** Metrics */
  metrics: {
    /** Total API calls today */
    apiCallsToday: number;
    /** Failed calls today */
    failedCallsToday: number;
    /** Average response time (ms) */
    averageResponseTime: number;
  };
}

/**
 * Result of incremental audit log sync
 */
export interface AISyncResult {
  /** Platform synced */
  platform: AIPlatform;

  /** Number of new logs retrieved */
  newLogsCount: number;

  /** Number of updated logs */
  updatedLogsCount: number;

  /** Last event timestamp */
  lastEventTimestamp: Date;

  /** Sync duration (ms) */
  syncDuration: number;

  /** Whether sync completed successfully */
  success: boolean;

  /** Sync errors (if any) */
  errors?: string[];

  /** Next sync cursor/token */
  nextCursor?: string;
}

/**
 * AI platform connector factory configuration
 */
export interface AIPlatformConnectorConfig {
  /** Platform type */
  platform: AIPlatform;

  /** API credentials/configuration */
  credentials: ChatGPTCredentials | ClaudeCredentials | GeminiCredentials;

  /** Additional options */
  options?: {
    /** Enable automatic retry */
    autoRetry?: boolean;
    /** Retry attempts */
    maxRetries?: number;
    /** Request timeout (ms) */
    timeout?: number;
    /** Enable request logging */
    enableLogging?: boolean;
  };
}

/**
 * ChatGPT-specific credentials
 */
export interface ChatGPTCredentials {
  type: 'chatgpt';
  /** OpenAI API key */
  apiKey: string;
  /** Organization ID */
  organizationId: string;
}

/**
 * Claude-specific credentials
 */
export interface ClaudeCredentials {
  type: 'claude';
  /** Anthropic API key */
  apiKey: string;
  /** Organization ID */
  organizationId: string;
}

/**
 * Gemini-specific credentials
 */
export interface GeminiCredentials {
  type: 'gemini';
  /** Google OAuth2 credentials */
  oauth: OAuthCredentials;
  /** Customer ID */
  customerId?: string;
}

/**
 * Unified connector response wrapper
 */
export interface ConnectorResponse<T> {
  /** Whether request was successful */
  success: boolean;

  /** Response data (if successful) */
  data?: T;

  /** Error information (if failed) */
  error?: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** HTTP status code (if applicable) */
    statusCode?: number;
    /** Retry-able error */
    retryable: boolean;
  };

  /** Response metadata */
  metadata: {
    /** Request ID */
    requestId: string;
    /** Response time (ms) */
    responseTime: number;
    /** Timestamp */
    timestamp: Date;
  };
}

/**
 * Connector health check result
 */
export interface ConnectorHealthCheck {
  /** Platform */
  platform: AIPlatform;

  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Health checks performed */
  checks: Array<{
    /** Check name */
    name: string;
    /** Check status */
    passed: boolean;
    /** Response time (ms) */
    responseTime?: number;
    /** Error message (if failed) */
    error?: string;
  }>;

  /** Timestamp of health check */
  checkedAt: Date;

  /** Recommendations for issues */
  recommendations?: string[];
}
