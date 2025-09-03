/**
 * OAuth Credentials type definitions
 * Secure handling and management of OAuth tokens and credentials
 */

/**
 * OAuth 2.0 grant types
 */
export type OAuthGrantType = 
  | 'authorization_code'
  | 'client_credentials'
  | 'refresh_token'
  | 'device_code';

/**
 * OAuth token types
 */
export type TokenType = 'Bearer' | 'MAC';

/**
 * OAuth credential encryption status
 */
export type EncryptionStatus = 'encrypted' | 'decrypted' | 'error';

/**
 * Core OAuth credentials structure
 */
export interface OAuthCredentials {
  /** Access token for API calls */
  accessToken: string;
  
  /** Refresh token for token renewal */
  refreshToken?: string;
  
  /** Token type (typically Bearer) */
  tokenType: TokenType;
  
  /** Token expiration timestamp */
  expiresAt?: Date;
  
  /** Granted scopes */
  scope: string[];
  
  /** Token issue timestamp */
  issuedAt: Date;
  
  /** Platform-specific user ID */
  platformUserId?: string;
  
  /** Platform workspace/organization ID */
  platformWorkspaceId?: string;
  
  /** Additional platform-specific data */
  platformData?: Record<string, unknown>;
}

/**
 * Encrypted OAuth credentials for storage
 */
export interface EncryptedOAuthCredentials {
  /** Encrypted access token */
  encryptedAccessToken: string;
  
  /** Encrypted refresh token */
  encryptedRefreshToken?: string;
  
  /** Token metadata (unencrypted) */
  metadata: OAuthTokenMetadata;
  
  /** Encryption information */
  encryption: {
    algorithm: string;
    keyVersion: string;
    encryptedAt: Date;
  };
  
  /** Token validation hash for integrity */
  hash: string;
}

/**
 * OAuth token metadata (safe to store unencrypted)
 */
export interface OAuthTokenMetadata {
  /** Token type */
  tokenType: TokenType;
  
  /** Expiration timestamp */
  expiresAt?: Date;
  
  /** Issue timestamp */
  issuedAt: Date;
  
  /** Granted scopes */
  scope: string[];
  
  /** Platform user ID */
  platformUserId?: string;
  
  /** Platform workspace ID */
  platformWorkspaceId?: string;
  
  /** Token status */
  status: 'active' | 'expired' | 'revoked' | 'invalid';
  
  /** Last used timestamp */
  lastUsedAt?: Date;
  
  /** Usage statistics */
  usageStats: {
    totalRequests: number;
    successfulRequests: number;
    lastRequestAt?: Date;
    rateLimitHits: number;
  };
}

/**
 * OAuth token validation result
 */
export interface TokenValidation {
  /** Whether token is valid */
  isValid: boolean;
  
  /** Validation timestamp */
  validatedAt: Date;
  
  /** Token status */
  status: 'valid' | 'expired' | 'revoked' | 'invalid' | 'malformed';
  
  /** Time until expiration (if applicable) */
  expiresIn?: number;
  
  /** Validation errors */
  errors?: string[];
  
  /** Platform response (if validated with platform) */
  platformResponse?: {
    userId?: string;
    workspaceId?: string;
    permissions?: string[];
    rateLimitRemaining?: number;
  };
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  /** Whether refresh was successful */
  success: boolean;
  
  /** New credentials (if successful) */
  credentials?: OAuthCredentials;
  
  /** Error information (if failed) */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  
  /** Refresh timestamp */
  refreshedAt: Date;
  
  /** Next refresh recommendation */
  nextRefreshAt?: Date;
}

/**
 * OAuth credential encryption/decryption operations
 */
export interface CredentialCrypto {
  /**
   * Encrypt OAuth credentials for storage
   */
  encrypt(credentials: OAuthCredentials): Promise<EncryptedOAuthCredentials>;
  
  /**
   * Decrypt OAuth credentials for use
   */
  decrypt(encrypted: EncryptedOAuthCredentials): Promise<OAuthCredentials>;
  
  /**
   * Validate credential integrity
   */
  validateIntegrity(encrypted: EncryptedOAuthCredentials): Promise<boolean>;
  
  /**
   * Rotate encryption key
   */
  rotateKey(encrypted: EncryptedOAuthCredentials): Promise<EncryptedOAuthCredentials>;
}

/**
 * OAuth token manager interface
 */
export interface TokenManager {
  /**
   * Store credentials securely
   */
  store(
    connectionId: string, 
    credentials: OAuthCredentials
  ): Promise<void>;
  
  /**
   * Retrieve credentials
   */
  retrieve(connectionId: string): Promise<OAuthCredentials | null>;
  
  /**
   * Validate token and refresh if needed
   */
  validateAndRefresh(connectionId: string): Promise<OAuthCredentials>;
  
  /**
   * Revoke token
   */
  revoke(connectionId: string): Promise<void>;
  
  /**
   * Check token expiration
   */
  checkExpiration(connectionId: string): Promise<TokenValidation>;
  
  /**
   * Get usage statistics
   */
  getUsageStats(connectionId: string): Promise<OAuthTokenMetadata['usageStats']>;
}

/**
 * Platform-specific credential configurations
 */
export interface PlatformCredentialConfig {
  /** Platform identifier */
  platform: string;
  
  /** Token refresh settings */
  refresh: {
    /** Enable automatic refresh */
    enabled: boolean;
    
    /** Refresh buffer time before expiration (in seconds) */
    bufferSeconds: number;
    
    /** Maximum retry attempts */
    maxRetries: number;
    
    /** Retry delay multiplier */
    retryDelayMultiplier: number;
  };
  
  /** Token validation settings */
  validation: {
    /** Enable periodic validation */
    enabled: boolean;
    
    /** Validation interval in minutes */
    intervalMinutes: number;
    
    /** Validate against platform API */
    validateWithPlatform: boolean;
  };
  
  /** Security settings */
  security: {
    /** Encryption algorithm */
    encryptionAlgorithm: string;
    
    /** Key rotation interval in days */
    keyRotationDays: number;
    
    /** Enable audit logging */
    auditLogging: boolean;
  };
  
  /** Rate limiting */
  rateLimit: {
    /** Requests per minute */
    requestsPerMinute: number;
    
    /** Burst limit */
    burstLimit: number;
    
    /** Backoff strategy */
    backoffStrategy: 'exponential' | 'linear' | 'fixed';
  };
}

/**
 * Credential security audit event
 */
export interface CredentialAuditEvent {
  /** Event ID */
  id: string;
  
  /** Connection ID */
  connectionId: string;
  
  /** Event type */
  eventType: 
    | 'credential_stored'
    | 'credential_retrieved'
    | 'credential_refreshed'
    | 'credential_revoked'
    | 'credential_expired'
    | 'validation_failed'
    | 'encryption_key_rotated'
    | 'suspicious_usage';
  
  /** Event timestamp */
  timestamp: Date;
  
  /** User or system that triggered the event */
  triggeredBy: {
    type: 'user' | 'system' | 'automated';
    id: string;
    name?: string;
  };
  
  /** Event details */
  details: {
    /** Previous token status */
    previousStatus?: string;
    
    /** New token status */
    newStatus?: string;
    
    /** Error information */
    error?: string;
    
    /** Security flags */
    securityFlags?: string[];
    
    /** IP address */
    ipAddress?: string;
    
    /** User agent */
    userAgent?: string;
  };
  
  /** Risk assessment */
  riskAssessment: {
    /** Risk score (0-100) */
    score: number;
    
    /** Risk factors */
    factors: string[];
    
    /** Recommended actions */
    recommendations: string[];
  };
}

/**
 * Bulk credential operations
 */
export interface BulkCredentialOperation {
  /** Operation ID */
  operationId: string;
  
  /** Operation type */
  type: 'refresh_all' | 'validate_all' | 'rotate_keys' | 'revoke_expired';
  
  /** Target connections */
  connectionIds: string[];
  
  /** Operation status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  
  /** Progress tracking */
  progress: {
    total: number;
    completed: number;
    failed: number;
    currentItem?: string;
  };
  
  /** Results */
  results: Array<{
    connectionId: string;
    success: boolean;
    error?: string;
    details?: Record<string, unknown>;
  }>;
  
  /** Timestamps */
  startedAt: Date;
  completedAt?: Date;
  
  /** Initiated by */
  initiatedBy: string;
}

/**
 * Credential health monitoring
 */
export interface CredentialHealth {
  /** Connection ID */
  connectionId: string;
  
  /** Overall health status */
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  
  /** Last health check */
  lastCheckAt: Date;
  
  /** Health indicators */
  indicators: {
    /** Token validity */
    tokenValid: boolean;
    
    /** Time until expiration */
    expiresIn?: number;
    
    /** Refresh token available */
    canRefresh: boolean;
    
    /** Recent API success rate */
    apiSuccessRate: number;
    
    /** Rate limiting status */
    rateLimitStatus: 'ok' | 'warning' | 'throttled';
    
    /** Platform connectivity */
    platformConnectivity: boolean;
  };
  
  /** Health warnings */
  warnings: string[];
  
  /** Recommended actions */
  recommendations: string[];
  
  /** Next check schedule */
  nextCheckAt: Date;
}