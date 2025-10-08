/**
 * Feedback Storage Service
 * PostgreSQL storage for detection feedback and reinforcement learning metrics
 */

import { db } from '../database/pool';
import { DetectionFeedback, FeedbackType, ReinforcementMetrics } from '@saas-xray/shared-types';

/**
 * Database row structure for detection_feedback table
 */
interface DetectionFeedbackRow {
  id: string;
  detection_id: string;
  feedback_type: string;
  user_id: string;
  organization_id: string;
  comment: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Metrics calculation row structure
 */
interface MetricsRow {
  total_feedback: string;
  true_positives: string;
  false_positives: string;
  false_negatives: string;
}

/**
 * Service for managing detection feedback storage and reinforcement learning metrics
 */
class FeedbackStorageService {
  /**
   * Create new feedback entry
   */
  async createFeedback(
    feedback: Omit<DetectionFeedback, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DetectionFeedback> {
    try {
      const result = await db.query<DetectionFeedbackRow>(
        `INSERT INTO detection_feedback
         (detection_id, feedback_type, user_id, organization_id, comment, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          feedback.detectionId,
          feedback.feedbackType,
          feedback.userId,
          feedback.organizationId,
          feedback.comment || null,
          feedback.metadata || {}
        ]
      );

      if (!result.rows[0]) {
        throw new Error('Failed to create feedback: no rows returned');
      }

      return this.mapRowToFeedback(result.rows[0]);
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw new Error(`Failed to create feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all feedback for a specific detection
   */
  async getFeedbackByDetectionId(detectionId: string): Promise<DetectionFeedback[]> {
    try {
      const result = await db.query<DetectionFeedbackRow>(
        `SELECT * FROM detection_feedback
         WHERE detection_id = $1
         ORDER BY created_at DESC`,
        [detectionId]
      );

      return result.rows.map(row => this.mapRowToFeedback(row));
    } catch (error) {
      console.error('Error fetching feedback by detection ID:', error);
      throw new Error(`Failed to fetch feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get organization feedback within time window
   */
  async getOrganizationFeedback(
    organizationId: string,
    timeWindow: { start: Date; end: Date }
  ): Promise<DetectionFeedback[]> {
    try {
      const result = await db.query<DetectionFeedbackRow>(
        `SELECT * FROM detection_feedback
         WHERE organization_id = $1
         AND created_at BETWEEN $2 AND $3
         ORDER BY created_at DESC`,
        [organizationId, timeWindow.start, timeWindow.end]
      );

      return result.rows.map(row => this.mapRowToFeedback(row));
    } catch (error) {
      console.error('Error fetching organization feedback:', error);
      throw new Error(`Failed to fetch organization feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate reinforcement learning metrics for organization
   */
  async calculateMetrics(
    organizationId: string,
    timeWindow: { start: Date; end: Date }
  ): Promise<ReinforcementMetrics> {
    try {
      const result = await db.query<MetricsRow>(
        `SELECT
           COUNT(*) as total_feedback,
           COUNT(*) FILTER (WHERE feedback_type = 'true_positive') as true_positives,
           COUNT(*) FILTER (WHERE feedback_type = 'false_positive') as false_positives,
           COUNT(*) FILTER (WHERE feedback_type = 'false_negative') as false_negatives
         FROM detection_feedback
         WHERE organization_id = $1
         AND created_at BETWEEN $2 AND $3`,
        [organizationId, timeWindow.start, timeWindow.end]
      );

      const row = result.rows[0];
      const totalFeedback = parseInt(row.total_feedback, 10);
      const truePositives = parseInt(row.true_positives, 10);
      const falsePositives = parseInt(row.false_positives, 10);
      const falseNegatives = parseInt(row.false_negatives, 10);

      // Calculate precision: TP / (TP + FP)
      const precision = (truePositives + falsePositives) > 0
        ? truePositives / (truePositives + falsePositives)
        : 0;

      // Calculate recall: TP / (TP + FN)
      const recall = (truePositives + falseNegatives) > 0
        ? truePositives / (truePositives + falseNegatives)
        : 0;

      // Calculate F1 score: 2 * (precision * recall) / (precision + recall)
      const f1Score = (precision + recall) > 0
        ? 2 * (precision * recall) / (precision + recall)
        : 0;

      // Calculate reward signal: +1 for TP, -1 for FP, -2 for FN
      const rewardSignal = (truePositives * 1) + (falsePositives * -1) + (falseNegatives * -2);

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
    } catch (error) {
      console.error('Error calculating metrics:', error);
      throw new Error(`Failed to calculate metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database row to DetectionFeedback model
   */
  private mapRowToFeedback(row: DetectionFeedbackRow): DetectionFeedback {
    return {
      id: row.id,
      detectionId: row.detection_id,
      feedbackType: row.feedback_type as FeedbackType,
      userId: row.user_id,
      organizationId: row.organization_id,
      comment: row.comment || undefined,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const feedbackStorageService = new FeedbackStorageService();
