/**
 * Claude Enterprise Audit Log Types
 *
 * Type definitions for Anthropic Claude Enterprise audit log export functionality
 * Based on: Claude Enterprise Documentation (2025)
 *
 * @module platforms/claude-enterprise
 */

/**
 * Claude Audit Log Entry
 */
export interface ClaudeAuditLogEntry {
  /** Unique identifier for the audit log entry */
  id: string;

  /** Timestamp in ISO 8601 format */
  timestamp: string;

  /** Organization ID */
  organization_id: string;

  /** User ID who performed the action */
  user_id: string;

  /** User email */
  user_email: string;

  /** Type of event */
  event_type: ClaudeEventType;

  /** Event-specific data */
  event_data: ClaudeEventData;

  /** Additional event metadata */
  metadata: ClaudeEventMetadata;
}

/**
 * Claude event types
 */
export type ClaudeEventType =
  // Authentication events
  | 'user.login'
  | 'user.logout'
  | 'user.login.failed'
  // Conversation events
  | 'conversation.started'
  | 'conversation.archived'
  | 'conversation.deleted'
  // Message events
  | 'message.sent'
  | 'message.received'
  | 'message.edited'
  | 'message.deleted'
  // Artifact events (Claude's code/document artifacts)
  | 'artifact.created'
  | 'artifact.updated'
  | 'artifact.deleted'
  | 'artifact.published'
  // File events
  | 'file.uploaded'
  | 'file.downloaded'
  | 'file.deleted'
  // Project events
  | 'project.created'
  | 'project.updated'
  | 'project.archived'
  // Settings events
  | 'settings.updated'
  // API key events
  | 'api.key_created'
  | 'api.key_revoked'
  // Workspace events
  | 'workspace.member_added'
  | 'workspace.member_removed'
  | 'workspace.settings_changed';

/**
 * Event-specific data for Claude events
 */
export interface ClaudeEventData {
  /** Conversation ID */
  conversation_id?: string;

  /** Message ID */
  message_id?: string;

  /** Artifact ID */
  artifact_id?: string;

  /** AI model used */
  model?: string;

  /** Token usage */
  tokens?: {
    /** Input tokens */
    input: number;
    /** Output tokens */
    output: number;
  };

  /** File IDs involved */
  file_ids?: string[];

  /** Content type */
  content_type?: string;

  /** Artifact type (if applicable) */
  artifact_type?: 'code' | 'document' | 'html' | 'svg' | 'mermaid' | 'react';

  /** Project ID */
  project_id?: string;

  /** Settings changed (if event_type is settings.updated) */
  settings_changed?: Record<string, any>;

  /** API key ID (if applicable) */
  api_key_id?: string;

  /** Additional event-specific fields */
  [key: string]: any;
}

/**
 * Metadata for Claude events
 */
export interface ClaudeEventMetadata {
  /** IP address */
  ip_address?: string;

  /** User agent string */
  user_agent?: string;

  /** Session ID */
  session_id?: string;

  /** Geographic location */
  location?: {
    /** Country code */
    country?: string;
    /** Region/state */
    region?: string;
  };

  /** Client information */
  client?: {
    /** Client name (e.g., 'web', 'ios', 'android') */
    name: string;
    /** Client version */
    version: string;
  };

  /** Request ID for tracing */
  request_id?: string;
}

/**
 * Request parameters for exporting Claude audit logs
 */
export interface ClaudeAuditLogExportRequest {
  /** Start date (ISO 8601, max 180 days ago) */
  start_date: string;

  /** End date (ISO 8601) */
  end_date: string;

  /** Filter by specific user IDs */
  user_ids?: string[];

  /** Filter by event types */
  event_types?: ClaudeEventType[];

  /** Export format */
  format?: 'json' | 'csv';

  /** Include deleted items */
  include_deleted?: boolean;
}

/**
 * Response from Claude audit log export request
 */
export interface ClaudeAuditLogExportResponse {
  /** Export job ID */
  export_id: string;

  /** Export status */
  status: 'pending' | 'processing' | 'completed' | 'failed';

  /** Download URL (when status is 'completed') */
  download_url?: string;

  /** URL expiration time */
  expires_at?: string;

  /** Total number of events in export */
  total_events: number;

  /** File size in bytes (when completed) */
  file_size?: number;

  /** Error message (if status is 'failed') */
  error?: string;

  /** Created timestamp */
  created_at: string;

  /** Completed timestamp (if applicable) */
  completed_at?: string;
}

/**
 * Claude Enterprise API configuration
 */
export interface ClaudeEnterpriseConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Organization ID */
  organizationId: string;

  /** Base URL (default: https://api.anthropic.com) */
  baseUrl?: string;

  /** Request timeout */
  timeout?: number;
}

/**
 * Claude usage analytics for an organization
 */
export interface ClaudeUsageAnalytics {
  /** Time period analyzed */
  period: {
    /** Start timestamp (ISO 8601) */
    start: string;
    /** End timestamp (ISO 8601) */
    end: string;
  };

  /** Organization ID */
  organization_id: string;

  /** User-level usage data */
  users: ClaudeUserUsage[];

  /** Aggregated metrics */
  aggregates: ClaudeUsageAggregates;
}

/**
 * Per-user usage data for Claude
 */
export interface ClaudeUserUsage {
  /** User ID */
  user_id: string;

  /** User email */
  user_email: string;

  /** Total conversations */
  total_conversations: number;

  /** Total messages sent */
  total_messages: number;

  /** Total tokens consumed */
  total_tokens: {
    input: number;
    output: number;
  };

  /** Number of days active */
  active_days: number;

  /** Last activity timestamp */
  last_activity: string;

  /** Artifacts created */
  artifacts_created?: number;

  /** Files uploaded */
  files_uploaded?: number;

  /** Most used model */
  primary_model?: string;
}

/**
 * Aggregated usage metrics for Claude
 */
export interface ClaudeUsageAggregates {
  /** Total unique users */
  total_users: number;

  /** Active users (sent at least one message) */
  active_users: number;

  /** Total conversations across organization */
  total_conversations: number;

  /** Total messages across organization */
  total_messages: number;

  /** Total tokens consumed */
  total_tokens: {
    input: number;
    output: number;
  };

  /** Average messages per user */
  average_messages_per_user: number;

  /** Average conversations per active user */
  average_conversations_per_active_user: number;

  /** Model usage distribution */
  model_distribution: {
    [model: string]: number; // Percentage (0-100)
  };
}

/**
 * Claude artifact information
 */
export interface ClaudeArtifact {
  /** Artifact ID */
  id: string;

  /** Conversation ID */
  conversation_id: string;

  /** Message ID that created this artifact */
  message_id: string;

  /** Artifact type */
  type: 'code' | 'document' | 'html' | 'svg' | 'mermaid' | 'react';

  /** Artifact title */
  title: string;

  /** Artifact content */
  content: string;

  /** Programming language (for code artifacts) */
  language?: string;

  /** Created timestamp */
  created_at: string;

  /** Updated timestamp */
  updated_at: string;

  /** Creator user ID */
  created_by: string;

  /** Whether artifact is published */
  is_published: boolean;

  /** Version number */
  version: number;
}

/**
 * Claude Project (workspace) information
 */
export interface ClaudeProject {
  /** Project ID */
  id: string;

  /** Project name */
  name: string;

  /** Project description */
  description?: string;

  /** Organization ID */
  organization_id: string;

  /** Created timestamp */
  created_at: string;

  /** Updated timestamp */
  updated_at: string;

  /** Creator user ID */
  created_by: string;

  /** Whether project is archived */
  is_archived: boolean;

  /** Project members */
  members?: Array<{
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    added_at: string;
  }>;

  /** Project settings */
  settings?: {
    default_model?: string;
    max_tokens?: number;
    temperature?: number;
  };
}

/**
 * Claude API rate limit information
 */
export interface ClaudeRateLimitInfo {
  /** Requests remaining in current window */
  requests_remaining: number;

  /** Total requests allowed per window */
  requests_limit: number;

  /** Tokens remaining in current window */
  tokens_remaining: number;

  /** Total tokens allowed per window */
  tokens_limit: number;

  /** When rate limit resets (ISO 8601) */
  reset_at: string;

  /** Rate limit window in seconds */
  window_seconds: number;
}
