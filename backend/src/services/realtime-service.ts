/**
 * Real-time Service - Socket.io Integration
 * Provides real-time updates for dashboard, discovery status, and notifications
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { verify } from 'jsonwebtoken';
import { redis } from '../jobs/queue';
import {
  AuthenticatedSocket,
  SocketAuthPayload,
  SocketEvent,
  DiscoveryEventData,
  AutomationEventData,
  ConnectionEventData,
  RiskEventData,
  SystemEventData
} from '@singura/shared-types';

// Event types for type safety
export interface RealTimeEvents {
  // Discovery events
  'discovery:started': {
    organizationId: string;
    connectionId: string;
    platform: string;
    jobId: string;
    timestamp: string;
  };
  
  'discovery:progress': {
    organizationId: string;
    connectionId: string;
    jobId: string;
    progress: number;
    stage: string;
    message: string;
    timestamp: string;
  };
  
  'discovery:completed': {
    organizationId: string;
    connectionId: string;
    jobId: string;
    totalAutomations: number;
    newAutomations: number;
    duration: number;
    timestamp: string;
  };
  
  'discovery:failed': {
    organizationId: string;
    connectionId: string;
    jobId: string;
    error: string;
    timestamp: string;
  };

  // Automation events
  'automation:discovered': {
    organizationId: string;
    automation: {
      id: string;
      name: string;
      type: string;
      platform: string;
      riskLevel?: string;
    };
    timestamp: string;
  };

  'automation:risk_updated': {
    organizationId: string;
    automationId: string;
    oldRiskLevel: string;
    newRiskLevel: string;
    riskScore: number;
    timestamp: string;
  };

  // Connection events  
  'connection:status_changed': {
    organizationId: string;
    connectionId: string;
    platform: string;
    status: string;
    previousStatus: string;
    timestamp: string;
  };

  'connection:error': {
    organizationId: string;
    connectionId: string;
    platform: string;
    error: string;
    timestamp: string;
  };

  // Risk and security events
  'risk:high_risk_detected': {
    organizationId: string;
    automationId: string;
    automationName: string;
    platform: string;
    riskLevel: 'high' | 'critical';
    riskFactors: string[];
    timestamp: string;
  };

  'security:compliance_violation': {
    organizationId: string;
    automationId: string;
    framework: string;
    violation: string;
    severity: string;
    timestamp: string;
  };

  // System events
  'system:health_status': {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, string>;
    timestamp: string;
  };

  'notification:new': {
    organizationId: string;
    type: string;
    message: string;
    priority: string;
    timestamp: string;
  };
}

/**
 * Socket.io authentication middleware
 */
function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as SocketAuthPayload;
    (socket as AuthenticatedSocket).userId = decoded.userId;
    (socket as AuthenticatedSocket).organizationId = decoded.organizationId;
    
    console.log(`Socket authenticated: user ${decoded.userId}, org ${decoded.organizationId}`);
    next();
  } catch (error) {
    console.error('Socket authentication failed:', error);
    next(new Error('Invalid authentication token'));
  }
}

/**
 * Real-time Service - Manages Socket.io connections and events
 */
export class RealTimeService {
  private io: SocketServer;
  private connectedClients: Map<string, Set<string>> = new Map(); // organizationId -> Set<socketId>
  private clientRooms: Map<string, string> = new Map(); // socketId -> organizationId

  constructor(httpServer: Server) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupRedisSubscription();
  }

  /**
   * Setup Socket.io middleware
   */
  private setupMiddleware() {
    // Authentication middleware
    this.io.use(authenticateSocket);

    // Rate limiting middleware
    this.io.use((socket, next) => {
      // Simple rate limiting - could be enhanced with Redis
      const userConnections = Array.from(this.io.sockets.sockets.values())
        .filter(s => (s as AuthenticatedSocket).userId === (socket as AuthenticatedSocket).userId).length;

      if (userConnections > 5) {
        return next(new Error('Too many connections from this user'));
      }
      
      next();
    });

    // Error handling middleware
    this.io.use((socket, next) => {
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
      next();
    });
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      const organizationId = (socket as any).organizationId;
      
      console.log(`Client connected: ${socket.id} (user: ${userId}, org: ${organizationId})`);

      // Join organization room
      socket.join(`org:${organizationId}`);
      socket.join(`user:${userId}`);

      // Track connection
      if (!this.connectedClients.has(organizationId)) {
        this.connectedClients.set(organizationId, new Set());
      }
      this.connectedClients.get(organizationId)!.add(socket.id);
      this.clientRooms.set(socket.id, organizationId);

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Real-time connection established',
        timestamp: new Date().toISOString(),
        socketId: socket.id
      });

      // Handle client-side events
      socket.on('ping', (callback) => {
        callback({ pong: Date.now() });
      });

      socket.on('subscribe:discovery', (data) => {
        if (data.connectionId) {
          socket.join(`discovery:${data.connectionId}`);
        }
      });

      socket.on('subscribe:automation', (data) => {
        if (data.automationId) {
          socket.join(`automation:${data.automationId}`);
        }
      });

      socket.on('unsubscribe:discovery', (data) => {
        if (data.connectionId) {
          socket.leave(`discovery:${data.connectionId}`);
        }
      });

      socket.on('unsubscribe:automation', (data) => {
        if (data.automationId) {
          socket.leave(`automation:${data.automationId}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id} (reason: ${reason})`);
        
        // Clean up tracking
        const orgId = this.clientRooms.get(socket.id);
        if (orgId) {
          const orgClients = this.connectedClients.get(orgId);
          if (orgClients) {
            orgClients.delete(socket.id);
            if (orgClients.size === 0) {
              this.connectedClients.delete(orgId);
            }
          }
          this.clientRooms.delete(socket.id);
        }
      });
    });

    // Handle server-side errors
    this.io.on('error', (error) => {
      console.error('Socket.io server error:', error);
    });
  }

  /**
   * Setup Redis subscription for cross-process communication
   */
  private setupRedisSubscription() {
    // Subscribe to Redis channels for events from background workers
    const subscriber = redis.duplicate();
    
    const channels = [
      'discovery:events',
      'automation:events', 
      'connection:events',
      'risk:events',
      'system:events'
    ];

    channels.forEach(channel => {
      subscriber.subscribe(channel);
    });

    subscriber.on('message', (channel: string, message: string) => {
      try {
        const event = JSON.parse(message);
        this.handleRedisEvent(channel, event);
      } catch (error) {
        console.error(`Failed to parse Redis message on channel ${channel}:`, error);
      }
    });

    subscriber.on('error', (error: Error) => {
      console.error('Redis subscriber error:', error);
    });
  }

  /**
   * Handle events from Redis channels
   */
  private handleRedisEvent(channel: string, event: any) {
    switch (channel) {
      case 'discovery:events':
        this.handleDiscoveryEvent(event);
        break;
      case 'automation:events':
        this.handleAutomationEvent(event);
        break;
      case 'connection:events':
        this.handleConnectionEvent(event);
        break;
      case 'risk:events':
        this.handleRiskEvent(event);
        break;
      case 'system:events':
        this.handleSystemEvent(event);
        break;
    }
  }

  /**
   * Emit event to organization members
   */
  public emitToOrganization<K extends keyof RealTimeEvents>(
    organizationId: string, 
    eventType: K, 
    data: RealTimeEvents[K]
  ): void {
    this.io.to(`org:${organizationId}`).emit(eventType, data);
  }

  /**
   * Emit event to specific user
   */
  public emitToUser<K extends keyof RealTimeEvents>(
    userId: string, 
    eventType: K, 
    data: RealTimeEvents[K]
  ): void {
    this.io.to(`user:${userId}`).emit(eventType, data);
  }

  /**
   * Emit event to specific room/channel
   */
  public emitToRoom<K extends keyof RealTimeEvents>(
    room: string,
    eventType: K,
    data: RealTimeEvents[K]
  ): void {
    this.io.to(room).emit(eventType, data);
  }

  /**
   * Broadcast system-wide event
   */
  public broadcastSystem<K extends keyof RealTimeEvents>(
    eventType: K,
    data: RealTimeEvents[K]
  ): void {
    this.io.emit(eventType, data);
  }

  /**
   * Handle discovery events
   */
  private handleDiscoveryEvent(event: any) {
    const { type, organizationId, connectionId, ...eventData } = event;
    
    switch (type) {
      case 'started':
        this.emitToOrganization(organizationId, 'discovery:started', {
          organizationId,
          connectionId,
          ...eventData
        });
        break;
      case 'progress':
        this.emitToRoom(`discovery:${connectionId}`, 'discovery:progress', {
          organizationId,
          connectionId,
          ...eventData
        });
        break;
      case 'completed':
        this.emitToOrganization(organizationId, 'discovery:completed', {
          organizationId,
          connectionId,
          ...eventData
        });
        break;
      case 'failed':
        this.emitToOrganization(organizationId, 'discovery:failed', {
          organizationId,
          connectionId,
          ...eventData
        });
        break;
    }
  }

  /**
   * Handle automation events
   */
  private handleAutomationEvent(event: any) {
    const { type, organizationId, ...eventData } = event;

    switch (type) {
      case 'discovered':
        this.emitToOrganization(organizationId, 'automation:discovered', {
          organizationId,
          ...eventData
        });
        break;
      case 'risk_updated':
        this.emitToOrganization(organizationId, 'automation:risk_updated', {
          organizationId,
          ...eventData
        });
        break;
    }
  }

  /**
   * Handle connection events
   */
  private handleConnectionEvent(event: any) {
    const { type, organizationId, ...eventData } = event;

    switch (type) {
      case 'status_changed':
        this.emitToOrganization(organizationId, 'connection:status_changed', {
          organizationId,
          ...eventData
        });
        break;
      case 'error':
        this.emitToOrganization(organizationId, 'connection:error', {
          organizationId,
          ...eventData
        });
        break;
    }
  }

  /**
   * Handle risk events
   */
  private handleRiskEvent(event: any) {
    const { type, organizationId, ...eventData } = event;

    switch (type) {
      case 'high_risk_detected':
        this.emitToOrganization(organizationId, 'risk:high_risk_detected', {
          organizationId,
          ...eventData
        });
        break;
      case 'compliance_violation':
        this.emitToOrganization(organizationId, 'security:compliance_violation', {
          organizationId,
          ...eventData
        });
        break;
    }
  }

  /**
   * Handle system events
   */
  private handleSystemEvent(event: any) {
    const { type, ...eventData } = event;

    switch (type) {
      case 'health_status':
        this.broadcastSystem('system:health_status', eventData);
        break;
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    const totalConnections = this.io.sockets.sockets.size;
    const organizationsConnected = this.connectedClients.size;
    
    return {
      totalConnections,
      organizationsConnected,
      connectionsPerOrg: Array.from(this.connectedClients.entries()).map(
        ([orgId, sockets]) => ({
          organizationId: orgId,
          connections: sockets.size
        })
      )
    };
  }

  /**
   * Publish event to Redis for cross-process communication
   */
  public static async publishEvent(channel: string, event: any): Promise<void> {
    try {
      await redis.publish(channel, JSON.stringify({
        ...event,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error(`Failed to publish event to Redis channel ${channel}:`, error);
    }
  }

  /**
   * Close all connections and cleanup
   */
  public async close(): Promise<void> {
    console.log('Closing real-time service...');
    
    // Disconnect all clients
    this.io.disconnectSockets(true);
    
    // Close server
    this.io.close();
    
    // Clear tracking maps
    this.connectedClients.clear();
    this.clientRooms.clear();
    
    console.log('Real-time service closed');
  }
}

// Utility functions for publishing events from other services
export const publishDiscoveryEvent = (type: string, data: any) => 
  RealTimeService.publishEvent('discovery:events', { type, ...data });

export const publishAutomationEvent = (type: string, data: any) =>
  RealTimeService.publishEvent('automation:events', { type, ...data });

export const publishConnectionEvent = (type: string, data: any) =>
  RealTimeService.publishEvent('connection:events', { type, ...data });

export const publishRiskEvent = (type: string, data: any) =>
  RealTimeService.publishEvent('risk:events', { type, ...data });

export const publishSystemEvent = (type: string, data: any) =>
  RealTimeService.publishEvent('system:events', { type, ...data });

// Export types for use in other files
// RealTimeEvents interface already exported above