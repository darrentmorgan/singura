/**
 * Risk Assessment Service
 * Implements comprehensive risk scoring for discovered automations
 */

import { RiskAssessment, DiscoveredAutomation, RiskLevel, AutomationType } from '../types/database';
import { db } from '../database/pool';

export interface RiskFactor {
  category: 'permission' | 'data_access' | 'activity' | 'ownership' | 'compliance';
  factor: string;
  weight: number; // 0-1
  description: string;
  severity: RiskLevel;
}

export interface RiskCalculationResult {
  overallRisk: RiskLevel;
  riskScore: number;
  componentScores: {
    permission: number;
    dataAccess: number;
    activity: number;
    ownership: number;
  };
  riskFactors: RiskFactor[];
  recommendations: string[];
  complianceIssues: string[];
  confidenceLevel: number;
}

export interface RiskStatistics {
  total_automations: number;
  critical_risk: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  avg_risk_score: number;
  avg_confidence: number;
}

export interface HighRiskAutomation extends DiscoveredAutomation {
  risk_level: RiskLevel;
  risk_score: number;
  risk_factors: string[];
  recommendations: string[];
}

/**
 * Risk Assessment Service - Calculates and manages automation risk scores
 */
export class RiskService {
  
  /**
   * Assess risk for a discovered automation
   */
  async assessAutomationRisk(automation: DiscoveredAutomation): Promise<RiskCalculationResult> {
    const riskFactors: RiskFactor[] = [];
    const recommendations: string[] = [];
    const complianceIssues: string[] = [];

    // Calculate component scores
    const permissionScore = this.calculatePermissionRisk(automation, riskFactors);
    const dataAccessScore = this.calculateDataAccessRisk(automation, riskFactors);
    const activityScore = this.calculateActivityRisk(automation, riskFactors);
    const ownershipScore = this.calculateOwnershipRisk(automation, riskFactors);

    // Calculate overall risk score (weighted average)
    const weights = { permission: 0.3, dataAccess: 0.3, activity: 0.2, ownership: 0.2 };
    const riskScore = Math.round(
      permissionScore * weights.permission +
      dataAccessScore * weights.dataAccess +
      activityScore * weights.activity +
      ownershipScore * weights.ownership
    );

    // Determine risk level
    const overallRisk = this.determineRiskLevel(riskScore);

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(automation, riskFactors));

    // Check compliance issues
    complianceIssues.push(...this.checkComplianceIssues(automation, riskFactors));

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(automation, riskFactors);

    return {
      overallRisk,
      riskScore,
      componentScores: {
        permission: permissionScore,
        dataAccess: dataAccessScore,
        activity: activityScore,
        ownership: ownershipScore
      },
      riskFactors,
      recommendations,
      complianceIssues,
      confidenceLevel
    };
  }

  /**
   * Store risk assessment in database
   */
  async storeRiskAssessment(
    automationId: string,
    organizationId: string,
    riskResult: RiskCalculationResult
  ): Promise<RiskAssessment> {
    const query = `
      INSERT INTO risk_assessments (
        automation_id,
        organization_id,
        risk_level,
        risk_score,
        permission_risk_score,
        data_access_risk_score,
        activity_risk_score,
        ownership_risk_score,
        risk_factors,
        compliance_issues,
        security_concerns,
        recommendations,
        assessment_version,
        assessed_at,
        assessor_type,
        confidence_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15)
      ON CONFLICT (automation_id) 
      DO UPDATE SET
        risk_level = EXCLUDED.risk_level,
        risk_score = EXCLUDED.risk_score,
        permission_risk_score = EXCLUDED.permission_risk_score,
        data_access_risk_score = EXCLUDED.data_access_risk_score,
        activity_risk_score = EXCLUDED.activity_risk_score,
        ownership_risk_score = EXCLUDED.ownership_risk_score,
        risk_factors = EXCLUDED.risk_factors,
        compliance_issues = EXCLUDED.compliance_issues,
        security_concerns = EXCLUDED.security_concerns,
        recommendations = EXCLUDED.recommendations,
        assessed_at = NOW(),
        confidence_level = EXCLUDED.confidence_level,
        updated_at = NOW()
      RETURNING *
    `;

    const securityConcerns = riskResult.riskFactors
      .filter(f => f.severity === 'high' || f.severity === 'critical')
      .map(f => f.description);

    const values = [
      automationId,
      organizationId,
      riskResult.overallRisk,
      riskResult.riskScore,
      riskResult.componentScores.permission,
      riskResult.componentScores.dataAccess,
      riskResult.componentScores.activity,
      riskResult.componentScores.ownership,
      JSON.stringify(riskResult.riskFactors.map(f => f.factor)),
      JSON.stringify(riskResult.complianceIssues),
      JSON.stringify(securityConcerns),
      JSON.stringify(riskResult.recommendations),
      '1.0', // assessment_version
      'system', // assessor_type
      riskResult.confidenceLevel
    ];

    const result = await db.query<RiskAssessment>(query, values);
    const assessment = result.rows[0];
    if (!assessment) {
      throw new Error('Failed to store risk assessment');
    }
    return assessment;
  }

  /**
   * Calculate permission-based risk
   */
  private calculatePermissionRisk(automation: DiscoveredAutomation, riskFactors: RiskFactor[]): number {
    let score = 0;
    const permissions = automation.permissions_required || [];
    
    // High-privilege permissions
    const highRiskPermissions = [
      'admin', 'write', 'delete', 'manage', 'owner', 'full_access',
      'users:write', 'channels:manage', 'files:write', 'admin.users'
    ];
    
    const highRiskCount = permissions.filter(p => 
      highRiskPermissions.some(hr => p.toLowerCase().includes(hr.toLowerCase()))
    ).length;
    
    if (highRiskCount > 0) {
      score += Math.min(highRiskCount * 25, 75);
      riskFactors.push({
        category: 'permission',
        factor: 'high_privilege_permissions',
        weight: 0.8,
        description: `Has ${highRiskCount} high-privilege permissions`,
        severity: highRiskCount > 2 ? 'critical' : 'high'
      });
    }

    // Excessive permissions
    if (permissions.length > 10) {
      score += Math.min((permissions.length - 10) * 3, 25);
      riskFactors.push({
        category: 'permission',
        factor: 'excessive_permissions',
        weight: 0.5,
        description: `Has ${permissions.length} permissions (potentially excessive)`,
        severity: 'medium'
      });
    }

    // No permission information available
    if (permissions.length === 0) {
      score += 30;
      riskFactors.push({
        category: 'permission',
        factor: 'unknown_permissions',
        weight: 0.6,
        description: 'Permission requirements are unknown',
        severity: 'medium'
      });
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate data access risk
   */
  private calculateDataAccessRisk(automation: DiscoveredAutomation, riskFactors: RiskFactor[]): number {
    let score = 0;
    const dataPatterns = automation.data_access_patterns || [];
    const metadata = automation.platform_metadata || {};

    // Check for sensitive data access patterns
    const sensitivePatterns = ['pii', 'financial', 'health', 'confidential', 'secret'];
    const hasSensitiveAccess = dataPatterns.some(pattern => 
      sensitivePatterns.some(sp => pattern.toLowerCase().includes(sp))
    );

    if (hasSensitiveAccess) {
      score += 60;
      riskFactors.push({
        category: 'data_access',
        factor: 'sensitive_data_access',
        weight: 0.9,
        description: 'May access sensitive data (PII, financial, health, etc.)',
        severity: 'high'
      });
    }

    // Check automation type for implicit data access risk
    const dataRiskByType: Record<AutomationType, number> = {
      'bot': 40,
      'integration': 50,
      'webhook': 45,
      'workflow': 30,
      'scheduled_task': 25,
      'trigger': 20,
      'script': 35,
      'service_account': 70
    };

    const typeRisk = dataRiskByType[automation.automation_type] || 30;
    score += typeRisk;

    if (typeRisk >= 40) {
      riskFactors.push({
        category: 'data_access',
        factor: 'high_risk_automation_type',
        weight: 0.7,
        description: `${automation.automation_type} automations typically have broad data access`,
        severity: typeRisk >= 60 ? 'high' : 'medium'
      });
    }

    // External data sharing risk
    if (metadata.external_sharing || metadata.webhook_url || metadata.api_endpoints) {
      score += 40;
      riskFactors.push({
        category: 'data_access',
        factor: 'external_data_sharing',
        weight: 0.8,
        description: 'May share data with external services',
        severity: 'high'
      });
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate activity-based risk
   */
  private calculateActivityRisk(automation: DiscoveredAutomation, riskFactors: RiskFactor[]): number {
    let score = 0;

    // Check last activity
    const now = new Date();
    const lastSeen = automation.last_seen_at;
    const daysSinceLastSeen = lastSeen ? 
      Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)) : 999;

    if (daysSinceLastSeen > 90) {
      score += 30;
      riskFactors.push({
        category: 'activity',
        factor: 'stale_automation',
        weight: 0.4,
        description: `No activity detected in ${daysSinceLastSeen} days`,
        severity: 'medium'
      });
    }

    // Unknown activity status
    if (!automation.last_triggered_at && !automation.last_modified_at) {
      score += 25;
      riskFactors.push({
        category: 'activity',
        factor: 'unknown_activity',
        weight: 0.5,
        description: 'Activity history is unknown',
        severity: 'medium'
      });
    }

    // Status-based risk
    const statusRisk: Record<string, number> = {
      'error': 60,
      'unknown': 40,
      'paused': 20,
      'inactive': 15,
      'active': 0
    };

    const statusScore = statusRisk[automation.status] || 30;
    score += statusScore;

    if (statusScore >= 40) {
      riskFactors.push({
        category: 'activity',
        factor: 'problematic_status',
        weight: 0.7,
        description: `Automation status is ${automation.status}`,
        severity: statusScore >= 60 ? 'high' : 'medium'
      });
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate ownership-based risk
   */
  private calculateOwnershipRisk(automation: DiscoveredAutomation, riskFactors: RiskFactor[]): number {
    let score = 0;
    const owner = automation.owner_info || {};

    // Unknown owner
    if (!owner.id && !owner.email && !owner.name) {
      score += 50;
      riskFactors.push({
        category: 'ownership',
        factor: 'unknown_owner',
        weight: 0.8,
        description: 'Automation owner is unknown',
        severity: 'high'
      });
    }

    // Shared/system account
    if (owner.type === 'system' || owner.type === 'service_account' || 
        (typeof owner.name === 'string' && owner.name.toLowerCase().includes('system'))) {
      score += 30;
      riskFactors.push({
        category: 'ownership',
        factor: 'system_owned',
        weight: 0.6,
        description: 'Owned by system or service account',
        severity: 'medium'
      });
    }

    // External owner (outside organization)
    if (owner.external || (owner.email && !owner.email.includes('@'))) {
      score += 40;
      riskFactors.push({
        category: 'ownership',
        factor: 'external_owner',
        weight: 0.7,
        description: 'Owned by external user or organization',
        severity: 'high'
      });
    }

    // Inactive owner
    if (owner.last_active && owner.last_active < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      score += 25;
      riskFactors.push({
        category: 'ownership',
        factor: 'inactive_owner',
        weight: 0.5,
        description: 'Owner has been inactive for over 90 days',
        severity: 'medium'
      });
    }

    return Math.min(score, 100);
  }

  /**
   * Determine overall risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(automation: DiscoveredAutomation, riskFactors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    riskFactors.forEach(factor => {
      switch (factor.factor) {
        case 'high_privilege_permissions':
          recommendations.push('Review and minimize permissions to principle of least privilege');
          break;
        case 'sensitive_data_access':
          recommendations.push('Implement additional access controls for sensitive data');
          recommendations.push('Enable audit logging for all data access operations');
          break;
        case 'external_data_sharing':
          recommendations.push('Review external data sharing agreements and security controls');
          break;
        case 'unknown_owner':
          recommendations.push('Identify and document automation owner');
          recommendations.push('Implement ownership governance policies');
          break;
        case 'stale_automation':
          recommendations.push('Review if automation is still needed and deactivate if unused');
          break;
        case 'problematic_status':
          recommendations.push('Investigate and resolve automation status issues');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Check for compliance issues
   */
  private checkComplianceIssues(automation: DiscoveredAutomation, riskFactors: RiskFactor[]): string[] {
    const issues: string[] = [];

    // GDPR compliance issues
    const hasSensitiveDataAccess = riskFactors.some(f => f.factor === 'sensitive_data_access');
    const hasUnknownOwner = riskFactors.some(f => f.factor === 'unknown_owner');

    if (hasSensitiveDataAccess) {
      issues.push('GDPR: Automation with sensitive data access requires explicit consent and purpose limitation');
    }

    if (hasUnknownOwner && hasSensitiveDataAccess) {
      issues.push('GDPR: Data processor must be identifiable for sensitive data operations');
    }

    // SOC 2 compliance issues
    const hasExcessivePermissions = riskFactors.some(f => f.factor === 'excessive_permissions');
    const hasExternalSharing = riskFactors.some(f => f.factor === 'external_data_sharing');

    if (hasExcessivePermissions) {
      issues.push('SOC 2: Access controls should follow principle of least privilege');
    }

    if (hasExternalSharing) {
      issues.push('SOC 2: Third-party data sharing requires security assessment and monitoring');
    }

    return issues;
  }

  /**
   * Calculate confidence level in risk assessment
   */
  private calculateConfidenceLevel(automation: DiscoveredAutomation, riskFactors: RiskFactor[]): number {
    let confidence = 100;

    // Reduce confidence for missing information
    if (!automation.owner_info || Object.keys(automation.owner_info).length === 0) {
      confidence -= 15;
    }

    if (!automation.permissions_required || automation.permissions_required.length === 0) {
      confidence -= 20;
    }

    if (!automation.last_triggered_at && !automation.last_modified_at) {
      confidence -= 10;
    }

    if (!automation.description || automation.description.trim().length === 0) {
      confidence -= 5;
    }

    // Boost confidence for detailed metadata
    if (automation.platform_metadata && Object.keys(automation.platform_metadata).length > 5) {
      confidence += 5;
    }

    return Math.max(Math.min(confidence, 100), 50);
  }

  /**
   * Get risk statistics for an organization
   */
  async getRiskStatistics(organizationId: string): Promise<RiskStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total_automations,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_risk,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'low') as low_risk,
        AVG(risk_score) as avg_risk_score,
        AVG(confidence_level) as avg_confidence
      FROM risk_assessments ra
      JOIN discovered_automations da ON ra.automation_id = da.id
      WHERE ra.organization_id = $1 AND da.is_active = true
    `;

    const result = await db.query<RiskStatistics>(query, [organizationId]);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to get risk statistics');
    }
    return row;
  }

  /**
   * Get high-risk automations for an organization
   */
  async getHighRiskAutomations(organizationId: string, limit: number = 50): Promise<HighRiskAutomation[]> {
    const query = `
      SELECT da.*, ra.risk_level, ra.risk_score, ra.risk_factors, ra.recommendations
      FROM discovered_automations da
      JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.organization_id = $1 
        AND da.is_active = true
        AND ra.risk_level IN ('critical', 'high')
      ORDER BY ra.risk_score DESC, da.last_seen_at DESC
      LIMIT $2
    `;

    const result = await db.query<HighRiskAutomation>(query, [organizationId, limit]);
    return result.rows;
  }
}

// Export singleton instance
export const riskService = new RiskService();