/**
 * OAuth Credential Storage Service
 * Hybrid in-memory + database storage for OAuth tokens with encryption
 * Memory cache for performance, PostgreSQL for persistence
 */

import {
  OAuthCredentialStorage,
  StoredConnectionInfo,
  GoogleOAuthCredentials,
  OAuthCredentialRefreshResult,
  CredentialValidationResult,
  LiveConnectionManager,
  OAuthConnectionStatus
} from '@saas-xray/shared-types';
import { GoogleAPIClientService } from './google-api-client-service';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';
import { CredentialType } from '../types/database';

export class OAuthCredentialStorageService implements OAuthCredentialStorage, LiveConnectionManager {
  private credentialStore = new Map<string, GoogleOAuthCredentials>();
  private connectionInfo = new Map<string, StoredConnectionInfo>();
  private apiClients = new Map<string, GoogleAPIClientService>();
  private useDatabase: boolean = true;

  constructor() {
    console.log('OAuthCredentialStorageService initialized with database persistence');
    this.loadCredentialsFromDatabase().catch(err =>
      console.warn('Failed to load credentials from database on startup:', err)
    );
  }

  /**
   * Load existing credentials from database into memory cache on startup
   */
  private async loadCredentialsFromDatabase(): Promise<void> {
    try {
      // Note: This requires a method to list all credentials from database
      // For now, credentials will be loaded on-demand via retrieveCredentials
      console.log('Credential database integration active - credentials will load on-demand');
    } catch (error) {
      console.error('Failed to load credentials from database:', error);
    }
  }

  /**
   * Store OAuth credentials from completed auth flow
   * Stores in both memory cache and encrypted database
   */
  async storeCredentials(connectionId: string, credentials: GoogleOAuthCredentials): Promise<boolean> {
    try {
      // Store credentials in memory cache for fast access
      this.credentialStore.set(connectionId, credentials);

      // Store connection metadata
      const connectionInfo: StoredConnectionInfo = {
        connectionId,
        platform: 'google',
        userEmail: credentials.email || 'unknown',
        organizationDomain: credentials.domain,
        connectedAt: new Date(),
        lastUsed: new Date(),
        tokenStatus: 'active',
        scopes: credentials.scope,
        expiresAt: credentials.expiresAt
      };

      this.connectionInfo.set(connectionId, connectionInfo);

      // Persist to encrypted database for durability
      if (this.useDatabase) {
        try {
          await encryptedCredentialRepository.create({
            platform_connection_id: connectionId,
            credential_type: 'access_token',
            encrypted_value: JSON.stringify(credentials),
            expires_at: credentials.expiresAt,
            metadata: {}
          });
          console.log('✅ OAuth credentials persisted to encrypted database:', connectionId);
        } catch (dbError) {
          // Log error but don't fail - memory cache is still available
          console.warn('⚠️  Failed to persist credentials to database (memory cache still active):', dbError);
        }
      }

      console.log('OAuth credentials stored for live detection:', {
        connectionId,
        userEmail: credentials.email?.substring(0, 3) + '...',
        domain: credentials.domain,
        scopes: credentials.scope,
        expiresAt: credentials.expiresAt?.toISOString(),
        persisted: this.useDatabase
      });

      return true;
    } catch (error) {
      console.error('Failed to store OAuth credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve stored OAuth credentials for live API calls
   * Checks memory cache first, then database if not found
   */
  async retrieveCredentials(connectionId: string): Promise<GoogleOAuthCredentials | null> {
    try {
      // Check memory cache first (fast path)
      let credentials = this.credentialStore.get(connectionId);

      // If not in memory, try loading from database
      if (!credentials && this.useDatabase) {
        try {
          const dbCredential = await encryptedCredentialRepository.findByConnectionAndType(
            connectionId,
            'access_token' as CredentialType
          );

          if (dbCredential) {
            // Decrypt and parse credentials (encryption_key_id is validated by repository)
            const decryptedValue = await encryptedCredentialRepository.getDecryptedValue(
              dbCredential.id,
              dbCredential.encryption_key_id!
            );
            credentials = JSON.parse(decryptedValue) as GoogleOAuthCredentials;

            // Restore to memory cache for future fast access
            this.credentialStore.set(connectionId, credentials);

            // Restore connection info
            const connectionInfo: StoredConnectionInfo = {
              connectionId,
              platform: 'google',
              userEmail: credentials.email || 'unknown',
              organizationDomain: credentials.domain,
              connectedAt: dbCredential.created_at,
              lastUsed: new Date(),
              tokenStatus: 'active',
              scopes: credentials.scope || [],
              expiresAt: dbCredential.expires_at ?? undefined
            };
            this.connectionInfo.set(connectionId, connectionInfo);

            console.log(`✅ OAuth credentials loaded from database: ${connectionId}`);
          }
        } catch (dbError) {
          console.warn(`⚠️  Failed to load credentials from database for ${connectionId}:`, dbError);
        }
      }

      if (!credentials) {
        console.warn(`No OAuth credentials found for connection: ${connectionId}`);
        return null;
      }

      // Update last used timestamp
      const info = this.connectionInfo.get(connectionId);
      if (info) {
        info.lastUsed = new Date();
        this.connectionInfo.set(connectionId, info);
      }

      console.log(`OAuth credentials retrieved for live detection: ${connectionId}`);
      return credentials;
    } catch (error) {
      console.error(`Failed to retrieve OAuth credentials for ${connectionId}:`, error);
      return null;
    }
  }

  /**
   * Refresh OAuth credentials using refresh token
   */
  async refreshCredentials(connectionId: string): Promise<GoogleOAuthCredentials | null> {
    try {
      const credentials = this.credentialStore.get(connectionId);
      if (!credentials || !credentials.refreshToken) {
        console.warn(`Cannot refresh credentials for ${connectionId}: No refresh token`);
        return null;
      }

      // Use GoogleAPIClientService to refresh tokens
      const apiClient = new GoogleAPIClientService();
      await apiClient.initialize(credentials);
      
      const refreshed = await apiClient.refreshTokensIfNeeded();
      if (refreshed) {
        console.log(`OAuth credentials refreshed for ${connectionId}`);
        return credentials;
      }

      return null;
    } catch (error) {
      console.error(`Failed to refresh credentials for ${connectionId}:`, error);
      return null;
    }
  }

  /**
   * Revoke OAuth credentials and clean up storage
   */
  async revokeCredentials(connectionId: string): Promise<boolean> {
    try {
      const credentials = this.credentialStore.get(connectionId);
      if (credentials) {
        // Remove from storage
        this.credentialStore.delete(connectionId);
        this.connectionInfo.delete(connectionId);
        this.apiClients.delete(connectionId);

        console.log(`OAuth credentials revoked and cleaned up: ${connectionId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to revoke credentials for ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Validate if stored credentials are still valid
   */
  async isCredentialsValid(connectionId: string): Promise<boolean> {
    try {
      const credentials = this.credentialStore.get(connectionId);
      if (!credentials) {
        return false;
      }

      // Check expiration
      if (credentials.expiresAt && credentials.expiresAt < new Date()) {
        console.log(`Credentials expired for ${connectionId}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to validate credentials for ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * List all active connections for monitoring
   */
  async listActiveConnections(): Promise<StoredConnectionInfo[]> {
    try {
      const connections = Array.from(this.connectionInfo.values());
      console.log(`Retrieved ${connections.length} active connections`);
      return connections;
    } catch (error) {
      console.error('Failed to list active connections:', error);
      return [];
    }
  }

  /**
   * Initialize connection with authenticated API client for live detection
   */
  async initializeConnection(connectionId: string): Promise<boolean> {
    try {
      const credentials = await this.retrieveCredentials(connectionId);
      if (!credentials) {
        console.error(`Cannot initialize connection ${connectionId}: No credentials`);
        return false;
      }

      // Create and initialize GoogleAPIClientService
      const apiClient = new GoogleAPIClientService();
      const initialized = await apiClient.initialize(credentials);
      
      if (initialized) {
        this.apiClients.set(connectionId, apiClient);
        console.log(`Connection initialized for live detection: ${connectionId}`);
        return true;
      }

      console.error(`Failed to initialize Google API client for ${connectionId}`);
      return false;
    } catch (error) {
      console.error(`Connection initialization failed for ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Get authenticated API client for live Google Workspace scanning
   */
  async getAuthenticatedAPIClient(connectionId: string): Promise<GoogleAPIClientService | null> {
    try {
      let apiClient = this.apiClients.get(connectionId);
      
      if (!apiClient) {
        // Try to initialize if not already done
        const initialized = await this.initializeConnection(connectionId);
        if (!initialized) {
          return null;
        }
        apiClient = this.apiClients.get(connectionId);
      }

      if (apiClient) {
        console.log(`Authenticated API client retrieved for live detection: ${connectionId}`);
        return apiClient;
      }

      return null;
    } catch (error) {
      console.error(`Failed to get authenticated API client for ${connectionId}:`, error);
      return null;
    }
  }

  /**
   * Validate connection health for real-time monitoring
   */
  async validateConnectionHealth(connectionId: string): Promise<CredentialValidationResult> {
    try {
      const apiClient = await this.getAuthenticatedAPIClient(connectionId);
      const credentials = await this.retrieveCredentials(connectionId);
      
      if (!apiClient || !credentials) {
        return {
          connectionId,
          isValid: false,
          validatedAt: new Date(),
          scopes: [],
          apiTestResults: {
            adminReportsAPI: false,
            driveAPI: false,
            gmailAPI: false
          },
          error: 'No authenticated API client available'
        };
      }

      // Validate with Google API
      const isValid = await apiClient.validateCredentials();
      
      const result: CredentialValidationResult = {
        connectionId,
        isValid,
        validatedAt: new Date(),
        scopes: credentials.scope,
        userInfo: credentials.email ? {
          email: credentials.email,
          name: 'Unknown', // Would get from user info API
          domain: credentials.domain || 'unknown'
        } : undefined,
        apiTestResults: {
          adminReportsAPI: isValid,
          driveAPI: isValid,
          gmailAPI: isValid
        }
      };

      console.log(`Connection health validated for ${connectionId}:`, {
        isValid,
        scopes: credentials.scope.length,
        userEmail: credentials.email?.substring(0, 3) + '...'
      });

      return result;
    } catch (error) {
      console.error(`Connection health validation failed for ${connectionId}:`, error);
      
      return {
        connectionId,
        isValid: false,
        validatedAt: new Date(),
        scopes: [],
        apiTestResults: {
          adminReportsAPI: false,
          driveAPI: false,
          gmailAPI: false
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refresh connection if needed for continuous operation
   */
  async refreshConnectionIfNeeded(connectionId: string): Promise<boolean> {
    try {
      const credentials = await this.retrieveCredentials(connectionId);
      if (!credentials) {
        return false;
      }

      // Check if refresh needed
      const expiresAt = credentials.expiresAt;
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (!expiresAt || expiresAt > fiveMinutesFromNow) {
        return true; // Still valid
      }

      // Refresh credentials
      const refreshed = await this.refreshCredentials(connectionId);
      return !!refreshed;
    } catch (error) {
      console.error(`Failed to refresh connection ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Get current connection status for monitoring
   */
  async getConnectionStatus(connectionId: string): Promise<OAuthConnectionStatus> {
    try {
      const info = this.connectionInfo.get(connectionId);
      const credentials = this.credentialStore.get(connectionId);
      
      if (!info || !credentials) {
        return {
          connectionId,
          platform: 'google',
          status: 'failed',
          lastSuccessfulCall: new Date(0),
          lastError: 'Connection not found',
          apiCallCount: 0,
          rateLimitStatus: {
            remaining: 0,
            resetTime: new Date(),
            dailyQuota: 0
          }
        };
      }

      const isValid = await this.isCredentialsValid(connectionId);
      
      return {
        connectionId,
        platform: info.platform,
        status: isValid ? 'healthy' : 'expired',
        lastSuccessfulCall: info.lastUsed,
        apiCallCount: 0, // TODO: Track actual API calls
        rateLimitStatus: {
          remaining: 1000, // TODO: Get real quota status
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          dailyQuota: 10000
        }
      };
    } catch (error) {
      console.error(`Failed to get connection status for ${connectionId}:`, error);
      
      return {
        connectionId,
        platform: 'google',
        status: 'failed',
        lastSuccessfulCall: new Date(0),
        lastError: error instanceof Error ? error.message : 'Unknown error',
        apiCallCount: 0,
        rateLimitStatus: {
          remaining: 0,
          resetTime: new Date(),
          dailyQuota: 0
        }
      };
    }
  }

  /**
   * Get all stored connections for the data provider
   */
  getStoredConnections(): StoredConnectionInfo[] {
    return Array.from(this.connectionInfo.values());
  }

  /**
   * Get credentials by connection ID (alias for retrieveCredentials)
   */
  async getCredentials(connectionId: string): Promise<GoogleOAuthCredentials | null> {
    return this.retrieveCredentials(connectionId);
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo(): { storedConnections: number; activeAPIClients: number; connectionIds: string[] } {
    return {
      storedConnections: this.credentialStore.size,
      activeAPIClients: this.apiClients.size,
      connectionIds: Array.from(this.credentialStore.keys())
    };
  }
}

// Export singleton instance for shared use across the application
export const oauthCredentialStorage = new OAuthCredentialStorageService();