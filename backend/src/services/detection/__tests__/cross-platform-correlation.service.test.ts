/**
 * Cross-Platform Correlation Service Tests
 * Comprehensive test suite for correlation engine validation
 *
 * Business Impact:
 * - Validates P0 revenue blocker functionality for professional tier pricing
 * - Ensures correlation accuracy meets 90%+ target for enterprise customers
 * - Validates sub-2-second performance requirements for real-time correlation
 * - Tests compliance and audit functionality for regulatory requirements
 *
 * Test Coverage:
 * - Core correlation algorithms and accuracy validation
 * - Performance benchmarks for enterprise scalability
 * - Error handling and edge case validation
 * - Integration testing with platform connectors
 * - Executive report generation and business metrics
 */

import { CrossPlatformCorrelationService } from '../cross-platform-correlation.service';
import {
  MultiPlatformEvent,
  AutomationWorkflowChain,
  TemporalCorrelation,
  UserCorrelationAnalysis,
  MultiPlatformRiskAssessment,
  CorrelationAnalysisResult,
  ExecutiveRiskReport,
  isValidAutomationWorkflowChain,
  isValidMultiPlatformRiskAssessment,
  isValidCorrelationAnalysisResult
} from '@saas-xray/shared-types';

describe('CrossPlatformCorrelationService', () => {
  let correlationService: CrossPlatformCorrelationService;

  beforeEach(() => {
    correlationService = new CrossPlatformCorrelationService({
      timeWindowMs: 300000, // 5 minutes
      confidenceThreshold: 0.8,
      enableRealTimeProcessing: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Correlation Functionality', () => {
    /**
     * Test automation chain detection with mock cross-platform events
     * Validates core business value: unique automation chain mapping
     */
    it('should detect cross-platform automation chains', async () => {
      // Arrange: Create mock multi-platform events representing an automation workflow
      const mockEvents: MultiPlatformEvent[] = [
        {
          eventId: 'slack-trigger-1',
          platform: 'slack',
          timestamp: new Date('2025-01-15T10:00:00Z'),
          userId: 'user1',
          userEmail: 'user1@company.com',
          eventType: 'file_shared',
          resourceId: 'channel-123',
          resourceType: 'channel',
          actionDetails: {
            action: 'file_share_trigger',
            resourceName: 'Project Files Channel',
            metadata: {
              fileName: 'quarterly-report.pdf',
              fileSize: 2048000
            }
          },
          correlationMetadata: {
            potentialTrigger: true,
            potentialAction: false,
            externalDataAccess: true,
            automationIndicators: ['file_sharing', 'webhook_trigger', 'automated_process']
          }
        },
        {
          eventId: 'google-action-1',
          platform: 'google',
          timestamp: new Date('2025-01-15T10:00:05Z'), // 5 seconds later
          userId: 'user1',
          userEmail: 'user1@company.com',
          eventType: 'drive_file_create',
          resourceId: 'drive-file-456',
          resourceType: 'file',
          actionDetails: {
            action: 'file_upload',
            resourceName: 'quarterly-report-backup.pdf',
            metadata: {
              driveLocation: '/backup/reports/',
              fileSize: 2048000
            }
          },
          correlationMetadata: {
            potentialTrigger: false,
            potentialAction: true,
            externalDataAccess: true,
            automationIndicators: ['automated_backup', 'file_sync', 'scheduled_operation']
          }
        }
      ];

      // Act: Execute correlation detection
      const startTime = Date.now();
      const automationChains = await correlationService.detectAutomationChains(mockEvents);
      const processingTime = Date.now() - startTime;

      // Assert: Validate business requirements
      expect(automationChains).toBeDefined();
      expect(automationChains.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(2000); // Sub-2-second requirement

      // Validate chain structure and business metrics
      const chain = automationChains[0];
      expect(isValidAutomationWorkflowChain(chain)).toBe(true);
      expect(chain.platforms).toContain('slack');
      expect(chain.platforms).toContain('google');
      expect(chain.correlationConfidence).toBeGreaterThan(80); // 80%+ confidence requirement
      expect(chain.riskLevel).toMatch(/^(low|medium|high|critical)$/);

      // Validate workflow structure for executive presentation
      expect(chain.workflow.description).toBeDefined();
      expect(chain.workflow.stages.length).toBeGreaterThan(0);
      expect(chain.workflow.automation.isAutomated).toBe(true);

      // Validate risk assessment for compliance reporting
      expect(chain.riskAssessment.overallRisk).toBeGreaterThanOrEqual(0);
      expect(chain.riskAssessment.overallRisk).toBeLessThanOrEqual(100);
      expect(chain.riskAssessment.recommendations).toBeDefined();
      expect(Array.isArray(chain.riskAssessment.recommendations)).toBe(true);
    });

    /**
     * Test temporal correlation accuracy for time-based automation detection
     * Critical for professional tier differentiation
     */
    it('should accurately detect temporal correlations', async () => {
      // Arrange: Create events with clear temporal patterns
      const mockEvents: MultiPlatformEvent[] = [
        createMockEvent('slack', '2025-01-15T10:00:00Z', 'user1', true),
        createMockEvent('google', '2025-01-15T10:00:02Z', 'user1', false),
        createMockEvent('microsoft', '2025-01-15T10:00:05Z', 'user1', false)
      ];

      // Act: Analyze temporal correlations
      const temporalCorrelations = await correlationService.analyzeTemporalCorrelation(
        mockEvents,
        300000 // 5-minute window
      );

      // Assert: Validate temporal analysis accuracy
      expect(temporalCorrelations).toBeDefined();
      expect(temporalCorrelations.length).toBeGreaterThan(0);

      const correlation = temporalCorrelations[0];
      expect(correlation.events.length).toBeGreaterThanOrEqual(2);
      expect(correlation.automationLikelihood).toBeGreaterThan(70); // High automation likelihood
      expect(correlation.pattern.isSequential).toBe(true);
      expect(correlation.timeWindow.durationMs).toBeLessThan(300000); // Within time window
    });

    /**
     * Test user correlation analysis for behavioral pattern detection
     * Supports enterprise security team requirements
     */
    it('should analyze user correlation patterns', async () => {
      // Arrange: Create events for specific user analysis
      const userId = 'test-user-123';
      const mockEvents: MultiPlatformEvent[] = [
        createMockEvent('slack', '2025-01-15T09:00:00Z', userId, true),
        createMockEvent('google', '2025-01-15T09:05:00Z', userId, false),
        createMockEvent('slack', '2025-01-15T10:00:00Z', userId, true),
        createMockEvent('microsoft', '2025-01-15T10:10:00Z', userId, false)
      ];

      // Act: Analyze user correlation patterns
      const userCorrelation = await correlationService.identifyUserCorrelation(mockEvents, userId);

      // Assert: Validate user analysis for executive reporting
      expect(userCorrelation).toBeDefined();
      expect(userCorrelation.userId).toBe(userId);
      expect(userCorrelation.platforms.length).toBeGreaterThan(1); // Cross-platform activity
      expect(userCorrelation.activityCorrelation.crossPlatformWorkflows).toBeGreaterThan(0);
      expect(userCorrelation.riskProfile.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(userCorrelation.riskProfile.overallRiskScore).toBeLessThanOrEqual(100);
      expect(userCorrelation.riskProfile.recommendedActions).toBeDefined();
    });
  });

  describe('Risk Assessment and Business Intelligence', () => {
    /**
     * Test multi-platform risk assessment for executive decision-making
     * Critical for C-level engagement and revenue justification
     */
    it('should calculate comprehensive multi-platform risk assessment', async () => {
      // Arrange: Create mock automation chains with varying risk levels
      const mockChains: AutomationWorkflowChain[] = [
        createMockAutomationChain('high-risk-chain', ['slack', 'google'], 'high'),
        createMockAutomationChain('medium-risk-chain', ['google', 'microsoft'], 'medium'),
        createMockAutomationChain('low-risk-chain', ['slack'], 'low')
      ];

      // Act: Calculate cross-platform risk assessment
      const riskAssessment = await correlationService.calculateCrossPlatformRisk(mockChains);

      // Assert: Validate executive-ready risk metrics
      expect(isValidMultiPlatformRiskAssessment(riskAssessment)).toBe(true);
      expect(riskAssessment.assessmentId).toBeDefined();
      expect(riskAssessment.organizationId).toBeDefined();
      expect(riskAssessment.assessmentDate).toBeInstanceOf(Date);

      // Validate platform-specific risk metrics
      expect(riskAssessment.platforms.slack).toBeDefined();
      expect(riskAssessment.platforms.google).toBeDefined();
      expect(riskAssessment.platforms.slack.automationsDetected).toBeGreaterThan(0);

      // Validate cross-platform risk aggregation
      expect(riskAssessment.crossPlatformRisks.automationChains).toBe(mockChains.length);
      expect(riskAssessment.overallAssessment.compositeRiskScore).toBeGreaterThanOrEqual(0);
      expect(riskAssessment.overallAssessment.compositeRiskScore).toBeLessThanOrEqual(100);
      expect(riskAssessment.overallAssessment.recommendedActions).toBeDefined();

      // Validate compliance framework assessment
      expect(riskAssessment.complianceFramework.gdprCompliance).toBeDefined();
      expect(riskAssessment.complianceFramework.soxCompliance).toBeDefined();
    });

    /**
     * Test executive report generation for C-level presentation
     * Essential for premium tier value demonstration
     */
    it('should generate executive-ready correlation reports', async () => {
      // Arrange: Create comprehensive analysis result
      const mockAnalysisResult: CorrelationAnalysisResult = createMockAnalysisResult();

      // Act: Generate executive report
      const executiveReport = await correlationService.generateExecutiveReport(mockAnalysisResult);

      // Assert: Validate executive presentation quality
      expect(executiveReport).toBeDefined();
      expect(executiveReport.reportId).toBeDefined();
      expect(executiveReport.executiveSummary).toBeDefined();
      expect(executiveReport.executiveSummary.length).toBeGreaterThan(50); // Substantial summary

      // Validate key findings for business decision-making
      expect(executiveReport.keyFindings).toBeDefined();
      expect(executiveReport.keyFindings.length).toBeGreaterThan(0);
      expect(executiveReport.riskLevel).toMatch(/^(low|medium|high|critical)$/);

      // Validate business context for revenue justification
      expect(executiveReport.businessContext.totalPlatformsMonitored).toBeGreaterThan(0);
      expect(executiveReport.businessContext.totalAutomationsDetected).toBeGreaterThanOrEqual(0);

      // Validate actionable insights for investment decisions
      expect(executiveReport.actionPlan.immediateActions).toBeDefined();
      expect(executiveReport.actionPlan.strategicRecommendations).toBeDefined();
      expect(executiveReport.actionPlan.investmentRequired).toBeDefined();

      // Validate ROI metrics for budget justification
      expect(executiveReport.kpis.riskReduction).toBeGreaterThan(0);
      expect(executiveReport.kpis.complianceImprovement).toBeGreaterThan(0);
      expect(executiveReport.kpis.costBenefit).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    /**
     * Test correlation engine performance under enterprise load
     * Critical for professional tier SLA requirements
     */
    it('should maintain sub-2-second response time under load', async () => {
      // Arrange: Create large dataset simulating enterprise environment
      const largeEventSet: MultiPlatformEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        largeEventSet.push(
          createMockEvent('slack', `2025-01-15T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`, `user${i % 10}`, i % 5 === 0)
        );
        largeEventSet.push(
          createMockEvent('google', `2025-01-15T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String((i % 60) + 5).padStart(2, '0')}Z`, `user${i % 10}`, false)
        );
      }

      // Act: Execute correlation analysis under load
      const startTime = Date.now();
      const automationChains = await correlationService.detectAutomationChains(largeEventSet);
      const processingTime = Date.now() - startTime;

      // Assert: Validate enterprise performance requirements
      expect(processingTime).toBeLessThan(2000); // Sub-2-second requirement
      expect(automationChains).toBeDefined();
      expect(automationChains.length).toBeGreaterThan(0);

      // Validate accuracy under load
      const accurateChains = automationChains.filter(chain => chain.correlationConfidence >= 80);
      const accuracyRatio = accurateChains.length / automationChains.length;
      expect(accuracyRatio).toBeGreaterThan(0.8); // 80%+ accuracy requirement
    });

    /**
     * Test performance metrics tracking for operational monitoring
     * Supports enterprise SLA monitoring and optimization
     */
    it('should track and report performance metrics', async () => {
      // Arrange: Execute correlation analysis
      const mockEvents = [
        createMockEvent('slack', '2025-01-15T10:00:00Z', 'user1', true),
        createMockEvent('google', '2025-01-15T10:00:05Z', 'user1', false)
      ];

      // Act: Execute correlation and retrieve metrics
      await correlationService.detectAutomationChains(mockEvents);
      const performanceMetrics = correlationService.getPerformanceMetrics();

      // Assert: Validate comprehensive performance tracking
      expect(performanceMetrics).toBeDefined();
      expect(performanceMetrics.correlationLatency).toBeGreaterThan(0);
      expect(performanceMetrics.eventsProcessed).toBe(mockEvents.length);
      expect(performanceMetrics.chainsDetected).toBeGreaterThanOrEqual(0);
      expect(performanceMetrics.accuracyScore).toBeGreaterThanOrEqual(0);
      expect(performanceMetrics.accuracyScore).toBeLessThanOrEqual(100);
      expect(performanceMetrics.processingStartTime).toBeInstanceOf(Date);
      expect(performanceMetrics.processingEndTime).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test error handling for production reliability
     * Critical for enterprise customer trust and SLA compliance
     */
    it('should handle empty event arrays gracefully', async () => {
      // Act & Assert: Test edge case handling
      const automationChains = await correlationService.detectAutomationChains([]);
      expect(automationChains).toBeDefined();
      expect(automationChains).toHaveLength(0);
    });

    it('should handle single-platform events appropriately', async () => {
      // Arrange: Create single-platform events (should not create cross-platform chains)
      const singlePlatformEvents = [
        createMockEvent('slack', '2025-01-15T10:00:00Z', 'user1', true),
        createMockEvent('slack', '2025-01-15T10:00:05Z', 'user1', false)
      ];

      // Act: Execute correlation analysis
      const automationChains = await correlationService.detectAutomationChains(singlePlatformEvents);

      // Assert: Should not create cross-platform chains for single-platform activity
      expect(automationChains).toBeDefined();
      // Single-platform chains may still be detected but should be marked appropriately
      automationChains.forEach(chain => {
        if (chain.platforms.length === 1) {
          expect(chain.platforms[0]).toBe('slack');
        }
      });
    });

    it('should handle malformed event data gracefully', async () => {
      // Arrange: Create events with potential data issues
      const problematicEvents: MultiPlatformEvent[] = [
        {
          ...createMockEvent('slack', '2025-01-15T10:00:00Z', 'user1', true),
          correlationMetadata: {
            potentialTrigger: true,
            potentialAction: false,
            externalDataAccess: false,
            automationIndicators: [] // Empty indicators
          }
        }
      ];

      // Act & Assert: Should not throw errors
      await expect(correlationService.detectAutomationChains(problematicEvents))
        .resolves
        .toBeDefined();
    });
  });

  describe('Configuration and Customization', () => {
    /**
     * Test configuration flexibility for enterprise customization
     * Supports different customer requirements and use cases
     */
    it('should respect correlation confidence threshold configuration', async () => {
      // Arrange: Create service with high confidence threshold
      const highThresholdService = new CrossPlatformCorrelationService({
        confidenceThreshold: 0.95 // 95% confidence required
      });

      const mockEvents = [
        createMockEvent('slack', '2025-01-15T10:00:00Z', 'user1', true),
        createMockEvent('google', '2025-01-15T10:00:05Z', 'user1', false)
      ];

      // Act: Execute correlation with high threshold
      const automationChains = await highThresholdService.detectAutomationChains(mockEvents);

      // Assert: Should filter out lower-confidence chains
      automationChains.forEach(chain => {
        expect(chain.correlationConfidence).toBeGreaterThanOrEqual(95);
      });
    });

    it('should allow configuration updates during runtime', () => {
      // Act: Update configuration
      correlationService.updateConfiguration({
        timeWindowMs: 600000, // 10 minutes
        confidenceThreshold: 0.9
      });

      // Assert: Configuration should be updated
      const updatedConfig = correlationService.getConfiguration();
      expect(updatedConfig.timeWindowMs).toBe(600000);
      expect(updatedConfig.confidenceThreshold).toBe(0.9);
    });
  });

  // Helper functions for test data creation

  function createMockEvent(
    platform: 'slack' | 'google' | 'microsoft' | 'jira',
    timestamp: string,
    userId: string,
    isTrigger: boolean
  ): MultiPlatformEvent {
    return {
      eventId: `${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform,
      timestamp: new Date(timestamp),
      userId,
      userEmail: `${userId}@company.com`,
      eventType: isTrigger ? 'trigger_event' : 'action_event',
      resourceId: `resource-${platform}`,
      resourceType: platform === 'slack' ? 'channel' : 'file',
      actionDetails: {
        action: isTrigger ? 'trigger_action' : 'automated_action',
        resourceName: `Test Resource ${platform}`,
        metadata: {
          testData: true,
          platform
        }
      },
      correlationMetadata: {
        potentialTrigger: isTrigger,
        potentialAction: !isTrigger,
        externalDataAccess: true,
        automationIndicators: isTrigger
          ? ['webhook_trigger', 'automated_process']
          : ['automated_response', 'data_processing']
      }
    };
  }

  function createMockAutomationChain(
    chainId: string,
    platforms: ('slack' | 'google' | 'microsoft' | 'jira')[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): AutomationWorkflowChain {
    return {
      chainId,
      chainName: `Test Chain ${chainId}`,
      platforms,
      triggerEvent: createMockEvent(platforms[0], '2025-01-15T10:00:00Z', 'user1', true),
      actionEvents: platforms.slice(1).map((platform, index) =>
        createMockEvent(platform, `2025-01-15T10:0${index + 1}:00Z`, 'user1', false)
      ),
      correlationConfidence: riskLevel === 'high' ? 95 : riskLevel === 'medium' ? 85 : 75,
      riskLevel,
      workflow: {
        description: `Mock automation workflow for ${platforms.join(' → ')}`,
        stages: [],
        dataFlow: {
          flowId: `flow-${chainId}`,
          sourceDataType: ['documents'],
          destinationPlatforms: platforms,
          transformations: [],
          externalServices: [],
          sensitivityClassification: {
            containsPII: false,
            containsFinancialData: false,
            containsHealthData: false,
            containsBusinessSecrets: true,
            overallSensitivity: 'internal'
          }
        },
        automation: {
          isAutomated: true,
          automationType: 'event_driven',
          frequency: 'regular'
        }
      },
      riskAssessment: {
        overallRisk: riskLevel === 'high' ? 80 : riskLevel === 'medium' ? 60 : 40,
        riskFactors: {
          dataExposure: 60,
          permissionEscalation: 40,
          complianceImpact: 70,
          operationalDependency: 50
        },
        businessImpact: riskLevel === 'high' ? 'significant' : 'moderate',
        recommendations: [
          'Review automation permissions',
          'Implement additional monitoring'
        ]
      }
    };
  }

  function createMockAnalysisResult(): CorrelationAnalysisResult {
    const mockChains = [
      createMockAutomationChain('test-chain-1', ['slack', 'google'], 'medium'),
      createMockAutomationChain('test-chain-2', ['google', 'microsoft'], 'high')
    ];

    return {
      analysisId: 'test-analysis-123',
      organizationId: 'test-org-456',
      analysisDate: new Date(),
      platforms: ['slack', 'google', 'microsoft'],
      summary: {
        totalAutomationChains: mockChains.length,
        crossPlatformWorkflows: mockChains.filter(c => c.platforms.length > 1).length,
        aiIntegrationsDetected: 2,
        complianceViolations: 1,
        overallRiskScore: 65
      },
      workflows: mockChains,
      riskAssessment: {
        assessmentId: 'risk-assessment-789',
        organizationId: 'test-org-456',
        assessmentDate: new Date(),
        platforms: {
          slack: {
            platform: 'slack',
            connectionStatus: 'connected',
            automationsDetected: 1,
            riskScore: 60,
            riskDistribution: { low: 0, medium: 1, high: 0, critical: 0 },
            aiIntegrations: [],
            complianceIssues: []
          },
          google: {
            platform: 'google',
            connectionStatus: 'connected',
            automationsDetected: 2,
            riskScore: 70,
            riskDistribution: { low: 0, medium: 1, high: 1, critical: 0 },
            aiIntegrations: [],
            complianceIssues: []
          }
        },
        crossPlatformRisks: {
          automationChains: mockChains.length,
          dataExposureRisks: 1,
          complianceViolations: 1,
          unauthorizedAIIntegrations: 2
        },
        overallAssessment: {
          compositeRiskScore: 65,
          riskLevel: 'medium',
          topRisks: ['Data exposure via automation'],
          executiveSummary: 'Medium risk level detected across cross-platform automations',
          recommendedActions: []
        },
        complianceFramework: {
          gdprCompliance: {
            compliant: true,
            violations: [],
            riskLevel: 'low',
            lastAssessment: new Date(),
            nextReviewDate: new Date(),
            recommendedActions: []
          },
          soxCompliance: {
            compliant: true,
            violations: [],
            riskLevel: 'low',
            lastAssessment: new Date(),
            nextReviewDate: new Date(),
            recommendedActions: []
          },
          hipaaCompliance: {
            compliant: true,
            violations: [],
            riskLevel: 'low',
            lastAssessment: new Date(),
            nextReviewDate: new Date(),
            recommendedActions: []
          },
          pciCompliance: {
            compliant: true,
            violations: [],
            riskLevel: 'low',
            lastAssessment: new Date(),
            nextReviewDate: new Date(),
            recommendedActions: []
          },
          customCompliance: []
        }
      },
      executiveSummary: {} as ExecutiveRiskReport, // Placeholder
      recommendations: {
        immediate: [],
        shortTerm: [],
        longTerm: []
      }
    };
  }
});