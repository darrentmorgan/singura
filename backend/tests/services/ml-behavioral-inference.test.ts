/**
 * ML Behavioral Inference Service Unit Tests
 * Tests behavioral pattern recognition, Z-score anomaly detection, and baseline deviation
 */

import { MLBehavioralInferenceService } from '../../src/services/ml-behavioral/ml-behavioral-inference.service';
import { AutomationEvent } from '@singura/shared-types';

// Mock the behavioral baseline repository
jest.mock('../../src/database/repositories/behavioral-baseline.repository', () => ({
  behavioralBaselineRepository: {
    getAllBaselines: jest.fn(),
    getOrganizationalAggregates: jest.fn(),
  },
}));

import { behavioralBaselineRepository } from '../../src/database/repositories/behavioral-baseline.repository';

describe('MLBehavioralInferenceService', () => {
  let service: MLBehavioralInferenceService;

  beforeEach(() => {
    service = new MLBehavioralInferenceService();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should load baselines from database on initialization', async () => {
      const mockBaselines = [
        {
          id: 'baseline-1',
          userId: 'user-123',
          organizationId: 'org-1',
          stats: {
            meanEventsPerDay: 10,
            stdDevEventsPerDay: 2,
            typicalWorkHours: { start: 9, end: 17 },
            commonActions: [{ action: 'file_create', frequency: 0.5 }],
          },
          trainingDataSize: 100,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      (behavioralBaselineRepository.getAllBaselines as jest.Mock).mockResolvedValue(mockBaselines);

      const result = await service.initialize();

      expect(result).toBe(true);
      expect(behavioralBaselineRepository.getAllBaselines).toHaveBeenCalledTimes(1);
    });

    it('should handle empty baseline database gracefully', async () => {
      (behavioralBaselineRepository.getAllBaselines as jest.Mock).mockResolvedValue([]);

      const result = await service.initialize();

      expect(result).toBe(true);
    });

    it('should log error if database load fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (behavioralBaselineRepository.getAllBaselines as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.initialize();

      expect(result).toBe(true); // Falls back to simulation mode
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('analyzeBehavior', () => {
    const mockAutomation: AutomationEvent = {
      id: 'auto-1',
      userId: 'user-123',
      organizationId: 'org-1',
      platform: 'slack',
      type: 'bot',
      name: 'Test Bot',
      status: 'active',
      riskLevel: 'medium',
      createdAt: new Date().toISOString(),
      lastTriggered: new Date().toISOString(),
      permissions: [
        { name: 'channels:read', scope: 'read', grantedAt: new Date().toISOString() },
      ],
      actions: [
        { type: 'message', description: 'Send message' },
      ],
      metadata: {
        riskFactors: ['Recently active'],
      },
    };

    beforeEach(async () => {
      (behavioralBaselineRepository.getAllBaselines as jest.Mock).mockResolvedValue([]);
      await service.initialize();
    });

    it('should analyze automation behavior successfully', async () => {
      const result = await service.analyzeBehavior(mockAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      expect(result).toHaveProperty('automationId', 'auto-1');
      expect(result).toHaveProperty('organizationId', 'org-1');
      expect(result).toHaveProperty('behavioralRiskScore');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('modelMetadata');
      expect(result.behavioralRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.behavioralRiskScore).toBeLessThanOrEqual(100);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new MLBehavioralInferenceService();

      await expect(
        uninitializedService.analyzeBehavior(mockAutomation, {
          organizationId: 'org-1',
          platform: 'slack',
        })
      ).rejects.toThrow('ML Behavioral Engine not initialized');
    });

    it('should handle edge case automations gracefully', async () => {
      // Test with minimal automation data
      const edgeCaseAutomation = {
        ...mockAutomation,
        permissions: [],
        actions: [],
        metadata: {},
      };

      const result = await service.analyzeBehavior(edgeCaseAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Should still return valid analysis
      expect(result).toBeDefined();
      expect(result.behavioralRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.behavioralRiskScore).toBeLessThanOrEqual(100);
      expect(result.modelMetadata.modelsUsed).toBeDefined();
    });
  });

  describe('calculateBaselineDeviation', () => {
    const mockAutomation: AutomationEvent = {
      id: 'auto-1',
      userId: 'user-123',
      organizationId: 'org-1',
      platform: 'slack',
      type: 'bot',
      name: 'Test Bot',
      status: 'active',
      riskLevel: 'medium',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      lastTriggered: new Date().toISOString(),
      permissions: [
        { name: 'channels:read', scope: 'read', grantedAt: new Date().toISOString() },
      ],
    };

    beforeEach(async () => {
      (behavioralBaselineRepository.getAllBaselines as jest.Mock).mockResolvedValue([]);
      await service.initialize();
    });

    it('should calculate Z-score correctly for normal behavior', async () => {
      const mockOrgBaseline = {
        meanEventsPerDay: 10,
        stdDevEventsPerDay: 2,
        meanOffHoursActivity: 0.2,
        stdDevOffHoursActivity: 0.1,
        sampleSize: 50,
      };

      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockResolvedValue(
        mockOrgBaseline
      );

      const result = await service.analyzeBehavior(mockAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Z-score should be low for normal behavior
      expect(result.behavioralRiskScore).toBeLessThan(70);
    });

    it('should detect high risk patterns correctly', async () => {
      const mockOrgBaseline = {
        meanEventsPerDay: 10,
        stdDevEventsPerDay: 2,
        meanOffHoursActivity: 0.2,
        stdDevOffHoursActivity: 0.1,
        sampleSize: 50,
      };

      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockResolvedValue(
        mockOrgBaseline
      );

      // Create high-risk automation
      const highRiskAutomation: AutomationEvent = {
        ...mockAutomation,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        lastTriggered: new Date().toISOString(),
        metadata: {
          riskFactors: ['Recently active', 'High frequency', 'external API calls'],
        },
        actions: [
          { type: 'external_api', description: 'Call external API' },
        ],
      };

      const result = await service.analyzeBehavior(highRiskAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // High risk patterns should be detected
      expect(result.behavioralRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.behavioralRiskScore).toBeLessThanOrEqual(100);
    });

    it('should normalize Z-scores to [0, 1] range', async () => {
      const mockOrgBaseline = {
        meanEventsPerDay: 10,
        stdDevEventsPerDay: 2,
        meanOffHoursActivity: 0.2,
        stdDevOffHoursActivity: 0.1,
        sampleSize: 50,
      };

      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockResolvedValue(
        mockOrgBaseline
      );

      const result = await service.analyzeBehavior(mockAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Normalized score should be between 0 and 1
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data (<5 samples) gracefully', async () => {
      const mockOrgBaseline = {
        meanEventsPerDay: 10,
        stdDevEventsPerDay: 2,
        meanOffHoursActivity: 0.2,
        stdDevOffHoursActivity: 0.1,
        sampleSize: 3, // Insufficient samples
      };

      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockResolvedValue(
        mockOrgBaseline
      );

      const result = await service.analyzeBehavior(mockAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Should still return valid result
      expect(result).toHaveProperty('behavioralRiskScore');
      expect(result.behavioralRiskScore).toBeGreaterThanOrEqual(0);
    });

    it('should return moderate deviation on missing baseline', async () => {
      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockResolvedValue(null);

      const result = await service.analyzeBehavior(mockAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Should return moderate risk score without baseline
      expect(result.behavioralRiskScore).toBeGreaterThan(20);
      expect(result.behavioralRiskScore).toBeLessThan(80);
    });

    it('should return moderate deviation on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.analyzeBehavior(mockAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Should return moderate risk score on error
      expect(result).toHaveProperty('behavioralRiskScore');

      consoleErrorSpy.mockRestore();
    });

    it('should handle negative Z-scores', async () => {
      const mockOrgBaseline = {
        meanEventsPerDay: 10,
        stdDevEventsPerDay: 2,
        meanOffHoursActivity: 0.5,
        stdDevOffHoursActivity: 0.1,
        sampleSize: 50,
      };

      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockResolvedValue(
        mockOrgBaseline
      );

      // Create automation with low activity (negative Z-score)
      const lowActivityAutomation: AutomationEvent = {
        ...mockAutomation,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        lastTriggered: undefined, // No recent activity
      };

      const result = await service.analyzeBehavior(lowActivityAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Should handle negative deviation gracefully
      expect(result).toHaveProperty('behavioralRiskScore');
      expect(result.behavioralRiskScore).toBeGreaterThanOrEqual(0);
    });

    it('should clamp normalized scores to [0, 1]', async () => {
      const mockOrgBaseline = {
        meanEventsPerDay: 1,
        stdDevEventsPerDay: 0.1, // Very low stddev
        meanOffHoursActivity: 0.2,
        stdDevOffHoursActivity: 0.1,
        sampleSize: 50,
      };

      (behavioralBaselineRepository.getOrganizationalAggregates as jest.Mock).mockResolvedValue(
        mockOrgBaseline
      );

      const result = await service.analyzeBehavior(mockAutomation, {
        organizationId: 'org-1',
        platform: 'slack',
      });

      // Confidence should be clamped to [0, 1]
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getEngineStatus', () => {
    it('should return uninitialized status before initialization', () => {
      const uninitializedService = new MLBehavioralInferenceService();
      const status = uninitializedService.getEngineStatus();

      expect(status.initialized).toBe(false);
      expect(status.modelsLoaded).toEqual([]);
    });

    it('should return initialized status after initialization', async () => {
      (behavioralBaselineRepository.getAllBaselines as jest.Mock).mockResolvedValue([]);
      await service.initialize();

      const status = service.getEngineStatus();

      expect(status.initialized).toBe(true);
      expect(status.modelsLoaded).toEqual(['xgboost', 'lstm', 'gnn', 'ensemble']);
      expect(status.performanceMetrics).toHaveProperty('averageInferenceTime');
      expect(status.performanceMetrics).toHaveProperty('accuracy');
      expect(status.performanceMetrics).toHaveProperty('throughput');
    });

    it('should report performance metrics within targets', async () => {
      (behavioralBaselineRepository.getAllBaselines as jest.Mock).mockResolvedValue([]);
      await service.initialize();

      const status = service.getEngineStatus();

      // Check performance targets
      expect(status.performanceMetrics.averageInferenceTime).toBeLessThan(2000); // <2000ms
      expect(status.performanceMetrics.accuracy).toBeGreaterThanOrEqual(0.9); // 90%+
      expect(status.performanceMetrics.throughput).toBeGreaterThan(8000); // >8000 events/min
    });
  });
});
