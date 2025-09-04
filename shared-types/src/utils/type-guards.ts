/**
 * Type guards and runtime type validation utilities
 * Used for validating external data and eliminating 'any' types
 */

import { UUID, ValidationResult, ValidationError } from './common';
import { APIResponse } from '../api/responses';

/**
 * Basic type guard utilities
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }
  
  if (!itemGuard) {
    return true;
  }
  
  return value.every(itemGuard);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUUID(value: unknown): value is UUID {
  if (!isString(value)) {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isEmail(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isURL(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Composite type guards for database-related types
 */
export interface QueryParams {
  [key: string]: string | number | boolean | Date | null | undefined;
}

export function isQueryParams(value: unknown): value is QueryParams {
  if (!isObject(value)) {
    return false;
  }
  
  return Object.values(value).every(v => 
    v === null || 
    v === undefined || 
    isString(v) || 
    isNumber(v) || 
    isBoolean(v) || 
    isDate(v)
  );
}

export interface QueryParameterArray extends Array<string | number | boolean | Date | null> {}

export function isQueryParameterArray(value: unknown): value is QueryParameterArray {
  return isArray(value, (item): item is string | number | boolean | Date | null =>
    item === null || isString(item) || isNumber(item) || isBoolean(item) || isDate(item)
  );
}

/**
 * Database result type guards
 */
export interface DatabaseRow {
  [column: string]: unknown;
}

export function isDatabaseRow(value: unknown): value is DatabaseRow {
  return isObject(value);
}

export function isDatabaseRowArray(value: unknown): value is DatabaseRow[] {
  return isArray(value, isDatabaseRow);
}

/**
 * OAuth and platform-specific type guards
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export function isOAuthTokenResponse(value: unknown): value is OAuthTokenResponse {
  if (!isObject(value)) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.access_token)) {
    return false;
  }
  
  if (obj.refresh_token !== undefined && !isString(obj.refresh_token)) {
    return false;
  }
  
  if (obj.expires_in !== undefined && !isNumber(obj.expires_in)) {
    return false;
  }
  
  if (obj.scope !== undefined && !isString(obj.scope)) {
    return false;
  }
  
  if (obj.token_type !== undefined && !isString(obj.token_type)) {
    return false;
  }
  
  return true;
}

/**
 * Platform API response type guards
 */
export interface SlackUser {
  id: string;
  name?: string;
  real_name?: string;
  is_bot?: boolean;
  deleted?: boolean;
}

export function isSlackUser(value: unknown): value is SlackUser {
  if (!isObject(value)) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.id)) {
    return false;
  }
  
  if (obj.name !== undefined && !isString(obj.name)) {
    return false;
  }
  
  if (obj.real_name !== undefined && !isString(obj.real_name)) {
    return false;
  }
  
  if (obj.is_bot !== undefined && !isBoolean(obj.is_bot)) {
    return false;
  }
  
  if (obj.deleted !== undefined && !isBoolean(obj.deleted)) {
    return false;
  }
  
  return true;
}

export interface MicrosoftUser {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
}

export function isMicrosoftUser(value: unknown): value is MicrosoftUser {
  if (!isObject(value)) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.id)) {
    return false;
  }
  
  if (obj.displayName !== undefined && !isString(obj.displayName)) {
    return false;
  }
  
  if (obj.userPrincipalName !== undefined && !isString(obj.userPrincipalName)) {
    return false;
  }
  
  if (obj.mail !== undefined && !isString(obj.mail)) {
    return false;
  }
  
  return true;
}

/**
 * Event and notification type guards
 */
export interface EventData {
  type: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  organizationId?: string;
  userId?: string;
}

export function isEventData(value: unknown): value is EventData {
  if (!isObject(value)) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.type)) {
    return false;
  }
  
  if (!isDate(obj.timestamp)) {
    return false;
  }
  
  if (!isObject(obj.payload)) {
    return false;
  }
  
  if (obj.organizationId !== undefined && !isString(obj.organizationId)) {
    return false;
  }
  
  if (obj.userId !== undefined && !isString(obj.userId)) {
    return false;
  }
  
  return true;
}

/**
 * Job queue and background task type guards
 */
export interface JobData {
  organizationId: string;
  connectionId?: string;
  [key: string]: unknown;
}

export function isJobData(value: unknown): value is JobData {
  if (!isObject(value)) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.organizationId)) {
    return false;
  }
  
  if (obj.connectionId !== undefined && !isString(obj.connectionId)) {
    return false;
  }
  
  return true;
}

/**
 * HTTP request/response type guards
 */
export interface HTTPHeaders {
  [header: string]: string | string[] | undefined;
}

export function isHTTPHeaders(value: unknown): value is HTTPHeaders {
  if (!isObject(value)) {
    return false;
  }
  
  return Object.values(value).every(v => 
    v === undefined || 
    isString(v) || 
    (isArray(v) && v.every(isString))
  );
}

export function isAPIResponse<T>(
  value: unknown, 
  dataGuard?: (data: unknown) => data is T
): value is APIResponse<T> {
  if (!isObject(value)) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  if (!isBoolean(obj.success)) {
    return false;
  }
  
  if (obj.data !== undefined && dataGuard && !dataGuard(obj.data)) {
    return false;
  }
  
  if (obj.error !== undefined && !isString(obj.error)) {
    return false;
  }
  
  if (obj.message !== undefined && !isString(obj.message)) {
    return false;
  }
  
  return true;
}

/**
 * Validation utility functions
 */
export function validateWithGuard<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  fieldName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!guard(value)) {
    errors.push({
      field: fieldName,
      code: 'INVALID_TYPE',
      message: `Invalid type for field ${fieldName}`,
      value
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateObjectShape<T>(
  value: unknown,
  shape: { [K in keyof T]: (value: unknown) => value is T[K] },
  objectName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!isObject(value)) {
    errors.push({
      field: objectName,
      code: 'NOT_OBJECT',
      message: `Expected ${objectName} to be an object`,
      value
    });
    
    return { isValid: false, errors };
  }
  
  Object.entries(shape).forEach(([key, guard]) => {
    const fieldValue = (value as Record<string, unknown>)[key];
    const result = validateWithGuard(fieldValue, guard as (value: unknown) => value is unknown, `${objectName}.${key}`);
    errors.push(...result.errors);
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Safe type casting with runtime validation
 */
export function safeCast<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  fallback: T
): T {
  return guard(value) ? value : fallback;
}

export function safeCastOrThrow<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage: string
): T {
  if (guard(value)) {
    return value;
  }
  
  throw new Error(`${errorMessage}. Received: ${JSON.stringify(value)}`);
}