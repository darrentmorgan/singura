/**
 * Automation Feedback Service
 * Business logic for feedback capture and ML training preparation
 * Phase 2: Feedback System
 */

import { automationFeedbackRepository } from '../database/repositories/automation-feedback.repository';
import { discoveredAutomationRepository } from '../database/repositories/discovered-automation';
import {
  AutomationFeedback,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackFilters,
  FeedbackStatistics,
  FeedbackTrend,
  MLTrainingBatch,
  AutomationSnapshot,
  DetectionSnapshot,
  MLTrainingMetadata,
  MLFeatures,
  MLLabel,
  FeedbackSentiment
} from '@singura/shared-types';

export class AutomationFeedbackService {
  /**
   * Create feedback with automatic snapshot capture
   */
  async createFeedback(input: CreateFeedbackInput): Promise<{
    success: boolean;
    data: AutomationFeedback | null;
    error?: string;
  }> {
    try {
      // Fetch automation to create snapshot
      const automation = await discoveredAutomationRepository.findById(input.automationId);

      if (!automation) {
        return {
          success: false,
          data: null,
          error: 'Automation not found'
        };
      }

      const automationData = automation;

      // Create automation snapshot
      const automationSnapshot = this.createAutomationSnapshot(automationData);

      // Create detection snapshot
      const detectionSnapshot = this.createDetectionSnapshot(automationData);

      // Build ML metadata
      const mlMetadata = this.buildMLMetadata(
        input,
        automationData,
        automationSnapshot,
        detectionSnapshot
      );

      // Create feedback with snapshots
      const result = await automationFeedbackRepository.createWithSnapshots(
        input,
        automationSnapshot,
        detectionSnapshot,
        mlMetadata
      );

      return result;

    } catch (error) {
      console.error('Error creating feedback:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update feedback
   */
  async updateFeedback(
    feedbackId: string,
    input: UpdateFeedbackInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await automationFeedbackRepository.update(feedbackId, input as UpdateFeedbackInput & Record<string, unknown>);
      return { success: true };
    } catch (error) {
      console.error('Error updating feedback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedback(feedbackId: string): Promise<{
    success: boolean;
    data: AutomationFeedback | null;
  }> {
    const feedback = await automationFeedbackRepository.findById(feedbackId);
    return {
      success: !!feedback,
      data: feedback
    };
  }

  /**
   * Get feedback with filters
   */
  async getFeedbackList(filters: FeedbackFilters): Promise<{
    success: boolean;
    data: AutomationFeedback[];
    total: number;
  }> {
    return automationFeedbackRepository.findWithFilters(filters);
  }

  /**
   * Get feedback by automation
   */
  async getFeedbackByAutomation(automationId: string): Promise<AutomationFeedback[]> {
    return automationFeedbackRepository.getByAutomation(automationId);
  }

  /**
   * Get recent feedback for organization
   */
  async getRecentFeedback(
    organizationId: string,
    limit: number = 10
  ): Promise<AutomationFeedback[]> {
    return automationFeedbackRepository.getRecent(organizationId, limit);
  }

  /**
   * Acknowledge feedback
   */
  async acknowledgeFeedback(feedbackId: string): Promise<{ success: boolean }> {
    return automationFeedbackRepository.acknowledge(feedbackId);
  }

  /**
   * Resolve feedback
   */
  async resolveFeedback(
    feedbackId: string,
    resolution: any
  ): Promise<{ success: boolean }> {
    return automationFeedbackRepository.resolve(feedbackId, resolution);
  }

  /**
   * Archive old feedback
   */
  async archiveOldFeedback(daysOld: number = 90): Promise<{
    success: boolean;
    count: number;
  }> {
    return automationFeedbackRepository.archiveOld(daysOld);
  }

  /**
   * Get feedback statistics
   */
  async getStatistics(organizationId: string): Promise<FeedbackStatistics> {
    return automationFeedbackRepository.getStatistics(organizationId);
  }

  /**
   * Get feedback trends
   */
  async getTrends(
    organizationId: string,
    days: number = 30
  ): Promise<FeedbackTrend[]> {
    return automationFeedbackRepository.getTrends(organizationId, days);
  }

  /**
   * Get ML training batch
   */
  async getMLTrainingBatch(
    organizationId?: string,
    limit: number = 100
  ): Promise<MLTrainingBatch> {
    return automationFeedbackRepository.getMLTrainingSamples(organizationId, limit);
  }

  /**
   * Create automation snapshot for ML training
   */
  private createAutomationSnapshot(automation: any): AutomationSnapshot {
    return {
      automationId: automation.id,
      name: automation.name,
      type: automation.automation_type || automation.type,
      status: automation.status || 'unknown',
      risk: {
        score: automation.risk_score || 0,
        level: this.calculateRiskLevel(automation.risk_score || 0),
        factors: automation.risk_factors || []
      },
      permissions: {
        scopes: automation.permissions_required || [],
        canRead: automation.can_read !== false,
        canWrite: automation.can_write === true,
        canDelete: automation.can_delete === true,
        isAdmin: automation.is_admin === true
      },
      aiInfo: automation.ai_provider ? {
        provider: automation.ai_provider,
        model: automation.ai_model,
        endpoints: automation.api_endpoints || [],
        dailyApiCalls: automation.daily_api_calls
      } : undefined,
      metadata: automation.platform_metadata || {},
      snapshotAt: new Date()
    };
  }

  /**
   * Create detection snapshot
   */
  private createDetectionSnapshot(automation: any): DetectionSnapshot {
    const detectionMetadata = automation.detection_metadata || {};

    return {
      aiProvider: detectionMetadata.aiProvider ? {
        provider: detectionMetadata.aiProvider.provider,
        confidence: detectionMetadata.aiProvider.confidence,
        detectionMethods: detectionMetadata.aiProvider.detectionMethods || [],
        evidence: detectionMetadata.aiProvider.evidence || {},
        model: detectionMetadata.aiProvider.model
      } : undefined,
      detectionPatterns: detectionMetadata.detectionPatterns || [],
      correlationData: detectionMetadata.correlationData ? {
        relatedAutomations: detectionMetadata.correlationData.relatedAutomations?.map((r: any) => r.automationId) || [],
        crossPlatformChain: detectionMetadata.correlationData.crossPlatformChain || false,
        chainConfidence: detectionMetadata.correlationData.chainConfidence
      } : undefined,
      snapshotAt: new Date()
    };
  }

  /**
   * Build ML training metadata
   */
  private buildMLMetadata(
    input: CreateFeedbackInput,
    automation: any,
    snapshot: AutomationSnapshot,
    detectionSnapshot: DetectionSnapshot
  ): MLTrainingMetadata {
    // Extract features
    const features = this.extractMLFeatures(automation, snapshot, detectionSnapshot);

    // Create label from user feedback
    const label = this.createMLLabel(input, snapshot);

    // Calculate sample confidence
    const sampleConfidence = this.calculateSampleConfidence(input, features);

    // Determine if should use for training
    const useForTraining = this.shouldUseForTraining(input, sampleConfidence);

    // Calculate training weight
    const trainingWeight = this.calculateTrainingWeight(input, features, sampleConfidence);

    return {
      trainingSampleId: `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      features,
      label,
      sampleConfidence,
      useForTraining,
      trainingWeight,
      mlVersion: '1.0.0',
      createdAt: new Date()
    };
  }

  /**
   * Extract ML features from automation
   */
  private extractMLFeatures(
    automation: any,
    snapshot: AutomationSnapshot,
    detectionSnapshot: DetectionSnapshot
  ): MLFeatures {
    return {
      detection: {
        aiProviderConfidence: detectionSnapshot.aiProvider?.confidence || 0,
        detectionMethodCount: detectionSnapshot.aiProvider?.detectionMethods.length || 0,
        evidenceStrength: this.calculateEvidenceStrength(detectionSnapshot),
        modelDetected: !!detectionSnapshot.aiProvider?.model
      },
      risk: {
        riskScore: snapshot.risk.score,
        permissionCount: snapshot.permissions.scopes.length,
        hasAdminAccess: snapshot.permissions.isAdmin,
        dataAccessLevel: this.calculateDataAccessLevel(snapshot.permissions)
      },
      activity: {
        executionFrequency: automation.execution_frequency || 0,
        lastTriggered: this.daysSince(automation.last_triggered_at),
        totalExecutions: automation.total_executions || 0
      },
      context: {
        platform: automation.platform_type || 'unknown',
        organizationSize: 100, // TODO: Get from organization metadata
        industryVertical: undefined // TODO: Get from organization metadata
      }
    };
  }

  /**
   * Create ML label from feedback
   */
  private createMLLabel(
    input: CreateFeedbackInput,
    snapshot: AutomationSnapshot
  ): MLLabel {
    return {
      isAutomation: input.feedbackType !== 'false_positive',
      automationType: input.suggestedCorrections?.automationType || snapshot.type,
      aiProvider: input.suggestedCorrections?.aiProvider || snapshot.aiInfo?.provider,
      riskClassification: input.suggestedCorrections?.riskLevel || snapshot.risk.level as any,
      sentiment: input.sentiment,
      confidence: this.calculateLabelConfidence(input)
    };
  }

  /**
   * Calculate sample confidence
   */
  private calculateSampleConfidence(
    input: CreateFeedbackInput,
    features: MLFeatures
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if user provided detailed feedback
    if (input.comment && input.comment.length > 50) {
      confidence += 0.2;
    }

    // Increase confidence if user provided corrections
    if (input.suggestedCorrections) {
      confidence += 0.15;
    }

    // Increase confidence if detection evidence is strong
    if (features.detection.evidenceStrength > 0.7) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine if should use for training
   */
  private shouldUseForTraining(
    input: CreateFeedbackInput,
    sampleConfidence: number
  ): boolean {
    // Use for training if confidence is high enough
    if (sampleConfidence < 0.6) {
      return false;
    }

    // Use clear positive/negative feedback
    if (input.sentiment === 'positive' || input.sentiment === 'negative') {
      return true;
    }

    // Don't use neutral feedback unless it has corrections
    return !!input.suggestedCorrections;
  }

  /**
   * Calculate training weight
   */
  private calculateTrainingWeight(
    input: CreateFeedbackInput,
    features: MLFeatures,
    sampleConfidence: number
  ): number {
    let weight = 1.0; // Base weight

    // Increase weight for high-confidence samples
    weight *= sampleConfidence;

    // Increase weight for rare feedback types (false negatives are valuable)
    if (input.feedbackType === 'false_negative') {
      weight *= 1.5;
    }

    // Increase weight for high-risk scenarios
    if (features.risk.riskScore > 70) {
      weight *= 1.2;
    }

    return Math.min(weight, 2.0); // Cap at 2.0
  }

  /**
   * Calculate evidence strength
   */
  private calculateEvidenceStrength(detectionSnapshot: DetectionSnapshot): number {
    if (!detectionSnapshot.aiProvider) {
      return 0;
    }

    const methodCount = detectionSnapshot.aiProvider.detectionMethods.length;
    const confidence = detectionSnapshot.aiProvider.confidence / 100;
    const hasModel = detectionSnapshot.aiProvider.model ? 0.2 : 0;

    return Math.min((methodCount / 6) * 0.5 + confidence * 0.3 + hasModel, 1.0);
  }

  /**
   * Calculate data access level
   */
  private calculateDataAccessLevel(permissions: AutomationSnapshot['permissions']): number {
    let level = 0;
    if (permissions.canRead) level += 1;
    if (permissions.canWrite) level += 2;
    if (permissions.canDelete) level += 3;
    if (permissions.isAdmin) level += 4;
    return Math.min(level / 10, 1.0);
  }

  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(score: number): string {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    if (score < 90) return 'high';
    return 'critical';
  }

  /**
   * Calculate label confidence
   */
  private calculateLabelConfidence(input: CreateFeedbackInput): number {
    let confidence = 0.7; // Base confidence

    if (input.sentiment === 'positive' || input.sentiment === 'negative') {
      confidence += 0.1;
    }

    if (input.comment && input.comment.length > 50) {
      confidence += 0.1;
    }

    if (input.suggestedCorrections) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Days since date
   */
  private daysSince(date: Date | null | undefined): number {
    if (!date) return 999; // Large number if never triggered
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const automationFeedbackService = new AutomationFeedbackService();
