import { 
  GoogleWorkspaceEvent, 
  GoogleActivityPattern, 
  RiskIndicator,
  ActivityTimeframe,
  TemporalPattern
} from '@singura/shared-types';

import { VelocityDetectorService } from './velocity-detector.service';
import { BatchOperationDetectorService } from './batch-operation-detector.service';
import { OffHoursDetectorService } from './off-hours-detector.service';
import { AIProviderDetectorService } from './ai-provider-detector.service';
import { TimingVarianceDetectorService } from './timing-variance-detector.service';
import { PermissionEscalationDetectorService } from './permission-escalation-detector.service';
import { DataVolumeDetectorService } from './data-volume-detector.service';

export class DetectionEngineService {
  private velocityDetector: VelocityDetectorService;
  private batchOperationDetector: BatchOperationDetectorService;
  private offHoursDetector: OffHoursDetectorService;
  private aiProviderDetector: AIProviderDetectorService;
  private timingVarianceDetector: TimingVarianceDetectorService;
  private permissionEscalationDetector: PermissionEscalationDetectorService;
  private dataVolumeDetector: DataVolumeDetectorService;

  constructor(private organizationId?: string) {
    this.velocityDetector = new VelocityDetectorService();
    this.batchOperationDetector = new BatchOperationDetectorService();
    this.offHoursDetector = new OffHoursDetectorService();
    this.aiProviderDetector = new AIProviderDetectorService();
    this.timingVarianceDetector = new TimingVarianceDetectorService();
    this.permissionEscalationDetector = new PermissionEscalationDetectorService();
    this.dataVolumeDetector = new DataVolumeDetectorService();
  }

  async detectShadowAI(
    events: GoogleWorkspaceEvent[], 
    businessHours: ActivityTimeframe['businessHours']
  ): Promise<{
    activityPatterns: GoogleActivityPattern[];
    riskIndicators: RiskIndicator[];
  }> {
    // Velocity detection
    const velocityTemporalPatterns = this.velocityDetector.detectVelocityAnomalies(events);
    const velocityPatterns = velocityTemporalPatterns.map(pattern => this.convertTemporalToActivity(pattern));

    // Batch operation detection
    const batchOperationPatterns = this.batchOperationDetector.detectBatchOperations(events);

    // Off-hours activity detection
    const activityTimeframe: ActivityTimeframe = {
      timezoneId: 'UTC',
      businessHours,
      activityPeriod: {
        startTime: new Date(),
        endTime: new Date(),
        isBusinessHours: true,
        isWeekend: false
      },
      humanLikelihood: 50,
      automationIndicators: []
    };
    const offHoursPatterns = this.offHoursDetector.detectOffHoursActivity(events, activityTimeframe);

    // AI Provider detection
    const aiProviderSignatures = this.aiProviderDetector.detectAIProviders(events);
    const aiRiskIndicators = this.aiProviderDetector.generateAIIntegrationRiskIndicator(aiProviderSignatures);

    // Convert AI signatures to activity patterns
    const aiActivityPatterns = aiProviderSignatures.map(signature => ({
      patternId: signature.signatureId,
      patternType: 'api_usage' as const,
      detectedAt: signature.metadata.firstDetected,
      confidence: signature.confidence,
      metadata: {
        userId: 'ai-integration',
        userEmail: 'ai-integration@system',
        resourceType: 'script' as const,
        actionType: 'script_execution' as const,
        timestamp: signature.metadata.lastDetected
      },
      evidence: {
        description: `AI Provider Integration: ${signature.aiProvider}`,
        dataPoints: {
          provider: signature.aiProvider,
          confidence: signature.confidence,
          riskLevel: signature.riskLevel
        },
        supportingEvents: signature.metadata.affectedResources
      }
    }));

    // NEW: Timing variance detection (catches throttled bots)
    const timingVariancePatterns = this.timingVarianceDetector.detectSuspiciousTimingPatterns(events);

    // NEW: Permission escalation detection (detects privilege creep)
    const permissionEscalationPatterns = await this.permissionEscalationDetector.detectEscalation(events);

    // NEW: Data volume detection (catches exfiltration)
    const dataVolumePatterns = await this.dataVolumeDetector.detectExfiltration(
      events,
      this.organizationId || 'unknown'
    );

    // Combine all patterns and indicators
    const activityPatterns = [
      ...velocityPatterns,
      ...batchOperationPatterns,
      ...offHoursPatterns,
      ...aiActivityPatterns,
      ...timingVariancePatterns,
      ...permissionEscalationPatterns,
      ...dataVolumePatterns
    ];

    const riskIndicators = [
      ...aiRiskIndicators
    ];

    return {
      activityPatterns,
      riskIndicators
    };
  }

  // Helper method to convert TemporalPattern to GoogleActivityPattern
  private convertTemporalToActivity(pattern: TemporalPattern): GoogleActivityPattern {
    return {
      patternId: pattern.patternId,
      patternType: 'velocity',
      detectedAt: new Date(),
      confidence: pattern.confidence,
      metadata: {
        userId: 'system-velocity-detector',
        userEmail: 'system@velocity-detector',
        resourceType: 'file',
        actionType: 'file_create',
        timestamp: pattern.timeWindow.startTime
      },
      evidence: {
        description: `Velocity anomaly detected: ${pattern.velocity.eventsPerSecond} events/second`,
        dataPoints: {
          eventsPerSecond: pattern.velocity.eventsPerSecond,
          eventCount: pattern.eventCount,
          anomalyScore: pattern.anomalyScore,
          confidence: pattern.confidence
        },
        supportingEvents: []
      }
    };
  }

  // Aggregate risk scoring method
  calculateOverallRisk(
    activityPatterns: GoogleActivityPattern[], 
    riskIndicators: RiskIndicator[]
  ): number {
    // Calculate average risk across different detection mechanisms
    const patternRiskScores = activityPatterns.map(pattern => pattern.confidence);
    const indicatorRiskScores = riskIndicators.map(indicator => indicator.severity);

    const averagePatternRisk = patternRiskScores.length 
      ? patternRiskScores.reduce((sum, score) => sum + score, 0) / patternRiskScores.length 
      : 0;

    const averageIndicatorRisk = indicatorRiskScores.length
      ? indicatorRiskScores.reduce((sum, score) => sum + score, 0) / indicatorRiskScores.length
      : 0;

    // Weighted combination of pattern and indicator risks
    return Math.min(
      (averagePatternRisk * 0.6 + averageIndicatorRisk * 0.4), 
      100
    );
  }
}