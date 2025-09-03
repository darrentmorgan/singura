/**
 * Audit Log domain model types
 * Comprehensive audit logging for compliance and security monitoring
 */

/**
 * Types of auditable events
 */
export type AuditEventType = 
  | 'user_login'
  | 'user_logout' 
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'connection_created'
  | 'connection_updated'
  | 'connection_deleted'
  | 'automation_discovered'
  | 'automation_updated'
  | 'automation_risk_changed'
  | 'oauth_granted'
  | 'oauth_revoked'
  | 'data_exported'
  | 'settings_changed'
  | 'api_access'
  | 'security_event'
  | 'compliance_report'
  | 'system_event';

/**
 * Audit event severity levels
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Core Audit Log entry
 */
export interface AuditLogEntry {
  /** Unique audit log entry ID */
  id: string;
  
  /** Organization this event belongs to */
  organizationId: string;
  
  /** Event type */
  eventType: AuditEventType;
  
  /** Event severity */
  severity: AuditSeverity;
  
  /** Human-readable event description */
  description: string;
  
  /** User who performed the action (if applicable) */
  userId?: string;
  
  /** User email for easy reference */
  userEmail?: string;
  
  /** IP address of the actor */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Resource that was affected */
  resource: AuditResource;
  
  /** Event details and metadata */
  details: AuditEventDetails;
  
  /** Geographic information */
  location?: GeoLocation;
  
  /** Compliance tags */
  complianceTags: string[];
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Session ID if applicable */
  sessionId?: string;
  
  /** Request ID for correlation */
  requestId?: string;
}

/**
 * Resource affected by the audit event
 */
export interface AuditResource {
  /** Resource type */
  type: 'user' | 'organization' | 'connection' | 'automation' | 'api' | 'system';
  
  /** Resource identifier */
  id: string;
  
  /** Resource name for display */
  name: string;
  
  /** Parent resource if applicable */
  parent?: {
    type: string;
    id: string;
    name: string;
  };
}

/**
 * Detailed event information
 */
export interface AuditEventDetails {
  /** Changes made (for update events) */
  changes?: AuditChange[];
  
  /** Previous state snapshot */
  previousState?: Record<string, unknown>;
  
  /** New state snapshot */
  newState?: Record<string, unknown>;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  
  /** API endpoint called */
  apiEndpoint?: string;
  
  /** HTTP method used */
  httpMethod?: string;
  
  /** HTTP status code */
  statusCode?: number;
  
  /** Response time in ms */
  responseTime?: number;
  
  /** Error information */
  error?: {
    code: string;
    message: string;
    stackTrace?: string;
  };
  
  /** Security context */
  security?: {
    /** Authentication method used */
    authMethod: 'password' | 'oauth' | 'api_key' | 'jwt';
    
    /** Whether MFA was used */
    mfaUsed: boolean;
    
    /** Risk score of the action */
    riskScore?: number;
    
    /** Security flags */
    flags?: string[];
  };
}

/**
 * Individual change within an audit event
 */
export interface AuditChange {
  /** Field that changed */
  field: string;
  
  /** Previous value */
  previousValue: unknown;
  
  /** New value */
  newValue: unknown;
  
  /** Change type */
  changeType: 'added' | 'modified' | 'removed';
}

/**
 * Geographic location information
 */
export interface GeoLocation {
  /** Country code */
  country: string;
  
  /** Country name */
  countryName: string;
  
  /** Region/state */
  region?: string;
  
  /** City */
  city?: string;
  
  /** Timezone */
  timezone?: string;
  
  /** Latitude */
  latitude?: number;
  
  /** Longitude */
  longitude?: number;
  
  /** ISP information */
  isp?: string;
  
  /** Whether this is a known location for the user */
  isKnownLocation?: boolean;
}

/**
 * Audit log search/filter criteria
 */
export interface AuditLogFilter {
  /** Organization ID */
  organizationId: string;
  
  /** Date range */
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  
  /** Event types to include */
  eventTypes?: AuditEventType[];
  
  /** Severity levels to include */
  severities?: AuditSeverity[];
  
  /** User ID filter */
  userId?: string;
  
  /** User email filter */
  userEmail?: string;
  
  /** Resource type filter */
  resourceType?: string;
  
  /** Resource ID filter */
  resourceId?: string;
  
  /** IP address filter */
  ipAddress?: string;
  
  /** Compliance tags filter */
  complianceTags?: string[];
  
  /** Text search in description */
  searchText?: string;
  
  /** Pagination */
  pagination?: {
    offset: number;
    limit: number;
  };
  
  /** Sorting */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}


/**
 * Audit log retention policy
 */
export interface AuditLogRetentionPolicy {
  /** Organization ID */
  organizationId: string;
  
  /** Default retention period in days */
  defaultRetentionDays: number;
  
  /** Event-specific retention rules */
  eventRules: AuditRetentionRule[];
  
  /** Compliance requirements */
  complianceRequirements: {
    /** GDPR requirements */
    gdpr?: {
      retentionDays: number;
      autoDelete: boolean;
    };
    
    /** SOX requirements */
    sox?: {
      retentionDays: number;
      immutableStorage: boolean;
    };
    
    /** Custom compliance rules */
    custom?: Array<{
      name: string;
      retentionDays: number;
      requirements: string[];
    }>;
  };
}

/**
 * Event-specific retention rule
 */
export interface AuditRetentionRule {
  /** Event type this rule applies to */
  eventType: AuditEventType;
  
  /** Retention period in days */
  retentionDays: number;
  
  /** Whether to archive instead of delete */
  archive: boolean;
  
  /** Archive location if applicable */
  archiveLocation?: string;
}

/**
 * Audit log statistics and summary
 */
export interface AuditLogSummary {
  /** Organization ID */
  organizationId: string;
  
  /** Summary period */
  period: {
    startDate: Date;
    endDate: Date;
  };
  
  /** Total events */
  totalEvents: number;
  
  /** Events by type */
  eventsByType: Record<AuditEventType, number>;
  
  /** Events by severity */
  eventsBySeverity: Record<AuditSeverity, number>;
  
  /** Events by user */
  eventsByUser: Array<{
    userId: string;
    userEmail: string;
    count: number;
  }>;
  
  /** Top IP addresses */
  topIpAddresses: Array<{
    ipAddress: string;
    count: number;
    locations: string[];
  }>;
  
  /** Security events summary */
  securityEvents: {
    failedLogins: number;
    suspiciousActivity: number;
    dataExports: number;
    permissionChanges: number;
  };
  
  /** Compliance events summary */
  complianceEvents: {
    gdprRelated: number;
    dataRetention: number;
    userRights: number;
  };
}

/**
 * Real-time audit event for streaming
 */
export interface AuditEventStream {
  /** Event ID */
  id: string;
  
  /** Organization ID */
  organizationId: string;
  
  /** Event type */
  eventType: AuditEventType;
  
  /** Event severity */
  severity: AuditSeverity;
  
  /** Event description */
  description: string;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** User information */
  user?: {
    id: string;
    email: string;
    name: string;
  };
  
  /** Resource information */
  resource: AuditResource;
  
  /** Whether this event should trigger alerts */
  shouldAlert: boolean;
  
  /** Compliance relevance */
  complianceRelevant: boolean;
}