/**
 * WebSocket Hooks for Type-Safe Message Handling
 * React hooks for consuming validated Socket.io messages
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ConnectionUpdatePayload,
  DiscoveryProgressPayload,
  AutomationDiscoveredPayload,
  SystemNotificationPayload,
  parseWebSocketMessage,
} from '@singura/shared-types';

// WebSocket Configuration
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4201';

/**
 * Base WebSocket hook
 * Manages Socket.io connection lifecycle
 *
 * @returns Socket.io client instance or null
 */
export function useWebSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create Socket.io connection
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}

/**
 * Hook for connection update messages
 * Validates messages before calling handler
 *
 * @param handler - Callback to handle connection updates
 * @param deps - Dependency array for useCallback
 */
export function useConnectionUpdates(
  handler: (payload: ConnectionUpdatePayload) => void,
  deps: React.DependencyList = []
) {
  const socket = useWebSocket();

  const wrappedHandler = useCallback((data: unknown) => {
    try {
      // Validate full message structure
      const message = parseWebSocketMessage({
        type: 'connection:update',
        payload: data,
      });

      if (!message || message.type !== 'connection:update') {
        console.error('[WebSocket] Invalid connection:update message:', data);
        return;
      }

      handler(message.payload);
    } catch (error) {
      console.error('[WebSocket] Error processing connection:update:', error);
    }
  }, [handler, ...deps]);

  useEffect(() => {
    if (!socket) return;

    socket.on('connection:update', wrappedHandler);

    return () => {
      socket.off('connection:update', wrappedHandler);
    };
  }, [socket, wrappedHandler]);
}

/**
 * Hook for discovery progress messages
 * Validates messages before calling handler
 *
 * @param handler - Callback to handle discovery progress
 * @param deps - Dependency array for useCallback
 */
export function useDiscoveryProgress(
  handler: (payload: DiscoveryProgressPayload) => void,
  deps: React.DependencyList = []
) {
  const socket = useWebSocket();

  const wrappedHandler = useCallback((data: unknown) => {
    try {
      // Validate full message structure
      const message = parseWebSocketMessage({
        type: 'discovery:progress',
        payload: data,
      });

      if (!message || message.type !== 'discovery:progress') {
        console.error('[WebSocket] Invalid discovery:progress message:', data);
        return;
      }

      handler(message.payload);
    } catch (error) {
      console.error('[WebSocket] Error processing discovery:progress:', error);
    }
  }, [handler, ...deps]);

  useEffect(() => {
    if (!socket) return;

    socket.on('discovery:progress', wrappedHandler);

    return () => {
      socket.off('discovery:progress', wrappedHandler);
    };
  }, [socket, wrappedHandler]);
}

/**
 * Hook for automation discovered messages
 * Validates messages before calling handler
 *
 * @param handler - Callback to handle automation discovered events
 * @param deps - Dependency array for useCallback
 */
export function useAutomationDiscovered(
  handler: (payload: AutomationDiscoveredPayload) => void,
  deps: React.DependencyList = []
) {
  const socket = useWebSocket();

  const wrappedHandler = useCallback((data: unknown) => {
    try {
      // Validate full message structure
      const message = parseWebSocketMessage({
        type: 'automation:discovered',
        payload: data,
      });

      if (!message || message.type !== 'automation:discovered') {
        console.error('[WebSocket] Invalid automation:discovered message:', data);
        return;
      }

      handler(message.payload);
    } catch (error) {
      console.error('[WebSocket] Error processing automation:discovered:', error);
    }
  }, [handler, ...deps]);

  useEffect(() => {
    if (!socket) return;

    socket.on('automation:discovered', wrappedHandler);

    return () => {
      socket.off('automation:discovered', wrappedHandler);
    };
  }, [socket, wrappedHandler]);
}

/**
 * Hook for system notification messages
 * Validates messages before calling handler
 *
 * @param handler - Callback to handle system notifications
 * @param deps - Dependency array for useCallback
 */
export function useSystemNotifications(
  handler: (payload: SystemNotificationPayload) => void,
  deps: React.DependencyList = []
) {
  const socket = useWebSocket();

  const wrappedHandler = useCallback((data: unknown) => {
    try {
      // Validate full message structure
      const message = parseWebSocketMessage({
        type: 'system:notification',
        payload: data,
      });

      if (!message || message.type !== 'system:notification') {
        console.error('[WebSocket] Invalid system:notification message:', data);
        return;
      }

      handler(message.payload);
    } catch (error) {
      console.error('[WebSocket] Error processing system:notification:', error);
    }
  }, [handler, ...deps]);

  useEffect(() => {
    if (!socket) return;

    socket.on('system:notification', wrappedHandler);

    return () => {
      socket.off('system:notification', wrappedHandler);
    };
  }, [socket, wrappedHandler]);
}

/**
 * Hook for raw Socket.io events (for admin dashboard and debug purposes)
 * Does NOT validate - use type-safe hooks above for production code
 *
 * @param eventName - Socket.io event name
 * @param handler - Callback to handle event
 * @param deps - Dependency array for useCallback
 */
export function useSocketEvent<T = unknown>(
  eventName: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const socket = useWebSocket();

  const wrappedHandler = useCallback((data: T) => {
    try {
      // Basic type checking - ensure it's an object if expected
      if (data !== null && typeof data === 'object') {
        handler(data);
      } else {
        console.warn(`[WebSocket] Unexpected data type for ${eventName}:`, typeof data);
        handler(data); // Still call handler but log warning
      }
    } catch (error) {
      console.error(`[WebSocket] Error processing ${eventName}:`, error);
    }
  }, [eventName, handler, ...deps]);

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, wrappedHandler);

    return () => {
      socket.off(eventName, wrappedHandler);
    };
  }, [socket, eventName, wrappedHandler]);
}
