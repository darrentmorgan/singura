/**
 * WebSocket Message Schema Tests
 * Validates Zod schemas for Socket.io messages
 */

import {
  validateWebSocketMessage,
  parseWebSocketMessage,
  isWebSocketMessage,
  ConnectionUpdatePayloadSchema,
  DiscoveryProgressPayloadSchema,
  AutomationDiscoveredPayloadSchema,
  SystemNotificationPayloadSchema,
} from '../websocket';

describe('WebSocket Message Validation', () => {
  describe('Connection Update Message', () => {
    it('should validate valid connection update message', () => {
      const validMessage = {
        type: 'connection:update',
        payload: {
          connectionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'connected',
          platform: 'slack',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(validMessage);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMessage);
    });

    it('should reject connection update with invalid UUID', () => {
      const invalidMessage = {
        type: 'connection:update',
        payload: {
          connectionId: 'invalid-uuid',
          status: 'connected',
          platform: 'slack',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('connectionId');
    });

    it('should reject connection update with invalid status', () => {
      const invalidMessage = {
        type: 'connection:update',
        payload: {
          connectionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'invalid-status',
          platform: 'slack',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('status');
    });

    it('should allow optional error field', () => {
      const messageWithError = {
        type: 'connection:update',
        payload: {
          connectionId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'error',
          platform: 'google',
          timestamp: '2025-10-28T12:00:00Z',
          error: 'Authentication failed',
        },
      };

      const result = validateWebSocketMessage(messageWithError);
      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('connection:update');
      if (result.data?.type === 'connection:update') {
        expect(result.data.payload.error).toBe('Authentication failed');
      }
    });
  });

  describe('Discovery Progress Message', () => {
    it('should validate valid discovery progress message', () => {
      const validMessage = {
        type: 'discovery:progress',
        payload: {
          connectionId: '123e4567-e89b-12d3-a456-426614174000',
          progress: 75,
          status: 'in_progress',
          itemsFound: 42,
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject progress outside 0-100 range', () => {
      const invalidMessage = {
        type: 'discovery:progress',
        payload: {
          connectionId: '123e4567-e89b-12d3-a456-426614174000',
          progress: 150,
          status: 'in_progress',
          itemsFound: 42,
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('progress');
    });

    it('should reject negative itemsFound', () => {
      const invalidMessage = {
        type: 'discovery:progress',
        payload: {
          connectionId: '123e4567-e89b-12d3-a456-426614174000',
          progress: 50,
          status: 'in_progress',
          itemsFound: -5,
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('itemsFound');
    });

    it('should allow optional stage and message fields', () => {
      const messageWithOptional = {
        type: 'discovery:progress',
        payload: {
          connectionId: '123e4567-e89b-12d3-a456-426614174000',
          progress: 50,
          status: 'in_progress',
          itemsFound: 42,
          timestamp: '2025-10-28T12:00:00Z',
          stage: 'analyzing',
          message: 'Analyzing audit logs...',
        },
      };

      const result = validateWebSocketMessage(messageWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('Automation Discovered Message', () => {
    it('should validate valid automation discovered message', () => {
      const validMessage = {
        type: 'automation:discovered',
        payload: {
          automationId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'ChatGPT Integration',
          platform: 'google',
          riskLevel: 'high',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject invalid risk level', () => {
      const invalidMessage = {
        type: 'automation:discovered',
        payload: {
          automationId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'ChatGPT Integration',
          platform: 'google',
          riskLevel: 'super-high',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('riskLevel');
    });

    it('should allow optional riskScore and type fields', () => {
      const messageWithOptional = {
        type: 'automation:discovered',
        payload: {
          automationId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'ChatGPT Integration',
          platform: 'google',
          riskLevel: 'high',
          timestamp: '2025-10-28T12:00:00Z',
          riskScore: 85,
          type: 'integration',
        },
      };

      const result = validateWebSocketMessage(messageWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('System Notification Message', () => {
    it('should validate valid system notification message', () => {
      const validMessage = {
        type: 'system:notification',
        payload: {
          level: 'info',
          message: 'System maintenance scheduled',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject invalid notification level', () => {
      const invalidMessage = {
        type: 'system:notification',
        payload: {
          level: 'critical',
          message: 'System maintenance scheduled',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('level');
    });

    it('should allow optional title and details fields', () => {
      const messageWithOptional = {
        type: 'system:notification',
        payload: {
          level: 'warning',
          message: 'High memory usage detected',
          timestamp: '2025-10-28T12:00:00Z',
          title: 'System Warning',
          details: {
            memoryUsage: '95%',
            threshold: '90%',
          },
        },
      };

      const result = validateWebSocketMessage(messageWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Helper Functions', () => {
    it('parseWebSocketMessage should return null for invalid messages', () => {
      const invalidMessage = {
        type: 'invalid:type',
        payload: {},
      };

      const result = parseWebSocketMessage(invalidMessage);
      expect(result).toBeNull();
    });

    it('parseWebSocketMessage should return parsed message for valid messages', () => {
      const validMessage = {
        type: 'system:notification',
        payload: {
          level: 'info',
          message: 'Test message',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = parseWebSocketMessage(validMessage);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('system:notification');
    });

    it('isWebSocketMessage should return false for invalid messages', () => {
      const invalidMessage = {
        type: 'invalid:type',
        payload: {},
      };

      expect(isWebSocketMessage(invalidMessage)).toBe(false);
    });

    it('isWebSocketMessage should return true for valid messages', () => {
      const validMessage = {
        type: 'system:notification',
        payload: {
          level: 'info',
          message: 'Test message',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      expect(isWebSocketMessage(validMessage)).toBe(true);
    });
  });

  describe('Malformed Data Handling', () => {
    it('should reject completely malformed data', () => {
      const malformedData = 'not an object';

      const result = validateWebSocketMessage(malformedData);
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = validateWebSocketMessage(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined', () => {
      const result = validateWebSocketMessage(undefined);
      expect(result.success).toBe(false);
    });

    it('should reject messages with missing type field', () => {
      const invalidMessage = {
        payload: {
          level: 'info',
          message: 'Test message',
          timestamp: '2025-10-28T12:00:00Z',
        },
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject messages with missing payload field', () => {
      const invalidMessage = {
        type: 'system:notification',
      };

      const result = validateWebSocketMessage(invalidMessage);
      expect(result.success).toBe(false);
    });
  });
});
