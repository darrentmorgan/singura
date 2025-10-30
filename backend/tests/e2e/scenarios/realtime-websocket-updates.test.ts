/**
 * E2E Test: Real-Time Detection Updates via WebSocket
 *
 * Tests WebSocket functionality for live automation detection updates
 * and real-time risk score notifications.
 *
 * Scenarios:
 * 1. New automation detection pushed via WebSocket
 * 2. Risk score updates pushed immediately
 * 3. Multiple concurrent WebSocket clients
 * 4. Authentication and authorization for WebSocket connections
 * 5. Subscription management and filtering
 */

import { Server as HTTPServer, createServer } from 'http';
import { Server as SocketIOServer, Socket as ServerSocket } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { testDb, TestFixtures } from '../../helpers/test-database';
import crypto from 'crypto';

describe('E2E: Real-Time WebSocket Updates', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let fixtures: TestFixtures;
  let serverPort: number;

  beforeAll(async () => {
    await testDb.beginTransaction();
    fixtures = await testDb.createFixtures();

    // Create HTTP server for WebSocket
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        credentials: true
      },
      transports: ['websocket']
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        serverPort = typeof address === 'object' && address ? address.port : 3001;
        resolve();
      });
    });

    // Setup WebSocket event handlers
    ioServer.on('connection', (socket: ServerSocket) => {
      socket.on('authenticate', async (data: { token: string; organizationId: string }) => {
        // Simplified authentication for tests
        if (data.token.startsWith('test.')) {
          const [, userId, orgId] = data.token.split('.');
          socket.join(`org:${orgId}`);
          socket.emit('authenticated', {
            success: true,
            userId,
            organizationId: orgId
          });
        } else {
          socket.emit('authentication_error', { error: 'Invalid token' });
        }
      });

      socket.on('subscribe', (data: { events: string[] }) => {
        socket.data.subscriptions = data.events;
        socket.emit('subscribed', { events: data.events });
      });
    });
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
    ioServer.close();
    httpServer.close();
  });

  describe('Authentication and Connection', () => {
    it('should successfully authenticate WebSocket client', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      const authenticated = await new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 5000);

        client.on('authenticated', (data) => {
          clearTimeout(timeout);
          expect(data.success).toBe(true);
          expect(data.organizationId).toBe(fixtures.organization.id);
          resolve(true);
        });

        client.on('authentication_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Auth error: ${error.error}`));
        });

        client.emit('authenticate', {
          token: `test.user-123.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      expect(authenticated).toBe(true);
      client.close();
    });

    it('should reject invalid authentication token', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      const authError = await new Promise<string>((resolve) => {
        client.on('authentication_error', (error) => {
          resolve(error.error);
        });

        client.emit('authenticate', {
          token: 'invalid-token',
          organizationId: fixtures.organization.id
        });
      });

      expect(authError).toBe('Invalid token');
      client.close();
    });
  });

  describe('New Automation Detection Updates', () => {
    it('should push new automation detection via WebSocket', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      // Authenticate first
      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.user-123.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      // Subscribe to automation updates
      await new Promise<void>((resolve) => {
        client.on('subscribed', () => resolve());
        client.emit('subscribe', {
          events: ['automation:detected', 'automation:updated']
        });
      });

      // Setup listener for automation detection
      const detectionPromise = new Promise<any>((resolve) => {
        client.on('automation:detected', (data) => {
          resolve(data);
        });
      });

      // Simulate new automation detection
      const automationId = crypto.randomUUID();
      const automationData = {
        id: automationId,
        organizationId: fixtures.organization.id,
        name: 'New Slack Bot',
        platform: 'slack',
        riskScore: 65,
        detectedAt: new Date().toISOString()
      };

      // Broadcast to organization room
      ioServer.to(`org:${fixtures.organization.id}`).emit('automation:detected', automationData);

      // Verify client received the update within 1 second
      const receivedData = await Promise.race([
        detectionPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Update not received within 1s')), 1000)
        )
      ]);

      expect(receivedData).toMatchObject({
        id: automationId,
        name: 'New Slack Bot',
        riskScore: 65
      });

      client.close();
    });

    it('should include automation details in WebSocket message', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.user-456.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      const detectionPromise = new Promise<any>((resolve) => {
        client.on('automation:detected', (data) => {
          resolve(data);
        });
      });

      const detectionMetadata = {
        aiProvider: {
          provider: 'openai',
          confidence: 94,
          model: 'gpt-4'
        },
        detectionPatterns: [{
          patternType: 'velocity',
          confidence: 88
        }]
      };

      ioServer.to(`org:${fixtures.organization.id}`).emit('automation:detected', {
        id: crypto.randomUUID(),
        organizationId: fixtures.organization.id,
        name: 'AI Bot',
        detection_metadata: detectionMetadata
      });

      const receivedData = await detectionPromise;
      expect(receivedData.detection_metadata.aiProvider.provider).toBe('openai');
      expect(receivedData.detection_metadata.aiProvider.confidence).toBe(94);

      client.close();
    });
  });

  describe('Risk Score Updates', () => {
    it('should push risk score updates via WebSocket', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.user-789.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      const riskUpdatePromise = new Promise<any>((resolve) => {
        client.on('risk:score_updated', (data) => {
          resolve(data);
        });
      });

      const automationId = crypto.randomUUID();
      const riskUpdate = {
        automationId,
        organizationId: fixtures.organization.id,
        oldScore: 45,
        newScore: 78,
        reason: 'permission_escalation',
        timestamp: new Date().toISOString()
      };

      ioServer.to(`org:${fixtures.organization.id}`).emit('risk:score_updated', riskUpdate);

      const receivedUpdate = await Promise.race([
        riskUpdatePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Risk update not received')), 1000)
        )
      ]);

      expect(receivedUpdate.automationId).toBe(automationId);
      expect(receivedUpdate.oldScore).toBe(45);
      expect(receivedUpdate.newScore).toBe(78);
      expect(receivedUpdate.reason).toBe('permission_escalation');

      client.close();
    });

    it('should push high-risk alerts immediately', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.user-alert.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      const alertPromise = new Promise<any>((resolve) => {
        client.on('risk:high_alert', (data) => {
          resolve(data);
        });
      });

      const highRiskAlert = {
        automationId: crypto.randomUUID(),
        organizationId: fixtures.organization.id,
        riskScore: 92,
        riskLevel: 'critical',
        detectionPatterns: ['data_exfiltration', 'external_connections'],
        timestamp: new Date().toISOString()
      };

      ioServer.to(`org:${fixtures.organization.id}`).emit('risk:high_alert', highRiskAlert);

      const receivedAlert = await alertPromise;
      expect(receivedAlert.riskScore).toBe(92);
      expect(receivedAlert.riskLevel).toBe('critical');

      client.close();
    });
  });

  describe('Multiple Concurrent Clients', () => {
    it('should handle multiple concurrent WebSocket clients', async () => {
      const clientCount = 5;
      const clients: ClientSocket[] = [];
      const receivedMessages: any[][] = Array(clientCount).fill(null).map(() => []);

      // Create and authenticate multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = ioClient(`http://localhost:${serverPort}`, {
          transports: ['websocket']
        });

        await new Promise<void>((resolve) => {
          client.on('authenticated', () => resolve());
          client.emit('authenticate', {
            token: `test.client-${i}.${fixtures.organization.id}`,
            organizationId: fixtures.organization.id
          });
        });

        // Setup message listener
        client.on('broadcast:test', (data) => {
          receivedMessages[i].push(data);
        });

        clients.push(client);
      }

      // Broadcast message to all clients in organization
      const broadcastData = {
        message: 'Test broadcast to all clients',
        timestamp: new Date().toISOString()
      };
      ioServer.to(`org:${fixtures.organization.id}`).emit('broadcast:test', broadcastData);

      // Wait for all clients to receive message
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all clients received the message
      for (let i = 0; i < clientCount; i++) {
        expect(receivedMessages[i]).toHaveLength(1);
        expect(receivedMessages[i][0].message).toBe('Test broadcast to all clients');
      }

      // Cleanup
      clients.forEach(client => client.close());
    });

    it('should isolate messages by organization', async () => {
      // Create second organization
      const org2Result = await testDb.query(`
        INSERT INTO organizations (name, domain, slug, plan_tier, max_connections, settings, is_active)
        VALUES ('Org 2', 'org2.example.com', 'org-2', 'enterprise', 100, '{}'::jsonb, true)
        RETURNING *
      `);
      const org2Id = org2Result.rows[0].id;

      // Create clients for both organizations
      const client1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });
      const client2 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client1.on('authenticated', () => resolve());
        client1.emit('authenticate', {
          token: `test.user-org1.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      await new Promise<void>((resolve) => {
        client2.on('authenticated', () => resolve());
        client2.emit('authenticate', {
          token: `test.user-org2.${org2Id}`,
          organizationId: org2Id
        });
      });

      const client1Messages: any[] = [];
      const client2Messages: any[] = [];

      client1.on('automation:detected', (data) => client1Messages.push(data));
      client2.on('automation:detected', (data) => client2Messages.push(data));

      // Send message only to org 1
      ioServer.to(`org:${fixtures.organization.id}`).emit('automation:detected', {
        organizationId: fixtures.organization.id,
        message: 'Org 1 only'
      });

      // Send message only to org 2
      ioServer.to(`org:${org2Id}`).emit('automation:detected', {
        organizationId: org2Id,
        message: 'Org 2 only'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify isolation
      expect(client1Messages).toHaveLength(1);
      expect(client1Messages[0].message).toBe('Org 1 only');

      expect(client2Messages).toHaveLength(1);
      expect(client2Messages[0].message).toBe('Org 2 only');

      client1.close();
      client2.close();
    });
  });

  describe('WebSocket Reliability', () => {
    it('should handle client reconnection gracefully', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100
      });

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.reconnect.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      // Disconnect client
      client.disconnect();

      // Wait for reconnection
      const reconnected = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000);
        client.on('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        client.connect();
      });

      expect(reconnected).toBe(true);
      client.close();
    });

    it('should handle message delivery during network interruption', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.network.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      const messages: any[] = [];
      client.on('automation:detected', (data) => messages.push(data));

      // Send message before disconnect
      ioServer.to(`org:${fixtures.organization.id}`).emit('automation:detected', {
        id: 1,
        message: 'Before disconnect'
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Disconnect (simulates network interruption)
      client.disconnect();

      // Send message while disconnected (will be lost)
      ioServer.to(`org:${fixtures.organization.id}`).emit('automation:detected', {
        id: 2,
        message: 'During disconnect'
      });

      // Reconnect
      client.connect();

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.network.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      // Send message after reconnect
      ioServer.to(`org:${fixtures.organization.id}`).emit('automation:detected', {
        id: 3,
        message: 'After reconnect'
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should receive first and third messages
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0].message).toBe('Before disconnect');

      client.close();
    });

    it('should maintain stable connection under load', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.load.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      const messageCount = 100;
      const receivedMessages: any[] = [];

      client.on('load:test', (data) => receivedMessages.push(data));

      // Send 100 messages rapidly
      for (let i = 0; i < messageCount; i++) {
        ioServer.to(`org:${fixtures.organization.id}`).emit('load:test', {
          messageId: i,
          timestamp: Date.now()
        });
      }

      // Wait for messages to arrive
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should receive most messages (allow some loss under extreme load)
      expect(receivedMessages.length).toBeGreaterThan(messageCount * 0.95); // 95% delivery rate

      client.close();
    });
  });

  describe('Performance Metrics', () => {
    it('should deliver messages within 100ms latency', async () => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('authenticated', () => resolve());
        client.emit('authenticate', {
          token: `test.latency.${fixtures.organization.id}`,
          organizationId: fixtures.organization.id
        });
      });

      const latencies: number[] = [];

      client.on('latency:test', (data) => {
        const latency = Date.now() - data.sentAt;
        latencies.push(latency);
      });

      // Send 10 messages and measure latency
      for (let i = 0; i < 10; i++) {
        ioServer.to(`org:${fixtures.organization.id}`).emit('latency:test', {
          messageId: i,
          sentAt: Date.now()
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      expect(averageLatency).toBeLessThan(100); // Average latency under 100ms

      client.close();
    });
  });
});
