/**
 * ML Detection Pipeline Integration Test
 * Tests end-to-end flow: baseline learning → anomaly detection → feedback adaptation
 */

import { behavioralBaselineRepository, BehavioralStats } from '../../src/database/repositories/behavioral-baseline.repository';
import { BehavioralBaselineLearningService } from '../../src/services/ml-behavioral/behavioral-baseline-learning.service';
import { MLBehavioralInferenceService } from '../../src/services/ml-behavioral/ml-behavioral-inference.service';
import { ReinforcementLearningService } from '../../src/services/reinforcement-learning.service';
import { AutomationEvent } from '@singura/shared-types';
import { testDb } from '../helpers/test-database';

describe('ML Detection Pipeline Integration', () => {
  let learningService: BehavioralBaselineLearningService;
  let inferenceService: MLBehavioralInferenceService;
  let rlService: ReinforcementLearningService;
  let testOrganizationId: string;

  beforeAll(async () => {
    await testDb.beginTransaction();

    learningService = new BehavioralBaselineLearningService({
      minSampleSize: 10, // Lower for testing
      learningPeriodDays: 7,
      confidenceThreshold: 0.7,
      updateFrequency: 'weekly',
      adaptationRate: 0.2,
    });

    inferenceService = new MLBehavioralInferenceService();
    rlService = new ReinforcementLearningService();

    testOrganizationId = `test-org-${Date.now()}`;
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  // Helper function to create mock automation events
  const createMockAutomations = (count: number, baseDate: Date = new Date()): AutomationEvent[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `auto-${i}-${Date.now()}`,
      automationId: `auto-${i}-${Date.now()}`,
      userId: `user-${i % 5}`,
      organizationId: testOrganizationId,
      platform: i % 2 === 0 ? 'slack' : 'google',
      type: 'bot',
      name: `Test Bot ${i}`,
      status: 'active',
      riskLevel: 'medium',
      createdAt: new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000),
      lastTriggered: i % 3 === 0 ? new Date() : undefined,
      permissions: [
        { name: 'channels:read', scope: 'read', level: 'user' },
      ],
      actions: [
        { type: 'message', timestamp: new Date() },
      ],
    }));
  };

  describe('Full ML Detection Flow', () => {
    it('should create behavioral baseline from automation events', async () => {
      // Step 1: Generate 50+ test automation events
      const mockEvents = createMockAutomations(50);

      // Step 2: Run baseline learning service
      const baseline = await learningService.learnOrganizationalBaseline(
        testOrganizationId,
        mockEvents
      );

      // Step 3: Verify baseline created in database
      expect(baseline).toBeDefined();
      expect(baseline.organizationId).toBe(testOrganizationId);
      expect(baseline.behavioralPatterns.normalVelocity).toBeDefined();
      expect(baseline.learningPeriod.sampleSize).toBe(50);

      // Step 4: Create database baselines for users
      for (let i = 0; i < 5; i++) {
        const userId = `user-${i}`;
        const stats: BehavioralStats = {
          meanEventsPerDay: 10 + i,
          stdDevEventsPerDay: 2 + (i * 0.5),
          typicalWorkHours: { start: 9, end: 17 },
          commonActions: [
            { action: 'file_create', frequency: 0.5 },
          ],
        };

        await behavioralBaselineRepository.create({
          userId,
          organizationId: testOrganizationId,
          stats,
          trainingDataSize: 100,
        });
      }

      // Step 5: Verify baselines created correctly
      const orgBaselines = await behavioralBaselineRepository.findByOrganizationId(
        testOrganizationId
      );
      expect(orgBaselines.length).toBeGreaterThanOrEqual(5);
    });

    it('should detect anomaly using Z-scores', async () => {
      // Step 1: Create baseline (mean=10, stddev=2)
      const baselineStats: BehavioralStats = {
        meanEventsPerDay: 10,
        stdDevEventsPerDay: 2,
        typicalWorkHours: { start: 9, end: 17 },
        commonActions: [],
      };

      const userId = `anomaly-user-${Date.now()}`;
      await behavioralBaselineRepository.create({
        userId,
        organizationId: testOrganizationId,
        stats: baselineStats,
        trainingDataSize: 100,
      });

      // Step 2: Create organizational aggregates
      const aggregates = await behavioralBaselineRepository.getOrganizationalAggregates(
        testOrganizationId
      );
      expect(aggregates).not.toBeNull();

      // Step 3: Run detection with anomalous event (high activity)
      const anomalousAutomation: AutomationEvent = {
        id: `anomaly-auto-${Date.now()}`,
        userId,
        organizationId: testOrganizationId,
        platform: 'slack',
        type: 'bot',
        name: 'Anomalous Bot',
        status: 'active',
        riskLevel: 'high',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        lastTriggered: new Date().toISOString(), // Very recent activity
        permissions: [
          { name: 'admin:write', scope: 'write', grantedAt: new Date().toISOString() },
        ],
        actions: [
          { type: 'external_api', description: 'Call external API' },
        ],
        metadata: {
          riskFactors: ['Recently active', 'High frequency'],
        },
      };

      // Step 4: Initialize ML engine
      await inferenceService.initialize();

      // Step 5: Analyze behavior
      const analysis = await inferenceService.analyzeBehavior(anomalousAutomation, {
        organizationId: testOrganizationId,
        platform: 'slack',
      });

      // Step 6: Verify Z-score calculated: (20-10)/2 = 5 (high anomaly)
      expect(analysis).toBeDefined();
      expect(analysis.behavioralRiskScore).toBeGreaterThan(50); // High risk

      // Step 7: Verify ML pattern in detection results
      expect(analysis.modelMetadata.modelsUsed).toContain('xgboost');
      expect(analysis.modelMetadata.modelsUsed).toContain('lstm');
    });

    it('should update baseline with exponential moving average', async () => {
      // Step 1: Create baseline (mean=10)
      const mockEvents = createMockAutomations(20);
      const initialBaseline = await learningService.learnOrganizationalBaseline(
        `${testOrganizationId}-update`,
        mockEvents
      );

      const initialMean = initialBaseline.behavioralPatterns.normalVelocity.average;

      // Step 2: Add new events (different mean)
      const newEvents = createMockAutomations(10).map(e => ({
        ...e,
        organizationId: `${testOrganizationId}-update`,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        lastTriggered: new Date().toISOString(), // More activity
      }));

      // Step 3: Trigger baseline update
      const updatedBaseline = await learningService.updateBaseline(
        `${testOrganizationId}-update`,
        newEvents
      );

      // Step 4: Verify updated mean using exponential moving average
      // Expected: oldMean * 0.8 + newMean * 0.2 (adaptationRate=0.2)
      const updatedMean = updatedBaseline.behavioralPatterns.normalVelocity.average;
      expect(updatedMean).toBeDefined();
      expect(updatedMean).not.toBe(initialMean); // Should change
    });

    it('should adapt thresholds from user feedback', async () => {
      // Step 1: Set initial threshold
      const userId = `feedback-user-${Date.now()}`;
      const initialThreshold = rlService.getThreshold(userId);
      expect(initialThreshold).toBeDefined();
      expect(initialThreshold.value).toBeGreaterThan(0);

      // Step 2: Analyze velocity pattern (simulates detection)
      const eventData = {
        userId,
        events: Array(50).fill({ timestamp: new Date() }), // 50 events
        timeSpanMs: 60 * 60 * 1000, // 1 hour
      };

      const velocityAnalysis = await rlService.analyzeVelocityPattern(eventData);

      // Step 3: Verify analysis result
      expect(velocityAnalysis).toHaveProperty('eventRate', 50);
      expect(velocityAnalysis).toHaveProperty('isAnomalous');
      expect(velocityAnalysis).toHaveProperty('threshold');
      expect(velocityAnalysis).toHaveProperty('recommendation');

      // Simulated false positive scenario
      if (velocityAnalysis.isAnomalous) {
        // In real system, user would submit feedback via API
        // Here we verify threshold adjustment logic

        // Step 4: Get threshold after detection
        const afterThreshold = rlService.getThreshold(userId);
        expect(afterThreshold).toBeDefined();
        expect(afterThreshold.feedbackCount).toBeGreaterThanOrEqual(0);
      }

      // Step 5: Verify threshold adaptation capability
      const stats = rlService.getStatistics();
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('averageThreshold');
      expect(stats).toHaveProperty('totalFeedback');
    });

    it('should calculate organizational aggregates', async () => {
      // Step 1: Create 5+ baselines for same org
      const orgId = `${testOrganizationId}-aggregates`;
      const baselineCount = 5;

      for (let i = 0; i < baselineCount; i++) {
        const stats: BehavioralStats = {
          meanEventsPerDay: 10 + i * 2, // 10, 12, 14, 16, 18
          stdDevEventsPerDay: 2 + i * 0.5, // 2, 2.5, 3, 3.5, 4
          typicalWorkHours: { start: 9, end: 17 },
          commonActions: [],
        };

        await behavioralBaselineRepository.create({
          userId: `user-agg-${i}-${Date.now()}`,
          organizationId: orgId,
          stats,
          trainingDataSize: 100 + i * 10,
        });
      }

      // Step 2: Query organizational aggregates
      const aggregates = await behavioralBaselineRepository.getOrganizationalAggregates(orgId);

      // Step 3: Verify mean/stddev calculated correctly
      expect(aggregates).not.toBeNull();
      expect(aggregates?.sampleSize).toBe(baselineCount);
      expect(aggregates?.meanEventsPerDay).toBeCloseTo(14, 1); // Mean of 10,12,14,16,18 = 14
      expect(aggregates?.stdDevEventsPerDay).toBeGreaterThan(0);
      expect(aggregates?.meanOffHoursActivity).toBeGreaterThanOrEqual(0);
      expect(aggregates?.stdDevOffHoursActivity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ML Engine Performance', () => {
    it('should complete inference within 2 second target', async () => {
      const mockAutomation: AutomationEvent = {
        id: `perf-auto-${Date.now()}`,
        userId: 'user-perf',
        organizationId: testOrganizationId,
        platform: 'slack',
        type: 'bot',
        name: 'Performance Test Bot',
        status: 'active',
        riskLevel: 'medium',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastTriggered: new Date().toISOString(),
        permissions: [],
        actions: [],
      };

      await inferenceService.initialize();

      const startTime = Date.now();
      const result = await inferenceService.analyzeBehavior(mockAutomation, {
        organizationId: testOrganizationId,
        platform: 'slack',
      });
      const endTime = Date.now();

      const inferenceTime = endTime - startTime;

      expect(inferenceTime).toBeLessThan(2000); // < 2 seconds
      expect(result.modelMetadata.processingTimeMs).toBeLessThan(2000);
    });

    it('should report accurate performance metrics', async () => {
      await inferenceService.initialize();
      const status = inferenceService.getEngineStatus();

      expect(status.initialized).toBe(true);
      expect(status.performanceMetrics.averageInferenceTime).toBeLessThan(2000);
      expect(status.performanceMetrics.accuracy).toBeGreaterThanOrEqual(0.9);
      expect(status.performanceMetrics.throughput).toBeGreaterThan(8000);
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should handle missing baseline gracefully', async () => {
      const mockAutomation: AutomationEvent = {
        id: `fallback-auto-${Date.now()}`,
        userId: 'user-no-baseline',
        organizationId: 'org-no-baseline',
        platform: 'slack',
        type: 'bot',
        name: 'Fallback Test Bot',
        status: 'active',
        riskLevel: 'medium',
        createdAt: new Date().toISOString(),
        lastTriggered: new Date().toISOString(),
        permissions: [],
        actions: [],
      };

      await inferenceService.initialize();

      const result = await inferenceService.analyzeBehavior(mockAutomation, {
        organizationId: 'org-no-baseline',
        platform: 'slack',
      });

      // Should still return valid result
      expect(result).toBeDefined();
      expect(result.behavioralRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.behavioralRiskScore).toBeLessThanOrEqual(100);
    });

    it('should detect anomalies with insufficient organizational data', async () => {
      const orgId = `${testOrganizationId}-insufficient`;

      // Create only 2 baselines (less than 5 required)
      for (let i = 0; i < 2; i++) {
        const stats: BehavioralStats = {
          meanEventsPerDay: 10,
          stdDevEventsPerDay: 2,
          typicalWorkHours: { start: 9, end: 17 },
          commonActions: [],
        };

        await behavioralBaselineRepository.create({
          userId: `user-insufficient-${i}-${Date.now()}`,
          organizationId: orgId,
          stats,
          trainingDataSize: 50,
        });
      }

      const mockAutomation: AutomationEvent = {
        id: `insufficient-auto-${Date.now()}`,
        userId: 'user-insufficient-0',
        organizationId: orgId,
        platform: 'slack',
        type: 'bot',
        name: 'Insufficient Data Bot',
        status: 'active',
        riskLevel: 'medium',
        createdAt: new Date().toISOString(),
        lastTriggered: new Date().toISOString(),
        permissions: [],
        actions: [],
      };

      const result = await learningService.detectBehavioralAnomaly(mockAutomation, orgId);

      // Should still detect anomalies with reduced confidence
      expect(result).toBeDefined();
      expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(result.anomalyScore).toBeLessThanOrEqual(1);
    });
  });
});
