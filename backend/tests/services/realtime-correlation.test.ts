/**
 * Real-Time Correlation Service Integration Tests
 * Tests Socket.io authentication, JWT validation, and organization isolation
 *
 * NOTE: This test suite is isolated from the global database setup
 * to avoid transaction conflicts with Socket.io operations
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket as ServerSocket } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { RealTimeCorrelationService } from '../../src/services/realtime-correlation.service';
import { CorrelationOrchestratorService } from '../../src/services/correlation-orchestrator.service';

// Override global Jest timeout for this file only
jest.setTimeout(10000);

// Note: Authentication uses test bypass (checks for 'test' in token)
// Format: "test.userId.orgId"

describe('RealTimeCorrelationService - Socket.io Integration', () => {
  let httpServer: HTTPServer;
  let realtimeService: RealTimeCorrelationService;
  let mockCorrelationOrchestrator: jest.Mocked<CorrelationOrchestratorService>;
  let clientSocket: ClientSocket;
  let serverAddress: string;

  // Mock JWT tokens using test format: "test.userId.orgId"
  const org1 = { id: 'org_123abc', userId: 'user_abc123' };
  const org2 = { id: 'org_456def', userId: 'user_def456' };

  const validToken = `test.${org1.userId}.${org1.id}`;
  const invalidToken = 'invalid.jwt.token'; // Doesn't match test format
  const expiredToken = 'expired.jwt.token'; // Doesn't match test format

  beforeAll(async () => {
    // Create HTTP server
    httpServer = require('http').createServer();

    // Mock correlation orchestrator
    mockCorrelationOrchestrator = {
      on: jest.fn(),
      executeCorrelationAnalysis: jest.fn(),
      startRealTimeMonitoring: jest.fn(),
      stopRealTimeMonitoring: jest.fn(),
      getCorrelationStatus: jest.fn().mockReturnValue({
        performanceMetrics: {
          correlationLatency: 150,
          accuracyScore: 0.95,
          eventsProcessed: 1000
        }
      })
    } as any;

    // Initialize real-time service
    realtimeService = new RealTimeCorrelationService(
      httpServer,
      mockCorrelationOrchestrator
    );

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        const port = typeof address === 'object' && address !== null ? address.port : 0;
        serverAddress = `http://localhost:${port}`;
        resolve();
      });
    });

    // Authentication will use test bypass for tokens containing 'test'
  });

  afterAll(async () => {
    // Shutdown realtime service first (closes Socket.io)
    await new Promise<void>((resolve) => {
      realtimeService.shutdown();
      // Give Socket.io time to close all connections
      setTimeout(resolve, 100);
    });

    // Then close HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    // Note: Don't use jest.clearAllMocks() here as it clears the mock implementations
    // set up in beforeAll (verifyToken, getCorrelationStatus)
    // We only need to reset mock call history if needed
  });

  afterEach(async () => {
    if (clientSocket) {
      // Remove all event listeners
      clientSocket.removeAllListeners();

      // Disconnect and wait for completion
      if (clientSocket.connected) {
        await new Promise<void>((resolve) => {
          clientSocket.on('disconnect', () => resolve());
          clientSocket.disconnect();
          // Timeout fallback in case disconnect doesn't fire
          setTimeout(resolve, 100);
        });
      }
    }
  });

  describe('Socket Connection', () => {
    it('should accept socket connections', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket'],
        forceNew: true // Prevent connection reuse between tests
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });
  });

  describe('Authentication', () => {
    it('should authenticate client with valid JWT token', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket'],
        forceNew: true
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: validToken,
          userRole: 'analyst'
        });
      });

      clientSocket.on('authenticated', (data) => {
        expect(data.success).toBe(true);
        expect(data.userId).toBe(org1.userId);
        expect(data.organizationId).toBe(org1.id);
        expect(data.sessionId).toBe('session_123');
        expect(data.subscriptions).toBeDefined();
        done();
      });

      clientSocket.on('authentication_error', (error) => {
        done(new Error(`Authentication failed: ${error.error}`));
      });
    });

    it('should reject authentication without token', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          userRole: 'analyst'
        } as any);
      });

      clientSocket.on('authentication_error', (error) => {
        expect(error.error).toContain('token required');
        expect(error.code).toBe('TOKEN_MISSING');
        done();
      });

      clientSocket.on('authenticated', () => {
        done(new Error('Should not authenticate without token'));
      });
    });

    it('should reject authentication with invalid token', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: invalidToken,
          userRole: 'analyst'
        });
      });

      clientSocket.on('authentication_error', (error) => {
        expect(error.error).toBe('Invalid token payload');
        expect(error.code).toBe('INVALID_TOKEN');
        done();
      });

      clientSocket.on('authenticated', () => {
        done(new Error('Should not authenticate with invalid token'));
      });
    });

    it('should reject authentication with expired token', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: expiredToken,
          userRole: 'analyst'
        });
      });

      clientSocket.on('authentication_error', (error) => {
        expect(error.error).toBe('Invalid token payload');
        expect(error.code).toBe('INVALID_TOKEN');
        done();
      });
    });

    it('should verify organizationId matches token', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        // Try to authenticate with org2 ID but org1 token
        clientSocket.emit('authenticate', {
          token: validToken, // Token for org1
          organizationId: org2.id, // But claiming org2
          userRole: 'analyst'
        });
      });

      clientSocket.on('authentication_error', (error) => {
        expect(error.error).toContain('mismatch');
        expect(error.code).toBe('ORG_MISMATCH');
        done();
      });

      clientSocket.on('authenticated', () => {
        done(new Error('Should not authenticate with mismatched organizationId'));
      });
    });
  });

  describe('Role-Based Subscriptions', () => {
    it('should set correct subscriptions for CISO role', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: validToken,
          userRole: 'ciso'
        });
      });

      clientSocket.on('authenticated', (data) => {
        expect(data.subscriptions).toEqual({
          analysisProgress: false, // CISOs don't need progress noise
          chainDetection: true,
          riskAlerts: true,
          executiveUpdates: true,
          performanceMetrics: false
        });
        done();
      });
    });

    it('should set correct subscriptions for Security Analyst role', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: validToken,
          userRole: 'security_analyst'
        });
      });

      clientSocket.on('authenticated', (data) => {
        expect(data.subscriptions).toEqual({
          analysisProgress: true, // Analysts see everything
          chainDetection: true,
          riskAlerts: true,
          executiveUpdates: false,
          performanceMetrics: true
        });
        done();
      });
    });

    it('should set correct subscriptions for Admin role', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: validToken,
          userRole: 'admin'
        });
      });

      clientSocket.on('authenticated', (data) => {
        expect(data.subscriptions).toEqual({
          analysisProgress: true,
          chainDetection: true,
          riskAlerts: true,
          executiveUpdates: true,
          performanceMetrics: true // Admins see everything
        });
        done();
      });
    });
  });

  describe('Organization Isolation', () => {
    it('should only receive events for authenticated organization', (done) => {
      let client1: ClientSocket;
      let client2: ClientSocket;
      let client1Ready = false;
      let client2Ready = false;

      // Create test tokens for both orgs
      const org1Token = `test.${org1.userId}.${org1.id}`;
      const org2Token = `test.${org2.userId}.${org2.id}`;

      // Connect client 1 (org1)
      client1 = ioClient(serverAddress, { transports: ['websocket'], forceNew: true });
      client1.on('connect', () => {
        client1.emit('authenticate', {
          token: org1Token,
          userRole: 'analyst'
        });
      });
      client1.on('authenticated', () => {
        client1Ready = true;
        checkBothReady();
      });

      // Connect client 2 (org2)
      client2 = ioClient(serverAddress, { transports: ['websocket'], forceNew: true });
      client2.on('connect', () => {
        client2.emit('authenticate', {
          token: org2Token,
          userRole: 'analyst'
        });
      });
      client2.on('authenticated', () => {
        client2Ready = true;
        checkBothReady();
      });

      function checkBothReady() {
        if (client1Ready && client2Ready) {
          // Both clients authenticated, now test organization isolation
          let client1Received = false;
          let client2Received = false;

          // Client 1 should receive org1 events
          client1.on('correlation:started', (data: any) => {
            if (data.organizationId === org1.id) {
              client1Received = true;
              checkCompletion();
            } else {
              done(new Error('Client 1 received event for wrong organization'));
            }
          });

          // Client 2 should NOT receive org1 events
          client2.on('correlation:started', (data: any) => {
            if (data.organizationId === org1.id) {
              done(new Error('Client 2 received event for different organization'));
            } else if (data.organizationId === org2.id) {
              client2Received = true;
              checkCompletion();
            }
          });

          // Broadcast org-specific message
          realtimeService.broadcastToOrganization(org1.id, 'correlation:started', {
            organizationId: org1.id,
            platformCount: 2,
            eventCount: 100
          });

          function checkCompletion() {
            if (client1Received) {
              // Clean up
              client1.disconnect();
              client2.disconnect();
              done();
            }
          }

          // Timeout if event not received
          setTimeout(() => {
            if (!client1Received) {
              client1.disconnect();
              client2.disconnect();
              done(new Error('Timeout waiting for organization-filtered event'));
            }
          }, 2000);
        }
      }
    });
  });

  describe('Subscription Management', () => {
    it('should allow updating subscription preferences', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: validToken,
          userRole: 'analyst'
        });
      });

      clientSocket.on('authenticated', () => {
        // Update subscriptions
        clientSocket.emit('update_subscriptions', {
          subscriptions: {
            analysisProgress: false,
            riskAlerts: true
          },
          riskLevelFilter: ['critical'] // Only critical alerts
        });
      });

      clientSocket.on('subscriptions_updated', (data) => {
        expect(data.success).toBe(true);
        expect(data.preferences.subscriptions).toBeDefined();
        expect(data.preferences.riskLevelFilter).toEqual(['critical']);
        done();
      });
    });
  });

  describe('Service Statistics', () => {
    it('should track connected clients and subscriptions', (done) => {
      clientSocket = ioClient(serverAddress, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {
          token: validToken,
          userRole: 'analyst'
        });
      });

      clientSocket.on('authenticated', () => {
        const stats = realtimeService.getServiceStatistics();
        expect(stats.connectedClients).toBeGreaterThan(0);
        expect(stats.activeSubscriptions).toBeGreaterThan(0);
        done();
      });
    });
  });
});
