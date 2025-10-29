/**
 * WebSocket Server with Message Validation
 * Type-safe Socket.io broadcast methods with Zod validation
 */

import { Server as SocketIOServer } from 'socket.io';
import {
  WebSocketMessage,
  WebSocketMessageSchema,
  ConnectionUpdatePayload,
  DiscoveryProgressPayload,
  AutomationDiscoveredPayload,
  SystemNotificationPayload,
  validateWebSocketMessage,
} from '@singura/shared-types';

export class WebSocketServer {
  constructor(private io: SocketIOServer) {}

  /**
   * Generic broadcast method with validation
   * Validates message before broadcasting to prevent parsing errors on clients
   *
   * @param message - WebSocket message to broadcast
   * @returns True if broadcast succeeded, false if validation failed
   */
  broadcast(message: WebSocketMessage): boolean {
    try {
      // Validate message against schema
      const validation = validateWebSocketMessage(message);

      if (!validation.success) {
        console.error('[WebSocket] Invalid message format:', validation.error);
        console.error('[WebSocket] Rejected message:', JSON.stringify(message, null, 2));

        // Log validation failure but don't crash
        this.broadcastSystemNotification({
          level: 'error',
          message: 'Internal error: Invalid message format detected',
          timestamp: new Date().toISOString(),
          title: 'WebSocket Validation Error',
        });

        return false;
      }

      // Broadcast validated message
      this.io.emit(message.type, message.payload);
      console.log(`[WebSocket] Broadcast ${message.type}:`, JSON.stringify(message.payload).substring(0, 100));

      return true;
    } catch (error) {
      console.error('[WebSocket] Broadcast error:', error);
      return false;
    }
  }

  /**
   * Broadcast connection status update
   *
   * @param payload - Connection update payload
   * @returns True if broadcast succeeded
   */
  broadcastConnectionUpdate(payload: ConnectionUpdatePayload): boolean {
    return this.broadcast({
      type: 'connection:update',
      payload,
    });
  }

  /**
   * Broadcast discovery progress update
   *
   * @param payload - Discovery progress payload
   * @returns True if broadcast succeeded
   */
  broadcastDiscoveryProgress(payload: DiscoveryProgressPayload): boolean {
    return this.broadcast({
      type: 'discovery:progress',
      payload,
    });
  }

  /**
   * Broadcast automation discovered event
   *
   * @param payload - Automation discovered payload
   * @returns True if broadcast succeeded
   */
  broadcastAutomationDiscovered(payload: AutomationDiscoveredPayload): boolean {
    return this.broadcast({
      type: 'automation:discovered',
      payload,
    });
  }

  /**
   * Broadcast system notification
   *
   * @param payload - System notification payload
   * @returns True if broadcast succeeded
   */
  broadcastSystemNotification(payload: SystemNotificationPayload): boolean {
    return this.broadcast({
      type: 'system:notification',
      payload,
    });
  }

  /**
   * Get the underlying Socket.io server instance
   * Use this for advanced operations not covered by type-safe methods
   */
  getIO(): SocketIOServer {
    return this.io;
  }
}

/**
 * Create WebSocket server instance
 * This should be called once when setting up Socket.io
 *
 * @param io - Socket.io server instance
 * @returns WebSocket server with type-safe broadcast methods
 */
export function createWebSocketServer(io: SocketIOServer): WebSocketServer {
  return new WebSocketServer(io);
}
