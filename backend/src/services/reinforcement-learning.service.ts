/**
 * Reinforcement Learning Service
 * Optimizes detection thresholds using user feedback
 */

import { DetectionFeedback, FeedbackType, ReinforcementMetrics } from '@saas-xray/shared-types';
import { feedbackStorageService } from './feedback-storage.service';

/**
 * Optimized thresholds for an organization
 */
interface OptimizedThresholds {
  velocityThresholds: {
    humanMaxFileCreation: number;
    humanMaxPermissionChanges: number;
    humanMaxEmailActions: number;
    automationThreshold: number;
    criticalThreshold: number;
  };
  mlConfidenceThreshold: number;
  offHoursThreshold: number;
}

/**
 * Threshold adjustment result
 */
interface ThresholdAdjustment {
  newThreshold: number;
  confidence: number;
  adjustment: string;
  reason: string;
}

/**
 * Default baseline thresholds (from VelocityDetectorService)
 */
const DEFAULT_THRESHOLDS: OptimizedThresholds = {
  velocityThresholds: {
    humanMaxFileCreation: 1,
    humanMaxPermissionChanges: 2,
    humanMaxEmailActions: 3,
    automationThreshold: 5,
    criticalThreshold: 10
  },
  mlConfidenceThreshold: 0.7,
  offHoursThreshold: 0.1
};

/**
 * Reinforcement Learning Service
 * Uses Q-learning inspired approach to optimize detection parameters
 */
class ReinforcementLearningService {
  private organizationThresholds: Map<string, OptimizedThresholds> = new Map();
  private learningRate: number = 0.1;
  private explorationRate: number = 0.1;

  /**
   * Calculate reward signal from feedback type
   */
  calculateReward(feedbackType: FeedbackType): number {
    switch (feedbackType) {
      case FeedbackType.TRUE_POSITIVE:
        return 1;   // Correct detection
      case FeedbackType.FALSE_POSITIVE:
        return -1;  // Incorrect alert (annoying to users)
      case FeedbackType.FALSE_NEGATIVE:
        return -2;  // Missed threat (dangerous!)
      case FeedbackType.UNCERTAIN:
        return 0;   // Neutral
      default:
        return 0;
    }
  }

  /**
   * Adjust detection threshold based on feedback history
   */
  async adjustThresholds(
    organizationId: string,
    metric: 'velocity' | 'permission' | 'off_hours',
    currentThreshold: number,
    feedbackHistory: DetectionFeedback[]
  ): Promise<ThresholdAdjustment> {
    // Calculate metrics from feedback
    const truePositives = feedbackHistory.filter(f => f.feedbackType === FeedbackType.TRUE_POSITIVE).length;
    const falsePositives = feedbackHistory.filter(f => f.feedbackType === FeedbackType.FALSE_POSITIVE).length;
    const falseNegatives = feedbackHistory.filter(f => f.feedbackType === FeedbackType.FALSE_NEGATIVE).length;

    const totalTP_FP = truePositives + falsePositives;
    const totalTP_FN = truePositives + falseNegatives;

    const precision = totalTP_FP > 0 ? truePositives / totalTP_FP : 0;
    const recall = totalTP_FN > 0 ? truePositives / totalTP_FN : 0;

    // Calculate cumulative reward
    const totalReward = feedbackHistory.reduce((sum, fb) => {
      return sum + this.calculateReward(fb.feedbackType);
    }, 0);

    // Epsilon-greedy exploration
    if (this.shouldExplore()) {
      const randomAdjustment = (Math.random() - 0.5) * 0.2; // ±10% random
      const newThreshold = Math.max(0.1, currentThreshold * (1 + randomAdjustment));

      console.log(`🎲 Exploration: ${metric} threshold ${currentThreshold.toFixed(2)} → ${newThreshold.toFixed(2)} (random)`);

      return {
        newThreshold,
        confidence: 0.5,
        adjustment: 'exploration',
        reason: 'Random exploration for learning'
      };
    }

    // Exploitation: Adjust based on performance
    let adjustment = 0;
    let reason = '';

    // Too many false positives → increase threshold (less sensitive)
    if (precision < 0.85 && falsePositives > 3) {
      adjustment = 0.1; // Increase by 10%
      reason = `Low precision (${(precision * 100).toFixed(1)}%), reducing false positives`;
    }
    // Too many false negatives → decrease threshold (more sensitive)
    else if (recall < 0.90 && falseNegatives > 2) {
      adjustment = -0.1; // Decrease by 10%
      reason = `Low recall (${(recall * 100).toFixed(1)}%), improving detection coverage`;
    }
    // Good performance → small refinement
    else if (totalReward > 0) {
      adjustment = totalReward > 10 ? 0.02 : -0.02; // Small adjustment
      reason = `Fine-tuning based on positive feedback (reward: ${totalReward})`;
    }

    const newThreshold = Math.max(0.1, currentThreshold * (1 + adjustment));
    const confidence = Math.min(feedbackHistory.length / 100, 1.0); // More feedback = more confidence

    console.log(`⚙️ ${metric} threshold adjustment: ${currentThreshold.toFixed(2)} → ${newThreshold.toFixed(2)} (${reason})`);

    return {
      newThreshold,
      confidence,
      adjustment: adjustment > 0 ? 'increase' : adjustment < 0 ? 'decrease' : 'stable',
      reason
    };
  }

  /**
   * Get optimized thresholds for organization
   */
  async getOptimizedThresholds(organizationId: string): Promise<OptimizedThresholds> {
    // Check cache
    const cached = this.organizationThresholds.get(organizationId);
    if (cached) {
      return cached;
    }

    // Get feedback from last 30 days
    const timeWindow = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const feedbackHistory = await feedbackStorageService.getOrganizationFeedback(
      organizationId,
      timeWindow
    );

    // If insufficient feedback, use defaults
    if (feedbackHistory.length < 10) {
      console.log(`📊 Insufficient feedback for ${organizationId} (${feedbackHistory.length}), using defaults`);
      return DEFAULT_THRESHOLDS;
    }

    // Adjust velocity thresholds
    const velocityFeedback = feedbackHistory.filter(f =>
      f.metadata?.detectionType === 'velocity' ||
      f.metadata?.metric === 'velocity'
    );

    const baseThresholds = { ...DEFAULT_THRESHOLDS };

    if (velocityFeedback.length >= 5) {
      const velocityAdjustment = await this.adjustThresholds(
        organizationId,
        'velocity',
        baseThresholds.velocityThresholds.automationThreshold,
        velocityFeedback
      );

      const adjustmentFactor = velocityAdjustment.newThreshold / baseThresholds.velocityThresholds.automationThreshold;

      baseThresholds.velocityThresholds = {
        humanMaxFileCreation: baseThresholds.velocityThresholds.humanMaxFileCreation * adjustmentFactor,
        humanMaxPermissionChanges: baseThresholds.velocityThresholds.humanMaxPermissionChanges * adjustmentFactor,
        humanMaxEmailActions: baseThresholds.velocityThresholds.humanMaxEmailActions * adjustmentFactor,
        automationThreshold: velocityAdjustment.newThreshold,
        criticalThreshold: baseThresholds.velocityThresholds.criticalThreshold * adjustmentFactor
      };
    }

    // Adjust ML confidence threshold
    const mlFeedback = feedbackHistory.filter(f =>
      f.metadata?.detectionType === 'ml' ||
      f.metadata?.source === 'ml_enhanced'
    );

    if (mlFeedback.length >= 5) {
      const mlAdjustment = await this.adjustThresholds(
        organizationId,
        'permission',
        baseThresholds.mlConfidenceThreshold,
        mlFeedback
      );

      baseThresholds.mlConfidenceThreshold = mlAdjustment.newThreshold;
    }

    // Cache optimized thresholds
    this.organizationThresholds.set(organizationId, baseThresholds);

    console.log(`✅ Optimized thresholds calculated for ${organizationId}:`, {
      automation: baseThresholds.velocityThresholds.automationThreshold,
      mlConfidence: baseThresholds.mlConfidenceThreshold
    });

    return baseThresholds;
  }

  /**
   * Calculate performance metrics for organization
   */
  async getPerformanceMetrics(
    organizationId: string,
    feedbackData: DetectionFeedback[]
  ): Promise<ReinforcementMetrics> {
    const truePositives = feedbackData.filter(f => f.feedbackType === FeedbackType.TRUE_POSITIVE).length;
    const falsePositives = feedbackData.filter(f => f.feedbackType === FeedbackType.FALSE_POSITIVE).length;
    const falseNegatives = feedbackData.filter(f => f.feedbackType === FeedbackType.FALSE_NEGATIVE).length;
    const totalFeedback = feedbackData.length;

    const precision = (truePositives + falsePositives) > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;

    const recall = (truePositives + falseNegatives) > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;

    const f1Score = (precision + recall) > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    const rewardSignal = feedbackData.reduce((sum, fb) => {
      return sum + this.calculateReward(fb.feedbackType);
    }, 0);

    const timeWindow = feedbackData.length > 0
      ? {
          start: new Date(Math.min(...feedbackData.map(f => f.createdAt.getTime()))),
          end: new Date(Math.max(...feedbackData.map(f => f.createdAt.getTime())))
        }
      : { start: new Date(), end: new Date() };

    return {
      organizationId,
      timeWindow,
      totalFeedback,
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      f1Score,
      rewardSignal
    };
  }

  /**
   * Check if performance has degraded (safety check)
   */
  async checkPerformanceDegradation(
    organizationId: string
  ): Promise<{
    shouldRollback: boolean;
    reason?: string;
    metrics: { before: number; after: number };
  }> {
    const last30Days = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const last7Days = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const metrics30 = await feedbackStorageService.calculateMetrics(organizationId, last30Days);
    const metrics7 = await feedbackStorageService.calculateMetrics(organizationId, last7Days);

    // Check if precision dropped >5%
    const precisionDrop = metrics30.precision - metrics7.precision;
    if (precisionDrop > 0.05) {
      return {
        shouldRollback: true,
        reason: `Precision dropped ${(precisionDrop * 100).toFixed(1)}% in last 7 days`,
        metrics: { before: metrics30.precision, after: metrics7.precision }
      };
    }

    // Check if total reward became negative
    if (metrics7.rewardSignal < -5 && metrics7.totalFeedback > 10) {
      return {
        shouldRollback: true,
        reason: `Negative reward signal: ${metrics7.rewardSignal}`,
        metrics: { before: metrics30.rewardSignal, after: metrics7.rewardSignal }
      };
    }

    return {
      shouldRollback: false,
      metrics: { before: metrics30.precision, after: metrics7.precision }
    };
  }

  /**
   * Epsilon-greedy exploration decision
   */
  private shouldExplore(epsilon: number = this.explorationRate): boolean {
    return Math.random() < epsilon;
  }

  /**
   * Clear cached thresholds for organization
   */
  clearCache(organizationId?: string): void {
    if (organizationId) {
      this.organizationThresholds.delete(organizationId);
      console.log(`🗑️ Cleared threshold cache for ${organizationId}`);
    } else {
      this.organizationThresholds.clear();
      console.log(`🗑️ Cleared all threshold caches`);
    }
  }
}

export const reinforcementLearningService = new ReinforcementLearningService();
