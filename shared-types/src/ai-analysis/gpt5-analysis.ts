/**
 * GPT-5 Intelligent Analysis Service Types
 *
 * Type definitions for GPT-5 powered analysis of AI platform usage,
 * including risk assessment, content analysis, pattern detection,
 * and compliance checking.
 *
 * @module ai-analysis/gpt5-analysis
 */

import { AIplatformAuditLog, AIRiskIndicator, ComplianceFramework } from '../platforms/ai-platforms';

/**
 * Request for GPT-5 analysis
 */
export interface GPT5AnalysisRequest {
  /** Unique request identifier */
  requestId: string;

  /** Request timestamp */
  timestamp: Date;

  /** Analysis context */
  context: AnalysisContext;

  /** Events to analyze */
  events: AIplatformAuditLog[];

  /** Analysis options */
  options: GPT5AnalysisOptions;
}

/**
 * Context for GPT-5 analysis
 */
export interface AnalysisContext {
  /** Organization ID */
  organizationId: string;

  /** Specific user ID (if analyzing single user) */
  userId?: string;

  /** User's behavioral profile */
  userProfile?: UserBehaviorProfile;

  /** Organization policies */
  organizationPolicies?: OrganizationPolicies;

  /** Historical behavior baseline */
  historicalBaseline?: BehaviorBaseline;

  /** Time window being analyzed */
  timeWindow: {
    start: Date;
    end: Date;
  };

  /** Industry/sector (for context-specific analysis) */
  industry?: string;

  /** Organization size */
  organizationSize?: 'small' | 'medium' | 'large' | 'enterprise';
}

/**
 * User behavior profile for baseline comparison
 */
export interface UserBehaviorProfile {
  /** User identifier */
  userId: string;

  /** User email */
  email: string;

  /** Department */
  department?: string;

  /** Job role */
  role?: string;

  /** Seniority level */
  seniority?: 'junior' | 'mid' | 'senior' | 'executive';

  /** Normal working hours */
  normalWorkHours?: {
    /** Timezone */
    timezone: string;
    /** Work start hour (0-23) */
    startHour: number;
    /** Work end hour (0-23) */
    endHour: number;
    /** Work days (0-6, 0=Sunday) */
    workDays: number[];
  };

  /** Typical AI usage patterns */
  typicalAIUsage?: {
    /** Average conversations per day */
    averageConversationsPerDay: number;
    /** Preferred AI models */
    preferredModels: string[];
    /** Common use cases */
    commonUseCases: string[];
    /** Average tokens per conversation */
    averageTokensPerConversation?: number;
  };

  /** Risk tolerance level */
  riskTolerance?: 'low' | 'medium' | 'high';
}

/**
 * Organization AI usage policies
 */
export interface OrganizationPolicies {
  /** Allowed AI platforms */
  allowedAIPlatforms: ('chatgpt' | 'claude' | 'gemini')[];

  /** Banned AI platforms */
  bannedAIPlatforms?: ('chatgpt' | 'claude' | 'gemini')[];

  /** Data classification rules */
  dataClassificationRules: DataClassificationRule[];

  /** Compliance frameworks organization must adhere to */
  complianceFrameworks: ComplianceFramework[];

  /** Approved use cases for AI */
  approvedUseCases: string[];

  /** Banned use cases */
  bannedUseCases: string[];

  /** Maximum file size for uploads (bytes) */
  maxFileUploadSize?: number;

  /** Allowed file types for uploads */
  allowedFileTypes?: string[];

  /** Require approval for certain actions */
  requiresApproval?: {
    fileUploads: boolean;
    dataExports: boolean;
    integrations: boolean;
  };
}

/**
 * Data classification rule
 */
export interface DataClassificationRule {
  /** Classification level */
  classification: 'public' | 'internal' | 'confidential' | 'restricted';

  /** Keywords that indicate this classification */
  keywords: string[];

  /** Regex patterns for detection */
  patterns: string[];

  /** Actions to take when detected */
  actions: ('block' | 'alert' | 'log' | 'require_approval')[];

  /** Description of this rule */
  description?: string;
}

/**
 * Historical behavior baseline for anomaly detection
 */
export interface BehaviorBaseline {
  /** When baseline was computed */
  computed_at: Date;

  /** Period used for baseline calculation */
  period: {
    start: Date;
    end: Date;
  };

  /** Baseline metrics */
  metrics: {
    /** Average logins per day */
    averageDailyLogins: number;
    /** Peak usage hours (0-23) */
    peakUsageHours: number[];
    /** Typical session duration (minutes) */
    typicalSessionDuration: number;
    /** Average messages per session */
    averageMessagesPerSession: number;
    /** Most used platform */
    primaryPlatform: 'chatgpt' | 'claude' | 'gemini';
    /** Standard deviation for key metrics */
    standardDeviations: {
      dailyLogins: number;
      sessionDuration: number;
      messagesPerSession: number;
    };
  };

  /** Anomaly detection thresholds (Z-scores) */
  anomalyThresholds: {
    /** Login frequency threshold */
    loginFrequency: number;
    /** Session duration threshold */
    sessionDuration: number;
    /** Message volume threshold */
    messageVolume: number;
  };
}

/**
 * Options for GPT-5 analysis
 */
export interface GPT5AnalysisOptions {
  /** Types of analysis to perform */
  analysisType: AnalysisType[];

  /** Include actionable recommendations */
  includeRecommendations: boolean;

  /** Level of detail in analysis */
  detailLevel: 'summary' | 'detailed' | 'comprehensive';

  /** Prioritize and rank alerts */
  prioritizeAlerts: boolean;

  /** Generate contextual insights */
  contextualInsights: boolean;

  /** Enable cross-platform correlation */
  crossPlatformCorrelation?: boolean;

  /** Maximum cost limit for analysis (USD) */
  maxCost?: number;

  /** Use caching for similar analyses */
  enableCaching?: boolean;
}

/**
 * Types of GPT-5 analysis
 */
export type AnalysisType =
  | 'risk_assessment'
  | 'content_analysis'
  | 'pattern_detection'
  | 'compliance_check'
  | 'anomaly_detection'
  | 'correlation_analysis';

/**
 * Response from GPT-5 analysis
 */
export interface GPT5AnalysisResponse {
  /** Request ID (matches request) */
  requestId: string;

  /** When analysis was completed */
  analyzedAt: Date;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Analysis results */
  results: AnalysisResult;

  /** Executive summary */
  summary: AnalysisSummary;

  /** Alerts generated */
  alerts: Alert[];

  /** Contextual insights */
  insights: ContextualInsight[];

  /** Actionable recommendations */
  recommendations: Recommendation[];

  /** Analysis metadata */
  metadata: AnalysisMetadata;
}

/**
 * Comprehensive analysis results
 */
export interface AnalysisResult {
  /** Overall risk score (0-100) */
  overallRiskScore: number;

  /** Risk level classification */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Confidence in analysis (0-100) */
  confidence: number;

  /** Category-specific analyses */
  categories: {
    dataExfiltration: CategoryAnalysis;
    policyViolation: CategoryAnalysis;
    anomalousActivity: CategoryAnalysis;
    sensitiveContent: CategoryAnalysis;
    complianceRisk: CategoryAnalysis;
  };
}

/**
 * Analysis for a specific risk category
 */
export interface CategoryAnalysis {
  /** Risk score for this category (0-100) */
  score: number;

  /** Whether risk was detected */
  detected: boolean;

  /** Confidence in detection (0-100) */
  confidence: number;

  /** Evidence supporting the detection */
  evidence: string[];

  /** Event IDs that contributed to this detection */
  affectedEvents: string[];

  /** Specific findings */
  findings?: string[];

  /** Severity breakdown */
  severityBreakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Executive summary of analysis
 */
export interface AnalysisSummary {
  /** Total events analyzed */
  totalEventsAnalyzed: number;

  /** Time span covered */
  timeSpanCovered: {
    start: Date;
    end: Date;
  };

  /** Events by platform */
  platformBreakdown: {
    chatgpt: number;
    claude: number;
    gemini: number;
  };

  /** Key findings (3-5 bullet points) */
  keyFindings: string[];

  /** Critical issues count */
  criticalIssues: number;

  /** High priority issues count */
  highPriorityIssues: number;

  /** Overall assessment */
  overallAssessment: string;
}

/**
 * Security or compliance alert
 */
export interface Alert {
  /** Unique alert ID */
  id: string;

  /** Alert severity */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Alert title */
  title: string;

  /** Detailed description */
  description: string;

  /** Alert category */
  category: 'security' | 'compliance' | 'policy' | 'anomaly' | 'privacy';

  /** Event IDs that triggered this alert */
  affectedEvents: string[];

  /** Users affected by this alert */
  affectedUsers: string[];

  /** When alert was detected */
  detectedAt: Date;

  /** Whether immediate action is required */
  requiresAction: boolean;

  /** Suggested remediation actions */
  suggestedActions: string[];

  /** Related alert IDs (for correlation) */
  relatedAlerts?: string[];

  /** MITRE ATT&CK techniques (if applicable) */
  mitreAttackTechniques?: string[];

  /** Estimated impact */
  estimatedImpact?: {
    scope: 'user' | 'team' | 'organization';
    dataAtRisk?: string; // Description of data at risk
    potentialDamage: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Contextual insight generated by GPT-5
 */
export interface ContextualInsight {
  /** Insight type */
  type: 'pattern' | 'correlation' | 'trend' | 'anomaly' | 'comparison' | 'prediction';

  /** Insight title */
  title: string;

  /** Detailed description */
  description: string;

  /** Significance level */
  significance: 'low' | 'medium' | 'high';

  /** Supporting evidence */
  evidence: string[];

  /** Visualization data (if applicable) */
  visualization?: {
    /** Chart type */
    type: 'chart' | 'graph' | 'heatmap' | 'timeline' | 'network';
    /** Chart.js or similar compatible data */
    data: any;
    /** Chart configuration */
    config?: any;
  };

  /** Time range for this insight */
  timeRange?: {
    start: Date;
    end: Date;
  };

  /** Related entities */
  relatedEntities?: {
    users?: string[];
    platforms?: ('chatgpt' | 'claude' | 'gemini')[];
    events?: string[];
  };
}

/**
 * Actionable recommendation from GPT-5
 */
export interface Recommendation {
  /** Unique recommendation ID */
  id: string;

  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Recommendation category */
  category: 'immediate_action' | 'policy_update' | 'monitoring' | 'training' | 'technical';

  /** Recommendation title */
  title: string;

  /** Detailed description */
  description: string;

  /** Rationale for recommendation */
  rationale: string;

  /** Estimated impact of implementing */
  estimatedImpact: 'low' | 'medium' | 'high';

  /** Implementation complexity */
  implementationComplexity: 'low' | 'medium' | 'high';

  /** Step-by-step implementation guide */
  steps: string[];

  /** Related alert IDs */
  relatedAlerts?: string[];

  /** Expected outcomes */
  expectedOutcomes?: string[];

  /** Timeline for implementation */
  suggestedTimeline?: string;

  /** Resources required */
  resourcesRequired?: string[];
}

/**
 * Metadata about the GPT-5 analysis
 */
export interface AnalysisMetadata {
  /** GPT model used */
  modelUsed: string;

  /** Token usage */
  tokensUsed: {
    /** Input tokens */
    input: number;
    /** Output tokens */
    output: number;
  };

  /** Cost estimate in USD */
  costEstimate?: number;

  /** Analysis version/schema */
  analysisVersion: string;

  /** Correlation IDs for tracking related analyses */
  correlationIds: string[];

  /** Whether cached results were used */
  cacheHit?: boolean;

  /** Analysis duration in milliseconds */
  analysisDuration: number;
}

/**
 * GPT-5 prompt template
 */
export interface GPT5PromptTemplate {
  /** Template name */
  name: string;

  /** Template version */
  version: string;

  /** System prompt */
  systemPrompt: string;

  /** User prompt template (with variable placeholders) */
  userPromptTemplate: string;

  /** Variables used in template */
  variables: string[];

  /** Example inputs and outputs */
  examples?: Array<{
    input: any;
    output: any;
    description?: string;
  }>;

  /** Temperature setting */
  temperature?: number;

  /** Max tokens */
  maxTokens?: number;

  /** Response format */
  responseFormat?: 'text' | 'json_object' | 'json_schema';
}

/**
 * GPT-5 service configuration
 */
export interface GPT5ServiceConfig {
  /** OpenAI API key */
  apiKey: string;

  /** Model to use */
  model: string;

  /** Organization ID (optional) */
  organizationId?: string;

  /** Base URL */
  baseUrl?: string;

  /** Request timeout (ms) */
  timeout?: number;

  /** Enable request caching */
  enableCaching?: boolean;

  /** Cache TTL (seconds) */
  cacheTTL?: number;

  /** Max retries on failure */
  maxRetries?: number;
}

/**
 * Cross-platform correlation result
 */
export interface CrossPlatformCorrelation {
  /** Correlation ID */
  id: string;

  /** Correlation type */
  type: 'workflow_chain' | 'data_transfer' | 'shared_context' | 'temporal_proximity';

  /** Platforms involved */
  platforms: ('chatgpt' | 'claude' | 'gemini')[];

  /** Events involved in correlation */
  correlatedEvents: string[];

  /** Confidence in correlation (0-100) */
  confidence: number;

  /** Description of correlation */
  description: string;

  /** Timeline of correlated events */
  timeline: Array<{
    eventId: string;
    platform: string;
    timestamp: Date;
    action: string;
  }>;

  /** Potential risk from this correlation */
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    concerns: string[];
  };
}

/**
 * Batch analysis request for multiple users/time periods
 */
export interface GPT5BatchAnalysisRequest {
  /** Batch ID */
  batchId: string;

  /** Individual analysis requests */
  requests: GPT5AnalysisRequest[];

  /** Batch options */
  batchOptions: {
    /** Process in parallel */
    parallel?: boolean;
    /** Maximum concurrent analyses */
    maxConcurrency?: number;
    /** Stop on first error */
    stopOnError?: boolean;
  };
}

/**
 * Batch analysis response
 */
export interface GPT5BatchAnalysisResponse {
  /** Batch ID */
  batchId: string;

  /** Individual responses */
  responses: GPT5AnalysisResponse[];

  /** Batch statistics */
  statistics: {
    /** Total requests */
    totalRequests: number;
    /** Successful analyses */
    successCount: number;
    /** Failed analyses */
    failureCount: number;
    /** Total processing time (ms) */
    totalProcessingTime: number;
    /** Average processing time per request (ms) */
    averageProcessingTime: number;
  };

  /** Batch-level insights (cross-user patterns) */
  batchInsights?: ContextualInsight[];

  /** Aggregated recommendations */
  aggregatedRecommendations?: Recommendation[];
}

/**
 * Cached analysis entry
 */
export interface CachedAnalysis {
  /** Cache key */
  key: string;

  /** Cached response */
  response: GPT5AnalysisResponse;

  /** When cached */
  cachedAt: Date;

  /** Cache expiration */
  expiresAt: Date;

  /** Hit count */
  hitCount: number;

  /** Cache size in bytes */
  sizeBytes: number;
}

/**
 * GPT-5 analysis job status (for async processing)
 */
export interface GPT5AnalysisJob {
  /** Job ID */
  jobId: string;

  /** Analysis request */
  request: GPT5AnalysisRequest;

  /** Job status */
  status: 'queued' | 'processing' | 'completed' | 'failed';

  /** Progress percentage (0-100) */
  progress: number;

  /** Created timestamp */
  createdAt: Date;

  /** Started timestamp */
  startedAt?: Date;

  /** Completed timestamp */
  completedAt?: Date;

  /** Result (when completed) */
  result?: GPT5AnalysisResponse;

  /** Error message (if failed) */
  error?: string;

  /** Retry count */
  retryCount?: number;

  /** Priority */
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Sensitive data detection result
 */
export interface SensitiveDataDetection {
  /** Whether sensitive data was detected */
  detected: boolean;

  /** Types of sensitive data found */
  dataTypes: SensitiveDataType[];

  /** Confidence score (0-100) */
  confidence: number;

  /** Specific matches/patterns found */
  matches: Array<{
    type: SensitiveDataType;
    pattern: string;
    location: string; // Description of where found
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;

  /** Compliance impact */
  complianceImpact: ComplianceFramework[];

  /** Recommended actions */
  recommendedActions: string[];
}

/**
 * Types of sensitive data
 */
export type SensitiveDataType =
  | 'pii'                    // Personally Identifiable Information
  | 'phi'                    // Protected Health Information
  | 'pci'                    // Payment Card Information
  | 'credentials'            // Passwords, API keys, secrets
  | 'financial'              // Financial data
  | 'confidential_business'  // Confidential business information
  | 'source_code'            // Proprietary source code
  | 'legal'                  // Legal documents
  | 'customer_data';         // Customer information

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  /** Whether anomalies were detected */
  anomaliesDetected: boolean;

  /** Anomalies found */
  anomalies: Anomaly[];

  /** Anomaly score (0-100) */
  anomalyScore: number;

  /** Comparison to baseline */
  baselineComparison?: {
    /** Deviation from baseline (standard deviations) */
    zScore: number;
    /** Metric being compared */
    metric: string;
    /** Baseline value */
    baselineValue: number;
    /** Current value */
    currentValue: number;
    /** Percentage change */
    percentageChange: number;
  };
}

/**
 * Individual anomaly
 */
export interface Anomaly {
  /** Anomaly ID */
  id: string;

  /** Anomaly type */
  type: 'temporal' | 'volumetric' | 'behavioral' | 'contextual';

  /** Description */
  description: string;

  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Confidence (0-100) */
  confidence: number;

  /** Events involved */
  eventIds: string[];

  /** Statistical evidence */
  statisticalEvidence?: {
    zScore: number;
    pValue: number;
    deviationPercentage: number;
  };
}

/**
 * Cost tracking for GPT-5 analyses
 */
export interface GPT5CostTracking {
  /** Period */
  period: {
    start: Date;
    end: Date;
  };

  /** Total analyses performed */
  totalAnalyses: number;

  /** Total tokens consumed */
  totalTokens: {
    input: number;
    output: number;
  };

  /** Total cost (USD) */
  totalCost: number;

  /** Average cost per analysis */
  averageCostPerAnalysis: number;

  /** Cost by analysis type */
  costByType: {
    [type: string]: {
      count: number;
      tokens: number;
      cost: number;
    };
  };

  /** Cache hit rate */
  cacheHitRate?: number;

  /** Cost savings from caching */
  cacheSavings?: number;
}
