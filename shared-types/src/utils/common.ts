/**
 * Common utility types used across the application
 */

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown> 
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * Make specified properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specified properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract keys of T where values are of type U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Create a union of all possible dot-notation paths in an object
 */
export type DotNotation<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? `${Prefix}${K & string}` | DotNotation<T[K], `${Prefix}${K & string}.`>
    : `${Prefix}${K & string}`;
}[keyof T];

/**
 * Extract the type at a dot-notation path
 */
export type PathValue<T, P extends string> = 
  P extends keyof T
    ? T[P]
    : P extends `${infer K}.${infer R}`
      ? K extends keyof T
        ? PathValue<T[K], R>
        : never
      : never;

/**
 * Discriminated union helper
 */
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = 
  T extends Record<K, V> ? T : never;

/**
 * API response wrapper
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Brand type for nominal typing
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * ISO date string
 */
export type ISODateString = Brand<string, 'ISODateString'>;

/**
 * UUID v4 string
 */
export type UUID = Brand<string, 'UUID'>;

/**
 * Email address string
 */
export type EmailAddress = Brand<string, 'EmailAddress'>;

/**
 * URL string
 */
export type URLString = Brand<string, 'URLString'>;

/**
 * JSON string
 */
export type JSONString = Brand<string, 'JSONString'>;

/**
 * Base64 encoded string
 */
export type Base64String = Brand<string, 'Base64String'>;

/**
 * Encrypted data string
 */
export type EncryptedString = Brand<string, 'EncryptedString'>;

/**
 * Environment variable type
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * HTTP methods
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Content types
 */
export type ContentType = 
  | 'application/json'
  | 'application/xml'
  | 'text/plain'
  | 'text/html'
  | 'multipart/form-data'
  | 'application/x-www-form-urlencoded';

/**
 * Timestamp utilities
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteTimestamps extends Timestamps {
  deletedAt?: Date;
}

/**
 * Pagination utilities
 */
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Sorting utilities
 */
export interface SortParams {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  nullsFirst?: boolean;
}

/**
 * Filter utilities
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface TextSearchFilter {
  searchTerm?: string;
  searchFields?: string[];
  exactMatch?: boolean;
  caseSensitive?: boolean;
}

/**
 * API key structure
 */
export interface APIKey {
  id: UUID;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

/**
 * Rate limiting types
 */
export interface RateLimit {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

/**
 * Event types for system events
 */
export interface SystemEvent<T = unknown> {
  id: UUID;
  type: string;
  timestamp: Date;
  source: string;
  data: T;
  userId?: UUID;
  organizationId?: UUID;
  correlationId?: string;
}

/**
 * Configuration types
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  conditions?: Record<string, unknown>;
}

export interface ConfigValue<T = unknown> {
  key: string;
  value: T;
  environment: Environment;
  encrypted: boolean;
  updatedAt: Date;
}

/**
 * Health check types
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: ServiceHealth[];
  metadata?: Record<string, unknown>;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

/**
 * Metrics and monitoring
 */
export interface MetricValue {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Notification types
 */
export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  enabled: boolean;
  configuration: Record<string, unknown>;
}

export interface NotificationTemplate {
  id: UUID;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  channels: NotificationChannel[];
}

/**
 * Utility functions type definitions
 */
export type TypeGuard<T> = (value: unknown) => value is T;
export type Validator<T> = (value: T) => ValidationResult;
export type Transformer<T, U> = (input: T) => U;
export type AsyncTransformer<T, U> = (input: T) => Promise<U>;

/**
 * Cache types
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
}