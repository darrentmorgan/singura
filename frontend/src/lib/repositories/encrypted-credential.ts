/**
 * Encrypted Credential Repository - Supabase Implementation
 * Handles secure OAuth token storage with enterprise security
 */

import { BaseSupabaseRepository } from './base-supabase';
import type {
  EncryptedCredential,
  CreateEncryptedCredentialInput,
  UpdateEncryptedCredentialInput,
  EncryptedCredentialFilters,
  CredentialType
} from '../../types/database';

export class EncryptedCredentialRepository extends BaseSupabaseRepository<
  EncryptedCredential,
  CreateEncryptedCredentialInput,
  UpdateEncryptedCredentialInput,
  EncryptedCredentialFilters
> {
  constructor() {
    super('encrypted_credentials', 'id');
  }

  /**
   * Find credentials by platform connection
   */
  async findByConnection(connectionId: string): Promise<EncryptedCredential[]> {
    const result = await this.findMany({
      platform_connection_id: connectionId
    } as EncryptedCredentialFilters);
    return result.data;
  }

  /**
   * Find credential by connection and type
   */
  async findByConnectionAndType(
    connectionId: string,
    credentialType: CredentialType
  ): Promise<EncryptedCredential | null> {
    return this.findOne({
      platform_connection_id: connectionId,
      credential_type: credentialType
    } as EncryptedCredentialFilters);
  }

  /**
   * Get access token for connection
   */
  async getAccessToken(connectionId: string): Promise<EncryptedCredential | null> {
    return this.findByConnectionAndType(connectionId, 'access_token');
  }

  /**
   * Get refresh token for connection
   */
  async getRefreshToken(connectionId: string): Promise<EncryptedCredential | null> {
    return this.findByConnectionAndType(connectionId, 'refresh_token');
  }

  /**
   * Store OAuth tokens securely
   */
  async storeOAuthTokens(
    connectionId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
    encryptionKeyId: string = 'default'
  ): Promise<{
    accessTokenRecord: EncryptedCredential;
    refreshTokenRecord?: EncryptedCredential;
  }> {
    // Store access token
    const accessTokenRecord = await this.create({
      platform_connection_id: connectionId,
      credential_type: 'access_token',
      encrypted_value: accessToken, // Will be encrypted by database trigger/function
      encryption_key_id: encryptionKeyId,
      expires_at: expiresAt,
      metadata: {
        tokenType: 'Bearer',
        usage: {
          lastUsedAt: new Date().toISOString(),
          requestCount: 0
        }
      }
    });

    let refreshTokenRecord: EncryptedCredential | undefined;

    // Store refresh token if provided
    if (refreshToken) {
      refreshTokenRecord = await this.create({
        platform_connection_id: connectionId,
        credential_type: 'refresh_token',
        encrypted_value: refreshToken, // Will be encrypted by database trigger/function
        encryption_key_id: encryptionKeyId,
        metadata: {
          tokenType: 'Bearer',
          usage: {
            lastUsedAt: new Date().toISOString(),
            requestCount: 0
          }
        }
      });
    }

    return {
      accessTokenRecord,
      refreshTokenRecord
    };
  }

  /**
   * Update token usage statistics
   */
  async updateUsageStats(credentialId: string): Promise<EncryptedCredential | null> {
    const credential = await this.findById(credentialId);
    if (!credential) return null;

    const currentUsage = credential.metadata?.usage || { requestCount: 0 };
    const updatedMetadata = {
      ...credential.metadata,
      usage: {
        lastUsedAt: new Date().toISOString(),
        requestCount: (currentUsage.requestCount || 0) + 1
      }
    };

    return this.update(credentialId, {
      metadata: updatedMetadata
    } as UpdateEncryptedCredentialInput);
  }

  /**
   * Get credentials that are expiring soon
   */
  async getExpiringCredentials(hoursAhead: number = 1): Promise<EncryptedCredential[]> {
    const expiryThreshold = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    const result = await this.findMany({
      expires_before: expiryThreshold
    } as EncryptedCredentialFilters);
    return result.data;
  }

  /**
   * Clean up expired credentials
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const result = await this.executeRPC('cleanup_expired_credentials', {
      current_time: now.toISOString()
    });
    
    // Return count of cleaned up records
    return Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && 'count' in result[0] 
      ? (result[0] as { count: number }).count 
      : 0;
  }

  /**
   * Rotate encryption key for credentials
   */
  async rotateEncryptionKey(
    oldKeyId: string,
    newKeyId: string
  ): Promise<{ updated: number; failed: number }> {
    const result = await this.executeRPC('rotate_credential_encryption_key', {
      old_key_id: oldKeyId,
      new_key_id: newKeyId
    });

    return Array.isArray(result) && result.length > 0 && typeof result[0] === 'object'
      ? (result[0] as { updated: number; failed: number })
      : { updated: 0, failed: 0 };
  }

  /**
   * Get credential audit trail
   */
  async getAuditTrail(credentialId: string): Promise<Array<{
    event_type: string;
    event_timestamp: Date;
    actor_type: string;
    details: Record<string, unknown>;
  }>> {
    return this.executeRPC('get_credential_audit_trail', {
      credential_id: credentialId
    });
  }

  /**
   * Validate credential integrity
   */
  async validateIntegrity(credentialId: string): Promise<{
    valid: boolean;
    issues: string[];
    lastValidated: Date;
  }> {
    const result = await this.executeRPC('validate_credential_integrity', {
      credential_id: credentialId
    });

    return Array.isArray(result) && result.length > 0 && typeof result[0] === 'object'
      ? (result[0] as { valid: boolean; issues: string[]; lastValidated: Date })
      : { valid: false, issues: ['Validation failed'], lastValidated: new Date() };
  }

  /**
   * Delete all credentials for a connection
   */
  async deleteByConnection(connectionId: string): Promise<number> {
    const credentials = await this.findByConnection(connectionId);
    let deletedCount = 0;

    for (const credential of credentials) {
      const deleted = await this.delete(credential.id);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }
}