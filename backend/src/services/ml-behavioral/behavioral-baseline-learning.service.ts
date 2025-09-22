/**
 * Behavioral Baseline Learning System
 * Organization-specific behavioral pattern learning and adaptation
 *
 * Business Impact: Creates customer switching costs through personalized baselines
 * Technical Objective: Learn organizational patterns for accurate anomaly detection
 */

import { AutomationEvent } from '@saas-xray/shared-types';

// Organizational Behavioral Baseline
export interface OrganizationalBaseline {
  organizationId: string;
  platforms: string[];
  learningPeriod: {
    startDate: Date;
    endDate: Date;
    sampleSize: number;
  };

  // Behavioral patterns learned
  behavioralPatterns: {
    normalVelocity: {
      min: number;
      max: number;
      average: number;
      stdDev: number;
    };

    typicalTimeWindows: {
      businessHours: { start: number; end: number };
      peakActivity: number[];
      offHoursThreshold: number;
    };

    permissionPatterns: {
      commonPermissions: string[];
      riskPermissions: string[];
      permissionComplexity: number;
    };

    automationTypes: {
      commonTypes: string[];
      riskTypes: string[];
      typeDistribution: Record<string, number>;
    };

    crossPlatformBehavior: {
      platformUsage: Record<string, number>;
      crossPlatformChains: number;
      integrationComplexity: number;
    };
  };

  // Learning metadata
  confidence: number; // 0-1
  lastUpdated: Date;
  nextUpdateDue: Date;
  learningStatus: 'learning' | 'established' | 'updating';
}

// Learning Configuration
export interface LearningConfig {
  minSampleSize: number;
  learningPeriodDays: number;
  confidenceThreshold: number;
  updateFrequency: 'daily' | 'weekly' | 'monthly';
  adaptationRate: number; // How quickly to adapt to new patterns
}

/**
 * Behavioral Baseline Learning Service
 * Learns and maintains organization-specific behavioral patterns
 */
export class BehavioralBaselineLearningService {
  private baselines: Map<string, OrganizationalBaseline> = new Map();
  private learningConfig: LearningConfig;

  constructor(config?: Partial<LearningConfig>) {
    this.learningConfig = {
      minSampleSize: 50,
      learningPeriodDays: 30,
      confidenceThreshold: 0.8,
      updateFrequency: 'weekly',
      adaptationRate: 0.1,
      ...config
    };
  }

  /**
   * Learn organizational baseline from historical automation data
   */
  async learnOrganizationalBaseline(
    organizationId: string,
    historicalAutomations: AutomationEvent[]
  ): Promise<OrganizationalBaseline> {

    console.log(`🧠 Learning behavioral baseline for organization: ${organizationId}`);
    console.log(`📊 Analyzing ${historicalAutomations.length} historical automations`);

    if (historicalAutomations.length < this.learningConfig.minSampleSize) {
      throw new Error(`Insufficient data for baseline learning. Need at least ${this.learningConfig.minSampleSize} automations, got ${historicalAutomations.length}`);
    }

    // 1. Extract behavioral patterns
    const behavioralPatterns = await this.extractBehavioralPatterns(historicalAutomations);

    // 2. Calculate confidence based on data quality
    const confidence = this.calculateLearningConfidence(historicalAutomations);

    // 3. Create baseline
    const baseline: OrganizationalBaseline = {
      organizationId,
      platforms: this.extractPlatforms(historicalAutomations),
      learningPeriod: {
        startDate: new Date(Math.min(...historicalAutomations.map(a => new Date(a.createdAt).getTime()))),
        endDate: new Date(Math.max(...historicalAutomations.map(a => new Date(a.createdAt).getTime()))),
        sampleSize: historicalAutomations.length
      },
      behavioralPatterns,
      confidence,
      lastUpdated: new Date(),
      nextUpdateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Weekly updates
      learningStatus: confidence >= this.learningConfig.confidenceThreshold ? 'established' : 'learning'
    };

    // 4. Store baseline
    this.baselines.set(organizationId, baseline);

    console.log(`✅ Behavioral baseline learned with ${Math.round(confidence * 100)}% confidence`);
    console.log(`📈 Patterns identified across ${baseline.platforms.length} platforms`);

    return baseline;
  }

  /**
   * Get organizational baseline for behavioral analysis
   */
  async getOrganizationalBaseline(organizationId: string): Promise<OrganizationalBaseline | null> {
    const baseline = this.baselines.get(organizationId);

    if (!baseline) {
      console.log(`⚠️ No behavioral baseline found for organization: ${organizationId}`);
      return null;
    }

    // Check if baseline needs updating
    if (baseline.nextUpdateDue < new Date()) {
      console.log(`🔄 Baseline update due for organization: ${organizationId}`);
      // TODO: Trigger baseline update with new data
    }

    return baseline;
  }

  /**
   * Update baseline with new automation data
   */
  async updateBaseline(
    organizationId: string,
    newAutomations: AutomationEvent[]
  ): Promise<OrganizationalBaseline> {

    const currentBaseline = this.baselines.get(organizationId);
    if (!currentBaseline) {
      throw new Error(`No existing baseline found for organization: ${organizationId}`);
    }

    console.log(`🔄 Updating behavioral baseline with ${newAutomations.length} new automations`);

    // 1. Extract patterns from new data
    const newPatterns = await this.extractBehavioralPatterns(newAutomations);

    // 2. Adaptive baseline update
    const updatedPatterns = this.adaptivePatternUpdate(
      currentBaseline.behavioralPatterns,
      newPatterns,
      this.learningConfig.adaptationRate
    );

    // 3. Update baseline
    const updatedBaseline: OrganizationalBaseline = {
      ...currentBaseline,
      behavioralPatterns: updatedPatterns,
      lastUpdated: new Date(),
      nextUpdateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      learningStatus: 'updating'
    };

    this.baselines.set(organizationId, updatedBaseline);

    console.log(`✅ Baseline updated for organization: ${organizationId}`);
    return updatedBaseline;
  }

  /**
   * Extract behavioral patterns from automation events
   */
  private async extractBehavioralPatterns(
    automations: AutomationEvent[]
  ): Promise<OrganizationalBaseline['behavioralPatterns']> {

    // 1. Velocity pattern analysis
    const velocities = automations.map(a => {
      const daysSinceCreated = (Date.now() - new Date(a.createdAt).getTime()) / (24 * 60 * 60 * 1000);
      const triggerCount = a.lastTriggered ? 1 : 0;
      return triggerCount / Math.max(daysSinceCreated, 1);
    });

    const normalVelocity = {
      min: Math.min(...velocities),
      max: Math.max(...velocities),
      average: velocities.reduce((a, b) => a + b, 0) / velocities.length,
      stdDev: this.calculateStandardDeviation(velocities)
    };

    // 2. Time window analysis
    const hours = automations.map(a => new Date(a.createdAt).getHours());
    const businessHoursActivity = hours.filter(h => h >= 9 && h <= 17).length;
    const offHoursActivity = hours.length - businessHoursActivity;

    const typicalTimeWindows = {
      businessHours: { start: 9, end: 17 },
      peakActivity: this.calculatePeakHours(hours),
      offHoursThreshold: offHoursActivity / hours.length
    };

    // 3. Permission pattern analysis
    const allPermissions = automations.flatMap(a => a.permissions || []);
    const permissionCounts = this.countOccurrences(allPermissions);

    const permissionPatterns = {
      commonPermissions: Object.keys(permissionCounts)
        .filter(p => permissionCounts[p] > automations.length * 0.1)
        .slice(0, 10),
      riskPermissions: Object.keys(permissionCounts)
        .filter(p => p.includes('admin') || p.includes('write') || p.includes('delete')),
      permissionComplexity: allPermissions.length / automations.length
    };

    // 4. Automation type analysis
    const allTypes = automations.map(a => a.type);
    const typeCounts = this.countOccurrences(allTypes);

    const automationTypes = {
      commonTypes: Object.keys(typeCounts).slice(0, 5),
      riskTypes: Object.keys(typeCounts).filter(t => t.includes('bot') || t.includes('integration')),
      typeDistribution: typeCounts
    };

    // 5. Cross-platform behavior analysis
    const platforms = automations.map(a => a.platform);
    const platformCounts = this.countOccurrences(platforms);
    const crossPlatformChains = automations.filter(a =>
      a.metadata?.riskFactors?.includes('Cross-platform') ||
      a.actions.includes('external_api')
    ).length;

    const crossPlatformBehavior = {
      platformUsage: platformCounts,
      crossPlatformChains: crossPlatformChains / automations.length,
      integrationComplexity: this.calculateIntegrationComplexity(automations)
    };

    return {
      normalVelocity,
      typicalTimeWindows,
      permissionPatterns,
      automationTypes,
      crossPlatformBehavior
    };
  }

  private calculateLearningConfidence(automations: AutomationEvent[]): number {
    // Calculate confidence based on data quality and quantity
    const sampleSizeScore = Math.min(automations.length / 100, 1.0); // More data = higher confidence
    const platformDiversityScore = new Set(automations.map(a => a.platform)).size / 3; // Multi-platform = higher confidence
    const timeSpanScore = this.calculateTimeSpanScore(automations); // Longer observation = higher confidence

    return (sampleSizeScore * 0.4 + platformDiversityScore * 0.3 + timeSpanScore * 0.3);
  }

  private extractPlatforms(automations: AutomationEvent[]): string[] {
    return [...new Set(automations.map(a => a.platform))];
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculatePeakHours(hours: number[]): number[] {
    const hourCounts = this.countOccurrences(hours);
    return Object.keys(hourCounts)
      .map(h => parseInt(h))
      .sort((a, b) => hourCounts[b] - hourCounts[a])
      .slice(0, 3);
  }

  private countOccurrences<T>(items: T[]): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = String(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateTimeSpanScore(automations: AutomationEvent[]): number {
    const dates = automations.map(a => new Date(a.createdAt).getTime());
    const timeSpanDays = (Math.max(...dates) - Math.min(...dates)) / (24 * 60 * 60 * 1000);
    return Math.min(timeSpanDays / 30, 1.0); // 30 days = full score
  }

  private calculateIntegrationComplexity(automations: AutomationEvent[]): number {
    const integrationIndicators = automations.filter(a =>
      a.actions.includes('external_api') ||
      a.actions.includes('data_processing') ||
      a.metadata?.riskFactors?.includes('external') ||
      a.type === 'integration'
    ).length;

    return integrationIndicators / automations.length;
  }

  private adaptivePatternUpdate(
    currentPatterns: OrganizationalBaseline['behavioralPatterns'],
    newPatterns: OrganizationalBaseline['behavioralPatterns'],
    adaptationRate: number
  ): OrganizationalBaseline['behavioralPatterns'] {

    // Adaptive learning with exponential moving average
    const alpha = adaptationRate;

    return {
      normalVelocity: {
        min: Math.min(currentPatterns.normalVelocity.min, newPatterns.normalVelocity.min),
        max: Math.max(currentPatterns.normalVelocity.max, newPatterns.normalVelocity.max),
        average: currentPatterns.normalVelocity.average * (1 - alpha) + newPatterns.normalVelocity.average * alpha,
        stdDev: currentPatterns.normalVelocity.stdDev * (1 - alpha) + newPatterns.normalVelocity.stdDev * alpha
      },

      typicalTimeWindows: {
        businessHours: currentPatterns.typicalTimeWindows.businessHours, // Keep stable
        peakActivity: newPatterns.typicalTimeWindows.peakActivity, // Update with recent data
        offHoursThreshold: currentPatterns.typicalTimeWindows.offHoursThreshold * (1 - alpha) +
          newPatterns.typicalTimeWindows.offHoursThreshold * alpha
      },

      // Update other patterns with similar adaptive approach
      permissionPatterns: this.mergePermissionPatterns(currentPatterns.permissionPatterns, newPatterns.permissionPatterns),
      automationTypes: this.mergeAutomationTypes(currentPatterns.automationTypes, newPatterns.automationTypes),
      crossPlatformBehavior: this.mergeCrossPlatformBehavior(currentPatterns.crossPlatformBehavior, newPatterns.crossPlatformBehavior, alpha)
    };
  }

  private mergePermissionPatterns(current: any, updated: any): any {
    // Merge permission patterns intelligently
    const combinedCommon = [...new Set([...current.commonPermissions, ...updated.commonPermissions])];
    const combinedRisk = [...new Set([...current.riskPermissions, ...updated.riskPermissions])];

    return {
      commonPermissions: combinedCommon.slice(0, 10), // Keep top 10
      riskPermissions: combinedRisk,
      permissionComplexity: (current.permissionComplexity + updated.permissionComplexity) / 2
    };
  }

  private mergeAutomationTypes(current: any, updated: any): any {
    // Merge automation type patterns
    const combinedDistribution = { ...current.typeDistribution };

    // Update distribution with new data
    Object.keys(updated.typeDistribution).forEach(type => {
      combinedDistribution[type] = (combinedDistribution[type] || 0) + updated.typeDistribution[type];
    });

    return {
      commonTypes: Object.keys(combinedDistribution).slice(0, 5),
      riskTypes: [...new Set([...current.riskTypes, ...updated.riskTypes])],
      typeDistribution: combinedDistribution
    };
  }

  private mergeCrossPlatformBehavior(current: any, updated: any, alpha: number): any {
    // Adaptive merge for cross-platform behavior
    const mergedUsage: Record<string, number> = {};

    // Combine platform usage patterns
    const allPlatforms = new Set([...Object.keys(current.platformUsage), ...Object.keys(updated.platformUsage)]);
    allPlatforms.forEach(platform => {
      const currentUsage = current.platformUsage[platform] || 0;
      const updatedUsage = updated.platformUsage[platform] || 0;
      mergedUsage[platform] = currentUsage * (1 - alpha) + updatedUsage * alpha;
    });

    return {
      platformUsage: mergedUsage,
      crossPlatformChains: current.crossPlatformChains * (1 - alpha) + updated.crossPlatformChains * alpha,
      integrationComplexity: current.integrationComplexity * (1 - alpha) + updated.integrationComplexity * alpha
    };
  }

  /**
   * Detect behavioral anomalies based on organizational baseline
   */
  async detectBehavioralAnomaly(
    automation: AutomationEvent,
    organizationId: string
  ): Promise<{
    isAnomaly: boolean;
    anomalyScore: number; // 0-1
    anomalyFactors: string[];
    confidence: number;
  }> {

    const baseline = await this.getOrganizationalBaseline(organizationId);
    if (!baseline) {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        anomalyFactors: ['No baseline available'],
        confidence: 0
      };
    }

    const anomalyFactors = [];
    let anomalyScore = 0;

    // 1. Velocity anomaly detection
    const velocityAnomaly = this.detectVelocityAnomaly(automation, baseline);
    if (velocityAnomaly.isAnomaly) {
      anomalyFactors.push(`Velocity anomaly: ${velocityAnomaly.reason}`);
      anomalyScore += velocityAnomaly.score * 0.3;
    }

    // 2. Time window anomaly detection
    const timeAnomaly = this.detectTimeAnomaly(automation, baseline);
    if (timeAnomaly.isAnomaly) {
      anomalyFactors.push(`Time anomaly: ${timeAnomaly.reason}`);
      anomalyScore += timeAnomaly.score * 0.2;
    }

    // 3. Permission anomaly detection
    const permissionAnomaly = this.detectPermissionAnomaly(automation, baseline);
    if (permissionAnomaly.isAnomaly) {
      anomalyFactors.push(`Permission anomaly: ${permissionAnomaly.reason}`);
      anomalyScore += permissionAnomaly.score * 0.3;
    }

    // 4. Cross-platform anomaly detection
    const crossPlatformAnomaly = this.detectCrossPlatformAnomaly(automation, baseline);
    if (crossPlatformAnomaly.isAnomaly) {
      anomalyFactors.push(`Cross-platform anomaly: ${crossPlatformAnomaly.reason}`);
      anomalyScore += crossPlatformAnomaly.score * 0.2;
    }

    const isAnomaly = anomalyScore > 0.5; // Threshold for anomaly classification

    return {
      isAnomaly,
      anomalyScore: Math.min(anomalyScore, 1.0),
      anomalyFactors,
      confidence: baseline.confidence
    };
  }

  // Velocity anomaly detection
  private detectVelocityAnomaly(automation: AutomationEvent, baseline: OrganizationalBaseline): {
    isAnomaly: boolean;
    score: number;
    reason: string;
  } {
    // Calculate automation velocity
    const daysSinceCreated = (Date.now() - new Date(automation.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    const triggerCount = automation.lastTriggered ? 1 : 0;
    const velocity = triggerCount / Math.max(daysSinceCreated, 1);

    // Compare to baseline
    const { average, stdDev } = baseline.behavioralPatterns.normalVelocity;
    const deviationScore = Math.abs(velocity - average) / Math.max(stdDev, 0.1);

    const isAnomaly = deviationScore > 2; // 2 standard deviations
    const score = Math.min(deviationScore / 3, 1.0);

    return {
      isAnomaly,
      score,
      reason: isAnomaly ? `Velocity ${velocity.toFixed(2)} deviates ${deviationScore.toFixed(1)}σ from baseline` : 'Normal velocity'
    };
  }

  // Time anomaly detection
  private detectTimeAnomaly(automation: AutomationEvent, baseline: OrganizationalBaseline): {
    isAnomaly: boolean;
    score: number;
    reason: string;
  } {
    const hour = new Date(automation.createdAt).getHours();
    const isOffHours = hour < 9 || hour > 17;
    const offHoursThreshold = baseline.behavioralPatterns.typicalTimeWindows.offHoursThreshold;

    if (isOffHours && offHoursThreshold < 0.1) {
      return {
        isAnomaly: true,
        score: 0.8,
        reason: `Off-hours activity (${hour}:00) unusual for this organization`
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Normal time pattern'
    };
  }

  // Permission anomaly detection
  private detectPermissionAnomaly(automation: AutomationEvent, baseline: OrganizationalBaseline): {
    isAnomaly: boolean;
    score: number;
    reason: string;
  } {
    const permissions = automation.permissions || [];
    const commonPermissions = baseline.behavioralPatterns.permissionPatterns.commonPermissions;

    const unusualPermissions = permissions.filter(p => !commonPermissions.includes(p));
    const anomalyScore = unusualPermissions.length / Math.max(permissions.length, 1);

    const isAnomaly = anomalyScore > 0.5;

    return {
      isAnomaly,
      score: anomalyScore,
      reason: isAnomaly ? `${unusualPermissions.length} unusual permissions detected` : 'Normal permissions'
    };
  }

  // Cross-platform anomaly detection
  private detectCrossPlatformAnomaly(automation: AutomationEvent, baseline: OrganizationalBaseline): {
    isAnomaly: boolean;
    score: number;
    reason: string;
  } {
    const hasExternalCalls = automation.actions.includes('external_api') ||
      automation.metadata?.riskFactors?.includes('external');

    const baselineCrossPlatformRate = baseline.behavioralPatterns.crossPlatformBehavior.crossPlatformChains;

    if (hasExternalCalls && baselineCrossPlatformRate < 0.1) {
      return {
        isAnomaly: true,
        score: 0.7,
        reason: 'Cross-platform activity unusual for this organization'
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Normal cross-platform behavior'
    };
  }

  /**
   * Get baseline learning statistics
   */
  getStatistics(): {
    totalOrganizations: number;
    establishedBaselines: number;
    learningBaselines: number;
    averageConfidence: number;
  } {
    const baselines = Array.from(this.baselines.values());

    return {
      totalOrganizations: baselines.length,
      establishedBaselines: baselines.filter(b => b.learningStatus === 'established').length,
      learningBaselines: baselines.filter(b => b.learningStatus === 'learning').length,
      averageConfidence: baselines.length > 0 ?
        baselines.reduce((sum, b) => sum + b.confidence, 0) / baselines.length : 0
    };
  }
}

/**
 * Export singleton instance
 */
export const behavioralLearningService = new BehavioralBaselineLearningService();