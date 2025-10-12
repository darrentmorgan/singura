/**
 * Automation Feedback Repository
 * Handles CRUD operations for automation_feedback table
 * Phase 2: Feedback System
 */

import { BaseRepository } from './base';
import { db } from '../pool';
import {
  AutomationFeedback,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackFilters,
  FeedbackStatistics,
  FeedbackTrend,
  MLTrainingBatch,
  FeedbackType,
  FeedbackSentiment,
  FeedbackStatus
} from '@singura/shared-types';

/**
 * Database representation of feedback
 */
export interface AutomationFeedbackRow {
  id: string;
  automation_id: string;
  organization_id: string;
  user_id: string;
  user_email: string;
  feedback_type: FeedbackType;
  sentiment: FeedbackSentiment;
  comment: string | null;
  automation_snapshot: any;
  detection_snapshot: any;
  suggested_corrections: any;
  ml_metadata: any;
  status: FeedbackStatus;
  resolution: any;
  created_at: Date;
  updated_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
}

export class AutomationFeedbackRepository extends BaseRepository<
  AutomationFeedback,
  CreateFeedbackInput & Record<string, unknown>,
  UpdateFeedbackInput & Record<string, unknown>,
  FeedbackFilters
> {
  protected db = db;

  constructor() {
    super('automation_feedback');
  }

  /**
   * Create new feedback with snapshots
   */
  async createWithSnapshots(
    input: CreateFeedbackInput,
    automationSnapshot: any,
    detectionSnapshot: any,
    mlMetadata: any
  ): Promise<{ success: boolean; data: AutomationFeedback | null }> {
    const query = `
      INSERT INTO ${this.tableName} (
        automation_id,
        organization_id,
        user_id,
        user_email,
        feedback_type,
        sentiment,
        comment,
        automation_snapshot,
        detection_snapshot,
        suggested_corrections,
        ml_metadata,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      input.automationId,
      input.organizationId,
      input.userId,
      input.userEmail,
      input.feedbackType,
      input.sentiment,
      input.comment || null,
      JSON.stringify(automationSnapshot),
      JSON.stringify(detectionSnapshot),
      JSON.stringify(input.suggestedCorrections || {}),
      JSON.stringify(mlMetadata),
      'pending'
    ];

    const result = await this.db.query<AutomationFeedbackRow>(query, values);

    if (result.rows.length > 0 && result.rows[0]) {
      return {
        success: true,
        data: this.mapRowToEntity(result.rows[0])
      };
    }

    return { success: false, data: null };
  }

  /**
   * Find feedback with filters
   */
  async findWithFilters(filters: FeedbackFilters): Promise<{
    success: boolean;
    data: AutomationFeedback[];
    total: number;
  }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      values.push(filters.organizationId);
    }

    if (filters.automationId) {
      conditions.push(`automation_id = $${paramIndex++}`);
      values.push(filters.automationId);
    }

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.userId);
    }

    if (filters.feedbackType) {
      conditions.push(`feedback_type = $${paramIndex++}`);
      values.push(filters.feedbackType);
    }

    if (filters.sentiment) {
      conditions.push(`sentiment = $${paramIndex++}`);
      values.push(filters.sentiment);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.useForTraining !== undefined) {
      conditions.push(`(ml_metadata->>'useForTraining')::boolean = $${paramIndex++}`);
      values.push(filters.useForTraining);
    }

    if (filters.createdAfter) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.createdAfter);
    }

    if (filters.createdBefore) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.createdBefore);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await this.db.query<AutomationFeedbackRow>(query, values);

    return {
      success: true,
      data: result.rows.map(row => this.mapRowToEntity(row)),
      total: result.rows.length
    };
  }

  /**
   * Acknowledge feedback
   */
  async acknowledge(feedbackId: string): Promise<{ success: boolean }> {
    const query = `SELECT acknowledge_feedback($1)`;
    await this.db.query(query, [feedbackId]);
    return { success: true };
  }

  /**
   * Resolve feedback
   */
  async resolve(
    feedbackId: string,
    resolution: any
  ): Promise<{ success: boolean }> {
    const query = `SELECT resolve_feedback($1, $2)`;
    await this.db.query(query, [feedbackId, JSON.stringify(resolution)]);
    return { success: true };
  }

  /**
   * Archive old feedback with organization scope
   * SECURITY: Only archives feedback within organization boundaries
   */
  async archiveOld(organizationId: string, daysOld: number = 90): Promise<{ success: boolean; count: number }> {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'archived', updated_at = NOW()
      WHERE organization_id = $1
        AND status = 'resolved'
        AND resolved_at < NOW() - ($2 || ' days')::INTERVAL
      RETURNING id
    `;
    const result = await this.db.query(query, [organizationId, daysOld]);
    return {
      success: true,
      count: result.rows.length
    };
  }

  /**
   * Get feedback statistics
   */
  async getStatistics(organizationId: string): Promise<FeedbackStatistics> {
    const query = `SELECT get_feedback_statistics($1) as stats`;
    const result = await this.db.query<{ stats: any }>(query, [organizationId]);

    const stats = result.rows[0]?.stats || {};

    return {
      totalFeedback: stats.totalFeedback || 0,
      bySentiment: stats.bySentiment || { positive: 0, negative: 0, neutral: 0 },
      byType: stats.byType || {},
      byStatus: stats.byStatus || { pending: 0, acknowledged: 0, resolved: 0, archived: 0 },
      mlMetrics: stats.mlMetrics || {
        totalTrainingSamples: 0,
        avgSampleConfidence: 0,
        avgTrainingWeight: 0
      },
      detectionAccuracy: stats.detectionAccuracy || {
        correctDetections: 0,
        falsePositives: 0,
        falseNegatives: 0,
        accuracyRate: 0
      }
    };
  }

  /**
   * Get feedback trends over time
   */
  async getTrends(
    organizationId: string,
    days: number = 30
  ): Promise<FeedbackTrend[]> {
    const query = `
      SELECT
        DATE(created_at) as period,
        COUNT(*) as total_feedback,
        COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_feedback,
        COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_feedback,
        ROUND(
          (COUNT(*) FILTER (WHERE feedback_type = 'correct_detection')::numeric /
           NULLIF(COUNT(*), 0)::numeric) * 100,
          2
        ) as accuracy_rate
      FROM ${this.tableName}
      WHERE organization_id = $1
        AND created_at >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY DATE(created_at)
      ORDER BY period DESC
    `;

    const result = await this.db.query<{
      period: Date;
      total_feedback: string;
      positive_feedback: string;
      negative_feedback: string;
      accuracy_rate: string;
    }>(query, [organizationId, days]);

    return result.rows.map(row => ({
      period: row.period.toISOString(),
      totalFeedback: parseInt(row.total_feedback, 10),
      positiveFeedback: parseInt(row.positive_feedback, 10),
      negativeFeedback: parseInt(row.negative_feedback, 10),
      accuracyRate: parseFloat(row.accuracy_rate)
    }));
  }

  /**
   * Get ML training samples
   */
  async getMLTrainingSamples(
    organizationId?: string,
    limit: number = 100
  ): Promise<MLTrainingBatch> {
    const query = `SELECT * FROM get_ml_training_samples($1, $2)`;
    const result = await this.db.query<{
      sample_id: string;
      features: any;
      label: any;
      training_weight: number;
      created_at: Date;
    }>(query, [organizationId || null, limit]);

    return {
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      samples: result.rows.map(row => ({
        sampleId: row.sample_id,
        features: row.features,
        label: row.label,
        weight: row.training_weight
      })),
      batchSize: result.rows.length,
      createdAt: new Date(),
      mlVersion: '1.0.0'
    };
  }

  /**
   * Get feedback by automation with organization filtering
   * SECURITY: Joins with discovered_automations to enforce organization boundaries
   */
  async getByAutomation(automationId: string, organizationId: string): Promise<AutomationFeedback[]> {
    const query = `
      SELECT af.* FROM ${this.tableName} af
      INNER JOIN discovered_automations da ON af.automation_id = da.id
      WHERE af.automation_id = $1
        AND da.organization_id = $2
      ORDER BY af.created_at DESC
    `;

    const result = await this.db.query<AutomationFeedbackRow>(query, [automationId, organizationId]);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Get recent feedback for organization
   */
  async getRecent(
    organizationId: string,
    limit: number = 10
  ): Promise<AutomationFeedback[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.db.query<AutomationFeedbackRow>(query, [organizationId, limit]);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Map database row to entity
   */
  private mapRowToEntity(row: AutomationFeedbackRow): AutomationFeedback {
    return {
      id: row.id,
      automationId: row.automation_id,
      organizationId: row.organization_id,
      userId: row.user_id,
      userEmail: row.user_email,
      feedbackType: row.feedback_type,
      sentiment: row.sentiment,
      comment: row.comment || undefined,
      automationSnapshot: row.automation_snapshot,
      detectionSnapshot: row.detection_snapshot || undefined,
      suggestedCorrections: row.suggested_corrections || undefined,
      mlMetadata: row.ml_metadata,
      status: row.status,
      resolution: row.resolution || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      acknowledgedAt: row.acknowledged_at || undefined,
      resolvedAt: row.resolved_at || undefined
    };
  }
}

// Export singleton instance
export const automationFeedbackRepository = new AutomationFeedbackRepository();
