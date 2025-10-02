/**
 * Google Gemini Workspace Reporting API Types
 *
 * Type definitions for Google Admin SDK Reports API - Gemini Activities
 * API Documentation: https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities
 *
 * @module platforms/gemini-workspace
 */

/**
 * Gemini Audit Event from Google Admin SDK Reports API
 */
export interface GeminiAuditEvent {
  /** Kind identifier (always 'admin#reports#activity') */
  kind: 'admin#reports#activity';

  /** Event identifier */
  id: {
    /** Event time (RFC 3339 timestamp) */
    time: string;
    /** Unique qualifier for this event */
    uniqueQualifier: string;
    /** Application name (always 'gemini') */
    applicationName: 'gemini';
    /** Customer ID */
    customerId: string;
  };

  /** Actor who performed the action */
  actor: GeminiActor;

  /** Owner domain */
  ownerDomain?: string;

  /** IP address of the actor */
  ipAddress?: string;

  /** Events array (typically contains one event) */
  events: GeminiEvent[];

  /** ETag */
  etag?: string;
}

/**
 * Actor information for Gemini events
 */
export interface GeminiActor {
  /** User email */
  email: string;

  /** Profile ID */
  profileId: string;

  /** Caller type */
  callerType: 'USER' | 'APPLICATION' | 'SERVICE_ACCOUNT';

  /** Additional actor key (if applicable) */
  key?: string;
}

/**
 * Gemini event details
 */
export interface GeminiEvent {
  /** Event type (always 'gemini_activity') */
  type: 'gemini_activity';

  /** Specific event name */
  name: GeminiEventName;

  /** Event parameters */
  parameters: GeminiEventParameter[];
}

/**
 * Gemini event names (activities tracked)
 */
export type GeminiEventName =
  // General Gemini usage
  | 'gemini_used'
  // Gmail features
  | 'help_me_write'       // Gmail: Help me write
  | 'smart_reply'         // Gmail: Smart reply
  | 'summarize'           // Gmail: Summarize emails
  // Docs features
  | 'help_me_organize'    // Docs: Help me organize
  | 'proofread'           // Docs: Proofread
  | 'write_content'       // Docs: Write content
  // Sheets features
  | 'analyze_data'        // Sheets: Analyze data
  | 'create_chart'        // Sheets: Create chart
  | 'generate_formula'    // Sheets: Generate formula
  // Slides features
  | 'create_presentation' // Slides: Create presentation
  | 'generate_image'      // Slides: Generate image
  | 'design_slide'        // Slides: Design slide
  // Meet features
  | 'take_notes'          // Meet: Take notes
  | 'summarize_meeting'   // Meet: Summarize meeting
  // Drive features
  | 'organize_files'      // Drive: Organize files
  | 'smart_search'        // Drive: Smart search
  // General AI features
  | 'code_generation'     // Generate code
  | 'remove_background'   // Image: Remove background
  | 'translate'           // Translate text
  | 'sentiment_analysis'; // Analyze sentiment

/**
 * Event parameter (key-value pair)
 */
export interface GeminiEventParameter {
  /** Parameter name */
  name: string;

  /** String value */
  value?: string;

  /** Integer value */
  intValue?: string; // Note: Google API returns this as string

  /** Boolean value */
  boolValue?: boolean;

  /** Multi-value (array) */
  multiValue?: string[];

  /** Nested message value */
  messageValue?: {
    /** Nested parameters */
    parameter: GeminiEventParameter[];
  };
}

/**
 * Normalized Gemini activity details
 */
export interface GeminiActivityDetails {
  /** Google Workspace application */
  application: GeminiApplication;

  /** Specific feature used */
  feature: string;

  /** Action performed */
  action: string;

  /** Activity timestamp */
  timestamp: Date;

  /** User ID */
  userId: string;

  /** User email */
  userEmail: string;

  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Google Workspace applications with Gemini integration
 */
export type GeminiApplication =
  | 'gmail'
  | 'docs'
  | 'sheets'
  | 'slides'
  | 'drive'
  | 'meet'
  | 'gemini_app'; // Standalone Gemini app

/**
 * Query parameters for Gemini Reporting API
 */
export interface GeminiReportingAPIQuery {
  /** User key ('all' for all users or specific email) */
  userKey: 'all' | string;

  /** Application name (always 'gemini') */
  applicationName: 'gemini';

  /** Start time (RFC 3339) */
  startTime: string;

  /** End time (RFC 3339, optional) */
  endTime?: string;

  /** Maximum results per page (max 1000) */
  maxResults?: number;

  /** Page token for pagination */
  pageToken?: string;

  /** Event name filter */
  eventName?: GeminiEventName;

  /** Additional filters (Admin SDK filter syntax) */
  filters?: string;

  /** Custom parameters */
  customerId?: string;
}

/**
 * Response from Gemini Reporting API
 */
export interface GeminiReportingAPIResponse {
  /** Kind identifier */
  kind: 'admin#reports#activities';

  /** ETag */
  etag: string;

  /** Token for next page */
  nextPageToken?: string;

  /** Array of activities */
  items: GeminiAuditEvent[];
}

/**
 * Gemini usage metrics aggregated by application
 */
export interface GeminiUsageMetrics {
  /** Time period */
  period: {
    start: Date;
    end: Date;
  };

  /** Total unique users */
  totalUsers: number;

  /** Active users (used Gemini at least once) */
  activeUsers: number;

  /** Usage breakdown by application */
  usageByApplication: {
    [key in GeminiApplication]: GeminiAppUsage;
  };

  /** Top users by activity */
  topUsers: Array<{
    email: string;
    totalActions: number;
    applications: GeminiApplication[];
    primaryApplication: GeminiApplication;
  }>;

  /** Most popular features */
  topFeatures: Array<{
    feature: GeminiEventName;
    count: number;
    application: GeminiApplication;
  }>;

  /** Daily usage trend */
  dailyTrend: Array<{
    date: string;
    activeUsers: number;
    totalActions: number;
  }>;
}

/**
 * Usage metrics for a specific Gemini application
 */
export interface GeminiAppUsage {
  /** Total actions in this application */
  totalActions: number;

  /** Unique users in this application */
  uniqueUsers: number;

  /** Top features used */
  topFeatures: Array<{
    feature: string;
    count: number;
  }>;

  /** Average actions per user */
  averageActionsPerUser: number;
}

/**
 * Gemini feature usage detail
 */
export interface GeminiFeatureUsage {
  /** Feature name */
  feature: GeminiEventName;

  /** Application where feature is used */
  application: GeminiApplication;

  /** Usage count */
  count: number;

  /** Unique users who used this feature */
  uniqueUsers: number;

  /** First usage timestamp */
  firstUsed: Date;

  /** Most recent usage timestamp */
  lastUsed: Date;

  /** Average usage per user */
  averagePerUser: number;
}

/**
 * Gemini user activity profile
 */
export interface GeminiUserProfile {
  /** User email */
  email: string;

  /** User profile ID */
  profileId: string;

  /** First Gemini usage */
  firstActivity: Date;

  /** Most recent Gemini usage */
  lastActivity: Date;

  /** Total actions performed */
  totalActions: number;

  /** Applications used */
  applicationsUsed: GeminiApplication[];

  /** Primary application */
  primaryApplication: GeminiApplication;

  /** Favorite features */
  favoriteFeatures: GeminiEventName[];

  /** Usage pattern */
  usagePattern: {
    /** Peak usage hours (0-23) */
    peakHours: number[];
    /** Peak usage days (0-6, 0=Sunday) */
    peakDays: number[];
    /** Average actions per day */
    averageActionsPerDay: number;
  };
}

/**
 * Gemini admin SDK configuration
 */
export interface GeminiAdminSDKConfig {
  /** Google OAuth2 client */
  auth: any; // google.auth.OAuth2Client

  /** Customer ID (optional, defaults to 'my_customer') */
  customerId?: string;

  /** Request timeout */
  timeout?: number;
}

/**
 * Gemini activity summary for dashboard
 */
export interface GeminiActivitySummary {
  /** Summary period */
  period: {
    start: string;
    end: string;
  };

  /** Total Gemini actions */
  totalActions: number;

  /** Active users */
  activeUsers: number;

  /** Growth rate compared to previous period */
  growthRate?: number;

  /** Most active application */
  topApplication: {
    name: GeminiApplication;
    actionCount: number;
    percentage: number;
  };

  /** Most popular feature */
  topFeature: {
    name: GeminiEventName;
    count: number;
  };

  /** Risk indicators */
  riskIndicators: Array<{
    type: 'excessive_usage' | 'off_hours' | 'sensitive_data';
    count: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Parameters for extracting specific data from Gemini events
 */
export interface GeminiEventExtractor {
  /** Extract application name from parameters */
  extractApplication(parameters: GeminiEventParameter[]): GeminiApplication | undefined;

  /** Extract feature details from parameters */
  extractFeatureDetails(parameters: GeminiEventParameter[]): Record<string, any>;

  /** Determine if event indicates sensitive data usage */
  isSensitiveDataEvent(event: GeminiEvent): boolean;
}
