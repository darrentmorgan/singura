/**
 * Google Workspace Detection Patterns
 * Foundation types for shadow AI and automation detection algorithms
 * Following CLAUDE.md Types-Tests-Code methodology
 */

/**
 * Supported platform types for SaaS X-Ray detection
 */
export type PlatformType = 'slack' | 'google' | 'microsoft' | 'jira';

/**
 * Detection algorithm types used in SaaS X-Ray
 */
export type DetectionAlgorithm = 
  | 'VelocityDetector'
  | 'AIProviderDetector'
  | 'BatchOperationDetector'
  | 'OffHoursDetector'
  | 'CrossPlatformCorrelator';

/**
 * Google Workspace activity pattern for automation detection
 */
export interface GoogleActivityPattern {
  patternId: string;
  patternType: 'velocity' | 'batch_operation' | 'off_hours' | 'regular_interval' | 'api_usage';
  detectedAt: Date;
  confidence: number; // 0-100, confidence in automation detection
  metadata: {
    userId: string;
    userEmail: string;
    resourceType: 'file' | 'email' | 'calendar' | 'script' | 'permission';
    actionType: string;
    timestamp: Date;
    location?: string;
    userAgent?: string;
  };
  evidence: {
    description: string;
    dataPoints: Record<string, unknown>;
    supportingEvents: string[];
  };
}

/**
 * Automation signature for known AI tool detection
 */
export interface AutomationSignature {
  signatureId: string;
  signatureType: 'ai_integration' | 'api_pattern' | 'behavior_pattern' | 'external_service';
  aiProvider?: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'unknown';
  detectionMethod: 'api_endpoint' | 'user_agent' | 'access_pattern' | 'content_analysis';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: {
    apiEndpoints?: string[];
    userAgents?: string[];
    accessPatterns?: string[];
    contentSignatures?: string[];
  };
  metadata: {
    firstDetected: Date;
    lastDetected: Date;
    occurrenceCount: number;
    affectedResources: string[];
  };
}

/**
 * Risk indicator for security assessment
 */
export interface RiskIndicator {
  indicatorId: string;
  riskType: 'data_sensitivity' | 'permission_scope' | 'external_access' | 'automation_frequency';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  severity: number; // 0-100, numerical risk score
  description: string;
  detectionTime: Date;
  affectedResources: {
    resourceId: string;
    resourceType: 'file' | 'email' | 'script' | 'service_account';
    resourceName: string;
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  }[];
  mitigationRecommendations: string[];
  complianceImpact: {
    gdpr: boolean;
    sox: boolean;
    hipaa: boolean;
    pci: boolean;
  };
}

/**
 * Temporal pattern for velocity and timing analysis
 */
export interface TemporalPattern {
  patternId: string;
  analysisType: 'velocity' | 'frequency' | 'timing_anomaly' | 'batch_detection';
  timeWindow: {
    startTime: Date;
    endTime: Date;
    durationMs: number;
  };
  eventCount: number;
  velocity: {
    eventsPerSecond: number;
    eventsPerMinute: number;
    eventsPerHour: number;
  };
  thresholds: {
    humanMaxVelocity: number;
    automationThreshold: number;
    criticalThreshold: number;
  };
  anomalyScore: number; // 0-100, higher = more likely automation
  confidence: number; // 0-100, confidence in detection
}

/**
 * Activity timeframe for off-hours and business hours analysis
 */
export interface ActivityTimeframe {
  timezoneId: string;
  businessHours: {
    startHour: number; // 0-23, e.g., 9 for 9 AM
    endHour: number;   // 0-23, e.g., 17 for 5 PM
    daysOfWeek: number[]; // 0-6, Sunday=0, Monday=1, etc.
  };
  activityPeriod: {
    startTime: Date;
    endTime: Date;
    isBusinessHours: boolean;
    isWeekend: boolean;
    isHoliday?: boolean;
  };
  humanLikelihood: number; // 0-100, likelihood of human activity during this timeframe
  automationIndicators: string[]; // Reasons suggesting automation
}

/**
 * Frequency pattern for regular interval detection
 */
export interface FrequencyPattern {
  patternId: string;
  intervalType: 'exact' | 'approximate' | 'irregular';
  detectedInterval: {
    value: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  regularity: {
    standardDeviation: number;
    variance: number;
    perfectRegularity: boolean; // Too perfect = likely automation
  };
  occurrences: {
    total: number;
    withinThreshold: number;
    percentageRegular: number;
  };
  humanLikelihood: number; // 0-100, humans are less perfectly regular
  automationConfidence: number; // 0-100, confidence this is automated
}

/**
 * Velocity detector for inhuman activity speed detection
 */
export interface VelocityDetector {
  detectVelocityAnomalies(events: GoogleWorkspaceEvent[]): TemporalPattern[];
  calculateEventsPerSecond(events: GoogleWorkspaceEvent[], timeWindow: number): number;
  isInhumanVelocity(velocity: number, actionType: string): boolean;
  getVelocityThresholds(): {
    humanMaxFileCreation: number;    // files per second
    humanMaxPermissionChanges: number; // permission changes per second
    humanMaxEmailActions: number;    // email actions per second
    automationThreshold: number;     // velocity suggesting automation
    criticalThreshold: number;       // velocity indicating certain automation
  };
}

/**
 * Google Workspace event for velocity analysis
 */
export interface GoogleWorkspaceEvent {
  eventId: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  eventType: 'file_create' | 'file_edit' | 'file_share' | 'permission_change' | 'email_send' | 'script_execution';
  resourceId: string;
  resourceType: 'file' | 'folder' | 'email' | 'script' | 'permission';
  actionDetails: {
    action: string;
    resourceName: string;
    additionalMetadata: Record<string, unknown>;
  };
  userAgent?: string;
  ipAddress?: string;
  location?: string;
}

/**
 * Batch operation detector for identifying bulk automated actions
 */
export interface BatchOperationDetector {
  detectBatchOperations(events: GoogleWorkspaceEvent[]): GoogleActivityPattern[];
  identifySimilarActions(events: GoogleWorkspaceEvent[]): BatchOperationGroup[];
  calculateBatchLikelihood(group: BatchOperationGroup): number;
  getBatchThresholds(): {
    minimumSimilarActions: number;  // minimum actions to consider a batch
    maxTimeWindowMs: number;        // max time window for batch detection
    similarityThreshold: number;    // 0-1, how similar actions must be
  };
}

/**
 * Batch operation group for analysis
 */
export interface BatchOperationGroup {
  groupId: string;
  events: GoogleWorkspaceEvent[];
  similarity: {
    actionType: boolean;          // same action type
    resourceType: boolean;        // same resource type  
    namingPattern: boolean;       // similar naming pattern
    permissions: boolean;         // similar permission changes
    timing: boolean;              // regular timing intervals
  };
  timeWindow: {
    startTime: Date;
    endTime: Date;
    totalDurationMs: number;
  };
  automationConfidence: number;   // 0-100, confidence this is automated
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Off-hours activity detector for business hours analysis
 */
export interface OffHoursDetector {
  detectOffHoursActivity(events: GoogleWorkspaceEvent[], businessHours: ActivityTimeframe): GoogleActivityPattern[];
  isBusinessHours(timestamp: Date, timezone: string, businessConfig: ActivityTimeframe['businessHours']): boolean;
  calculateOffHoursRisk(activity: GoogleWorkspaceEvent[], totalActivity: GoogleWorkspaceEvent[]): number;
  getOffHoursThresholds(): {
    suspiciousActivityThreshold: number;    // % of activity outside business hours
    criticalActivityThreshold: number;     // % indicating certain automation
    minimumEventsForAnalysis: number;      // minimum events to analyze
  };
}

/**
 * Type guards for runtime validation
 */

export function isValidGoogleActivityPattern(value: unknown): value is GoogleActivityPattern {
  return (
    typeof value === 'object' &&
    value !== null &&
    'patternId' in value &&
    'patternType' in value &&
    'detectedAt' in value &&
    'confidence' in value &&
    typeof (value as any).patternId === 'string' &&
    ['velocity', 'batch_operation', 'off_hours', 'regular_interval', 'api_usage'].includes((value as any).patternType) &&
    (value as any).detectedAt instanceof Date &&
    typeof (value as any).confidence === 'number' &&
    (value as any).confidence >= 0 &&
    (value as any).confidence <= 100
  );
}

export function isValidAutomationSignature(value: unknown): value is AutomationSignature {
  return (
    typeof value === 'object' &&
    value !== null &&
    'signatureId' in value &&
    'signatureType' in value &&
    'detectionMethod' in value &&
    'confidence' in value &&
    'riskLevel' in value &&
    typeof (value as any).signatureId === 'string' &&
    ['ai_integration', 'api_pattern', 'behavior_pattern', 'external_service'].includes((value as any).signatureType) &&
    ['api_endpoint', 'user_agent', 'access_pattern', 'content_analysis'].includes((value as any).detectionMethod) &&
    typeof (value as any).confidence === 'number' &&
    ['low', 'medium', 'high', 'critical'].includes((value as any).riskLevel)
  );
}

export function isValidRiskIndicator(value: unknown): value is RiskIndicator {
  return (
    typeof value === 'object' &&
    value !== null &&
    'indicatorId' in value &&
    'riskType' in value &&
    'riskLevel' in value &&
    'severity' in value &&
    typeof (value as any).indicatorId === 'string' &&
    ['data_sensitivity', 'permission_scope', 'external_access', 'automation_frequency'].includes((value as any).riskType) &&
    ['low', 'medium', 'high', 'critical'].includes((value as any).riskLevel) &&
    typeof (value as any).severity === 'number' &&
    (value as any).severity >= 0 &&
    (value as any).severity <= 100
  );
}