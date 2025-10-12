/**
 * Automation Feedback Types
 * User feedback for detection accuracy and ML training preparation
 * Phase 2: Feedback System
 */

/**
 * Feedback classification types
 */
export type FeedbackType =
  | 'correct_detection'      // User confirms detection is accurate
  | 'false_positive'         // Flagged as automation but isn't
  | 'false_negative'         // Missed automation detection
  | 'incorrect_classification' // Wrong automation type
  | 'incorrect_risk_score'   // Risk score doesn't match reality
  | 'incorrect_ai_provider'; // AI provider misidentified

/**
 * Feedback sentiment (thumbs up/down)
 */
export type FeedbackSentiment = 'positive' | 'negative' | 'neutral';

/**
 * Feedback status for tracking resolution
 */
export type FeedbackStatus =
  | 'pending'      // Awaiting review
  | 'acknowledged' // Reviewed by system/admin
  | 'resolved'     // Issue fixed or confirmed
  | 'archived';    // Historical record

/**
 * Core Feedback entity
 */
export interface AutomationFeedback {
  /** Unique feedback identifier */
  id: string;

  /** Automation being reviewed */
  automationId: string;

  /** Organization that owns the automation */
  organizationId: string;

  /** User who provided feedback */
  userId: string;
  userEmail: string;

  /** Type of feedback */
  feedbackType: FeedbackType;

  /** Overall sentiment */
  sentiment: FeedbackSentiment;

  /** User's text comment (optional) */
  comment?: string;

  /** Snapshot of automation state when feedback given */
  automationSnapshot: AutomationSnapshot;

  /** Snapshot of detection metadata when feedback given */
  detectionSnapshot?: DetectionSnapshot;

  /** Suggested corrections from user */
  suggestedCorrections?: SuggestedCorrections;

  /** ML training metadata */
  mlMetadata: MLTrainingMetadata;

  /** Feedback status */
  status: FeedbackStatus;

  /** Resolution details if addressed */
  resolution?: FeedbackResolution;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

/**
 * Snapshot of automation at time of feedback
 * Captures complete state for ML training
 */
export interface AutomationSnapshot {
  /** Automation ID */
  automationId: string;

  /** Automation name */
  name: string;

  /** Automation type */
  type: string;

  /** Status when feedback given */
  status: string;

  /** Risk assessment snapshot */
  risk: {
    score: number;
    level: string;
    factors: Array<{
      type: string;
      description: string;
      score: number;
      severity: string;
    }>;
  };

  /** Permissions snapshot */
  permissions: {
    scopes: string[];
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    isAdmin: boolean;
  };

  /** AI information snapshot (if applicable) */
  aiInfo?: {
    provider: string;
    model?: string;
    endpoints: string[];
    dailyApiCalls?: number;
  };

  /** Full metadata snapshot */
  metadata: Record<string, unknown>;

  /** Snapshot timestamp */
  snapshotAt: Date;
}

/**
 * Snapshot of detection metadata at time of feedback
 */
export interface DetectionSnapshot {
  /** AI provider detection result */
  aiProvider?: {
    provider: string;
    confidence: number;
    detectionMethods: string[];
    evidence: Record<string, unknown>;
    model?: string;
  };

  /** All detection patterns found */
  detectionPatterns?: Array<{
    patternType: string;
    confidence: number;
    severity: string;
    evidence: Record<string, unknown>;
  }>;

  /** Correlation data */
  correlationData?: {
    relatedAutomations: string[];
    crossPlatformChain: boolean;
    chainConfidence?: number;
  };

  /** Snapshot timestamp */
  snapshotAt: Date;
}

/**
 * User's suggested corrections
 */
export interface SuggestedCorrections {
  /** Suggested automation type */
  automationType?: string;

  /** Suggested AI provider */
  aiProvider?: string;

  /** Suggested risk level */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  /** Suggested risk score (0-100) */
  riskScore?: number;

  /** Additional notes */
  notes?: string;
}

/**
 * ML training metadata
 * Prepared for reinforcement learning
 */
export interface MLTrainingMetadata {
  /** Training sample ID for ML pipeline */
  trainingSampleId: string;

  /** Feature vector for ML model */
  features: MLFeatures;

  /** Ground truth label from user feedback */
  label: MLLabel;

  /** Confidence in this training sample */
  sampleConfidence: number;

  /** Whether this sample should be used for training */
  useForTraining: boolean;

  /** Training weight (importance) */
  trainingWeight: number;

  /** ML pipeline version */
  mlVersion: string;

  /** Created timestamp */
  createdAt: Date;
}

/**
 * Feature vector for ML training
 */
export interface MLFeatures {
  /** Detection features */
  detection: {
    aiProviderConfidence: number;
    detectionMethodCount: number;
    evidenceStrength: number;
    modelDetected: boolean;
  };

  /** Risk features */
  risk: {
    riskScore: number;
    permissionCount: number;
    hasAdminAccess: boolean;
    dataAccessLevel: number;
  };

  /** Activity features */
  activity: {
    executionFrequency: number;
    lastTriggered: number; // Days since last trigger
    totalExecutions: number;
  };

  /** Context features */
  context: {
    platform: string;
    organizationSize: number;
    industryVertical?: string;
  };
}

/**
 * Ground truth label for ML training
 */
export interface MLLabel {
  /** Is this actually an automation? */
  isAutomation: boolean;

  /** Correct automation type */
  automationType?: string;

  /** Correct AI provider (if AI automation) */
  aiProvider?: string;

  /** Correct risk classification */
  riskClassification: 'low' | 'medium' | 'high' | 'critical';

  /** User sentiment (positive = correct, negative = incorrect) */
  sentiment: FeedbackSentiment;

  /** Label confidence */
  confidence: number;
}

/**
 * Feedback resolution details
 */
export interface FeedbackResolution {
  /** Resolution type */
  type: 'detection_improved' | 'user_educated' | 'bug_fixed' | 'confirmed_correct' | 'false_report';

  /** Resolution description */
  description: string;

  /** Resolved by user/admin */
  resolvedBy: string;

  /** Actions taken */
  actionsTaken: string[];

  /** Whether detection algorithm was updated */
  algorithmUpdated: boolean;

  /** Resolution timestamp */
  resolvedAt: Date;
}

/**
 * Feedback creation input
 */
export interface CreateFeedbackInput {
  automationId: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  feedbackType: FeedbackType;
  sentiment: FeedbackSentiment;
  comment?: string;
  suggestedCorrections?: SuggestedCorrections;
}

/**
 * Feedback update input
 */
export interface UpdateFeedbackInput {
  status?: FeedbackStatus;
  comment?: string;
  resolution?: FeedbackResolution;
}

/**
 * Feedback query filters
 */
export interface FeedbackFilters {
  organizationId?: string;
  automationId?: string;
  userId?: string;
  feedbackType?: FeedbackType;
  sentiment?: FeedbackSentiment;
  status?: FeedbackStatus;
  useForTraining?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Feedback statistics
 */
export interface FeedbackStatistics {
  /** Total feedback count */
  totalFeedback: number;

  /** By sentiment */
  bySentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };

  /** By feedback type */
  byType: Record<FeedbackType, number>;

  /** By status */
  byStatus: Record<FeedbackStatus, number>;

  /** ML training metrics */
  mlMetrics: {
    totalTrainingSamples: number;
    avgSampleConfidence: number;
    avgTrainingWeight: number;
  };

  /** Detection accuracy metrics */
  detectionAccuracy: {
    correctDetections: number;
    falsePositives: number;
    falseNegatives: number;
    accuracyRate: number;
  };
}

/**
 * Feedback aggregation by time period
 */
export interface FeedbackTrend {
  period: string; // ISO date or period identifier
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  accuracyRate: number;
}

/**
 * ML training batch export
 */
export interface MLTrainingBatch {
  batchId: string;
  organizationId?: string;
  samples: Array<{
    sampleId: string;
    features: MLFeatures;
    label: MLLabel;
    weight: number;
  }>;
  batchSize: number;
  createdAt: Date;
  mlVersion: string;
}
