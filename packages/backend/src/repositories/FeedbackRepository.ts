import {
  UserFeedback,
  FeedbackEffectivenessReport,
  OrganizationDetectionConfig,
  LearningFeedbackMetrics
} from '@saas-xray/shared-types/detection';
import { PostgresRepository } from '../core/PostgresRepository';
import { db } from '../config/database';

export class FeedbackRepositoryPostgres extends PostgresRepository<UserFeedback> {
  async submitFeedback(feedback: UserFeedback): Promise<UserFeedback> {
    const result = await db.query(
      `INSERT INTO user_feedback
        (detection_id, user_id, organization_id, action, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        feedback.detectionId,
        feedback.userId,
        feedback.organizationId,
        feedback.action,
        feedback.comment
      ]
    );
    return result.rows[0];
  }

  async getFeedbackForDetection(detectionId: string): Promise<UserFeedback[]> {
    const result = await db.query(
      `SELECT * FROM user_feedback WHERE detection_id = $1 ORDER BY timestamp DESC`,
      [detectionId]
    );
    return result.rows;
  }

  async getOrganizationFeedbackMetrics(organizationId: string): Promise<FeedbackEffectivenessReport> {
    const metricsResult = await db.query(
      `WITH feedback_metrics AS (
        SELECT
          COUNT(*) as total_detections,
          SUM(CASE WHEN action = 'approve' THEN 1 ELSE 0 END) as true_positives,
          SUM(CASE WHEN action = 'flag' THEN 1 ELSE 0 END) as false_positives,
          AVG(CASE WHEN action = 'approve' THEN 1.0 ELSE 0.0 END) as accuracy_rate
        FROM user_feedback
        WHERE organization_id = $1
      ),
      accuracy_trends AS (
        SELECT
          date_trunc('day', timestamp) as trend_date,
          AVG(CASE WHEN action = 'approve' THEN 1.0 ELSE 0.0 END) as daily_accuracy
        FROM user_feedback
        WHERE organization_id = $1
        GROUP BY date_trunc('day', timestamp)
        ORDER BY trend_date
      )
      SELECT
        json_build_object(
          'totalDetections', total_detections,
          'truePositives', true_positives,
          'falsePositives', false_positives,
          'accuracyRate', accuracy_rate,
          'sensitivityScore', 1.0 - (false_positives::float / total_detections)
        ) as metrics,
        json_agg(
          json_build_object(
            'timestamp', trend_date,
            'accuracy', daily_accuracy
          )
        ) as accuracy_trends
      FROM feedback_metrics, accuracy_trends`,
      [organizationId]
    );

    return {
      organizationId,
      metrics: metricsResult.rows[0].metrics,
      trends: {
        accuracyOverTime: metricsResult.rows[0].accuracy_trends,
        falsePositiveReduction: [] // More complex calculation needed
      }
    };
  }

  async updateOrganizationDetectionConfig(
    config: OrganizationDetectionConfig
  ): Promise<OrganizationDetectionConfig> {
    const result = await db.query(
      `INSERT INTO organization_detection_config
        (organization_id, base_risk_threshold, learning_enabled, custom_sensitivity_factors)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (organization_id) DO UPDATE
      SET
        base_risk_threshold = EXCLUDED.base_risk_threshold,
        learning_enabled = EXCLUDED.learning_enabled,
        custom_sensitivity_factors = EXCLUDED.custom_sensitivity_factors
      RETURNING *`,
      [
        config.organizationId,
        config.baseRiskThreshold,
        config.learningEnabled,
        JSON.stringify(config.customSensitivityFactors)
      ]
    );
    return result.rows[0];
  }
}