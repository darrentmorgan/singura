/**
 * Socket.io and real-time communication types
 * Replaces 'any' types in socket handling
 */

/**
 * Base socket interface (without socket.io dependency)
 */
export interface BaseSocket {
  id: string;
  emit(event: string, ...args: any[]): boolean;
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener?: (...args: any[]) => void): this;
  disconnect(close?: boolean): this;
}

/**
 * Authenticated socket interface
 */
export interface AuthenticatedSocket extends BaseSocket {
  userId: string;
  organizationId: string;
}

/**
 * JWT token payload for socket authentication
 */
export interface SocketAuthPayload {
  userId: string;
  organizationId: string;
  iat: number;
  exp: number;
}

/**
 * Socket authentication data
 */
export interface SocketAuthData {
  token: string;
}

/**
 * Socket event types
 */
export type SocketEventType = 
  | 'discovery'
  | 'automation'
  | 'connection'
  | 'risk'
  | 'system'
  | 'notification';

/**
 * Base socket event interface
 */
export interface BaseSocketEvent {
  type: SocketEventType;
  timestamp: Date;
  organizationId: string;
  userId?: string;
}

/**
 * Discovery-related socket events
 */
export interface DiscoverySocketEvent extends BaseSocketEvent {
  type: 'discovery';
  event: 'started' | 'progress' | 'completed' | 'failed';
  data: DiscoveryEventData;
}

export interface DiscoveryEventData {
  discoveryId: string;
  connectionId?: string;
  platform?: string;
  progress?: number;
  message?: string;
  automationsFound?: number;
  newAutomations?: number;
  error?: string;
}

/**
 * Automation-related socket events
 */
export interface AutomationSocketEvent extends BaseSocketEvent {
  type: 'automation';
  event: 'created' | 'updated' | 'deleted' | 'risk_changed';
  data: AutomationEventData;
}

export interface AutomationEventData {
  automationId: string;
  name: string;
  platform: string;
  riskLevel?: string;
  riskScore?: number;
  changes?: string[];
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

/**
 * Connection-related socket events
 */
export interface ConnectionSocketEvent extends BaseSocketEvent {
  type: 'connection';
  event: 'created' | 'updated' | 'deleted' | 'sync_started' | 'sync_completed' | 'sync_failed';
  data: ConnectionEventData;
}

export interface ConnectionEventData {
  connectionId: string;
  platform: string;
  status?: string;
  lastSyncAt?: Date;
  error?: string;
  syncProgress?: number;
  automationsDiscovered?: number;
}

/**
 * Risk-related socket events
 */
export interface RiskSocketEvent extends BaseSocketEvent {
  type: 'risk';
  event: 'assessment_completed' | 'high_risk_detected' | 'risk_threshold_exceeded';
  data: RiskEventData;
}

export interface RiskEventData {
  automationId?: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  previousRiskScore?: number;
  threshold?: number;
  affectedAutomations?: number;
}

/**
 * System-related socket events
 */
export interface SystemSocketEvent extends BaseSocketEvent {
  type: 'system';
  event: 'maintenance_started' | 'maintenance_completed' | 'service_status_changed' | 'alert';
  data: SystemEventData;
}

export interface SystemEventData {
  service?: string;
  status?: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  maintenanceWindow?: {
    start: Date;
    end: Date;
    estimatedDuration: number;
  };
}

/**
 * Notification socket events
 */
export interface NotificationSocketEvent extends BaseSocketEvent {
  type: 'notification';
  event: 'new_notification' | 'notification_read' | 'notification_dismissed';
  data: NotificationEventData;
}

export interface NotificationEventData {
  notificationId: string;
  title: string;
  message: string;
  category: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionRequired?: boolean;
  actionUrl?: string;
  expiresAt?: Date;
}

/**
 * Union of all socket events
 */
export type SocketEvent = 
  | DiscoverySocketEvent
  | AutomationSocketEvent
  | ConnectionSocketEvent
  | RiskSocketEvent
  | SystemSocketEvent
  | NotificationSocketEvent;

/**
 * Socket room management
 */
export interface SocketRoomInfo {
  roomId: string;
  organizationId: string;
  clientCount: number;
  clients: string[];
}

/**
 * Client connection info
 */
export interface ClientConnectionInfo {
  socketId: string;
  userId: string;
  organizationId: string;
  connectedAt: Date;
  userAgent?: string;
  ipAddress?: string;
  rooms: string[];
}

/**
 * Real-time service statistics
 */
export interface RealTimeServiceStats {
  totalConnections: number;
  connectionsByOrganization: Record<string, number>;
  eventsSentLastHour: number;
  eventsReceivedLastHour: number;
  averageLatency: number;
  uptime: number;
}

/**
 * Socket middleware types
 */
export type SocketMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;

/**
 * Redis pub/sub event data
 */
export interface RedisEventData {
  channel: string;
  event: SocketEvent;
  publishedAt: Date;
}

/**
 * Event publishing options
 */
export interface EventPublishOptions {
  room?: string;
  broadcast?: boolean;
  excludeSocket?: string;
  ttl?: number;
  persistent?: boolean;
}