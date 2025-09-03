/**
 * API Error type definitions
 * Standardized error types and codes for the SaaS X-Ray API
 */

/**
 * Standard HTTP status codes
 */
export enum HTTPStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Application-specific error codes
 */
export enum ErrorCode {
  // Authentication and Authorization
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  MFA_REQUIRED = 'MFA_REQUIRED',
  INVALID_MFA_CODE = 'INVALID_MFA_CODE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  
  // User Management
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_INACTIVE = 'USER_INACTIVE',
  INVALID_USER_ROLE = 'INVALID_USER_ROLE',
  USER_LIMIT_EXCEEDED = 'USER_LIMIT_EXCEEDED',
  INVITATION_EXPIRED = 'INVITATION_EXPIRED',
  INVITATION_ALREADY_USED = 'INVITATION_ALREADY_USED',
  
  // Organization Management
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  ORGANIZATION_LIMIT_EXCEEDED = 'ORGANIZATION_LIMIT_EXCEEDED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
  BILLING_ISSUE = 'BILLING_ISSUE',
  
  // Platform Connections
  CONNECTION_NOT_FOUND = 'CONNECTION_NOT_FOUND',
  CONNECTION_ALREADY_EXISTS = 'CONNECTION_ALREADY_EXISTS',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  OAUTH_ERROR = 'OAUTH_ERROR',
  OAUTH_STATE_MISMATCH = 'OAUTH_STATE_MISMATCH',
  OAUTH_CODE_EXPIRED = 'OAUTH_CODE_EXPIRED',
  INVALID_OAUTH_SCOPES = 'INVALID_OAUTH_SCOPES',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  CONNECTION_LIMIT_EXCEEDED = 'CONNECTION_LIMIT_EXCEEDED',
  
  // Discovery and Automations
  AUTOMATION_NOT_FOUND = 'AUTOMATION_NOT_FOUND',
  DISCOVERY_IN_PROGRESS = 'DISCOVERY_IN_PROGRESS',
  DISCOVERY_FAILED = 'DISCOVERY_FAILED',
  PLATFORM_API_ERROR = 'PLATFORM_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS_PLATFORM = 'INSUFFICIENT_PERMISSIONS_PLATFORM',
  
  // Data Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALUE_TOO_LONG = 'VALUE_TOO_LONG',
  VALUE_TOO_SHORT = 'VALUE_TOO_SHORT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  
  // System and Infrastructure
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Business Logic
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  DEPENDENCY_EXISTS = 'DEPENDENCY_EXISTS',
  
  // Security
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  IP_BLOCKED = 'IP_BLOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_ENCRYPTION_ERROR = 'DATA_ENCRYPTION_ERROR',
  
  // Compliance and Audit
  AUDIT_LOG_ERROR = 'AUDIT_LOG_ERROR',
  RETENTION_POLICY_VIOLATION = 'RETENTION_POLICY_VIOLATION',
  GDPR_VIOLATION = 'GDPR_VIOLATION',
  DATA_EXPORT_ERROR = 'DATA_EXPORT_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Comprehensive error response structure
 */
export interface ErrorResponse {
  /** Whether the request was successful */
  success: false;
  
  /** Error information */
  error: APIErrorDetails;
  
  /** Request correlation ID */
  requestId?: string;
  
  /** Error timestamp */
  timestamp: Date;
  
  /** API version */
  version: string;
}

/**
 * Detailed error information
 */
export interface APIErrorDetails {
  /** Application-specific error code */
  code: ErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** HTTP status code */
  statusCode: HTTPStatusCode;
  
  /** Error severity */
  severity: ErrorSeverity;
  
  /** Additional error context */
  details?: ErrorDetails;
  
  /** Field-specific validation errors */
  fieldErrors?: FieldValidationError[];
  
  /** Suggested actions for resolution */
  suggestions?: string[];
  
  /** Related documentation links */
  documentationUrls?: string[];
  
  /** Error trace ID for debugging */
  traceId?: string;
  
  /** Stack trace (development only) */
  stackTrace?: string;
}

/**
 * Additional error context and metadata
 */
export interface ErrorDetails {
  /** Resource that caused the error */
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  
  /** Operation that was attempted */
  operation?: string;
  
  /** External service error details */
  externalError?: {
    service: string;
    code?: string;
    message?: string;
    statusCode?: number;
  };
  
  /** Rate limiting information */
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
  };
  
  /** Validation context */
  validation?: {
    schema?: string;
    rule?: string;
    constraint?: string;
  };
  
  /** Security context */
  security?: {
    ipAddress?: string;
    userAgent?: string;
    attemptCount?: number;
    blockDuration?: number;
  };
  
  /** Platform-specific error details */
  platform?: {
    name: string;
    error: string;
    code?: string;
    rateLimitHit?: boolean;
    permissionMissing?: string[];
  };
}

/**
 * Field-specific validation error
 */
export interface FieldValidationError {
  /** Field path (dot notation for nested fields) */
  field: string;
  
  /** Error code specific to this field */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Invalid value that was provided */
  value?: unknown;
  
  /** Expected format or constraint */
  expected?: string;
  
  /** Additional validation context */
  context?: Record<string, unknown>;
}

/**
 * Predefined error messages for common scenarios
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication and Authorization
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password provided',
  [ErrorCode.EXPIRED_TOKEN]: 'Authentication token has expired',
  [ErrorCode.INVALID_TOKEN]: 'Invalid authentication token provided',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ErrorCode.MFA_REQUIRED]: 'Multi-factor authentication is required',
  [ErrorCode.INVALID_MFA_CODE]: 'Invalid MFA code provided',
  [ErrorCode.ACCOUNT_LOCKED]: 'Your account has been temporarily locked due to security concerns',
  [ErrorCode.PASSWORD_EXPIRED]: 'Your password has expired and must be changed',
  
  // User Management
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_ALREADY_EXISTS]: 'A user with this email already exists',
  [ErrorCode.USER_INACTIVE]: 'User account is inactive',
  [ErrorCode.INVALID_USER_ROLE]: 'Invalid user role specified',
  [ErrorCode.USER_LIMIT_EXCEEDED]: 'Maximum number of users exceeded for your organization',
  [ErrorCode.INVITATION_EXPIRED]: 'User invitation has expired',
  [ErrorCode.INVITATION_ALREADY_USED]: 'This invitation has already been used',
  
  // Organization Management
  [ErrorCode.ORGANIZATION_NOT_FOUND]: 'Organization not found',
  [ErrorCode.ORGANIZATION_LIMIT_EXCEEDED]: 'Organization limits exceeded',
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Your subscription has expired',
  [ErrorCode.FEATURE_NOT_AVAILABLE]: 'This feature is not available in your current plan',
  [ErrorCode.BILLING_ISSUE]: 'There is an issue with your billing information',
  
  // Platform Connections
  [ErrorCode.CONNECTION_NOT_FOUND]: 'Platform connection not found',
  [ErrorCode.CONNECTION_ALREADY_EXISTS]: 'A connection to this platform already exists',
  [ErrorCode.CONNECTION_FAILED]: 'Failed to establish platform connection',
  [ErrorCode.OAUTH_ERROR]: 'OAuth authentication failed',
  [ErrorCode.OAUTH_STATE_MISMATCH]: 'OAuth state parameter mismatch',
  [ErrorCode.OAUTH_CODE_EXPIRED]: 'OAuth authorization code has expired',
  [ErrorCode.INVALID_OAUTH_SCOPES]: 'Invalid or insufficient OAuth scopes',
  [ErrorCode.TOKEN_REFRESH_FAILED]: 'Failed to refresh access token',
  [ErrorCode.CONNECTION_LIMIT_EXCEEDED]: 'Maximum number of connections exceeded',
  
  // Discovery and Automations
  [ErrorCode.AUTOMATION_NOT_FOUND]: 'Automation not found',
  [ErrorCode.DISCOVERY_IN_PROGRESS]: 'Discovery is already in progress for this connection',
  [ErrorCode.DISCOVERY_FAILED]: 'Automation discovery failed',
  [ErrorCode.PLATFORM_API_ERROR]: 'Platform API returned an error',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'API rate limit exceeded',
  [ErrorCode.INSUFFICIENT_PERMISSIONS_PLATFORM]: 'Insufficient permissions on the connected platform',
  
  // Data Validation
  [ErrorCode.VALIDATION_ERROR]: 'Request validation failed',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FORMAT]: 'Invalid format provided',
  [ErrorCode.VALUE_TOO_LONG]: 'Value exceeds maximum length',
  [ErrorCode.VALUE_TOO_SHORT]: 'Value is below minimum length',
  [ErrorCode.INVALID_EMAIL]: 'Invalid email address format',
  [ErrorCode.WEAK_PASSWORD]: 'Password does not meet security requirements',
  
  // System and Infrastructure
  [ErrorCode.INTERNAL_ERROR]: 'An internal server error occurred',
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service is unavailable',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
  [ErrorCode.TIMEOUT_ERROR]: 'Request timeout occurred',
  
  // Business Logic
  [ErrorCode.RESOURCE_CONFLICT]: 'Resource conflict detected',
  [ErrorCode.INVALID_STATE_TRANSITION]: 'Invalid state transition attempted',
  [ErrorCode.OPERATION_NOT_ALLOWED]: 'Operation not allowed in current state',
  [ErrorCode.DEPENDENCY_EXISTS]: 'Cannot delete resource with existing dependencies',
  
  // Security
  [ErrorCode.SECURITY_VIOLATION]: 'Security policy violation detected',
  [ErrorCode.IP_BLOCKED]: 'Your IP address has been temporarily blocked',
  [ErrorCode.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected',
  [ErrorCode.DATA_ENCRYPTION_ERROR]: 'Data encryption/decryption failed',
  
  // Compliance and Audit
  [ErrorCode.AUDIT_LOG_ERROR]: 'Failed to create audit log entry',
  [ErrorCode.RETENTION_POLICY_VIOLATION]: 'Operation violates data retention policy',
  [ErrorCode.GDPR_VIOLATION]: 'Operation violates GDPR compliance requirements',
  [ErrorCode.DATA_EXPORT_ERROR]: 'Data export operation failed',
};

/**
 * Error factory functions for common error types
 */
export class APIErrorFactory {
  /**
   * Create a validation error
   */
  static validation(
    fieldErrors: FieldValidationError[],
    message = 'Request validation failed'
  ): APIErrorDetails {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message,
      statusCode: HTTPStatusCode.BAD_REQUEST,
      severity: ErrorSeverity.LOW,
      fieldErrors,
    };
  }
  
  /**
   * Create an authentication error
   */
  static authentication(
    code: ErrorCode = ErrorCode.INVALID_CREDENTIALS,
    details?: Partial<ErrorDetails>
  ): APIErrorDetails {
    return {
      code,
      message: ERROR_MESSAGES[code],
      statusCode: HTTPStatusCode.UNAUTHORIZED,
      severity: ErrorSeverity.MEDIUM,
      details,
    };
  }
  
  /**
   * Create an authorization error
   */
  static authorization(
    resource?: string,
    operation?: string
  ): APIErrorDetails {
    return {
      code: ErrorCode.INSUFFICIENT_PERMISSIONS,
      message: ERROR_MESSAGES[ErrorCode.INSUFFICIENT_PERMISSIONS],
      statusCode: HTTPStatusCode.FORBIDDEN,
      severity: ErrorSeverity.MEDIUM,
      details: { resource: { type: resource || 'unknown', id: 'unknown' }, operation },
    };
  }
  
  /**
   * Create a not found error
   */
  static notFound(
    resourceType: string,
    resourceId: string
  ): APIErrorDetails {
    return {
      code: ErrorCode.USER_NOT_FOUND, // This would be dynamic based on resource type
      message: `${resourceType} not found`,
      statusCode: HTTPStatusCode.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      details: {
        resource: { type: resourceType, id: resourceId },
      },
    };
  }
  
  /**
   * Create a rate limiting error
   */
  static rateLimited(
    limit: number,
    resetAt: Date,
    retryAfter?: number
  ): APIErrorDetails {
    return {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: ERROR_MESSAGES[ErrorCode.RATE_LIMIT_EXCEEDED],
      statusCode: HTTPStatusCode.TOO_MANY_REQUESTS,
      severity: ErrorSeverity.MEDIUM,
      details: {
        rateLimit: {
          limit,
          remaining: 0,
          resetAt,
          retryAfter,
        },
      },
    };
  }
  
  /**
   * Create an internal server error
   */
  static internal(
    message = 'An internal server error occurred',
    traceId?: string
  ): APIErrorDetails {
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message,
      statusCode: HTTPStatusCode.INTERNAL_SERVER_ERROR,
      severity: ErrorSeverity.CRITICAL,
      traceId,
    };
  }
}