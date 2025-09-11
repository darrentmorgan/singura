import { 
  OffHoursDetector, 
  GoogleWorkspaceEvent, 
  ActivityTimeframe 
} from '@saas-xray/shared-types';
import { OffHoursDetectorService } from '../../../src/services/detection/off-hours-detector.service';

describe('OffHoursDetectorService', () => {
  let offHoursDetector: OffHoursDetectorService;

  beforeEach(() => {
    offHoursDetector = new OffHoursDetectorService();
  });

  const createMockEvent = (
    eventType: string, 
    timestamp: Date, 
    userId: string = 'test-user'
  ): GoogleWorkspaceEvent => ({
    eventId: `event_${Math.random()}`,
    timestamp,
    userId,
    userEmail: 'test@example.com',
    eventType,
    resourceId: `resource_${Math.random()}`,
    resourceType: 'file',
    actionDetails: {
      action: 'create',
      resourceName: 'test-resource',
      additionalMetadata: {}
    }
  });

  const standardBusinessHours: ActivityTimeframe['businessHours'] = {
    startHour: 9,  // 9 AM
    endHour: 17,   // 5 PM
    daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
  };

  describe('isBusinessHours', () => {
    it('should identify business hours correctly', () => {
      // Tuesday 2 PM UTC
      const businessTime = new Date('2025-01-07T14:00:00Z');
      const result = offHoursDetector.isBusinessHours(businessTime, 'UTC', standardBusinessHours);
      expect(result).toBe(true);
    });

    it('should identify off-hours correctly - evening', () => {
      // Tuesday 8 PM UTC
      const eveningTime = new Date('2025-01-07T20:00:00Z');
      const result = offHoursDetector.isBusinessHours(eveningTime, 'UTC', standardBusinessHours);
      expect(result).toBe(false);
    });

    it('should identify off-hours correctly - weekend', () => {
      // Saturday 2 PM UTC
      const weekendTime = new Date('2025-01-11T14:00:00Z');
      const result = offHoursDetector.isBusinessHours(weekendTime, 'UTC', standardBusinessHours);
      expect(result).toBe(false);
    });

    it('should identify off-hours correctly - early morning', () => {
      // Tuesday 6 AM UTC
      const earlyTime = new Date('2025-01-07T06:00:00Z');
      const result = offHoursDetector.isBusinessHours(earlyTime, 'UTC', standardBusinessHours);
      expect(result).toBe(false);
    });
  });

  describe('calculateOffHoursRisk', () => {
    it('should calculate off-hours percentage correctly', () => {
      const businessTime = new Date('2025-01-07T14:00:00Z'); // Tuesday 2 PM
      const offHoursTime = new Date('2025-01-07T22:00:00Z'); // Tuesday 10 PM

      const allEvents = [
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', offHoursTime),
        createMockEvent('file_create', offHoursTime),
        createMockEvent('file_create', offHoursTime)
      ];

      const offHoursEvents = [
        createMockEvent('file_create', offHoursTime),
        createMockEvent('file_create', offHoursTime),
        createMockEvent('file_create', offHoursTime)
      ];

      const riskPercentage = offHoursDetector.calculateOffHoursRisk(offHoursEvents, allEvents);
      expect(riskPercentage).toBe(60); // 3/5 = 60%
    });

    it('should handle zero total activity', () => {
      const riskPercentage = offHoursDetector.calculateOffHoursRisk([], []);
      expect(riskPercentage).toBe(0);
    });
  });

  describe('detectOffHoursActivity', () => {
    it('should detect high off-hours activity', () => {
      const businessTime = new Date('2025-01-07T14:00:00Z'); // Tuesday 2 PM
      const offHoursTime1 = new Date('2025-01-07T22:00:00Z'); // Tuesday 10 PM
      const offHoursTime2 = new Date('2025-01-07T23:00:00Z'); // Tuesday 11 PM
      const offHoursTime3 = new Date('2025-01-08T02:00:00Z'); // Wednesday 2 AM

      const events = [
        createMockEvent('file_create', businessTime, 'user1'),
        createMockEvent('file_create', businessTime, 'user1'),
        // High off-hours activity
        createMockEvent('file_create', offHoursTime1, 'user2'),
        createMockEvent('file_edit', offHoursTime2, 'user2'),
        createMockEvent('file_share', offHoursTime3, 'user2'),
        createMockEvent('permission_change', offHoursTime1, 'user2'),
        createMockEvent('script_execution', offHoursTime2, 'user2'),
        createMockEvent('file_create', offHoursTime3, 'user2'),
        createMockEvent('file_create', offHoursTime1, 'user2'),
        createMockEvent('file_create', offHoursTime2, 'user2')
      ];

      const patterns = offHoursDetector.detectOffHoursActivity(events, standardBusinessHours);
      expect(patterns.length).toBeGreaterThan(0);
      
      const pattern = patterns[0];
      expect(pattern.patternType).toBe('off_hours');
      expect(pattern.confidence).toBeGreaterThan(30);
      expect(pattern.evidence.description).toContain('off-hours activity detected');
    });

    it('should not detect off-hours activity below threshold', () => {
      const businessTime = new Date('2025-01-07T14:00:00Z'); // Tuesday 2 PM
      const offHoursTime = new Date('2025-01-07T22:00:00Z'); // Tuesday 10 PM

      const events = [
        // Mostly business hours activity
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        createMockEvent('file_create', businessTime),
        // Only small amount of off-hours activity
        createMockEvent('file_create', offHoursTime),
        createMockEvent('file_create', offHoursTime)
      ];

      const patterns = offHoursDetector.detectOffHoursActivity(events, standardBusinessHours);
      expect(patterns.length).toBe(0); // Should be below 30% threshold
    });

    it('should require minimum events for analysis', () => {
      const offHoursTime = new Date('2025-01-07T22:00:00Z'); // Tuesday 10 PM

      const events = [
        createMockEvent('file_create', offHoursTime),
        createMockEvent('file_create', offHoursTime)
      ]; // Only 2 events, below minimum threshold

      const patterns = offHoursDetector.detectOffHoursActivity(events, standardBusinessHours);
      expect(patterns.length).toBe(0);
    });
  });

  describe('getOffHoursThresholds', () => {
    it('should return valid thresholds', () => {
      const thresholds = offHoursDetector.getOffHoursThresholds();
      
      expect(thresholds.suspiciousActivityThreshold).toBeGreaterThan(0);
      expect(thresholds.criticalActivityThreshold).toBeGreaterThan(thresholds.suspiciousActivityThreshold);
      expect(thresholds.minimumEventsForAnalysis).toBeGreaterThan(0);
    });
  });

  describe('ChatGPT Integration Scenario Test', () => {
    it('should detect ChatGPT automation running overnight', () => {
      // Realistic scenario: ChatGPT integration running automated document processing overnight
      const baseTime = new Date('2025-01-07T00:00:00Z'); // Tuesday midnight

      const events = [
        // Some normal business hours activity
        createMockEvent('file_edit', new Date('2025-01-07T10:00:00Z'), 'user1'),
        createMockEvent('file_edit', new Date('2025-01-07T11:00:00Z'), 'user1'),
        createMockEvent('file_edit', new Date('2025-01-07T15:00:00Z'), 'user1'),
        
        // Suspicious overnight automation pattern
        createMockEvent('script_execution', new Date('2025-01-07T23:30:00Z'), 'chatgpt-integration'),
        createMockEvent('file_create', new Date('2025-01-07T23:35:00Z'), 'chatgpt-integration'),
        createMockEvent('file_edit', new Date('2025-01-07T23:40:00Z'), 'chatgpt-integration'),
        createMockEvent('file_create', new Date('2025-01-08T00:15:00Z'), 'chatgpt-integration'),
        createMockEvent('file_edit', new Date('2025-01-08T00:30:00Z'), 'chatgpt-integration'),
        createMockEvent('file_create', new Date('2025-01-08T01:00:00Z'), 'chatgpt-integration'),
        createMockEvent('script_execution', new Date('2025-01-08T01:30:00Z'), 'chatgpt-integration'),
        createMockEvent('file_create', new Date('2025-01-08T02:00:00Z'), 'chatgpt-integration'),
        createMockEvent('file_edit', new Date('2025-01-08T02:30:00Z'), 'chatgpt-integration'),
        createMockEvent('file_create', new Date('2025-01-08T03:00:00Z'), 'chatgpt-integration'),
        createMockEvent('script_execution', new Date('2025-01-08T03:30:00Z'), 'chatgpt-integration'),
        createMockEvent('file_create', new Date('2025-01-08T04:00:00Z'), 'chatgpt-integration')
      ];

      const patterns = offHoursDetector.detectOffHoursActivity(events, standardBusinessHours);
      expect(patterns.length).toBeGreaterThan(0);
      
      const automationPattern = patterns.find(p => p.metadata.userId === 'chatgpt-integration');
      expect(automationPattern).toBeDefined();
      expect(automationPattern!.confidence).toBeGreaterThan(70); // High confidence for overnight activity
      expect(automationPattern!.evidence.dataPoints.offHoursPercentage).toBeGreaterThan(60);
    });
  });
});