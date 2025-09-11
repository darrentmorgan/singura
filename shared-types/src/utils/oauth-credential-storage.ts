/**
 * OAuth Credential Storage Types
 * Secure storage and management of OAuth tokens for live API integration
 * Following CLAUDE.md Types-Tests-Code methodology - Step 1 Types
 */

import { GoogleOAuthCredentials } from '../oauth/google';

/**
 * OAuth credential storage interface for persistent token management
 */
export interface OAuthCredentialStorage {
  storeCredentials(connectionId: string, credentials: GoogleOAuthCredentials): Promise<boolean>;
  retrieveCredentials(connectionId: string): Promise<GoogleOAuthCredentials | null>;
  refreshCredentials(connectionId: string): Promise<GoogleOAuthCredentials | null>;
  revokeCredentials(connectionId: string): Promise<boolean>;
  isCredentialsValid(connectionId: string): Promise<boolean>;
  listActiveConnections(): Promise<StoredConnectionInfo[]>;
}

/**
 * Stored connection information for OAuth management
 */
export interface StoredConnectionInfo {
  connectionId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  userEmail: string;
  organizationDomain?: string;
  connectedAt: Date;
  lastUsed: Date;
  tokenStatus: 'active' | 'expired' | 'revoked' | 'error';
  scopes: string[];
  expiresAt?: Date;
}

/**
 * OAuth credential refresh result for storage operations
 */
export interface OAuthCredentialRefreshResult {
  success: boolean;
  newCredentials?: GoogleOAuthCredentials;
  error?: string;
  requiresReauthorization: boolean;
}

/**
 * Credential validation result for live API access
 */
export interface CredentialValidationResult {
  connectionId: string;
  isValid: boolean;
  validatedAt: Date;
  scopes: string[];
  userInfo?: {
    email: string;
    name: string;
    domain: string;
  };
  apiTestResults: {
    adminReportsAPI: boolean;
    driveAPI: boolean;
    gmailAPI: boolean;
  };
  error?: string;
}

/**
 * Live connection manager for real-time API access
 */
export interface LiveConnectionManager {
  initializeConnection(connectionId: string): Promise<boolean>;
  getAuthenticatedAPIClient(connectionId: string): Promise<any | null>;
  validateConnectionHealth(connectionId: string): Promise<CredentialValidationResult>;
  refreshConnectionIfNeeded(connectionId: string): Promise<boolean>;
  getConnectionStatus(connectionId: string): Promise<OAuthConnectionStatus>;
}

/**
 * OAuth connection status for real-time monitoring
 */
export interface OAuthConnectionStatus {
  connectionId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  status: 'healthy' | 'expired' | 'failed' | 'unauthorized';
  lastSuccessfulCall: Date;
  lastError?: string;
  apiCallCount: number;
  rateLimitStatus: {
    remaining: number;
    resetTime: Date;
    dailyQuota: number;
  };
}

/**
 * OAuth credential encryption interface for security
 */
export interface OAuthCredentialEncryption {
  encryptCredentials(credentials: GoogleOAuthCredentials): Promise<EncryptedCredentialData>;
  decryptCredentials(encryptedData: EncryptedCredentialData): Promise<GoogleOAuthCredentials>;
  rotateEncryptionKey(connectionId: string): Promise<boolean>;
}

/**
 * Encrypted credential data for secure storage
 */
export interface EncryptedCredentialData {
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  encryptionMetadata: {
    algorithm: string;
    keyId: string;
    iv: string;
    createdAt: Date;
  };
  plainTextMetadata: {
    tokenType: string;
    scopes: string[];
    expiresAt?: Date;
    userEmail: string;
    domain?: string;
  };
}

/**
 * Live API quota management for enterprise usage
 */
export interface APIQuotaManager {
  checkQuotaAvailability(connectionId: string, apiType: string): Promise<QuotaStatus>;
  recordAPIUsage(connectionId: string, apiType: string, callCount: number): Promise<void>;
  getQuotaUsage(connectionId: string, timeframe: 'hour' | 'day' | 'month'): Promise<QuotaUsage>;
  predictQuotaExhaustion(connectionId: string): Promise<QuotaPrediction>;
}

/**
 * API quota status
 */
export interface QuotaStatus {
  available: boolean;
  remaining: number;
  resetTime: Date;
  quotaType: 'per_user' | 'per_organization' | 'per_app';
  recommendations: string[];
}

/**
 * API quota usage tracking
 */
export interface QuotaUsage {
  connectionId: string;
  timeframe: string;
  totalCalls: number;
  callsByAPI: Record<string, number>;
  averageCallsPerHour: number;
  peakUsageTimes: Date[];
  efficiency: {
    successRate: number;
    errorRate: number;
    retryRate: number;
  };
}

/**
 * Quota exhaustion prediction
 */
export interface QuotaPrediction {
  likelyExhaustionTime?: Date;
  confidence: 'low' | 'medium' | 'high';
  currentTrend: 'increasing' | 'stable' | 'decreasing';
  recommendations: string[];
  suggestedActions: string[];
}

/**
 * Type guards for OAuth credential storage validation
 */
export function isValidStoredConnectionInfo(value: unknown): value is StoredConnectionInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'connectionId' in value &&
    'platform' in value &&
    'userEmail' in value &&
    'connectedAt' in value &&
    typeof (value as any).connectionId === 'string' &&
    ['slack', 'google', 'microsoft', 'jira'].includes((value as any).platform)
  );
}

export function isValidCredentialValidationResult(value: unknown): value is CredentialValidationResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'connectionId' in value &&
    'isValid' in value &&
    'validatedAt' in value &&
    typeof (value as any).connectionId === 'string' &&
    typeof (value as any).isValid === 'boolean'
  );
}

export function isValidOAuthConnectionStatus(value: unknown): value is OAuthConnectionStatus {
  return (
    typeof value === 'object' &&
    value !== null &&
    'connectionId' in value &&
    'platform' in value &&
    'status' in value &&
    typeof (value as any).connectionId === 'string' &&
    ['healthy', 'expired', 'failed', 'unauthorized'].includes((value as any).status)
  );
}