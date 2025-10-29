/**
 * WebSocket Message Schemas and Validation
 * Defines all Socket.io message types with Zod validation for runtime type safety
 */

import { z } from 'zod';

// ============================================================================
// Platform and Status Enums (WebSocket-specific)
// ============================================================================

export const WSPlatformSchema = z.enum(['slack', 'google', 'microsoft']);
export type WSPlatform = z.infer<typeof WSPlatformSchema>;

export const WSConnectionStatusSchema = z.enum(['connected', 'disconnected', 'error', 'refreshing']);
export type WSConnectionStatus = z.infer<typeof WSConnectionStatusSchema>;

export const WSDiscoveryStatusSchema = z.enum(['in_progress', 'completed', 'failed']);
export type WSDiscoveryStatus = z.infer<typeof WSDiscoveryStatusSchema>;

export const WSRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type WSRiskLevel = z.infer<typeof WSRiskLevelSchema>;

export const WSNotificationLevelSchema = z.enum(['info', 'warning', 'error']);
export type WSNotificationLevel = z.infer<typeof WSNotificationLevelSchema>;

// ============================================================================
// Message Payload Schemas
// ============================================================================

/**
 * Connection Update Message
 * Sent when connection status changes (connected, disconnected, error, refreshing)
 */
export const ConnectionUpdatePayloadSchema = z.object({
  connectionId: z.string().uuid(),
  status: WSConnectionStatusSchema,
  platform: WSPlatformSchema,
  timestamp: z.string().datetime(),
  error: z.string().optional(),
});
export type ConnectionUpdatePayload = z.infer<typeof ConnectionUpdatePayloadSchema>;

/**
 * Discovery Progress Message
 * Sent during discovery to update progress (0-100)
 */
export const DiscoveryProgressPayloadSchema = z.object({
  connectionId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  status: WSDiscoveryStatusSchema,
  itemsFound: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  stage: z.string().optional(), // 'initializing', 'connecting', 'analyzing', etc.
  message: z.string().optional(),
});
export type DiscoveryProgressPayload = z.infer<typeof DiscoveryProgressPayloadSchema>;

/**
 * Automation Discovered Message
 * Sent when a new automation is discovered
 */
export const AutomationDiscoveredPayloadSchema = z.object({
  automationId: z.string().uuid(),
  name: z.string(),
  platform: WSPlatformSchema,
  riskLevel: WSRiskLevelSchema,
  timestamp: z.string().datetime(),
  riskScore: z.number().min(0).max(100).optional(),
  type: z.string().optional(), // 'bot', 'workflow', 'integration', etc.
});
export type AutomationDiscoveredPayload = z.infer<typeof AutomationDiscoveredPayloadSchema>;

/**
 * System Notification Message
 * System-level notifications (info, warning, error)
 */
export const SystemNotificationPayloadSchema = z.object({
  level: WSNotificationLevelSchema,
  message: z.string(),
  timestamp: z.string().datetime(),
  title: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type SystemNotificationPayload = z.infer<typeof SystemNotificationPayloadSchema>;

// ============================================================================
// Full Message Schemas (with type discriminator)
// ============================================================================

/**
 * Connection Update Message
 */
export const ConnectionUpdateSchema = z.object({
  type: z.literal('connection:update'),
  payload: ConnectionUpdatePayloadSchema,
});
export type ConnectionUpdate = z.infer<typeof ConnectionUpdateSchema>;

/**
 * Discovery Progress Message
 */
export const DiscoveryProgressSchema = z.object({
  type: z.literal('discovery:progress'),
  payload: DiscoveryProgressPayloadSchema,
});
export type DiscoveryProgress = z.infer<typeof DiscoveryProgressSchema>;

/**
 * Automation Discovered Message
 */
export const AutomationDiscoveredSchema = z.object({
  type: z.literal('automation:discovered'),
  payload: AutomationDiscoveredPayloadSchema,
});
export type AutomationDiscovered = z.infer<typeof AutomationDiscoveredSchema>;

/**
 * System Notification Message
 */
export const SystemNotificationSchema = z.object({
  type: z.literal('system:notification'),
  payload: SystemNotificationPayloadSchema,
});
export type SystemNotification = z.infer<typeof SystemNotificationSchema>;

// ============================================================================
// Discriminated Union for All Message Types
// ============================================================================

/**
 * WebSocket Message Schema
 * Discriminated union of all message types using the 'type' field
 */
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  ConnectionUpdateSchema,
  DiscoveryProgressSchema,
  AutomationDiscoveredSchema,
  SystemNotificationSchema,
]);
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a WebSocket message against the schema
 * @param data - Raw data to validate
 * @returns Validation result with parsed data or error
 */
export function validateWebSocketMessage(data: unknown): {
  success: boolean;
  data?: WebSocketMessage;
  error?: string;
} {
  try {
    const parsed = WebSocketMessageSchema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Type guard to check if data is a valid WebSocket message
 * @param data - Data to check
 * @returns True if data is a valid WebSocket message
 */
export function isWebSocketMessage(data: unknown): data is WebSocketMessage {
  return WebSocketMessageSchema.safeParse(data).success;
}

/**
 * Safe parse that returns null on failure (for optional validation)
 * @param data - Data to parse
 * @returns Parsed message or null
 */
export function parseWebSocketMessage(data: unknown): WebSocketMessage | null {
  const result = WebSocketMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}
