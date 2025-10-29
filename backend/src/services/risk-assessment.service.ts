/**
 * Risk Assessment Service
 * Analyzes detection results and creates risk assessments for automations
 */

import {
  DetectionMetadata,
  DetectionPattern,
  GoogleActivityPattern,
  RiskIndicator
} from '@singura/shared-types';
import { RiskLevel } from '../types/database';
import {
  riskAssessmentRepository,
  CreateRiskAssessmentInput
} from '../database/repositories/risk-assessment';
import { discoveredAutomationRepository } from '../database/repositories/discovered-automation';

export interface DetectionResults {
  activityPatterns: GoogleActivityPattern[];
  riskIndicators: RiskIndicator[];
  detectionMetadata: DetectionMetadata;
}

export class RiskAssessmentService {
  /**
   * Create a risk assessment from detection results
   *
   * @param automationId - ID of the automation being assessed
   * @param detectionResults - Results from detection engine
   * @param organizationId - Organization ID
   * @returns Created risk assessment
   */
  async createFromDetection(
    automationId: string,
    detectionResults: DetectionResults,
    organizationId: string
  ): Promise<void> {
    try {
      // Calculate risk scores from detection patterns
      const riskScores = this.calculateRiskScores(detectionResults);

      // Determine overall risk level
      const riskLevel = this.determineRiskLevel(riskScores.overall);

      // Extract risk factors from detection patterns
      const riskFactors = this.extractRiskFactors(detectionResults);

      // Generate security concerns
      const securityConcerns = this.generateSecurityConcerns(detectionResults);

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskFactors, riskLevel);

      // Create risk assessment record
      const assessmentInput: CreateRiskAssessmentInput = {
        automation_id: automationId,
        organization_id: organizationId,
        risk_level: riskLevel,
        risk_score: riskScores.overall,
        permission_risk_score: riskScores.permission,
        data_access_risk_score: riskScores.dataAccess,
        activity_risk_score: riskScores.activity,
        ownership_risk_score: riskScores.ownership,
        risk_factors: riskFactors,
        compliance_issues: [],
        security_concerns: securityConcerns,
        recommendations,
        assessment_version: '1.0',
        assessor_type: 'system',
        confidence_level: this.calculateConfidence(detectionResults)
      };

      await riskAssessmentRepository.create(assessmentInput);

      // Update automation's detection metadata
      await discoveredAutomationRepository.updateDetectionMetadata(
        automationId,
        detectionResults.detectionMetadata
      );

      // Append to risk score history
      await discoveredAutomationRepository.appendRiskScoreHistory(
        automationId,
        riskScores.overall,
        riskLevel,
        riskFactors,
        'automated_detection'
      );

      console.log(`Created risk assessment for automation ${automationId}: ${riskLevel} (${riskScores.overall})`);
    } catch (error) {
      console.error(`Failed to create risk assessment for automation ${automationId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate risk scores from detection results
   */
  private calculateRiskScores(detectionResults: DetectionResults): {
    overall: number;
    permission: number;
    dataAccess: number;
    activity: number;
    ownership: number;
  } {
    const { activityPatterns, riskIndicators } = detectionResults;

    // Activity risk based on detection patterns
    const activityRisk = this.calculateActivityRisk(activityPatterns);

    // Permission risk based on indicators
    const permissionRisk = this.calculatePermissionRisk(riskIndicators);

    // Data access risk based on patterns
    const dataAccessRisk = this.calculateDataAccessRisk(activityPatterns);

    // Ownership risk (default medium for shadow AI)
    const ownershipRisk = 50;

    // Overall risk is weighted average
    const overall = Math.round(
      activityRisk * 0.4 +
      permissionRisk * 0.2 +
      dataAccessRisk * 0.3 +
      ownershipRisk * 0.1
    );

    return {
      overall: Math.min(overall, 100),
      permission: Math.min(permissionRisk, 100),
      dataAccess: Math.min(dataAccessRisk, 100),
      activity: Math.min(activityRisk, 100),
      ownership: Math.min(ownershipRisk, 100)
    };
  }

  /**
   * Calculate activity risk from patterns
   */
  private calculateActivityRisk(patterns: GoogleActivityPattern[]): number {
    if (patterns.length === 0) return 0;

    // Find highest confidence pattern
    const maxConfidence = Math.max(...patterns.map(p => p.confidence));

    // Weight by number of patterns (more patterns = higher risk)
    const patternCount = patterns.length;
    const patternWeight = Math.min(patternCount * 5, 30); // Max 30 from count

    return Math.round(maxConfidence * 0.7 + patternWeight * 0.3);
  }

  /**
   * Calculate permission risk from indicators
   */
  private calculatePermissionRisk(indicators: RiskIndicator[]): number {
    if (indicators.length === 0) return 30; // Default medium-low

    const avgSeverity = indicators.reduce((sum, ind) => sum + ind.severity, 0) / indicators.length;
    return Math.round(avgSeverity);
  }

  /**
   * Calculate data access risk from patterns
   */
  private calculateDataAccessRisk(patterns: GoogleActivityPattern[]): number {
    // Look for data volume and permission escalation patterns
    const highRiskPatterns = patterns.filter(p =>
      p.patternType === 'permission_change' ||
      p.evidence.description.toLowerCase().includes('data') ||
      p.evidence.description.toLowerCase().includes('volume')
    );

    if (highRiskPatterns.length === 0) return 30; // Default medium-low

    const avgConfidence = highRiskPatterns.reduce((sum, p) => sum + p.confidence, 0) / highRiskPatterns.length;
    return Math.round(avgConfidence);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Extract risk factors from detection results
   */
  private extractRiskFactors(detectionResults: DetectionResults): string[] {
    const factors: string[] = [];
    const { activityPatterns, detectionMetadata } = detectionResults;

    // Add AI provider detection
    if (detectionMetadata.aiProvider) {
      factors.push(
        `AI Provider Detected: ${detectionMetadata.aiProvider.provider} (${Math.round(detectionMetadata.aiProvider.confidence)}% confidence)`
      );
    }

    // Add pattern-based factors
    const patternTypes = new Set(activityPatterns.map(p => p.patternType));

    if (patternTypes.has('velocity')) {
      const velocityPattern = activityPatterns.find(p => p.patternType === 'velocity');
      if (velocityPattern) {
        const eventsPerSec = typeof velocityPattern.evidence.dataPoints === 'object' &&
                             velocityPattern.evidence.dataPoints !== null &&
                             'eventsPerSecond' in velocityPattern.evidence.dataPoints
                             ? (velocityPattern.evidence.dataPoints as any).eventsPerSecond || 0
                             : 0;
        factors.push(`High velocity activity: ${Number(eventsPerSec).toFixed(2)} events/second`);
      }
    }

    if (patternTypes.has('batch_operation')) {
      factors.push('Batch operation patterns detected');
    }

    if (patternTypes.has('off_hours')) {
      factors.push('Off-hours activity detected');
    }

    if (patternTypes.has('regular_interval')) {
      factors.push('Regular interval timing patterns (automation indicator)');
    }

    if (patternTypes.has('permission_change')) {
      factors.push('Permission escalation detected');
    }

    // Add detection pattern severity
    const highSeverityPatterns = detectionMetadata.detectionPatterns?.filter(
      p => p.severity === 'high' || p.severity === 'critical'
    ) || [];

    if (highSeverityPatterns.length > 0) {
      factors.push(`${highSeverityPatterns.length} high/critical severity patterns detected`);
    }

    return factors;
  }

  /**
   * Generate security concerns from detection results
   */
  private generateSecurityConcerns(detectionResults: DetectionResults): string[] {
    const concerns: string[] = [];
    const { activityPatterns, detectionMetadata } = detectionResults;

    // AI provider concerns
    if (detectionMetadata.aiProvider) {
      concerns.push('Unauthorized AI integration may pose data leakage risk');
      concerns.push('AI provider has access to organizational data');
    }

    // Velocity concerns
    if (activityPatterns.some(p => p.patternType === 'velocity')) {
      concerns.push('Abnormally high activity velocity indicates automated access');
    }

    // Off-hours concerns
    if (activityPatterns.some(p => p.patternType === 'off_hours')) {
      concerns.push('Off-hours activity may indicate compromised credentials or unauthorized automation');
    }

    // Permission concerns
    if (activityPatterns.some(p => p.patternType === 'permission_change')) {
      concerns.push('Permission escalation detected - review access controls');
    }

    return concerns;
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(riskFactors: string[], riskLevel: RiskLevel): string[] {
    const recommendations: string[] = [];

    // Critical/High risk recommendations
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Immediate review required - consider disabling automation');
      recommendations.push('Conduct security audit of automation permissions');
      recommendations.push('Review data access logs for potential data exfiltration');
    }

    // Medium risk recommendations
    if (riskLevel === 'medium') {
      recommendations.push('Review automation purpose and necessity');
      recommendations.push('Verify automation owner and approvals');
    }

    // AI-specific recommendations
    if (riskFactors.some(f => f.toLowerCase().includes('ai provider'))) {
      recommendations.push('Review AI provider integration for data privacy compliance');
      recommendations.push('Implement data classification and access controls');
      recommendations.push('Consider enterprise AI solution with proper governance');
    }

    // Velocity-specific recommendations
    if (riskFactors.some(f => f.toLowerCase().includes('velocity'))) {
      recommendations.push('Implement rate limiting for automated access');
      recommendations.push('Review service account credentials and rotation policy');
    }

    // Off-hours recommendations
    if (riskFactors.some(f => f.toLowerCase().includes('off-hours'))) {
      recommendations.push('Configure alerts for off-hours automated activity');
      recommendations.push('Review access logs for unusual timing patterns');
    }

    // General recommendations
    recommendations.push('Document automation purpose and data access requirements');
    recommendations.push('Enable audit logging for all automation activities');

    return recommendations;
  }

  /**
   * Calculate confidence level for the assessment
   */
  private calculateConfidence(detectionResults: DetectionResults): number {
    const { activityPatterns } = detectionResults;

    if (activityPatterns.length === 0) return 50; // Default medium confidence

    // Confidence is based on average pattern confidence and number of patterns
    const avgConfidence = activityPatterns.reduce((sum, p) => sum + p.confidence, 0) / activityPatterns.length;
    const patternBonus = Math.min(activityPatterns.length * 5, 20); // More patterns = higher confidence

    return Math.min(Math.round(avgConfidence + patternBonus), 100);
  }
}

// Export singleton instance
export const riskAssessmentService = new RiskAssessmentService();
