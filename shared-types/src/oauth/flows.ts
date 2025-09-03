/**
 * OAuth Flow type definitions
 * Complete OAuth 2.0 authorization flow handling
 */

import { OAuthCredentials } from './credentials';
import { Platform } from '../models';

/**
 * OAuth 2.0 flow types
 */
export type OAuthFlowType = 
  | 'authorization_code'
  | 'implicit'
  | 'client_credentials'
  | 'device_authorization'
  | 'pkce';

/**
 * OAuth flow state
 */
export type OAuthFlowState = 
  | 'initialized'
  | 'authorization_pending'
  | 'authorization_granted'
  | 'token_exchange_pending'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

/**
 * OAuth authorization response
 */
export interface OAuthAuthorizationResponse {
  /** Authorization URL to redirect user to */
  authorizationUrl: string;
  
  /** State parameter for validation */
  state: string;
}

/**
 * OAuth authorization request
 */
export interface OAuthAuthorizationRequest {
  /** Connection ID */
  connectionId: string;
  
  /** OAuth client configuration */
  client: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  
  /** Requested scopes */
  scopes: string[];
  
  /** State parameter for CSRF protection */
  state: string;
  
  /** PKCE code verifier (for PKCE flow) */
  codeVerifier?: string;
  
  /** Additional parameters */
  additionalParams?: Record<string, string>;
  
  /** Flow type */
  flowType: OAuthFlowType;
  
  /** Platform-specific configuration */
  platformConfig?: PlatformOAuthConfig;
}

/**
 * OAuth authorization response
 */
export interface OAuthAuthorizationResponse {
  /** Authorization URL for user redirect */
  authorizationUrl: string;
  
  /** State parameter */
  state: string;
  
  /** PKCE code challenge (if applicable) */
  codeChallenge?: string;
  
  /** Flow expiration time */
  expiresAt: Date;
  
  /** Additional metadata */
  metadata: {
    flowId: string;
    platform: Platform;
    scopes: string[];
    createdAt: Date;
  };
}

/**
 * OAuth callback handling
 */
export interface OAuthCallback {
  /** Connection ID */
  connectionId: string;
  
  /** Authorization code */
  code?: string;
  
  /** State parameter */
  state: string;
  
  /** Error code (if authorization failed) */
  error?: string;
  
  /** Error description */
  errorDescription?: string;
  
  /** Error URI */
  errorUri?: string;
  
  /** Additional callback parameters */
  additionalParams?: Record<string, string>;
}

/**
 * OAuth token exchange request
 */
export interface TokenExchangeRequest {
  /** Authorization code */
  code: string;
  
  /** Client credentials */
  client: {
    clientId: string;
    clientSecret: string;
  };
  
  /** Redirect URI (must match authorization request) */
  redirectUri: string;
  
  /** PKCE code verifier (if applicable) */
  codeVerifier?: string;
  
  /** Grant type */
  grantType: 'authorization_code';
  
  /** Platform-specific parameters */
  platformParams?: Record<string, unknown>;
}

/**
 * OAuth token exchange response
 */
export interface TokenExchangeResponse {
  /** Whether exchange was successful */
  success: boolean;
  
  /** OAuth credentials (if successful) */
  credentials?: OAuthCredentials;
  
  /** Error details (if failed) */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  
  /** Platform-specific response data */
  platformData?: Record<string, unknown>;
  
  /** Exchange timestamp */
  exchangedAt: Date;
}

/**
 * OAuth flow result
 */
export interface OAuthFlowResult {
  /** Flow ID */
  flowId: string;
  
  /** Connection ID */
  connectionId: string;
  
  /** Flow state */
  state: OAuthFlowState;
  
  /** Flow success status */
  success: boolean;
  
  /** Obtained credentials (if successful) */
  credentials?: OAuthCredentials;
  
  /** Error information (if failed) */
  error?: OAuthFlowError;
  
  /** Flow timeline */
  timeline: OAuthFlowEvent[];
  
  /** Final result metadata */
  metadata: {
    platform: Platform;
    scopes: string[];
    startedAt: Date;
    completedAt?: Date;
    duration?: number;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * OAuth flow error
 */
export interface OAuthFlowError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error category */
  category: 'client_error' | 'server_error' | 'platform_error' | 'security_error';
  
  /** Platform-specific error */
  platformError?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
  
  /** Security implications */
  security?: {
    suspicious: boolean;
    reasons: string[];
    actions: string[];
  };
  
  /** Retry information */
  retry?: {
    possible: boolean;
    after?: Date;
    maxAttempts: number;
    currentAttempt: number;
  };
}

/**
 * OAuth flow event for timeline tracking
 */
export interface OAuthFlowEvent {
  /** Event type */
  type: 
    | 'flow_started'
    | 'authorization_url_generated'
    | 'user_redirected'
    | 'callback_received'
    | 'token_exchange_started'
    | 'token_exchange_completed'
    | 'flow_completed'
    | 'flow_failed'
    | 'error_occurred';
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Event description */
  description: string;
  
  /** Event data */
  data?: Record<string, unknown>;
  
  /** Error information (if applicable) */
  error?: string;
}

/**
 * Platform-specific OAuth configuration
 */
export interface PlatformOAuthConfig {
  /** Platform identifier */
  platform: Platform;
  
  /** Authorization endpoint */
  authorizationEndpoint: string;
  
  /** Token endpoint */
  tokenEndpoint: string;
  
  /** User info endpoint (optional) */
  userInfoEndpoint?: string;
  
  /** Revocation endpoint (optional) */
  revocationEndpoint?: string;
  
  /** Supported scopes */
  supportedScopes: string[];
  
  /** Required scopes */
  requiredScopes: string[];
  
  /** PKCE support */
  pkceSupport: boolean;
  
  /** Additional authorization parameters */
  additionalAuthParams?: Record<string, string>;
  
  /** Token refresh configuration */
  tokenRefresh: {
    supported: boolean;
    endpoint?: string;
    bufferSeconds: number;
  };
  
  /** Platform-specific validation */
  validation: {
    /** Validate state parameter */
    validateState: boolean;
    
    /** Custom validation rules */
    customRules?: Array<{
      name: string;
      description: string;
      validator: string; // Function name or expression
    }>;
  };
}

/**
 * OAuth flow manager interface
 */
export interface OAuthFlowManager {
  /**
   * Start OAuth authorization flow
   */
  startFlow(request: OAuthAuthorizationRequest): Promise<OAuthAuthorizationResponse>;
  
  /**
   * Handle OAuth callback
   */
  handleCallback(callback: OAuthCallback): Promise<OAuthFlowResult>;
  
  /**
   * Get flow status
   */
  getFlowStatus(flowId: string): Promise<OAuthFlowResult>;
  
  /**
   * Cancel active flow
   */
  cancelFlow(flowId: string): Promise<void>;
  
  /**
   * Clean up expired flows
   */
  cleanupExpiredFlows(): Promise<number>;
}

/**
 * PKCE (Proof Key for Code Exchange) configuration
 */
export interface PKCEConfig {
  /** Code verifier */
  codeVerifier: string;
  
  /** Code challenge */
  codeChallenge: string;
  
  /** Code challenge method */
  codeChallengeMethod: 'S256' | 'plain';
  
  /** Generation timestamp */
  generatedAt: Date;
}

/**
 * OAuth flow security validation
 */
export interface OAuthFlowSecurity {
  /** State validation */
  state: {
    valid: boolean;
    provided: string;
    expected: string;
  };
  
  /** PKCE validation */
  pkce?: {
    valid: boolean;
    codeVerifier: string;
    codeChallenge: string;
  };
  
  /** Redirect URI validation */
  redirectUri: {
    valid: boolean;
    provided: string;
    expected: string;
  };
  
  /** Client validation */
  client: {
    valid: boolean;
    clientId: string;
    authenticated: boolean;
  };
  
  /** Security flags */
  flags: Array<{
    type: 'warning' | 'error' | 'info';
    code: string;
    message: string;
  }>;
  
  /** Overall security score */
  securityScore: number;
}

/**
 * OAuth flow analytics and monitoring
 */
export interface OAuthFlowAnalytics {
  /** Flow statistics */
  statistics: {
    totalFlows: number;
    successfulFlows: number;
    failedFlows: number;
    averageDuration: number;
    successRate: number;
  };
  
  /** Error breakdown */
  errors: Array<{
    code: string;
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
  
  /** Platform breakdown */
  platforms: Array<{
    platform: Platform;
    totalFlows: number;
    successRate: number;
    averageDuration: number;
  }>;
  
  /** Time-based analytics */
  trends: {
    daily: Array<{ date: Date; flows: number; successRate: number }>;
    hourly: Array<{ hour: number; flows: number; successRate: number }>;
  };
  
  /** Security incidents */
  securityIncidents: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    lastOccurred: Date;
    description: string;
  }>;
}

/**
 * Device authorization flow (for devices without browser)
 */
export interface DeviceAuthorizationFlow {
  /** Device code */
  deviceCode: string;
  
  /** User code */
  userCode: string;
  
  /** Verification URI */
  verificationUri: string;
  
  /** Complete verification URI */
  verificationUriComplete?: string;
  
  /** Device code expires at */
  expiresAt: Date;
  
  /** Polling interval */
  interval: number;
  
  /** Flow status */
  status: 'pending' | 'authorized' | 'expired' | 'denied';
}

/**
 * Batch OAuth operations
 */
export interface BatchOAuthOperation {
  /** Operation ID */
  operationId: string;
  
  /** Operation type */
  type: 'bulk_refresh' | 'bulk_validate' | 'bulk_revoke';
  
  /** Target connections */
  connections: string[];
  
  /** Operation status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  
  /** Progress */
  progress: {
    total: number;
    completed: number;
    failed: number;
    current?: string;
  };
  
  /** Results */
  results: Array<{
    connectionId: string;
    success: boolean;
    error?: string;
    credentials?: OAuthCredentials;
  }>;
  
  /** Timing */
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}