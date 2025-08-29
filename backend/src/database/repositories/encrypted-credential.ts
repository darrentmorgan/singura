/**
 * Encrypted Credential repository for secure token/secret storage
 * Updated to use enterprise encryption service with proper security controls
 */

import { BaseRepository } from './base';
import {
  EncryptedCredential,
  CreateEncryptedCredentialInput,
  EncryptedCredentialFilters,
  CredentialType,
  ValidationError
} from '../../types/database';
import { encryptionService, EncryptedData } from '../../security/encryption';
import { securityAuditService } from '../../security/audit';

export class EncryptedCredentialRepository extends BaseRepository<
  EncryptedCredential,
  CreateEncryptedCredentialInput,
  never, // No direct updates - credentials should be replaced
  EncryptedCredentialFilters
> {
  constructor() {
    super('encrypted_credentials');
  }

  /**
   * Create a new encrypted credential with automatic encryption
   */
  async create(data: CreateEncryptedCredentialInput): Promise<EncryptedCredential> {
    // Validate required fields
    const errors = this.validateRequiredFields(data, [
      'platform_connection_id',
      'credential_type',
      'encrypted_value'
    ]);

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Check if credential already exists for this connection and type
    const existing = await this.findByConnectionAndType(
      data.platform_connection_id,
      data.credential_type
    );

    if (existing) {
      throw new Error(
        `Credential of type '${data.credential_type}' already exists for this connection`
      );
    }

    try {
      // Encrypt the credential value using enterprise encryption service
      const keyId = data.encryption_key_id || 'default';
      const encryptedData = encryptionService.encrypt(data.encrypted_value, keyId);
      
      // Store the encrypted data as JSON string
      const encryptedValue = JSON.stringify(encryptedData);

      const result = await super.create({
        ...data,
        encrypted_value: encryptedValue,
        encryption_key_id: keyId,
        metadata: data.metadata || {}
      });

      // Audit credential creation
      await securityAuditService.logSecurityEvent({
        type: 'credential_created',
        category: 'auth',
        severity: 'low',
        description: `New ${data.credential_type} credential created`,
        connectionId: data.platform_connection_id,
        metadata: {
          credentialType: data.credential_type,
          encryptionKeyId: keyId
        }
      });

      return result;
    } catch (error) {
      // Audit credential creation failure
      await securityAuditService.logSecurityEvent({
        type: 'credential_creation_failed',
        category: 'error',
        severity: 'medium',
        description: `Failed to create ${data.credential_type} credential`,
        connectionId: data.platform_connection_id,
        metadata: {
          credentialType: data.credential_type,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Find credential by connection and type
   */
  async findByConnectionAndType(
    platformConnectionId: string,
    credentialType: CredentialType
  ): Promise<EncryptedCredential | null> {
    const query = `
      SELECT * FROM encrypted_credentials
      WHERE platform_connection_id = $1 AND credential_type = $2
    `;
    const result = await this.executeQuery<EncryptedCredential>(
      query,
      [platformConnectionId, credentialType]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find all credentials for a platform connection
   */
  async findByConnection(platformConnectionId: string): Promise<EncryptedCredential[]> {
    const query = `
      SELECT * FROM encrypted_credentials
      WHERE platform_connection_id = $1
      ORDER BY credential_type, created_at DESC
    `;
    const result = await this.executeQuery<EncryptedCredential>(query, [platformConnectionId]);
    return result.rows;
  }

  /**
   * Get decrypted credential value (use with caution)
   */
  async getDecryptedValue(
    platformConnectionId: string,
    credentialType: CredentialType
  ): Promise<string | null> {
    const credential = await this.findByConnectionAndType(platformConnectionId, credentialType);
    if (!credential) {
      return null;
    }

    try {
      // Try new encryption format first
      if (credential.encrypted_value.startsWith('{')) {
        const encryptedData: EncryptedData = JSON.parse(credential.encrypted_value);
        const decryptedValue = encryptionService.decrypt(encryptedData);
        
        // Audit credential access
        await securityAuditService.logSecurityEvent({
          type: 'credential_accessed',
          category: 'auth',
          severity: 'low',
          description: `Credential ${credentialType} accessed`,
          connectionId: platformConnectionId,
          metadata: {
            credentialType,
            encryptionKeyId: credential.encryption_key_id
          }
        });

        return decryptedValue;
      } else {
        // Legacy encryption format - use backward compatibility
        const decryptedValue = encryptionService.decryptLegacy(
          credential.encrypted_value, 
          credential.encryption_key_id
        );

        // Log that legacy format was accessed (should be migrated)
        await securityAuditService.logSecurityEvent({
          type: 'legacy_credential_accessed',
          category: 'auth',
          severity: 'medium',
          description: `Legacy format credential ${credentialType} accessed - should be migrated`,
          connectionId: platformConnectionId,
          metadata: {
            credentialType,
            encryptionKeyId: credential.encryption_key_id,
            migrationNeeded: true
          }
        });

        return decryptedValue;
      }
    } catch (error) {
      // Secure error handling - don't leak sensitive information
      await securityAuditService.logSecurityEvent({
        type: 'credential_decryption_failed',
        category: 'error',
        severity: 'high',
        description: `Failed to decrypt ${credentialType} credential`,
        connectionId: platformConnectionId,
        metadata: {
          credentialId: credential.id,
          credentialType,
          encryptionKeyId: credential.encryption_key_id,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      });
      
      throw new Error('Failed to decrypt credential');
    }
  }

  /**
   * Replace credential value (delete old, create new)
   */
  async replaceCredential(
    platformConnectionId: string,
    credentialType: CredentialType,
    newValue: string,
    expiresAt?: Date,
    encryptionKeyId?: string
  ): Promise<EncryptedCredential> {
    return this.executeQuery('BEGIN', []).then(async () => {
      try {
        // Delete existing credential
        await this.deleteByConnectionAndType(platformConnectionId, credentialType);

        // Create new credential
        const newCredential = await this.create({
          platform_connection_id: platformConnectionId,
          credential_type: credentialType,
          encrypted_value: newValue,
          expires_at: expiresAt,
          encryption_key_id: encryptionKeyId
        });

        await this.executeQuery('COMMIT', []);

        // Audit credential replacement
        await securityAuditService.logSecurityEvent({
          type: 'credential_replaced',
          category: 'auth',
          severity: 'medium',
          description: `Credential ${credentialType} replaced`,
          connectionId: platformConnectionId,
          metadata: {
            credentialType,
            encryptionKeyId: encryptionKeyId || 'default',
            hasExpiration: !!expiresAt,
            expiresAt: expiresAt?.toISOString()
          }
        });

        return newCredential;
      } catch (error) {
        await this.executeQuery('ROLLBACK', []);
        
        // Audit credential replacement failure
        await securityAuditService.logSecurityEvent({
          type: 'credential_replacement_failed',
          category: 'error',
          severity: 'high',
          description: `Failed to replace ${credentialType} credential`,
          connectionId: platformConnectionId,
          metadata: {
            credentialType,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        throw error;
      }
    });
  }

  /**
   * Delete credential by connection and type
   */
  async deleteByConnectionAndType(
    platformConnectionId: string,
    credentialType: CredentialType
  ): Promise<boolean> {
    const query = `
      DELETE FROM encrypted_credentials
      WHERE platform_connection_id = $1 AND credential_type = $2
    `;
    const result = await this.executeQuery(query, [platformConnectionId, credentialType]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Find expiring credentials
   */
  async findExpiring(beforeDate?: Date): Promise<EncryptedCredential[]> {
    const cutoffDate = beforeDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const query = `
      SELECT ec.*, pc.organization_id, pc.platform_type, pc.display_name
      FROM encrypted_credentials ec
      JOIN platform_connections pc ON ec.platform_connection_id = pc.id
      WHERE ec.expires_at IS NOT NULL
        AND ec.expires_at <= $1
      ORDER BY ec.expires_at ASC
    `;

    const result = await this.executeQuery<EncryptedCredential & {
      organization_id: string;
      platform_type: string;
      display_name: string;
    }>(query, [cutoffDate]);
    return result.rows;
  }

  /**
   * Delete all credentials for a platform connection
   */
  async deleteByConnection(platformConnectionId: string): Promise<number> {
    const query = 'DELETE FROM encrypted_credentials WHERE platform_connection_id = $1';
    const result = await this.executeQuery(query, [platformConnectionId]);
    return result.rowCount || 0;
  }

  /**
   * Find credentials by encryption key ID (for key rotation)
   */
  async findByEncryptionKey(encryptionKeyId: string): Promise<EncryptedCredential[]> {
    const query = `
      SELECT * FROM encrypted_credentials
      WHERE encryption_key_id = $1
      ORDER BY created_at ASC
    `;
    const result = await this.executeQuery<EncryptedCredential>(query, [encryptionKeyId]);
    return result.rows;
  }

  /**
   * Get credential statistics
   */
  async getCredentialStats(): Promise<{
    total: number;
    by_type: Record<CredentialType, number>;
    by_encryption_key: Record<string, number>;
    expiring_soon: number;
    expired: number;
  }> {
    const query = `
      SELECT 
        credential_type,
        encryption_key_id,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW() + INTERVAL '24 hours') as expiring_soon,
        COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired
      FROM encrypted_credentials
      GROUP BY credential_type, encryption_key_id
      ORDER BY credential_type, encryption_key_id
    `;

    const result = await this.executeQuery<{
      credential_type: CredentialType;
      encryption_key_id: string;
      count: string;
      expiring_soon: string;
      expired: string;
    }>(query, []);

    const by_type: Record<CredentialType, number> = {} as any;
    const by_encryption_key: Record<string, number> = {};
    let total = 0;
    let expiring_soon = 0;
    let expired = 0;

    result.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      const expiringSoonCount = parseInt(row.expiring_soon, 10);
      const expiredCount = parseInt(row.expired, 10);

      total += count;
      expiring_soon += expiringSoonCount;
      expired += expiredCount;

      by_type[row.credential_type] = (by_type[row.credential_type] || 0) + count;
      by_encryption_key[row.encryption_key_id] = (by_encryption_key[row.encryption_key_id] || 0) + count;
    });

    return {
      total,
      by_type,
      by_encryption_key,
      expiring_soon,
      expired
    };
  }

  /**
   * Batch decrypt credentials (use with extreme caution)
   */
  async batchDecrypt(credentialIds: string[]): Promise<Array<{
    id: string;
    credential_type: CredentialType;
    decrypted_value: string;
  }>> {
    if (credentialIds.length === 0) {
      return [];
    }

    const placeholders = credentialIds.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      SELECT id, credential_type, encrypted_value
      FROM encrypted_credentials
      WHERE id IN (${placeholders})
    `;

    const result = await this.executeQuery<{
      id: string;
      credential_type: CredentialType;
      encrypted_value: string;
    }>(query, credentialIds);

    return result.rows.map(row => ({
      id: row.id,
      credential_type: row.credential_type,
      decrypted_value: this.decryptValue(row.encrypted_value)
    }));
  }

  /**
   * Rotate encryption key for credentials
   */
  async rotateEncryptionKey(
    oldKeyId: string,
    newKeyId: string
  ): Promise<number> {
    const credentials = await this.findByEncryptionKey(oldKeyId);
    let rotatedCount = 0;
    let failedCount = 0;

    for (const credential of credentials) {
      try {
        // Decrypt with old key
        let decryptedValue: string;
        
        if (credential.encrypted_value.startsWith('{')) {
          // New format
          const encryptedData: EncryptedData = JSON.parse(credential.encrypted_value);
          decryptedValue = encryptionService.decrypt(encryptedData);
        } else {
          // Legacy format
          decryptedValue = encryptionService.decryptLegacy(credential.encrypted_value, oldKeyId);
        }
        
        // Re-encrypt with new key
        const newEncryptedData = encryptionService.encrypt(decryptedValue, newKeyId);
        const newEncryptedValue = JSON.stringify(newEncryptedData);

        // Update the credential
        const query = `
          UPDATE encrypted_credentials
          SET encrypted_value = $1, encryption_key_id = $2, updated_at = NOW()
          WHERE id = $3
        `;
        
        await this.executeQuery(query, [newEncryptedValue, newKeyId, credential.id]);
        rotatedCount++;

        // Audit successful key rotation
        await securityAuditService.logSecurityEvent({
          type: 'credential_key_rotated',
          category: 'admin',
          severity: 'medium',
          description: `Encryption key rotated for ${credential.credential_type}`,
          metadata: {
            credentialId: credential.id,
            credentialType: credential.credential_type,
            oldKeyId,
            newKeyId
          }
        });
      } catch (error) {
        failedCount++;
        
        // Audit failed key rotation
        await securityAuditService.logSecurityEvent({
          type: 'credential_key_rotation_failed',
          category: 'error',
          severity: 'high',
          description: `Failed to rotate encryption key for credential ${credential.id}`,
          metadata: {
            credentialId: credential.id,
            credentialType: credential.credential_type,
            oldKeyId,
            newKeyId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        
        console.error(`Failed to rotate key for credential ${credential.id}:`, error);
      }
    }

    // Log overall rotation summary
    await securityAuditService.logSecurityEvent({
      type: 'bulk_key_rotation_completed',
      category: 'admin',
      severity: 'high',
      description: `Bulk encryption key rotation completed`,
      metadata: {
        oldKeyId,
        newKeyId,
        totalCredentials: credentials.length,
        successfulRotations: rotatedCount,
        failedRotations: failedCount
      }
    });

    return rotatedCount;
  }

  /**
   * Migrate legacy credential to new encryption format
   */
  async migrateLegacyCredential(credentialId: string): Promise<boolean> {
    try {
      const credential = await this.findById(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      // Skip if already in new format
      if (credential.encrypted_value.startsWith('{')) {
        return false;
      }

      // Decrypt using legacy method
      const decryptedValue = encryptionService.decryptLegacy(
        credential.encrypted_value,
        credential.encryption_key_id
      );

      // Re-encrypt using new method
      const newEncryptedData = encryptionService.encrypt(decryptedValue, credential.encryption_key_id);
      const newEncryptedValue = JSON.stringify(newEncryptedData);

      // Update credential
      const query = `
        UPDATE encrypted_credentials
        SET encrypted_value = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await this.executeQuery(query, [newEncryptedValue, credentialId]);

      // Audit migration
      await securityAuditService.logSecurityEvent({
        type: 'credential_migrated',
        category: 'admin',
        severity: 'low',
        description: `Legacy credential migrated to new encryption format`,
        metadata: {
          credentialId,
          credentialType: credential.credential_type,
          encryptionKeyId: credential.encryption_key_id
        }
      });

      return true;
    } catch (error) {
      await securityAuditService.logSecurityEvent({
        type: 'credential_migration_failed',
        category: 'error',
        severity: 'medium',
        description: `Failed to migrate legacy credential`,
        metadata: {
          credentialId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }

  /**
   * Batch migrate all legacy credentials
   */
  async batchMigrateLegacyCredentials(): Promise<{ migrated: number; failed: number }> {
    const query = `
      SELECT id, encrypted_value
      FROM encrypted_credentials
      WHERE encrypted_value NOT LIKE '{%'
      ORDER BY created_at ASC
    `;
    
    const result = await this.executeQuery<{ id: string; encrypted_value: string }>(query, []);
    const legacyCredentials = result.rows;

    let migrated = 0;
    let failed = 0;

    for (const credential of legacyCredentials) {
      try {
        await this.migrateLegacyCredential(credential.id);
        migrated++;
      } catch (error) {
        failed++;
        console.error(`Failed to migrate credential ${credential.id}:`, error);
      }
    }

    // Audit batch migration
    await securityAuditService.logSecurityEvent({
      type: 'batch_credential_migration_completed',
      category: 'admin',
      severity: 'high',
      description: `Batch migration of legacy credentials completed`,
      metadata: {
        totalLegacy: legacyCredentials.length,
        migrated,
        failed
      }
    });

    return { migrated, failed };
  }

  /**
   * Prevent direct updates - credentials should be replaced
   */
  async update(): Promise<never> {
    throw new Error('Direct credential updates are not allowed. Use replaceCredential() instead.');
  }
}

export const encryptedCredentialRepository = new EncryptedCredentialRepository();