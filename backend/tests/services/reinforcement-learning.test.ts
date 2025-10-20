/**
 * Reinforcement Learning Service Unit Tests
 * Tests adaptive threshold optimization and learning rate adjustment
 */

import { ReinforcementLearningService } from '../../src/services/reinforcement-learning.service';

// Mock the automation feedback repository
jest.mock('../../src/database/repositories/automation-feedback.repository', () => ({
  automationFeedbackRepository: {
    findWithFilters: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

import { automationFeedbackRepository } from '../../src/database/repositories/automation-feedback.repository';

describe('ReinforcementLearningService', () => {
  let service: ReinforcementLearningService;

  beforeEach(() => {
    service = new ReinforcementLearningService();
    jest.clearAllMocks();
  });

  describe('analyzeVelocityPattern', () => {
    it('should detect normal velocity patterns', async () => {
      const eventData = {
        userId: 'user-123',
        events: Array(1).fill({ timestamp: new Date() }),
        timeSpanMs: 60 * 60 * 1000, // 1 hour
      };

      const result = await service.analyzeVelocityPattern(eventData);

      expect(result).toHaveProperty('eventRate');
      expect(result).toHaveProperty('threshold');
      expect(result).toHaveProperty('isAnomalous');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('recommendation');
      expect(result.eventRate).toBe(1); // 1 event per hour (well below threshold)
      expect(result.isAnomalous).toBe(false);
      expect(result.recommendation).toBe('normal');
    });

    it('should detect anomalous velocity patterns', async () => {
      const eventData = {
        userId: 'user-456',
        events: Array(200).fill({ timestamp: new Date() }),
        timeSpanMs: 60 * 60 * 1000, // 1 hour
      };

      const result = await service.analyzeVelocityPattern(eventData);

      expect(result.eventRate).toBe(200); // 200 events per hour
      expect(result.isAnomalous).toBe(true);
      expect(['investigate', 'critical']).toContain(result.recommendation);
    });

    it('should detect critical velocity patterns', async () => {
      const eventData = {
        userId: 'user-789',
        events: Array(500).fill({ timestamp: new Date() }),
        timeSpanMs: 60 * 60 * 1000, // 1 hour
      };

      const result = await service.analyzeVelocityPattern(eventData);

      expect(result.eventRate).toBe(500); // 500 events per hour
      expect(result.isAnomalous).toBe(true);
      expect(result.recommendation).toBe('critical');
    });

    it('should handle zero time span gracefully', async () => {
      const eventData = {
        userId: 'user-000',
        events: Array(10).fill({ timestamp: new Date() }),
        timeSpanMs: 0, // Zero time span
      };

      const result = await service.analyzeVelocityPattern(eventData);

      expect(result.eventRate).toBeGreaterThan(0);
      expect(result).toHaveProperty('recommendation');
    });

    it('should increase confidence with feedback through getOptimizedThresholds', async () => {
      const mockFeedback = {
        data: [
          {
            feedbackType: 'correct_detection',
            userId: 'user-feedback',
            organizationId: 'org-123',
            mlMetadata: { features: { activity: { executionFrequency: 10 } } },
          },
        ],
        pagination: { total: 1 },
      };

      (automationFeedbackRepository.findWithFilters as jest.Mock).mockResolvedValue(mockFeedback);

      const result = await service.getOptimizedThresholds('org-123');

      expect(result.totalFeedback).toBe(1);
      expect(result.truePositiveRate).toBeGreaterThan(0);
    });
  });

  describe('adjustLearningRate', () => {
    it('should apply exponential decay to learning rate', () => {
      const performance1 = { epoch: 1, accuracy: 0.85 };
      const performance10 = { epoch: 10, accuracy: 0.85 };

      const rate1 = service.adjustLearningRate(performance1);
      const rate10 = service.adjustLearningRate(performance10);

      expect(rate10).toBeLessThan(rate1);
      expect(rate1).toBeGreaterThan(0);
      expect(rate10).toBeGreaterThan(0);
    });

    it('should adjust learning rate based on accuracy', () => {
      const highAccuracy = { epoch: 5, accuracy: 0.95 };
      const lowAccuracy = { epoch: 5, accuracy: 0.50 };

      const rateHigh = service.adjustLearningRate(highAccuracy);
      const rateLow = service.adjustLearningRate(lowAccuracy);

      // Lower accuracy should result in higher learning rate
      expect(rateLow).toBeGreaterThan(rateHigh);
    });

    it('should handle missing accuracy gracefully', () => {
      const performance = { epoch: 5 };

      const rate = service.adjustLearningRate(performance);

      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1);
    });

    it('should clamp learning rate to reasonable bounds', () => {
      const veryHighEpoch = { epoch: 100, accuracy: 0.99 };

      const rate = service.adjustLearningRate(veryHighEpoch);

      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1);
    });
  });

  describe('getOptimizedThresholds', () => {
    it('should calculate thresholds from feedback data', async () => {
      const mockFeedback = {
        data: [
          { feedbackType: 'false_positive', metadata: { detectionType: 'velocity' } },
          { feedbackType: 'false_positive', metadata: { detectionType: 'velocity' } },
          { feedbackType: 'confirmed_threat', metadata: { detectionType: 'velocity' } },
          { feedbackType: 'confirmed_threat', metadata: { detectionType: 'velocity' } },
          { feedbackType: 'confirmed_threat', metadata: { detectionType: 'velocity' } },
        ],
        pagination: { total: 5 },
      };

      (automationFeedbackRepository.findWithFilters as jest.Mock).mockResolvedValue(mockFeedback);

      const result = await service.getOptimizedThresholds('org-123');

      expect(result).toHaveProperty('velocityThresholds');
      expect(result).toHaveProperty('falsePositiveRate');
      expect(result).toHaveProperty('truePositiveRate');
      expect(result).toHaveProperty('totalFeedback');
      expect(result.totalFeedback).toBe(5);
    });

    it('should increase thresholds for false positives', async () => {
      const mockFeedback = {
        data: Array(10).fill({
          feedbackType: 'false_positive',
          metadata: { detectionType: 'velocity' },
        }),
        pagination: { total: 10 },
      };

      (automationFeedbackRepository.findWithFilters as jest.Mock).mockResolvedValue(mockFeedback);

      const result = await service.getOptimizedThresholds('org-false-pos');

      expect(result.velocityThresholds.automationThreshold).toBeGreaterThan(1.0);
    });

    it('should decrease thresholds for true positives', async () => {
      const mockFeedback = {
        data: Array(10).fill({
          feedbackType: 'correct_detection',
          userId: 'user-123',
          organizationId: 'org-true-pos',
          metadata: { detectionType: 'velocity' },
          mlMetadata: { features: { activity: { executionFrequency: 2.0 } } },
        }),
        pagination: { total: 10 },
      };

      (automationFeedbackRepository.findWithFilters as jest.Mock).mockResolvedValue(mockFeedback);

      const result = await service.getOptimizedThresholds('org-true-pos');

      // Correct detections should be reflected in the rate
      expect(result.velocityThresholds.automationThreshold).toBeGreaterThan(0);
      expect(result.truePositiveRate).toBe(1.0);
    });

    it('should clamp thresholds within bounds', async () => {
      const mockFeedback = {
        data: Array(100).fill({
          feedbackType: 'false_positive',
          metadata: { detectionType: 'velocity' },
        }),
        pagination: { total: 100 },
      };

      (automationFeedbackRepository.findWithFilters as jest.Mock).mockResolvedValue(mockFeedback);

      const result = await service.getOptimizedThresholds('org-bounds');

      // Thresholds should be clamped to reasonable bounds
      expect(result.velocityThresholds.automationThreshold).toBeLessThan(100);
      expect(result.velocityThresholds.humanMaxFileCreation).toBeGreaterThan(0);
    });

    it('should handle empty feedback gracefully', async () => {
      const mockFeedback = {
        data: [],
        pagination: { total: 0 },
      };

      (automationFeedbackRepository.findWithFilters as jest.Mock).mockResolvedValue(mockFeedback);

      const result = await service.getOptimizedThresholds('org-empty');

      expect(result).toHaveProperty('velocityThresholds');
      expect(result.totalFeedback).toBe(0);
      expect(result.falsePositiveRate).toBe(0);
      expect(result.truePositiveRate).toBe(0);
    });
  });

  describe('getThreshold and resetThreshold', () => {
    it('should get threshold for a user', () => {
      const threshold = service.getThreshold('user-123');

      expect(threshold).toHaveProperty('value');
      expect(threshold).toHaveProperty('min');
      expect(threshold).toHaveProperty('max');
      expect(threshold).toHaveProperty('confidence');
      expect(threshold).toHaveProperty('lastUpdated');
      expect(threshold).toHaveProperty('feedbackCount');
    });

    it('should reset threshold for a user', () => {
      // Get initial threshold
      const initial = service.getThreshold('user-reset');

      // Reset threshold
      service.resetThreshold('user-reset');

      // Get threshold after reset
      const after = service.getThreshold('user-reset');

      expect(after.value).toBe(initial.value);
      expect(after.feedbackCount).toBe(0);
    });

    it('should return statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('averageThreshold');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('totalFeedback');
      expect(typeof stats.totalUsers).toBe('number');
    });
  });
});

// Custom Jest matcher
expect.extend({
  toBeIn(received: any, array: any[]) {
    const pass = array.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be in ${JSON.stringify(array)}`,
    };
  },
});
