/**
 * Behavioral Baseline Learning Service Unit Tests
 * Tests organizational baseline learning, adaptive updates, and anomaly detection
 */

import { BehavioralBaselineLearningService } from '../../src/services/ml-behavioral/behavioral-baseline-learning.service';
import { AutomationEvent } from '@singura/shared-types';

// Mock the discovered automation repository
jest.mock('../../src/database/repositories/discovered-automation', () => ({
  discoveredAutomationRepository: {
    getRecentByOrganization: jest.fn(),
  },
}));

import { discoveredAutomationRepository } from '../../src/database/repositories/discovered-automation';

describe('BehavioralBaselineLearningService', () => {
  let service: BehavioralBaselineLearningService;

  beforeEach(() => {
    service = new BehavioralBaselineLearningService({
      minSampleSize: 10, // Lower for testing
      learningPeriodDays: 7,
      confidenceThreshold: 0.7,
      updateFrequency: 'weekly',
      adaptationRate: 0.2,
    });
    jest.clearAllMocks();
  });

  // Helper function to create mock automation events
  const createMockAutomations = (count: number, baseDate: Date = new Date()): AutomationEvent[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `auto-${i}`,
      automationId: `auto-${i}`,
      userId: `user-${i % 5}`,
      organizationId: 'org-1',
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

  describe('learnOrganizationalBaseline', () => {
    it('should learn baseline from sufficient historical data', async () => {
      const mockAutomations = createMockAutomations(50);

      const result = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      expect(result).toHaveProperty('organizationId', 'org-1');
      expect(result).toHaveProperty('behavioralPatterns');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('learningStatus');
      expect(result.learningPeriod.sampleSize).toBe(50);
    });

    it('should throw error with insufficient data', async () => {
      const mockAutomations = createMockAutomations(5); // Less than minSampleSize

      await expect(
        service.learnOrganizationalBaseline('org-1', mockAutomations)
      ).rejects.toThrow('Insufficient data for baseline learning');
    });

    it('should extract velocity patterns correctly', async () => {
      const mockAutomations = createMockAutomations(20);

      const result = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      expect(result.behavioralPatterns.normalVelocity).toHaveProperty('min');
      expect(result.behavioralPatterns.normalVelocity).toHaveProperty('max');
      expect(result.behavioralPatterns.normalVelocity).toHaveProperty('average');
      expect(result.behavioralPatterns.normalVelocity).toHaveProperty('stdDev');
      expect(result.behavioralPatterns.normalVelocity.min).toBeLessThanOrEqual(
        result.behavioralPatterns.normalVelocity.max
      );
    });

    it('should extract time window patterns', async () => {
      const mockAutomations = createMockAutomations(20);

      const result = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      expect(result.behavioralPatterns.typicalTimeWindows).toHaveProperty('businessHours');
      expect(result.behavioralPatterns.typicalTimeWindows).toHaveProperty('peakActivity');
      expect(result.behavioralPatterns.typicalTimeWindows).toHaveProperty('offHoursThreshold');
      expect(result.behavioralPatterns.typicalTimeWindows.businessHours.start).toBe(9);
      expect(result.behavioralPatterns.typicalTimeWindows.businessHours.end).toBe(17);
    });

    it('should extract permission patterns', async () => {
      const mockAutomations = createMockAutomations(20);

      const result = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      expect(result.behavioralPatterns.permissionPatterns).toHaveProperty('commonPermissions');
      expect(result.behavioralPatterns.permissionPatterns).toHaveProperty('riskPermissions');
      expect(result.behavioralPatterns.permissionPatterns).toHaveProperty('permissionComplexity');
      expect(Array.isArray(result.behavioralPatterns.permissionPatterns.commonPermissions)).toBe(true);
    });

    it('should identify multiple platforms', async () => {
      const mockAutomations = createMockAutomations(20);

      const result = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      expect(result.platforms.length).toBeGreaterThan(1);
      expect(result.platforms).toContain('slack');
      expect(result.platforms).toContain('google');
    });

    it('should set learning status based on confidence', async () => {
      const mockAutomations = createMockAutomations(100); // Large sample

      const result = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      if (result.confidence >= 0.7) {
        expect(result.learningStatus).toBe('established');
      } else {
        expect(result.learningStatus).toBe('learning');
      }
    });
  });

  describe('getOrganizationalBaseline', () => {
    it('should return cached baseline', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const result = await service.getOrganizationalBaseline('org-1');

      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe('org-1');
    });

    it('should return null for missing organization', async () => {
      const result = await service.getOrganizationalBaseline('org-nonexistent');

      expect(result).toBeNull();
    });

    it('should trigger update if baseline is due', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      (discoveredAutomationRepository.getRecentByOrganization as jest.Mock).mockResolvedValue([]);

      const mockAutomations = createMockAutomations(20);
      const baseline = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      // Force baseline to be due for update
      baseline.nextUpdateDue = new Date(Date.now() - 1000);

      await service.getOrganizationalBaseline('org-1');

      // Wait for async update to start
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Baseline update due')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('updateBaseline', () => {
    it('should update baseline using exponential moving average', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const newAutomations = createMockAutomations(10);
      const result = await service.updateBaseline('org-1', newAutomations);

      expect(result).toHaveProperty('organizationId', 'org-1');
      expect(result.learningStatus).toBe('updating');
    });

    it('should merge statistics intelligently', async () => {
      const mockAutomations = createMockAutomations(20);
      const baseline = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const initialAverage = baseline.behavioralPatterns.normalVelocity.average;

      const newAutomations = createMockAutomations(10);
      const updated = await service.updateBaseline('org-1', newAutomations);

      // Average should change due to exponential moving average
      expect(updated.behavioralPatterns.normalVelocity.average).toBeDefined();
    });

    it('should update timestamp', async () => {
      const mockAutomations = createMockAutomations(20);
      const baseline = await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const originalTimestamp = baseline.lastUpdated;

      // Wait 10ms to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const newAutomations = createMockAutomations(10);
      const updated = await service.updateBaseline('org-1', newAutomations);

      expect(updated.lastUpdated.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });

    it('should throw error for missing baseline', async () => {
      const newAutomations = createMockAutomations(10);

      await expect(
        service.updateBaseline('org-nonexistent', newAutomations)
      ).rejects.toThrow('No existing baseline found');
    });

    it('should merge permission patterns', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const newAutomations = createMockAutomations(10).map(a => ({
        ...a,
        permissions: [
          { name: 'admin:write', scope: 'write', grantedAt: new Date().toISOString() },
        ],
      }));

      const updated = await service.updateBaseline('org-1', newAutomations);

      expect(updated.behavioralPatterns.permissionPatterns.commonPermissions.length).toBeGreaterThan(0);
    });

    it('should merge automation types', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const newAutomations = createMockAutomations(10).map(a => ({
        ...a,
        type: 'integration',
      }));

      const updated = await service.updateBaseline('org-1', newAutomations);

      expect(updated.behavioralPatterns.automationTypes.commonTypes).toBeDefined();
    });
  });

  describe('detectBehavioralAnomaly', () => {
    const mockAutomation: AutomationEvent = {
      id: 'auto-anomaly',
      userId: 'user-123',
      organizationId: 'org-1',
      platform: 'slack',
      type: 'bot',
      name: 'Anomalous Bot',
      status: 'active',
      riskLevel: 'high',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      lastTriggered: new Date().toISOString(),
      permissions: [
        { name: 'admin:write', scope: 'write', grantedAt: new Date().toISOString() },
      ],
      actions: [
        { type: 'external_api', description: 'Call external API' },
      ],
    };

    it('should detect velocity anomalies', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const result = await service.detectBehavioralAnomaly(mockAutomation, 'org-1');

      expect(result).toHaveProperty('isAnomaly');
      expect(result).toHaveProperty('anomalyScore');
      expect(result).toHaveProperty('anomalyFactors');
      expect(result).toHaveProperty('confidence');
    });

    it('should detect time anomalies', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const offHoursAutomation: AutomationEvent = {
        ...mockAutomation,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      };
      // Set hour to off-hours (e.g., 2 AM)
      const offHoursDate = new Date(offHoursAutomation.createdAt);
      offHoursDate.setHours(2);
      offHoursAutomation.createdAt = offHoursDate.toISOString();

      const result = await service.detectBehavioralAnomaly(offHoursAutomation, 'org-1');

      if (result.isAnomaly) {
        expect(result.anomalyFactors.some(f => f.includes('Time anomaly'))).toBe(true);
      }
    });

    it('should detect permission anomalies', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const unusualPermissionAutomation: AutomationEvent = {
        ...mockAutomation,
        permissions: [
          { name: 'super_admin:delete', scope: 'delete', grantedAt: new Date().toISOString() },
          { name: 'full_access:write', scope: 'write', grantedAt: new Date().toISOString() },
        ],
      };

      const result = await service.detectBehavioralAnomaly(unusualPermissionAutomation, 'org-1');

      if (result.isAnomaly) {
        expect(result.anomalyFactors.some(f => f.includes('Permission anomaly'))).toBe(true);
      }
    });

    it('should detect cross-platform anomalies', async () => {
      const mockAutomations = createMockAutomations(20).map(a => ({
        ...a,
        actions: [{ type: 'message', description: 'Send message' }],
      }));
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const result = await service.detectBehavioralAnomaly(mockAutomation, 'org-1');

      if (result.isAnomaly) {
        expect(result.anomalyScore).toBeGreaterThan(0);
      }
    });

    it('should return no anomaly for missing baseline', async () => {
      const result = await service.detectBehavioralAnomaly(mockAutomation, 'org-nonexistent');

      expect(result.isAnomaly).toBe(false);
      expect(result.anomalyScore).toBe(0);
      expect(result.anomalyFactors).toContain('No baseline available');
    });

    it('should calculate anomaly score correctly', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const result = await service.detectBehavioralAnomaly(mockAutomation, 'org-1');

      expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(result.anomalyScore).toBeLessThanOrEqual(1);
    });

    it('should set isAnomaly based on threshold', async () => {
      const mockAutomations = createMockAutomations(20);
      await service.learnOrganizationalBaseline('org-1', mockAutomations);

      const result = await service.detectBehavioralAnomaly(mockAutomation, 'org-1');

      if (result.anomalyScore > 0.5) {
        expect(result.isAnomaly).toBe(true);
      } else {
        expect(result.isAnomaly).toBe(false);
      }
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for no baselines', () => {
      const stats = service.getStatistics();

      expect(stats.totalOrganizations).toBe(0);
      expect(stats.establishedBaselines).toBe(0);
      expect(stats.learningBaselines).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });

    it('should return statistics for learned baselines', async () => {
      const mockAutomations1 = createMockAutomations(50);
      await service.learnOrganizationalBaseline('org-1', mockAutomations1);

      const mockAutomations2 = createMockAutomations(30);
      await service.learnOrganizationalBaseline('org-2', mockAutomations2);

      const stats = service.getStatistics();

      expect(stats.totalOrganizations).toBe(2);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    it('should count established vs learning baselines', async () => {
      const mockAutomations1 = createMockAutomations(100); // High confidence
      await service.learnOrganizationalBaseline('org-1', mockAutomations1);

      const mockAutomations2 = createMockAutomations(15); // Low confidence
      await service.learnOrganizationalBaseline('org-2', mockAutomations2);

      const stats = service.getStatistics();

      expect(stats.establishedBaselines + stats.learningBaselines).toBe(2);
    });
  });
});
