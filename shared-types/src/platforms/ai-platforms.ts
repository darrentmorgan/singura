/**
 * Unified AI Platform Types
 *
 * Provides normalized type definitions for AI platform audit logs across
 * ChatGPT, Claude, and Gemini. This allows consistent handling regardless
 * of the underlying platform's API structure.
 *
 * @module platforms/ai-platforms
 */

/**
 * Unified AI Platform Audit Log Entry
 * Normalizes events from ChatGPT, Claude, and Gemini into common format
 */
export interface AIplatformAuditLog {
  /** Unique identifier for the audit log entry */
  id: string;

  /** Source platform */
  platform: AIPlatform;

  /** When the activity occurred */
  timestamp: Date;

  /** User identifier on the platform */
  userId: string;

  /** User email address */
  userEmail: string;

  /** Organization/workspace identifier */
  organizationId: string;

  /** Type of activity performed */
  activityType: AIActivityType;

  /** Specific action name (platform-specific) */
  action: string;

  /** Additional metadata about the activity */
  metadata: AIActivityMetadata;

  /** IP address of the user (if available) */
  ipAddress?: string;

  /** User agent string (if available) */
  userAgent?: string;

  /** Geographic location (if available) */
  location?: GeoLocation;

  /** Risk indicators detected for this activity */
  riskIndicators: AIRiskIndicator[];
}

/**
 * Supported AI platforms
 */
export type AIPlatform = 'chatgpt' | 'claude' | 'gemini';

/**
 * Normalized activity types across all platforms
 */
export type AIActivityType =
  | 'login'                // User logged in
  | 'logout'               // User logged out
  | 'conversation'         // Chat/conversation activity
  | 'file_upload'          // File uploaded to AI platform
  | 'file_download'        // File downloaded from AI platform
  | 'model_usage'          // AI model usage (generation, completion)
  | 'prompt_injection'     // Potential prompt injection detected
  | 'data_export'          // Data export from platform
  | 'settings_change'      // User/org settings changed
  | 'integration_created'  // Third-party integration added
  | 'api_key_created'      // API key generated
  | 'api_key_deleted';     // API key revoked

/**
 * Activity metadata (platform-agnostic fields)
 */
export interface AIActivityMetadata {
  /** Conversation/thread identifier */
  conversationId?: string;

  /** Number of messages in conversation */
  messageCount?: number;

  /** Tokens consumed (input + output) */
  tokensUsed?: number;

  /** AI model used (e.g., 'gpt-4', 'claude-3-opus', 'gemini-pro') */
  model?: string;

  /** Files associated with activity */
  files?: FileReference[];

  /** Duration of activity in seconds */
  duration?: number;

  /** Application context (Gemini-specific: 'gmail', 'docs', etc.) */
  applicationContext?: string;

  /** Project identifier (ChatGPT/Claude workspaces) */
  projectId?: string;

  /** Team/workspace name */
  workspaceName?: string;

  /** Any additional platform-specific metadata */
  [key: string]: any;
}

/**
 * File reference in AI platform activity
 */
export interface FileReference {
  /** Unique file identifier */
  fileId: string;

  /** File name */
  fileName: string;

  /** MIME type or file extension */
  fileType: string;

  /** File size in bytes */
  fileSize?: number;

  /** When file was uploaded */
  uploadedAt: Date;

  /** Whether file contains sensitive data (detected) */
  isSensitive?: boolean;
}

/**
 * Risk indicator for AI platform activity
 */
export interface AIRiskIndicator {
  /** Type of risk detected */
  type: AIRiskType;

  /** Severity level */
  severity: RiskSeverity;

  /** Human-readable description */
  description: string;

  /** Confidence score (0-100) */
  confidence: number;

  /** Evidence supporting this risk indicator */
  evidence?: string[];

  /** Compliance frameworks impacted */
  complianceImpact?: ComplianceFramework[];
}

/**
 * Types of AI-related risks
 */
export type AIRiskType =
  | 'sensitive_data'       // Sensitive data shared with AI
  | 'unusual_activity'     // Anomalous usage patterns
  | 'policy_violation'     // Organization policy violation
  | 'security_event'       // Security-related event
  | 'data_exfiltration'    // Potential data leakage
  | 'unauthorized_access'  // Unauthorized platform access
  | 'excessive_usage';     // Unusually high usage

/**
 * Risk severity levels
 */
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Compliance frameworks
 */
export type ComplianceFramework = 'GDPR' | 'SOX' | 'HIPAA' | 'PCI' | 'SOC2' | 'ISO27001';

/**
 * Geographic location information
 */
export interface GeoLocation {
  /** Country code (ISO 3166-1 alpha-2) */
  country?: string;

  /** State/region */
  region?: string;

  /** City name */
  city?: string;

  /** Geographic coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  /** Timezone */
  timezone?: string;
}

/**
 * Query parameters for fetching AI platform audit logs
 */
export interface AIAuditLogQuery {
  /** Start of date range */
  startDate: Date;

  /** End of date range */
  endDate: Date;

  /** Filter by specific user IDs */
  userIds?: string[];

  /** Filter by event types */
  eventTypes?: string[];

  /** Maximum number of results */
  limit?: number;

  /** Pagination cursor */
  cursor?: string;

  /** Platform-specific filters */
  platformFilters?: Record<string, any>;
}

/**
 * Result of AI audit log query
 */
export interface AIAuditLogResult {
  /** Normalized audit logs */
  logs: AIplatformAuditLog[];

  /** Total number of logs matching query */
  totalCount: number;

  /** Whether more results are available */
  hasMore: boolean;

  /** Cursor for next page */
  nextCursor?: string;

  /** Query metadata */
  metadata: {
    /** Time taken to execute query (ms) */
    queryTime: number;

    /** Platform queried */
    platform: AIPlatform;

    /** Any warnings or issues */
    warnings?: string[];
  };
}

/**
 * Date range for AI platform queries
 */
export interface AIDateRange {
  /** Start date */
  start: Date;

  /** End date */
  end: Date;
}

/**
 * Usage analytics aggregated across AI platforms
 */
export interface UsageAnalytics {
  /** Platform */
  platform: AIPlatform;

  /** Time period analyzed */
  period: AIDateRange;

  /** Total number of users */
  totalUsers: number;

  /** Number of active users in period */
  activeUsers: number;

  /** Total events/activities */
  totalEvents: number;

  /** Top users by activity */
  topUsers: TopUserMetric[];

  /** Event counts by type */
  eventsByType: Record<string, number>;

  /** Daily activity breakdown */
  dailyBreakdown: DailyActivityMetric[];

  /** Model usage statistics (if applicable) */
  modelUsage?: ModelUsageMetric[];
}

/**
 * Top user activity metric
 */
export interface TopUserMetric {
  /** User identifier */
  userId: string;

  /** User email */
  email: string;

  /** Total event count */
  eventCount: number;

  /** Last activity timestamp */
  lastActivity?: Date;

  /** Risk score for user (if calculated) */
  riskScore?: number;
}

/**
 * Daily activity metric
 */
export interface DailyActivityMetric {
  /** Date (ISO 8601) */
  date: string;

  /** Active users on this day */
  activeUsers: number;

  /** Total events on this day */
  totalEvents: number;

  /** Peak activity hour (0-23) */
  peakHour?: number;
}

/**
 * Model usage metric
 */
export interface ModelUsageMetric {
  /** Model name/identifier */
  model: string;

  /** Number of times used */
  usageCount: number;

  /** Total tokens consumed */
  totalTokens?: number;

  /** Cost estimate (if available) */
  costEstimate?: number;
}

/**
 * AI platform connection status
 */
export interface AIPlatformConnectionStatus {
  /** Platform */
  platform: AIPlatform;

  /** Whether connection is active */
  isConnected: boolean;

  /** Last successful sync */
  lastSyncAt?: Date;

  /** Next scheduled sync */
  nextSyncAt?: Date;

  /** Current status */
  status: 'active' | 'disconnected' | 'error' | 'pending';

  /** Error message if status is 'error' */
  error?: string;

  /** Credentials expiration */
  credentialsExpiresAt?: Date;
}

/**
 * Batch processing result for AI audit logs
 */
export interface AIAuditLogBatchResult {
  /** Total logs processed */
  totalProcessed: number;

  /** Successfully processed logs */
  successCount: number;

  /** Failed logs */
  failureCount: number;

  /** Processing errors */
  errors: Array<{
    logId: string;
    error: string;
  }>;

  /** Processing duration (ms) */
  processingTime: number;

  /** Timestamp of batch processing */
  processedAt: Date;
}
