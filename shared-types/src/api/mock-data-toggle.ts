/**
 * Mock Data Toggle API Types
 * Development-only interfaces for runtime mock data control
 */

/**
 * Mock data toggle state interface
 */
export interface MockDataToggleState {
  enabled: boolean;
  environment: 'development' | 'production' | 'test';
  lastModified: Date;
  modifiedBy?: string;
  initialSource: 'environment' | 'runtime' | 'default';
}

/**
 * Mock data toggle response from API
 */
export interface MockDataToggleResponse {
  success: boolean;
  state: MockDataToggleState;
  message?: string;
  securityCheck: {
    isDevelopment: boolean;
    toggleAllowed: boolean;
    productionModeBlocked: boolean;
  };
}

/**
 * Mock data toggle update request
 */
export interface MockDataToggleRequest {
  enabled: boolean;
  requestedBy?: string;
  reason?: string;
}

/**
 * Development environment validation result
 */
export interface DevelopmentEnvironmentCheck {
  isValid: boolean;
  environment: string;
  toggleEnabled: boolean;
  securityReasons: string[];
}

/**
 * Mock data audit log entry
 */
export interface MockDataAuditEntry {
  timestamp: Date;
  action: 'toggle_enabled' | 'toggle_disabled' | 'toggle_accessed' | 'production_blocked';
  previousState: boolean;
  newState: boolean;
  triggeredBy: string;
  environment: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Type guard for mock data toggle state validation
 */
export function isValidMockDataToggleState(value: unknown): value is MockDataToggleState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    'environment' in value &&
    'lastModified' in value &&
    typeof (value as any).enabled === 'boolean' &&
    ['development', 'production', 'test'].includes((value as any).environment) &&
    (value as any).lastModified instanceof Date
  );
}

/**
 * Development-only endpoint security wrapper
 * Ensures endpoints are completely inaccessible in production
 */
export type DevelopmentOnlyEndpoint<T> = {
  development: T;
  production: never;
  test: T;
};