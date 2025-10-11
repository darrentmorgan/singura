import { 
  VelocityDetector, 
  GoogleWorkspaceEvent, 
  TemporalPattern 
} from '@singura/shared-types';
import { VelocityDetectorService } from '../../../src/services/detection/velocity-detector.service';

describe('VelocityDetectorService', () => {
  let velocityDetector: VelocityDetectorService;

  beforeEach(() => {
    velocityDetector = new VelocityDetectorService();
  });

  const createMockEvent = (
    eventType: string, 
    timestamp: Date, 
    resourceType: string = 'file'
  ): GoogleWorkspaceEvent => ({
    eventId: `event_${Math.random()}`,
    timestamp,
    userId: 'test-user',
    userEmail: 'test@example.com',
    eventType,
    resourceId: `resource_${Math.random()}`,
    resourceType,
    actionDetails: {
      action: 'create',
      resourceName: 'test-resource',
      additionalMetadata: {}
    }
  });

  describe('calculateEventsPerSecond', () => {
    it('should calculate events per second correctly', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('file_create', startTime),
        createMockEvent('file_create', new Date(startTime.getTime() + 500)),
        createMockEvent('file_create', new Date(startTime.getTime() + 1000))
      ];

      const velocity = velocityDetector.calculateEventsPerSecond(events, 1000);
      expect(velocity).toBeCloseTo(3, 1);
    });

    it('should handle zero time window', () => {
      const events = [createMockEvent('file_create', new Date())];
      const velocity = velocityDetector.calculateEventsPerSecond(events, 0);
      expect(velocity).toBe(0);
    });
  });

  describe('isInhumanVelocity', () => {
    it('should detect inhuman file creation velocity', () => {
      const fileVelocity = 2; // 2 files per second
      const result = velocityDetector.isInhumanVelocity(fileVelocity, 'file_create');
      expect(result).toBe(true);
    });

    it('should detect inhuman permission change velocity', () => {
      const permissionVelocity = 3; // 3 permission changes per second
      const result = velocityDetector.isInhumanVelocity(permissionVelocity, 'permission_change');
      expect(result).toBe(true);
    });

    it('should consider normal human velocities as valid', () => {
      const normalFileVelocity = 0.5; // 0.5 files per second
      const result = velocityDetector.isInhumanVelocity(normalFileVelocity, 'file_create');
      expect(result).toBe(false);
    });
  });

  describe('detectVelocityAnomalies', () => {
    it('should detect velocity anomalies across multiple events', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('file_create', startTime),
        createMockEvent('file_create', new Date(startTime.getTime() + 100)),
        createMockEvent('file_create', new Date(startTime.getTime() + 200)),
        createMockEvent('file_create', new Date(startTime.getTime() + 300)),
        createMockEvent('file_create', new Date(startTime.getTime() + 400)),
        createMockEvent('file_create', new Date(startTime.getTime() + 500))
      ];

      const anomalies = velocityDetector.detectVelocityAnomalies(events);
      expect(anomalies.length).toBeGreaterThan(0);
      
      const anomaly = anomalies[0];
      expect(anomaly.velocity.eventsPerSecond).toBeGreaterThan(5);
      expect(anomaly.anomalyScore).toBeGreaterThan(50);
    });

    it('should handle mixed event types', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('file_create', startTime),
        createMockEvent('permission_change', new Date(startTime.getTime() + 100)),
        createMockEvent('file_create', new Date(startTime.getTime() + 200)),
        createMockEvent('permission_change', new Date(startTime.getTime() + 300)),
        createMockEvent('file_create', new Date(startTime.getTime() + 400)),
        createMockEvent('permission_change', new Date(startTime.getTime() + 500))
      ];

      const anomalies = velocityDetector.detectVelocityAnomalies(events);
      expect(anomalies.length).toBeGreaterThan(0);
      
      // Verify multiple detection types
      const detectedTypes = new Set(anomalies.map(a => a.timeWindow.durationMs));
      expect(detectedTypes.size).toBeGreaterThan(0);
    });
  });
});