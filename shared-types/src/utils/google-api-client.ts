/**
 * Google API Client Types
 * Real Google Workspace API integration for live shadow AI detection
 * Following CLAUDE.md Types-Tests-Code methodology - Phase 3 Step 3.1
 */

import { GoogleOAuthCredentials } from '../oauth/google';
import { GoogleWorkspaceEvent } from './detection-patterns';

/**
 * Authenticated Google API client for Workspace scanning
 */
export interface GoogleAPIClient {
  initialize(credentials: GoogleOAuthCredentials): Promise<boolean>;
  validateCredentials(): Promise<boolean>;
  refreshTokensIfNeeded(): Promise<boolean>;
  
  // Admin Reports API integration
  getAuditLogs(options: GoogleAuditLogOptions): Promise<GoogleAuditLogResponse>;
  getUserActivity(userId: string, timeRange: DateRange): Promise<GoogleUserActivity[]>;
  getLoginActivity(timeRange: DateRange): Promise<GoogleLoginEvent[]>;
  
  // Drive API integration
  getDriveActivity(options: GoogleDriveActivityOptions): Promise<GoogleDriveEvent[]>;
  getFileSharing(timeRange: DateRange): Promise<GoogleFileShareEvent[]>;
  getPermissionChanges(timeRange: DateRange): Promise<GooglePermissionEvent[]>;
  
  // Apps Script API integration
  getAppsScriptProjects(): Promise<GoogleAppsScriptProject[]>;
  getScriptExecutions(scriptId: string, timeRange: DateRange): Promise<GoogleScriptExecution[]>;
  
  // Gmail API integration
  getEmailAutomation(timeRange: DateRange): Promise<GoogleEmailAutomation[]>;
  getEmailFilters(): Promise<GoogleEmailFilter[]>;
  
  // Service Account detection
  getServiceAccounts(): Promise<GoogleServiceAccountInfo[]>;
  getServiceAccountActivity(email: string, timeRange: DateRange): Promise<GoogleWorkspaceEvent[]>;
}

/**
 * Google audit log parsing for activity analysis
 */
export interface GoogleAuditLogParser {
  parseAuditEvents(rawLogs: GoogleAuditLogRaw[]): GoogleWorkspaceEvent[];
  extractAutomationPatterns(events: GoogleWorkspaceEvent[]): AutomationPattern[];
  identifyAIIntegrations(events: GoogleWorkspaceEvent[]): AIIntegrationDetection[];
  generateActivitySummary(events: GoogleWorkspaceEvent[]): ActivitySummary;
}

/**
 * Real-time detection engine for live monitoring
 */
export interface RealTimeDetectionEngine {
  startMonitoring(connectionId: string): Promise<boolean>;
  stopMonitoring(connectionId: string): Promise<boolean>;
  
  // Detection algorithm integration
  analyzeVelocityPatterns(events: GoogleWorkspaceEvent[]): VelocityAnomalyResult[];
  detectBatchOperations(events: GoogleWorkspaceEvent[]): BatchOperationResult[];
  analyzeOffHoursActivity(events: GoogleWorkspaceEvent[]): OffHoursAnalysis;
  identifyAIProviders(events: GoogleWorkspaceEvent[]): AIProviderDetection[];
  
  // Real-time alerting
  generateRiskAlerts(detectionResults: DetectionResult[]): RiskAlert[];
  sendComplianceNotifications(riskAlerts: RiskAlert[]): Promise<boolean>;
}

/**
 * Google audit log options for API queries
 */
export interface GoogleAuditLogOptions {
  applicationName?: 'admin' | 'calendar' | 'drive' | 'gmail' | 'groups' | 'login';
  eventName?: string;
  actorEmail?: string;
  startTime: Date;
  endTime: Date;
  maxResults?: number;
  pageToken?: string;
}

/**
 * Google audit log response structure
 */
export interface GoogleAuditLogResponse {
  items: GoogleAuditLogRaw[];
  nextPageToken?: string;
  totalResults: number;
  etag: string;
}

/**
 * Raw Google audit log entry from Admin Reports API
 */
export interface GoogleAuditLogRaw {
  id: {
    time: string;
    uniqueQualifier: string;
    applicationName: string;
    customerId: string;
  };
  actor: {
    email?: string;
    profileId?: string;
    callerType: 'USER' | 'APPLICATION';
  };
  events: GoogleAuditEvent[];
  ipAddress?: string;
  kind: string;
  etag: string;
}

/**
 * Individual audit event within a log entry
 */
export interface GoogleAuditEvent {
  name: string;
  parameters?: GoogleAuditParameter[];
  type: string;
}

/**
 * Audit event parameters for detailed analysis
 */
export interface GoogleAuditParameter {
  name: string;
  value?: string;
  intValue?: string;
  boolValue?: boolean;
  multiValue?: string[];
  multiIntValue?: string[];
}

/**
 * Date range for API queries
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Google user activity summary
 */
export interface GoogleUserActivity {
  userId: string;
  userEmail: string;
  activityCount: number;
  lastActivity: Date;
  suspiciousActivity: SuspiciousActivityIndicator[];
  riskScore: number;
}

/**
 * Google login event for authentication analysis
 */
export interface GoogleLoginEvent {
  timestamp: Date;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  loginType: 'SAML' | 'PASSWORD' | 'SERVICE_ACCOUNT' | 'OAUTH';
  success: boolean;
  suspiciousIndicators: string[];
}

/**
 * Google Drive activity options
 */
export interface GoogleDriveActivityOptions {
  ancestorName?: string;
  itemName?: string;
  timeRange: DateRange;
  activityTypes?: ('create' | 'edit' | 'move' | 'rename' | 'delete' | 'permissionChange')[];
  maxResults?: number;
}

/**
 * Google Drive activity event
 */
export interface GoogleDriveEvent {
  timestamp: Date;
  actor: string;
  action: string;
  target: {
    id: string;
    name: string;
    mimeType: string;
  };
  details: {
    description: string;
    additionalInfo: Record<string, unknown>;
  };
}

/**
 * Google file sharing event
 */
export interface GoogleFileShareEvent {
  fileId: string;
  fileName: string;
  sharedWith: string;
  permissionRole: 'reader' | 'writer' | 'commenter' | 'owner';
  shareType: 'user' | 'group' | 'domain' | 'anyone';
  timestamp: Date;
  sharedBy: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Google permission change event
 */
export interface GooglePermissionEvent {
  resourceId: string;
  resourceType: 'file' | 'folder' | 'document';
  permissionId: string;
  changeType: 'added' | 'removed' | 'modified';
  newRole?: string;
  oldRole?: string;
  grantedTo: string;
  grantedBy: string;
  timestamp: Date;
}

/**
 * Google Apps Script project information
 */
export interface GoogleAppsScriptProject {
  scriptId: string;
  title: string;
  parentId?: string;
  description?: string;
  createTime: Date;
  updateTime: Date;
  owner: string;
  functions: GoogleScriptFunction[];
  triggers: GoogleScriptTrigger[];
  permissions: GoogleScriptPermission[];
}

/**
 * Google Script function definition
 */
export interface GoogleScriptFunction {
  name: string;
  code?: string; // If available through API
  executionCount?: number;
  lastExecution?: Date;
  externalApiCalls: string[];
  riskIndicators: string[];
}

/**
 * Google Script execution event
 */
export interface GoogleScriptExecution {
  executionId: string;
  scriptId: string;
  functionName: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  errorMessage?: string;
  executionType: 'TRIGGER' | 'MANUAL' | 'API';
}

/**
 * Google Script trigger configuration
 */
export interface GoogleScriptTrigger {
  triggerId: string;
  eventType: 'ON_EDIT' | 'ON_CHANGE' | 'ON_FORM_SUBMIT' | 'ON_OPEN' | 'TIME_DRIVEN';
  handlerFunction: string;
  triggerSource: string;
  enabled: boolean;
  lastRun?: Date;
  frequency?: string;
}

/**
 * Google Script permission for risk assessment
 */
export interface GoogleScriptPermission {
  scope: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dataAccess: string[];
}

/**
 * Google email automation detection
 */
export interface GoogleEmailAutomation {
  filterId?: string;
  forwardingRule?: string;
  automationType: 'filter' | 'forwarding' | 'script' | 'addon';
  description: string;
  enabled: boolean;
  createdDate: Date;
  lastActivity: Date;
  riskFactors: string[];
  externalDestinations: string[];
}

/**
 * Google email filter for automation detection
 */
export interface GoogleEmailFilter {
  id: string;
  criteria: {
    from?: string;
    to?: string;
    subject?: string;
    query?: string;
  };
  action: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
    forward?: string;
    markAsRead?: boolean;
    delete?: boolean;
    star?: boolean;
    markImportant?: boolean;
  };
  riskAssessment: {
    forwardsExternally: boolean;
    processesAutomatically: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Google service account information
 */
export interface GoogleServiceAccountInfo {
  uniqueId: string;
  email: string;
  displayName: string;
  description?: string;
  projectId: string;
  createTime: Date;
  disabledTime?: Date;
  keys: GoogleServiceAccountKey[];
  roles: string[];
  lastActivity?: Date;
  activityCount: number;
  riskAssessment: {
    hasMultipleKeys: boolean;
    hasAdminAccess: boolean;
    externalIntegration: boolean;
    recentActivity: boolean;
    riskScore: number;
  };
}

/**
 * Google service account key information
 */
export interface GoogleServiceAccountKey {
  keyId: string;
  keyType: 'USER_MANAGED' | 'SYSTEM_MANAGED';
  privateKeyType: 'TYPE_PKCS12_FILE' | 'TYPE_GOOGLE_CREDENTIALS_FILE';
  validAfterTime: Date;
  validBeforeTime: Date;
  keyAlgorithm: string;
  createdTime: Date;
  usageCount?: number;
  lastUsed?: Date;
}

/**
 * Detection pattern results
 */
export interface AutomationPattern {
  patternId: string;
  patternType: 'velocity' | 'batch' | 'timing' | 'external_api';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  events: GoogleWorkspaceEvent[];
  analysis: {
    description: string;
    evidence: string[];
    recommendations: string[];
  };
}

/**
 * AI integration detection result
 */
export interface AIIntegrationDetection {
  integrationId: string;
  aiProvider: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'unknown';
  integrationMethod: 'apps_script' | 'service_account' | 'oauth_app' | 'api_key';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dataExposure: {
    dataTypes: string[];
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
    volumeEstimate: 'low' | 'medium' | 'high' | 'massive';
  };
  complianceImpact: {
    gdpr: boolean;
    sox: boolean;
    hipaa: boolean;
    pci: boolean;
  };
}

/**
 * Activity summary for reporting
 */
export interface ActivitySummary {
  totalEvents: number;
  timeRange: DateRange;
  userCount: number;
  automationCount: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topRisks: string[];
  recommendedActions: string[];
}

/**
 * Suspicious activity indicators
 */
export interface SuspiciousActivityIndicator {
  indicatorType: 'velocity' | 'timing' | 'volume' | 'external_access' | 'permission_escalation';
  description: string;
  severity: number; // 0-100
  evidence: string[];
  recommendation: string;
}

/**
 * Detection algorithm results
 */
export interface VelocityAnomalyResult {
  anomalyId: string;
  detectedAt: Date;
  velocity: number;
  threshold: number;
  confidence: number;
  affectedEvents: GoogleWorkspaceEvent[];
  riskAssessment: string;
}

export interface BatchOperationResult {
  batchId: string;
  operations: GoogleWorkspaceEvent[];
  similarity: number;
  timeWindow: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface OffHoursAnalysis {
  analysisId: string;
  totalActivity: number;
  offHoursActivity: number;
  offHoursPercentage: number;
  suspiciousActivities: GoogleWorkspaceEvent[];
  riskScore: number;
}

export interface AIProviderDetection {
  detectionId: string;
  provider: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'unknown';
  detectionMethod: 'endpoint_analysis' | 'user_agent' | 'content_analysis';
  confidence: number;
  evidence: string[];
  affectedResources: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Combined detection results
 */
export interface DetectionResult {
  connectionId: string;
  timestamp: Date;
  velocityAnomalies: VelocityAnomalyResult[];
  batchOperations: BatchOperationResult[];
  offHoursAnalysis: OffHoursAnalysis;
  aiProviderDetections: AIProviderDetection[];
  overallRiskScore: number;
  complianceViolations: string[];
  recommendedActions: string[];
}

/**
 * Risk alert for real-time notifications
 */
export interface RiskAlert {
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alertType: 'automation_detected' | 'ai_integration_found' | 'data_exposure' | 'compliance_violation';
  title: string;
  description: string;
  detectionTime: Date;
  affectedResources: string[];
  recommendedActions: string[];
  complianceImpact: {
    gdpr: boolean;
    sox: boolean;
    hipaa: boolean;
    pci: boolean;
  };
}

/**
 * Type guards for runtime validation of Google API responses
 */
export function isValidGoogleAuditLogResponse(value: unknown): value is GoogleAuditLogResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray((value as any).items)
  );
}

export function isValidGoogleWorkspaceEvent(value: unknown): value is GoogleWorkspaceEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'eventId' in value &&
    'timestamp' in value &&
    'userId' in value &&
    'eventType' in value &&
    typeof (value as any).eventId === 'string' &&
    (value as any).timestamp instanceof Date
  );
}

export function isValidDetectionResult(value: unknown): value is DetectionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'connectionId' in value &&
    'timestamp' in value &&
    'overallRiskScore' in value &&
    typeof (value as any).connectionId === 'string' &&
    typeof (value as any).overallRiskScore === 'number'
  );
}