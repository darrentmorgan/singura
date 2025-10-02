/**
 * ChatGPT Enterprise Compliance API Types
 *
 * Type definitions for OpenAI's ChatGPT Enterprise Compliance API
 * API Documentation: https://platform.openai.com/docs/api-reference/audit-logs
 *
 * @module platforms/chatgpt-enterprise
 */

/**
 * ChatGPT Audit Log Entry from Compliance API
 */
export interface ChatGPTAuditLogEntry {
  /** Unique identifier for the audit log entry */
  id: string;

  /** Type of event that occurred */
  type: ChatGPTEventType;

  /** Unix timestamp when the event occurred */
  effective_at: number;

  /** Actor who performed the action */
  actor: ChatGPTActor;

  /** API key information (if applicable) */
  api_key?: ChatGPTAPIKey;

  /** Project information (if applicable) */
  project?: ChatGPTProject;

  /** Organization information */
  organization?: ChatGPTOrganization;

  /** Additional event-specific data */
  [key: string]: any;
}

/**
 * ChatGPT event types from Compliance API
 */
export type ChatGPTEventType =
  // User authentication events
  | 'user.login'
  | 'user.login.failed'
  | 'user.logout'
  // Conversation events
  | 'conversation.created'
  | 'conversation.deleted'
  | 'conversation.message'
  // File events
  | 'file.uploaded'
  | 'file.downloaded'
  | 'file.deleted'
  // GPT/Assistant events
  | 'gpt.created'
  | 'gpt.updated'
  | 'gpt.deleted'
  // API key management
  | 'api_key.created'
  | 'api_key.updated'
  | 'api_key.deleted'
  // Project/workspace events
  | 'project.created'
  | 'project.updated'
  | 'project.archived'
  // Settings events
  | 'settings.updated'
  // Sharing events
  | 'share.created'
  | 'share.revoked';

/**
 * Actor information for ChatGPT events
 */
export interface ChatGPTActor {
  /** Type of actor */
  type: 'user' | 'api_key' | 'system';

  /** User information (if type is 'user') */
  user?: {
    /** User ID */
    id: string;
    /** User email */
    email: string;
  };

  /** Session information */
  session?: {
    /** Session ID */
    id: string;
    /** IP address */
    ip_address?: string;
    /** User agent */
    user_agent?: string;
  };

  /** API key information (if type is 'api_key') */
  api_key?: {
    /** API key ID */
    id: string;
    /** API key type */
    type: 'user' | 'service_account';
  };
}

/**
 * API key information
 */
export interface ChatGPTAPIKey {
  /** API key ID */
  id: string;

  /** API key type */
  type: 'user' | 'service_account';

  /** User who owns the key (if type is 'user') */
  user?: {
    id: string;
    email: string;
  };

  /** Service account information (if type is 'service_account') */
  service_account?: {
    id: string;
  };
}

/**
 * Project/workspace information
 */
export interface ChatGPTProject {
  /** Project ID */
  id: string;

  /** Project name */
  name: string;

  /** Project creation time */
  created_at?: number;
}

/**
 * Organization information
 */
export interface ChatGPTOrganization {
  /** Organization ID */
  id: string;

  /** Organization name */
  name: string;
}

/**
 * Conversation metadata from ChatGPT
 */
export interface ChatGPTConversationMetadata {
  /** Conversation ID */
  id: string;

  /** Conversation title */
  title?: string;

  /** Model used */
  model: string;

  /** Number of messages */
  message_count: number;

  /** Creation timestamp */
  created_at: number;

  /** Last update timestamp */
  updated_at: number;

  /** Parent message ID (for branched conversations) */
  parent_message_id?: string;

  /** Whether conversation is archived */
  is_archived?: boolean;
}

/**
 * ChatGPT Compliance API configuration
 */
export interface ChatGPTComplianceAPIConfig {
  /** OpenAI API key with audit_logs.read scope */
  apiKey: string;

  /** Organization ID */
  organizationId: string;

  /** Base URL (default: https://api.openai.com/v1) */
  baseUrl?: string;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Query parameters for ChatGPT audit logs
 */
export interface ChatGPTAuditLogQuery {
  /** Filter by effective_at timestamp */
  effective_at?: {
    /** Greater than timestamp */
    gt?: number;
    /** Greater than or equal */
    gte?: number;
    /** Less than timestamp */
    lt?: number;
    /** Less than or equal */
    lte?: number;
  };

  /** Filter by project IDs */
  project_ids?: string[];

  /** Filter by actor IDs */
  actor_ids?: string[];

  /** Filter by actor emails */
  actor_emails?: string[];

  /** Filter by event types */
  event_types?: ChatGPTEventType[];

  /** Maximum number of results (max 100) */
  limit?: number;

  /** Cursor for pagination (after this ID) */
  after?: string;

  /** Cursor for pagination (before this ID) */
  before?: string;
}

/**
 * Response from ChatGPT audit logs API
 */
export interface ChatGPTAuditLogResponse {
  /** Object type (always 'list') */
  object: 'list';

  /** Array of audit log entries */
  data: ChatGPTAuditLogEntry[];

  /** First entry ID */
  first_id: string;

  /** Last entry ID */
  last_id: string;

  /** Whether more results are available */
  has_more: boolean;
}

/**
 * ChatGPT user information
 */
export interface ChatGPTUser {
  /** User ID */
  id: string;

  /** User email */
  email: string;

  /** User name */
  name?: string;

  /** Role in organization */
  role?: 'owner' | 'admin' | 'member';

  /** When user was added */
  added_at?: number;
}

/**
 * ChatGPT usage statistics
 */
export interface ChatGPTUsageStatistics {
  /** Time period */
  period: {
    start: number; // Unix timestamp
    end: number;
  };

  /** Organization ID */
  organization_id: string;

  /** Total conversations */
  total_conversations: number;

  /** Total messages */
  total_messages: number;

  /** Total tokens used */
  total_tokens: {
    prompt: number;
    completion: number;
    total: number;
  };

  /** Active users */
  active_users: number;

  /** Model usage breakdown */
  model_usage: {
    [model: string]: {
      conversations: number;
      messages: number;
      tokens: number;
    };
  };

  /** Top users by activity */
  top_users: Array<{
    user_id: string;
    email: string;
    conversation_count: number;
    message_count: number;
    token_count: number;
  }>;
}

/**
 * ChatGPT file upload information
 */
export interface ChatGPTFileUpload {
  /** File ID */
  id: string;

  /** Original filename */
  filename: string;

  /** MIME type */
  content_type: string;

  /** File size in bytes */
  size: number;

  /** Upload timestamp */
  uploaded_at: number;

  /** Uploader user ID */
  uploaded_by: string;

  /** Conversation ID (if associated) */
  conversation_id?: string;

  /** File purpose */
  purpose?: 'assistants' | 'vision' | 'batch';

  /** File status */
  status: 'uploaded' | 'processed' | 'error';
}

/**
 * ChatGPT sharing/collaboration event
 */
export interface ChatGPTSharingEvent {
  /** Share ID */
  id: string;

  /** Type of share */
  type: 'gpt' | 'conversation';

  /** Resource ID being shared */
  resource_id: string;

  /** User who created the share */
  shared_by: string;

  /** User(s) shared with */
  shared_with: string[];

  /** Share permissions */
  permissions: ('read' | 'write' | 'admin')[];

  /** When share was created */
  created_at: number;

  /** When share expires (if applicable) */
  expires_at?: number;

  /** Whether share is active */
  is_active: boolean;
}

/**
 * ChatGPT Enterprise organization settings
 */
export interface ChatGPTOrganizationSettings {
  /** Organization ID */
  organization_id: string;

  /** Data retention policy (days) */
  data_retention_days?: number;

  /** Whether conversations are retained */
  retain_conversations: boolean;

  /** Whether to log user activity */
  activity_logging_enabled: boolean;

  /** Allowed models */
  allowed_models?: string[];

  /** Blocked capabilities */
  blocked_capabilities?: string[];

  /** SSO configuration */
  sso_enabled?: boolean;

  /** Domain restrictions */
  allowed_domains?: string[];
}

/**
 * Error response from ChatGPT API
 */
export interface ChatGPTAPIError {
  /** Error object */
  error: {
    /** Error message */
    message: string;
    /** Error type */
    type: string;
    /** Error parameter (if applicable) */
    param?: string;
    /** Error code */
    code?: string;
  };
}
