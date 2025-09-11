import { 
  BatchOperationDetector, 
  GoogleWorkspaceEvent 
} from '@saas-xray/shared-types';
import { BatchOperationDetectorService } from '../../../src/services/detection/batch-operation-detector.service';

describe('BatchOperationDetectorService', () => {
  let batchDetector: BatchOperationDetectorService;

  beforeEach(() => {
    batchDetector = new BatchOperationDetectorService();
  });

  const createMockEvent = (
    eventType: string, 
    timestamp: Date, 
    resourceName: string,
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
      resourceName,
      additionalMetadata: {}
    }
  });

  describe('detectBatchOperations', () => {
    it('should detect batch file creation', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('file_create', startTime, 'report_001.pdf'),
        createMockEvent('file_create', new Date(startTime.getTime() + 1000), 'report_002.pdf'),
        createMockEvent('file_create', new Date(startTime.getTime() + 2000), 'report_003.pdf')
      ];

      const batchOperations = batchDetector.detectBatchOperations(events);
      expect(batchOperations.length).toBeGreaterThan(0);
      
      const batchOperation = batchOperations[0];
      expect(batchOperation.metadata.actionType).toBe('file_create');
      expect(batchOperation.evidence.dataPoints.eventCount).toBe(3);
    });

    it('should detect batch operations across different users', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('file_share', startTime, 'document_001.pdf', 'user1'),
        createMockEvent('file_share', new Date(startTime.getTime() + 1000), 'document_002.pdf', 'user1'),
        createMockEvent('file_share', new Date(startTime.getTime() + 2000), 'document_003.pdf', 'user1'),
        createMockEvent('file_share', new Date(startTime.getTime() + 3000), 'document_001.pdf', 'user2'),
        createMockEvent('file_share', new Date(startTime.getTime() + 4000), 'document_002.pdf', 'user2')
      ];

      const batchOperations = batchDetector.detectBatchOperations(events);
      expect(batchOperations.length).toBeGreaterThan(0);
      
      // Verify multiple user batch sharing
      const batchOperation = batchOperations[0];
      expect(batchOperation.metadata.actionType).toBe('file_share');
      expect(batchOperation.evidence.dataPoints.eventCount).toBeGreaterThan(2);
    });

    it('should not detect batch for events too far apart', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('permission_change', startTime, 'doc1'),
        createMockEvent('permission_change', new Date(startTime.getTime() + 60000), 'doc2') // 1 minute apart
      ];

      const batchOperations = batchDetector.detectBatchOperations(events);
      expect(batchOperations.length).toBe(0);
    });
  });

  describe('identifySimilarActions', () => {
    it('should group similar events by naming pattern', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('file_create', startTime, 'report_001.pdf'),
        createMockEvent('file_create', new Date(startTime.getTime() + 1000), 'report_002.pdf'),
        createMockEvent('file_create', new Date(startTime.getTime() + 2000), 'report_003.pdf')
      ];

      const similarGroups = batchDetector.identifySimilarActions(events);
      expect(similarGroups.length).toBeGreaterThan(0);
      
      const group = similarGroups[0];
      expect(group.events.length).toBe(3);
      expect(group.similarity.namingPattern).toBe(true);
    });
  });

  describe('calculateBatchLikelihood', () => {
    it('should calculate batch likelihood based on similarity', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const events = [
        createMockEvent('file_create', startTime, 'report_001.pdf'),
        createMockEvent('file_create', new Date(startTime.getTime() + 1000), 'report_002.pdf'),
        createMockEvent('file_create', new Date(startTime.getTime() + 2000), 'report_003.pdf')
      ];

      const batchGroup = batchDetector.identifySimilarActions(events)[0];
      const likelihood = batchDetector.calculateBatchLikelihood(batchGroup);
      
      expect(likelihood).toBeGreaterThan(0.7);
    });
  });
});