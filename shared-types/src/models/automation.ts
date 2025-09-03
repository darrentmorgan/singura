/**
 * Automation domain model types
 * Core types for discovered automations and bots across SaaS platforms
 */

/**
 * Types of automations we can discover
 */
export type AutomationType = 
  | 'bot' 
  | 'webhook' 
  | 'workflow' 
  | 'script' 
  | 'integration' 
  | 'ai_service' 
  | 'custom_app'
  | 'service_account';

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Automation status
 */
export type AutomationStatus = 'active' | 'inactive' | 'error' | 'unknown';

/**
 * AI service providers we detect
 */
export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'cohere' 
  | 'huggingface' 
  | 'custom'
  | 'unknown';

/**
 * Core Automation entity
 */
export interface Automation {
  /** Unique automation identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Automation description */
  description?: string;
  
  /** Type of automation */
  type: AutomationType;
  
  /** Current status */
  status: AutomationStatus;
  
  /** Platform where automation was discovered */
  platform: string;
  
  /** Platform-specific automation ID */
  platformId: string;
  
  /** Organization that owns this automation */
  organizationId: string;
  
  /** Connection used to discover this automation */
  connectionId: string;
  
  /** Risk assessment */
  risk: AutomationRisk;
  
  /** Permissions and access levels */
  permissions: AutomationPermissions;
  
  /** AI-specific information if applicable */
  aiInfo?: AutomationAIInfo;
  
  /** Technical metadata */
  metadata: AutomationMetadata;
  
  /** Discovery and update timestamps */
  discoveredAt: Date;
  lastSeenAt: Date;
  updatedAt: Date;
}

/**
 * Risk assessment for an automation
 */
export interface AutomationRisk {
  /** Overall risk score (0-100) */
  score: number;
  
  /** Risk level classification */
  level: RiskLevel;
  
  /** Risk factors contributing to the score */
  factors: RiskFactor[];
  
  /** GDPR compliance concerns */
  gdprConcerns: string[];
  
  /** Data sensitivity assessment */
  dataSensitivity: DataSensitivity;
  
  /** Last risk assessment date */
  assessedAt: Date;
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  /** Factor type */
  type: 'data_access' | 'external_api' | 'ai_provider' | 'permissions' | 'activity';
  
  /** Human-readable description */
  description: string;
  
  /** Risk contribution (0-100) */
  score: number;
  
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Evidence supporting this factor */
  evidence?: string[];
}

/**
 * Data sensitivity classification
 */
export interface DataSensitivity {
  /** Contains personally identifiable information */
  hasPII: boolean;
  
  /** Contains financial information */
  hasFinancial: boolean;
  
  /** Contains health information */
  hasHealthData: boolean;
  
  /** Contains confidential business data */
  hasConfidential: boolean;
  
  /** Data types detected */
  dataTypes: string[];
  
  /** Estimated data volume */
  estimatedVolume: 'low' | 'medium' | 'high';
}

/**
 * Automation permissions and access levels
 */
export interface AutomationPermissions {
  /** OAuth scopes granted */
  scopes: string[];
  
  /** Specific permissions */
  permissions: Permission[];
  
  /** Can read data */
  canRead: boolean;
  
  /** Can write/modify data */
  canWrite: boolean;
  
  /** Can delete data */
  canDelete: boolean;
  
  /** Has admin privileges */
  isAdmin: boolean;
  
  /** Last permission review date */
  lastReviewedAt?: Date;
}

/**
 * Individual permission details
 */
export interface Permission {
  /** Permission name */
  name: string;
  
  /** Permission description */
  description: string;
  
  /** Resource this permission applies to */
  resource: string;
  
  /** Access level granted */
  level: 'read' | 'write' | 'admin';
  
  /** When permission was granted */
  grantedAt: Date;
  
  /** User who granted permission */
  grantedBy?: string;
}

/**
 * AI-specific automation information
 */
export interface AutomationAIInfo {
  /** AI service provider */
  provider: AIProvider;
  
  /** AI model being used */
  model?: string;
  
  /** API endpoints being accessed */
  endpoints: string[];
  
  /** Estimated API usage per day */
  dailyApiCalls?: number;
  
  /** AI service configuration */
  configuration?: {
    temperature?: number;
    maxTokens?: number;
    customPrompts?: boolean;
    fineTuned?: boolean;
  };
  
  /** Data flow to AI service */
  dataFlow: AIDataFlow;
}

/**
 * Data flow to AI services
 */
export interface AIDataFlow {
  /** Types of data sent to AI */
  inputDataTypes: string[];
  
  /** Data processing patterns */
  processingType: 'real_time' | 'batch' | 'on_demand';
  
  /** Estimated data volume */
  volumeEstimate: 'low' | 'medium' | 'high';
  
  /** Data retention by AI service */
  retentionPeriod?: string;
  
  /** Geographic data processing location */
  processingRegion?: string;
}

/**
 * Technical metadata about the automation
 */
export interface AutomationMetadata {
  /** Creation timestamp on platform */
  createdAt?: Date;
  
  /** Last modified on platform */
  lastModifiedAt?: Date;
  
  /** Creator information */
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  
  /** Version information */
  version?: string;
  
  /** Source code or configuration */
  source?: string;
  
  /** Dependencies */
  dependencies?: string[];
  
  /** Environment variables */
  environment?: Record<string, string>;
  
  /** Webhook URLs */
  webhookUrls?: string[];
  
  /** External integrations */
  integrations?: string[];
  
  /** Tags or labels */
  tags?: string[];
}

/**
 * Automation discovery event
 */
export interface AutomationDiscovery {
  /** Discovery event ID */
  id: string;
  
  /** Automation that was discovered */
  automationId: string;
  
  /** Discovery method */
  method: 'api_scan' | 'webhook_monitor' | 'manual_review';
  
  /** Changes detected since last scan */
  changes?: AutomationChange[];
  
  /** Discovery timestamp */
  discoveredAt: Date;
  
  /** Platform connection used */
  connectionId: string;
}

/**
 * Automation change tracking
 */
export interface AutomationChange {
  /** Type of change */
  type: 'created' | 'updated' | 'deleted' | 'permission_changed' | 'risk_changed';
  
  /** Field that changed */
  field: string;
  
  /** Previous value */
  previousValue?: unknown;
  
  /** New value */
  newValue?: unknown;
  
  /** Change timestamp */
  timestamp: Date;
  
  /** Additional context */
  context?: string;
}

/**
 * Automation alert/notification
 */
export interface AutomationAlert {
  /** Alert ID */
  id: string;
  
  /** Automation that triggered the alert */
  automationId: string;
  
  /** Alert type */
  type: 'high_risk' | 'new_automation' | 'permission_change' | 'ai_usage_spike';
  
  /** Alert severity */
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  /** Alert message */
  message: string;
  
  /** Additional alert data */
  data?: Record<string, unknown>;
  
  /** Alert status */
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Acknowledged by user */
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}