/**
 * WebSocket Service for Real-time Updates
 * Manages Socket.io connection for real-time platform connection status and discovery updates
 */

import { io, Socket } from 'socket.io-client';
import {
  ConnectionStatusUpdate,
  DiscoveryProgress,
  PlatformConnection,
  AutomationDiscovery
} from '@/types/api';
import { useConnectionsStore } from '@/stores/connections';
import { useAutomationsStore } from '@/stores/automations';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';

// WebSocket Configuration
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4201';
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

export class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // Event listeners storage for cleanup
  private eventListeners: Map<string, (...args: unknown[]) => void> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<boolean> {
    if (this.socket?.connected || this.isConnecting) {
      return true;
    }

    this.isConnecting = true;

    try {
      // Connect without auth token - backend handles Clerk authentication via HTTP
      this.socket = io(WS_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        timeout: 10000,
      });

      this.setupSocketEventHandlers();

      return new Promise((resolve) => {
        if (!this.socket) {
          resolve(false);
          return;
        }

        const connectTimeout = setTimeout(() => {
          console.error('WebSocket connection timeout');
          this.isConnecting = false;
          resolve(false);
        }, 10000);

        // Use once() instead of on() to prevent duplicate event handlers
        this.socket.once('connect', () => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          console.log('WebSocket connected');
          useUIStore.getState().setWebsocketStatus(true);

          // Only show success toast on first connection (not reconnections)
          if (this.reconnectAttempts === 0) {
            useUIStore.getState().showSuccess('Real-time updates connected');
          }

          this.startHeartbeat();
          resolve(true);
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;

          console.error('WebSocket connection error:', error);
          useUIStore.getState().setWebsocketStatus(false);

          this.scheduleReconnect();
          resolve(false);
        });
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    useUIStore.getState().setWebsocketStatus(false);
    console.log('WebSocket disconnected');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Send a message through the WebSocket
   */
  emit(event: string, data: unknown): boolean {
    if (!this.socket?.connected) {
      console.warn('Cannot send WebSocket message: not connected');
      return false;
    }

    try {
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * Subscribe to connection updates for a specific connection
   */
  subscribeToConnection(connectionId: string): void {
    this.emit('subscribe:connection', { connectionId });
  }

  /**
   * Unsubscribe from connection updates
   */
  unsubscribeFromConnection(connectionId: string): void {
    this.emit('unsubscribe:connection', { connectionId });
  }

  /**
   * Subscribe to automation discovery updates
   */
  subscribeToDiscovery(connectionId: string): void {
    this.emit('subscribe:discovery', { connectionId });
  }

  /**
   * Unsubscribe from discovery updates
   */
  unsubscribeFromDiscovery(connectionId: string): void {
    this.emit('unsubscribe:discovery', { connectionId });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      useUIStore.getState().setWebsocketStatus(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.scheduleReconnect();
      }
    });

    // Authentication events
    this.socket.on('auth_error', (error) => {
      console.error('WebSocket authentication error:', error);
      useUIStore.getState().showError('WebSocket authentication failed');
      
      // Try to refresh token and reconnect
      this.handleAuthError();
    });

    // Real-time data events
    this.socket.on('connection:status', (data: ConnectionStatusUpdate) => {
      console.log('Connection status update:', data);
      useConnectionsStore.getState().updateConnectionStatus(
        data.connectionId,
        data.status,
        data.error
      );
    });

    this.socket.on('connection:added', (data: { connection: PlatformConnection }) => {
      console.log('New connection added:', data.connection);
      useConnectionsStore.getState().addConnection(data.connection);
      useUIStore.getState().showSuccess(`${data.connection.display_name} connected successfully`);
    });

    this.socket.on('connection:removed', (data: { connectionId: string }) => {
      console.log('Connection removed:', data.connectionId);
      useConnectionsStore.getState().removeConnection(data.connectionId);
      useUIStore.getState().showInfo('Platform connection removed');
    });

    this.socket.on('discovery:progress', (data: DiscoveryProgress) => {
      console.log('Discovery progress:', data);
      useAutomationsStore.getState().updateDiscoveryProgress(data.connectionId, data);
    });

    this.socket.on('discovery:complete', (data: { connectionId: string, result: unknown }) => {
      console.log('Discovery completed:', data);
      useAutomationsStore.getState().updateDiscoveryResult(data.connectionId, data.result as import('@/types/api').DiscoveryResult);
      useUIStore.getState().showSuccess('Automation discovery completed');
    });

    this.socket.on('discovery:error', (data: { connectionId: string, error: string }) => {
      console.error('Discovery error:', data);
      useAutomationsStore.getState().updateDiscoveryProgress(data.connectionId, {
        connectionId: data.connectionId,
        stage: 'failed',
        progress: 100,
        message: data.error,
      });
      useUIStore.getState().showError(`Discovery failed: ${data.error}`);
    });

    this.socket.on('discovery:failed', (data: {
      connectionId: string,
      error: string,
      errorCategory?: string,
      technicalError?: string
    }) => {
      console.error('Discovery failed:', data);

      // Update discovery progress to failed state
      useAutomationsStore.getState().updateDiscoveryProgress(data.connectionId, {
        connectionId: data.connectionId,
        stage: 'failed',
        progress: 100,
        message: data.error,
      });

      // Set error in automations store for display
      useAutomationsStore.getState().setError(data.error);

      // Show user-friendly error notification
      if (data.errorCategory === 'authentication') {
        useUIStore.getState().showError(
          data.error,
          'Connection Expired',
          {
            action: {
              label: 'Reconnect',
              onClick: () => {
                // Navigate to connections page to reconnect
                window.location.href = '/connections';
              }
            }
          }
        );
      } else if (data.errorCategory === 'permission') {
        useUIStore.getState().showError(
          data.error,
          'Permission Error',
          {
            action: {
              label: 'Reconnect',
              onClick: () => {
                window.location.href = '/connections';
              }
            }
          }
        );
      } else {
        useUIStore.getState().showError(data.error, 'Discovery Failed');
      }

      // Log technical details in development mode
      if (import.meta.env.DEV && data.technicalError) {
        console.error('Technical error details:', data.technicalError);
      }
    });

    this.socket.on('automation:added', (data: { automation: AutomationDiscovery }) => {
      console.log('New automation discovered:', data.automation);
      useAutomationsStore.getState().addAutomation(data.automation);
    });

    this.socket.on('automation:updated', (data: { automationId: string, updates: Partial<AutomationDiscovery> }) => {
      console.log('Automation updated:', data);
      useAutomationsStore.getState().updateAutomation(data.automationId, data.updates);
    });

    this.socket.on('automation:removed', (data: { automationId: string }) => {
      console.log('Automation removed:', data.automationId);
      useAutomationsStore.getState().removeAutomation(data.automationId);
    });

    // System events
    this.socket.on('system:maintenance', (data: { message: string, scheduledAt?: string }) => {
      useUIStore.getState().showWarning(data.message, 'System Maintenance');
    });

    this.socket.on('system:alert', (data: { level: 'info' | 'warning' | 'error', message: string }) => {
      const { showInfo, showWarning, showError } = useUIStore.getState();
      
      switch (data.level) {
        case 'info':
          showInfo(data.message);
          break;
        case 'warning':
          showWarning(data.message);
          break;
        case 'error':
          showError(data.message);
          break;
      }
    });

    // Heartbeat/ping events
    this.socket.on('pong', () => {
      // Server responded to ping, connection is alive
      console.debug('WebSocket heartbeat received');
    });
  }

  /**
   * Setup application event listeners
   */
  private setupEventListeners(): void {
    // Listen for auth changes
    const handleAuthChange = () => {
      const { isAuthenticated } = useAuthStore.getState();
      
      if (isAuthenticated && !this.isConnected()) {
        this.connect();
      } else if (!isAuthenticated && this.isConnected()) {
        this.disconnect();
      }
    };

    // Subscribe to auth store changes
    useAuthStore.subscribe((_state) => {
      handleAuthChange();
    });

    this.eventListeners.set('auth', handleAuthChange);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Network came online, attempting WebSocket reconnection');
      if (!this.isConnected()) {
        this.connect();
      }
    };

    const handleOffline = () => {
      console.log('Network went offline');
      useUIStore.getState().setWebsocketStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.eventListeners.set('online', handleOnline);
    this.eventListeners.set('offline', handleOffline);

    // Listen for tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden, reduce activity
        this.stopHeartbeat();
      } else {
        // Tab became visible, resume full activity
        if (this.isConnected()) {
          this.startHeartbeat();
        } else {
          // Try to reconnect if not connected
          this.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.eventListeners.set('visibility', handleVisibilityChange);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_ATTEMPTS) {
      console.error('Max WebSocket reconnection attempts reached');
      useUIStore.getState().showError('Unable to establish real-time connection');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts); // Exponential backoff
    
    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts + 1}/${RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthError(): Promise<void> {
    const { refreshAccessToken, isAuthenticated } = useAuthStore.getState();
    
    if (!isAuthenticated) {
      console.log('User not authenticated, disconnecting WebSocket');
      this.disconnect();
      return;
    }

    try {
      const success = await refreshAccessToken();
      if (success) {
        console.log('Token refreshed, reconnecting WebSocket');
        this.disconnect();
        await this.connect();
      } else {
        console.error('Token refresh failed, disconnecting WebSocket');
        this.disconnect();
      }
    } catch (error) {
      console.error('Failed to refresh token for WebSocket:', error);
      this.disconnect();
    }
  }

  /**
   * Cleanup all event listeners
   */
  cleanup(): void {
    // Remove window event listeners
    this.eventListeners.forEach((listener, event) => {
      switch (event) {
        case 'online':
          window.removeEventListener('online', listener);
          break;
        case 'offline':
          window.removeEventListener('offline', listener);
          break;
        case 'visibility':
          document.removeEventListener('visibilitychange', listener);
          break;
      }
    });

    this.eventListeners.clear();
    this.disconnect();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    websocketService.cleanup();
  });
}