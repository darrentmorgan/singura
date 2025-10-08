/**
 * Feedback domain model types
 * Core types for reinforcement learning feedback on detection system
 */

/**
 * Type of feedback provided by users on detections
 */
export enum FeedbackType {
  /** User confirms the detection is correct - truly suspicious activity */
  TRUE_POSITIVE = 'true_positive',

  /** Detection was incorrect - activity is not suspicious */
  FALSE_POSITIVE = 'false_positive',

  /** We missed a real threat that should have been flagged */
  FALSE_NEGATIVE = 'false_negative',

  /** User is uncertain about the classification */
  UNCERTAIN = 'uncertain'
}

/**
 * User feedback on a specific detection
 * Enables reinforcement learning to improve detection accuracy
 */
export interface DetectionFeedback {
  /** Unique feedback identifier (UUID) */
  id: string;

  /** Detection this feedback is about */
  detectionId: string;

  /** Type of feedback provided */
  feedbackType: FeedbackType;

  /** User who provided the feedback */
  userId: string;

  /** Organization that owns this detection (multi-tenant isolation) */
  organizationId: string;

  /** Optional user explanation or context */
  comment?: string;

  /** Additional contextual information */
  metadata?: Record<string, any>;

  /** When feedback was created */
  createdAt: Date;

  /** When feedback was last updated */
  updatedAt: Date;
}

/**
 * Time window for metric calculations
 */
export interface TimeWindow {
  /** Start of the time window */
  start: Date;

  /** End of the time window */
  end: Date;
}

/**
 * Reinforcement learning metrics for model performance
 * Tracks detection accuracy and provides reward signals
 */
export interface ReinforcementMetrics {
  /** Organization these metrics apply to */
  organizationId: string;

  /** Time period for these metrics */
  timeWindow: TimeWindow;

  /** Total number of feedback items received */
  totalFeedback: number;

  /** Count of confirmed true positives */
  truePositives: number;

  /** Count of false positives (incorrect detections) */
  falsePositives: number;

  /** Count of false negatives (missed threats) */
  falseNegatives: number;

  /**
   * Precision: What proportion of positive detections are correct?
   * Formula: TP / (TP + FP)
   * Range: 0.0 to 1.0
   */
  precision: number;

  /**
   * Recall: What proportion of actual threats did we detect?
   * Formula: TP / (TP + FN)
   * Range: 0.0 to 1.0
   */
  recall: number;

  /**
   * F1 Score: Harmonic mean of precision and recall
   * Formula: 2 * (precision * recall) / (precision + recall)
   * Range: 0.0 to 1.0
   */
  f1Score: number;

  /**
   * Cumulative reward signal for reinforcement learning
   * Scoring: +1 for TP, -1 for FP, -2 for FN (missing threats is worse)
   */
  rewardSignal: number;
}

/**
 * Threshold adjustment record
 * Tracks how detection thresholds are tuned based on feedback
 */
export interface ThresholdAdjustment {
  /** When the adjustment was made */
  timestamp: Date;

  /** Metric that was adjusted (e.g., 'risk_score_threshold', 'confidence_threshold') */
  metric: string;

  /** Previous threshold value */
  oldValue: number;

  /** New threshold value */
  newValue: number;

  /** Reason for the adjustment */
  reason: string;
}

/**
 * Accuracy trend data point
 */
export interface AccuracyDataPoint {
  /** Date for this accuracy measurement */
  date: Date;

  /** Accuracy score (0.0 to 1.0) */
  accuracy: number;
}

/**
 * Aggregated feedback statistics for a specific detection type
 * Tracks performance trends and threshold adjustments over time
 */
export interface FeedbackStatistics {
  /** Organization these statistics apply to */
  organizationId: string;

  /** Type of detection (e.g., 'ai_service', 'bot', 'webhook') */
  detectionType: string;

  /** Total number of feedback items for this detection type */
  feedbackCount: number;

  /** Historical accuracy trend over time */
  accuracyTrend: AccuracyDataPoint[];

  /** History of threshold adjustments based on feedback */
  thresholdAdjustments: ThresholdAdjustment[];
}
