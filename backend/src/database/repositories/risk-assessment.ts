/**
 * Risk Assessment Repository
 * Handles CRUD operations for risk_assessments table
 */

import { BaseRepository } from './base';
import { RiskAssessment, RiskLevel } from '../../types/database';

export interface CreateRiskAssessmentInput extends Record<string, unknown> {
  automation_id: string;
  organization_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  permission_risk_score: number;
  data_access_risk_score: number;
  activity_risk_score: number;
  ownership_risk_score: number;
  risk_factors: string[];
  compliance_issues: string[];
  security_concerns: string[];
  recommendations: string[];
  assessment_version?: string;
  assessor_type?: string;
  confidence_level?: number;
}

export interface UpdateRiskAssessmentInput extends Record<string, unknown> {
  risk_level?: RiskLevel;
  risk_score?: number;
  permission_risk_score?: number;
  data_access_risk_score?: number;
  activity_risk_score?: number;
  ownership_risk_score?: number;
  risk_factors?: string[];
  compliance_issues?: string[];
  security_concerns?: string[];
  recommendations?: string[];
  confidence_level?: number;
}

export interface RiskAssessmentFilters {
  organization_id?: string;
  automation_id?: string;
  risk_level?: RiskLevel | RiskLevel[];
}

export class RiskAssessmentRepository extends BaseRepository<
  RiskAssessment,
  CreateRiskAssessmentInput,
  UpdateRiskAssessmentInput,
  RiskAssessmentFilters
> {
  constructor() {
    // Add risk_assessments to the allowed tables list in base.ts if not present
    super('risk_assessments');
  }

  /**
   * Find latest risk assessment for an automation
   */
  async findLatestByAutomation(automationId: string): Promise<RiskAssessment | null> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE automation_id = $1
      ORDER BY assessed_at DESC
      LIMIT 1
    `;

    const result = await this.executeQuery<RiskAssessment>(query, [automationId]);
    const row = result.rows[0];
    return row ? row : null;
  }

  /**
   * Get risk summary for an organization
   */
  async getRiskSummary(organizationId: string): Promise<{
    total_assessments: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    average_risk_score: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_assessments,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high,
        COUNT(*) FILTER (WHERE risk_level = 'medium') as medium,
        COUNT(*) FILTER (WHERE risk_level = 'low') as low,
        COALESCE(AVG(risk_score), 0) as average_risk_score
      FROM ${this.tableName}
      WHERE organization_id = $1
    `;

    const result = await this.executeQuery<{
      total_assessments: string;
      critical: string;
      high: string;
      medium: string;
      low: string;
      average_risk_score: number;
    }>(query, [organizationId]);

    const row = result.rows[0];
    if (!row) {
      return {
        total_assessments: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        average_risk_score: 0
      };
    }

    return {
      total_assessments: parseInt(row.total_assessments, 10),
      critical: parseInt(row.critical, 10),
      high: parseInt(row.high, 10),
      medium: parseInt(row.medium, 10),
      low: parseInt(row.low, 10),
      average_risk_score: Math.round(row.average_risk_score)
    };
  }

  /**
   * Get high-risk automations for an organization
   */
  async getHighRiskAutomations(
    organizationId: string,
    minRiskScore: number = 70
  ): Promise<RiskAssessment[]> {
    const query = `
      SELECT DISTINCT ON (automation_id) *
      FROM ${this.tableName}
      WHERE organization_id = $1
        AND risk_score >= $2
      ORDER BY automation_id, assessed_at DESC
    `;

    const result = await this.executeQuery<RiskAssessment>(query, [
      organizationId,
      minRiskScore
    ]);

    return result.rows;
  }
}

// Export singleton instance
export const riskAssessmentRepository = new RiskAssessmentRepository();
