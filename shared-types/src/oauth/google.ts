/**
 * Google OAuth Types
 * OAuth 2.0 type definitions for Google Workspace integration
 * Follows patterns from slack.ts with Google-specific enhancements
 */

/**
 * Google OAuth configuration interface
 */
export interface GoogleOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
  readonly accessType?: 'online' | 'offline';
  readonly includeGrantedScopes?: boolean;
}

/**
 * Metadata-focused Google OAuth scopes (no admin privileges)
 */
export const GOOGLE_METADATA_SCOPES = [
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',    // Activity logs
  'https://www.googleapis.com/auth/drive.metadata.readonly',         // File metadata  
  'https://www.googleapis.com/auth/drive.activity.readonly',         // Drive activity
  'https://www.googleapis.com/auth/gmail.metadata',                  // Email automation
  'openid',                                                          // Basic user info
  'email',                                                           // User email
  'profile'                                                          // Basic profile
] as const;

/**
 * Google OAuth credentials interface
 */
export interface GoogleOAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope: string[];
  expiresAt?: Date;
  idToken?: string;
  // Google Workspace specific fields
  userId?: string;
  email?: string;
  domain?: string;
  organizationId?: string;
}

/**
 * Raw Google OAuth API response (before processing)
 */
export interface GoogleOAuthRawResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  // Google-specific metadata
  granted_scopes?: string;
}

/**
 * Google OAuth error response
 */
export interface GoogleOAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * Google Workspace user info for audit logging
 */
export interface GoogleWorkspaceUserInfo {
  id: string;
  email: string;
  name: string;
  domain: string;
  isAdmin: boolean;
  orgUnit?: string;
  lastLoginTime?: Date;
}

/**
 * Google Workspace domain information
 */
export interface GoogleWorkspaceDomain {
  domainName: string;
  isPrimary: boolean;
  isVerified: boolean;
  creationTime?: Date;
  adminEmail?: string;
}

/**
 * Google OAuth flow state for CSRF protection
 */
export interface GoogleOAuthState {
  value: string;
  expiresAt: Date;
  userId?: string;
  returnUrl?: string;
}

/**
 * Google OAuth authorization URL parameters
 */
export interface GoogleOAuthAuthorizationParams {
  client_id: string;
  redirect_uri: string;
  response_type: 'code';
  scope: string;
  state: string;
  access_type?: 'online' | 'offline';
  include_granted_scopes?: boolean;
  prompt?: 'none' | 'consent' | 'select_account';
}

/**
 * Google OAuth token exchange request
 */
export interface GoogleOAuthTokenRequest {
  client_id: string;
  client_secret: string;
  code: string;
  grant_type: 'authorization_code';
  redirect_uri: string;
}

/**
 * Google OAuth refresh token request
 */
export interface GoogleOAuthRefreshRequest {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  grant_type: 'refresh_token';
}

/**
 * Type guard for Google OAuth credentials validation
 */
export function isValidGoogleOAuthCredentials(value: unknown): value is GoogleOAuthCredentials {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    'tokenType' in value &&
    'scope' in value &&
    typeof (value as any).accessToken === 'string' &&
    typeof (value as any).tokenType === 'string' &&
    Array.isArray((value as any).scope)
  );
}

/**
 * Type guard for Google OAuth raw response validation
 */
export function isValidGoogleOAuthRawResponse(value: unknown): value is GoogleOAuthRawResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'access_token' in value &&
    'token_type' in value &&
    typeof (value as any).access_token === 'string' &&
    typeof (value as any).token_type === 'string'
  );
}