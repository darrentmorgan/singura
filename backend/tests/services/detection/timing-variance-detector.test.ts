import { TimingVarianceDetectorService } from '../../../src/services/detection/timing-variance-detector.service';
import { GoogleWorkspaceEvent } from '@singura/shared-types';

describe('TimingVarianceDetectorService', () => {
  let detector: TimingVarianceDetectorService;

  beforeEach(() => {
    detector = new TimingVarianceDetectorService();
  });

  const createEvent = (timestampMs: number, userId = 'user-1', eventType = 'file_create'): GoogleWorkspaceEvent => ({
    eventId: `evt-${timestampMs}`,
    timestamp: new Date(timestampMs),
    userId,
    userEmail: `${userId}@example.com`,
    eventType,
    resourceType: 'file',
    resourceId: `file-${timestampMs}`,
    actionDetails: {
      actionType: eventType,
      resourceName: 'test.txt',
      additionalMetadata: {}
    },
    userAgent: 'test-agent',
    ipAddress: '192.168.1.1',
    location: { city: 'Test', country: 'US' }
  });

  describe('detectSuspiciousTimingPatterns', () => {
    it('should detect bot-like metronomic timing (CV < 5%)', () => {
      const baseTime = Date.now();
      const events: GoogleWorkspaceEvent[] = [];

      // Create 10 events with exactly 1.1s intervals (bot behavior)
      for (let i = 0; i < 10; i++) {
        events.push(createEvent(baseTime + i * 1100));
      }

      const patterns = detector.detectSuspiciousTimingPatterns(events);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.patternType).toBe('regular_interval');
      expect(patterns[0]!.confidence).toBeGreaterThan(90); // Critical confidence
      expect(patterns[0]!.evidence.dataPoints.coefficientOfVariation).toBeLessThan(0.05);
    });

    it('should NOT detect human-like irregular timing (CV > 15%)', () => {
      const baseTime = Date.now();
      const intervals = [1200, 800, 2100, 1500, 900]; // Human variance
      const events: GoogleWorkspaceEvent[] = [];

      let currentTime = baseTime;
      for (const interval of intervals) {
        events.push(createEvent(currentTime));
        currentTime += interval;
      }

      const patterns = detector.detectSuspiciousTimingPatterns(events);

      expect(patterns).toHaveLength(0);
    });

    it('should require minimum 5 events for analysis', () => {
      const baseTime = Date.now();
      const events = [
        createEvent(baseTime),
        createEvent(baseTime + 1000),
        createEvent(baseTime + 2000)
      ];

      const patterns = detector.detectSuspiciousTimingPatterns(events);

      expect(patterns).toHaveLength(0);
    });

    it('should group by user and detect per-user patterns', () => {
      const baseTime = Date.now();
      const events: GoogleWorkspaceEvent[] = [];

      // User 1: Bot-like timing
      for (let i = 0; i < 6; i++) {
        events.push(createEvent(baseTime + i * 1000, 'bot-user'));
      }

      // User 2: Human-like timing
      for (let i = 0; i < 6; i++) {
        events.push(createEvent(baseTime + i * (1000 + Math.random() * 500), 'human-user'));
      }

      const patterns = detector.detectSuspiciousTimingPatterns(events);

      expect(patterns.length).toBeGreaterThanOrEqual(1);
      expect(patterns[0]!.metadata.userId).toBe('bot-user');
    });

    it('should ignore large gaps (> 10 seconds) in timing analysis', () => {
      const baseTime = Date.now();
      const events = [
        createEvent(baseTime),
        createEvent(baseTime + 1000),
        createEvent(baseTime + 2000),
        createEvent(baseTime + 20000), // 20s gap - should be ignored
        createEvent(baseTime + 21000)
      ];

      const patterns = detector.detectSuspiciousTimingPatterns(events);

      // Should not be flagged as suspicious due to gap handling
      expect(patterns).toHaveLength(0);
    });

    it('should apply action type weighting', () => {
      const baseTime = Date.now();

      // Permission changes are weighted higher (1.25x)
      const permissionEvents: GoogleWorkspaceEvent[] = [];
      for (let i = 0; i < 6; i++) {
        permissionEvents.push(createEvent(baseTime + i * 1100, 'user-1', 'permission_change'));
      }

      const patterns = detector.detectSuspiciousTimingPatterns(permissionEvents);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.confidence).toBeGreaterThan(85);
    });
  });

  describe('getTimingThresholds', () => {
    it('should return correct default thresholds', () => {
      const thresholds = detector.getTimingThresholds();

      expect(thresholds.minimumEventsForAnalysis).toBe(5);
      expect(thresholds.maxIntervalMs).toBe(10000);
      expect(thresholds.suspiciousCVThreshold).toBe(0.15);
      expect(thresholds.criticalCVThreshold).toBe(0.05);
    });
  });
});
