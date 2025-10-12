/**
 * Automation domain model types
 * Core types for discovered automations and bots across SaaS platforms
 */

// Import detection types from ai-provider-patterns
import type {
  DetectionMethod as DetectionMethodType,
  AIProviderDetectionResult as AIProviderDetectionResultType
} from '../utils/ai-provider-patterns';

// Re-export DetectionMethod for shared use
export type { DetectionMethod } from '../utils/ai-provider-patterns';

// Internal type alias for detection metadata (not exported to avoid conflicts)
type AIProviderDetection = AIProviderDetectionResultType;

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
  | 'google_ai'
  | 'cohere'
  | 'huggingface'
  | 'replicate'
  | 'mistral'
  | 'together_ai'
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

  /** Detection algorithm metadata */
  detectionMetadata?: DetectionMetadata;

  /** Risk score history tracking */
  riskScoreHistory?: RiskScoreHistoryEntry[];

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

/**
 * Detection pattern types
 */
export type DetectionPatternType =
  | 'velocity'
  | 'batch_operation'
  | 'off_hours'
  | 'timing_variance'
  | 'permission_escalation'
  | 'data_volume'
  | 'ai_provider';

/**
 * Cross-platform correlation types
 */
export type CorrelationType =
  | 'same_ai_provider'
  | 'similar_timing'
  | 'data_flow_chain'
  | 'shared_credentials'
  | 'similar_naming';

/**
 * Individual detection pattern result
 */
export interface DetectionPattern {
  /** Type of detection pattern */
  patternType: DetectionPatternType;

  /** Confidence score (0-100) */
  confidence: number;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Evidence supporting this detection */
  evidence: Record<string, unknown>;

  /** When this pattern was detected */
  detectedAt: Date;

  /** Pattern-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete detection metadata stored in JSONB column
 */
export interface DetectionMetadata {
  /** AI provider detection results */
  aiProvider?: AIProviderDetectionResultType;

  /** All detection pattern results */
  detectionPatterns?: DetectionPattern[];

  /** Cross-platform correlation data */
  correlationData?: CrossPlatformCorrelationData;

  /** Detector configuration */
  detectorConfiguration?: DetectorConfiguration;

  /** Last metadata update */
  lastUpdated: Date;
}

/**
 * Related automation for cross-platform correlation
 */
export interface RelatedAutomation {
  /** Related automation ID */
  automationId: string;

  /** Platform of related automation */
  platform: string;

  /** Similarity score (0-100) */
  similarityScore: number;

  /** Type of correlation */
  correlationType: CorrelationType;

  /** Correlation evidence */
  evidence?: string[];
}

/**
 * Cross-platform correlation data (specific to automation model)
 * Named differently to avoid conflict with utils/cross-platform-correlation
 */
export interface CrossPlatformCorrelationData {
  /** Related automations across platforms */
  relatedAutomations: RelatedAutomation[];

  /** Is this part of a cross-platform automation chain */
  crossPlatformChain: boolean;

  /** Chain confidence score (0-100) */
  chainConfidence?: number;

  /** Chain description */
  chainDescription?: string;

  /** Last correlation analysis timestamp */
  lastAnalyzedAt: Date;
}

/**
 * Detector configuration and custom thresholds
 */
export interface DetectorConfiguration {
  /** Enabled detectors */
  enabledDetectors: DetectionPatternType[];

  /** Custom thresholds for each detector */
  customThresholds?: {
    velocity?: {
      eventsPerSecond?: number;
      fileCreationThreshold?: number;
      permissionChangeThreshold?: number;
    };
    batch?: {
      minSimilarity?: number;
      minBatchSize?: number;
    };
    offHours?: {
      startHour?: number;
      endHour?: number;
      daysOfWeek?: number[];
    };
    timingVariance?: {
      maxCoefficientOfVariation?: number;
    };
    dataVolume?: {
      volumeIncreaseThreshold?: number;
    };
  };

  /** Configuration last updated */
  lastUpdatedAt?: Date;
}

/**
 * Risk score history entry
 */
export interface RiskScoreHistoryEntry {
  /** Timestamp of this risk assessment */
  timestamp: Date;

  /** Risk score (0-100) */
  score: number;

  /** Risk level classification */
  level: RiskLevel;

  /** Risk factors at this point in time */
  factors: RiskFactor[];

  /** What triggered this risk assessment */
  trigger:
    | 'initial_discovery'
    | 'permission_change'
    | 'activity_spike'
    | 'manual_reassessment'
    | 'detector_update'
    | 'scheduled_scan';
}