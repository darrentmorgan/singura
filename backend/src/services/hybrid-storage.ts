/**
 * Hybrid Storage Service for OAuth Callbacks
 * Combines database and memory storage for maximum resilience
 */

import { 
  OAuthConnectionData, 
  StorageOperationResult, 
  StorageMode,
  StorageStatus 
} from '@saas-xray/shared-types';
import { platformConnectionRepository } from '../database/repositories/platform-connection';
import { oauthMemoryStorage } from './memory-storage';
import { PlatformConnection } from '../types/database';

/**
 * Hybrid storage service that tries database first, falls back to memory
 */
export class HybridStorageService {
  private lastDbConnectivity: boolean = true;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic database connectivity check
    this.startConnectivityMonitoring();
  }

  /**
   * Store OAuth connection with database-first, memory-fallback strategy
   */
  async storeConnection(connectionData: OAuthConnectionData): Promise<StorageOperationResult<PlatformConnection>> {
    const startTime = Date.now();
    const connectionId = `${connectionData.platform_type}-${Date.now()}`;

    // Try database first
    try {
      console.log(`🔄 Attempting database storage for ${connectionData.platform_type} connection...`);
      
      // Check for existing connections to avoid duplicates
      const existing = await platformConnectionRepository.findByPlatform(
        connectionData.organization_id, 
        connectionData.platform_type as any
      );

      let savedConnection: PlatformConnection;

      if (existing.length === 0) {
        // Create new connection
        savedConnection = await platformConnectionRepository.create({
          organization_id: connectionData.organization_id,
          platform_type: connectionData.platform_type as any,
          platform_user_id: connectionData.platform_user_id,
          display_name: connectionData.display_name,
          permissions_granted: connectionData.permissions_granted,
          metadata: connectionData.metadata,
          platform_workspace_id: connectionData.platform_workspace_id
        });
        
        // Immediately activate the connection after creation
        const activatedConnection = await platformConnectionRepository.updateStatus(savedConnection.id, 'active');
        savedConnection = activatedConnection || savedConnection;
        console.log(`✅ Database storage successful: ${savedConnection.id} - status set to active`);
      } else {
        // Update existing connection to active status
        const existingConnection = existing[0];
        const updatedConnection = await platformConnectionRepository.updateStatus(existingConnection.id, 'active');
        savedConnection = updatedConnection || existingConnection;
        console.log(`✅ Database update successful: ${existingConnection.id} - status set to active`);
      }

      // Update database connectivity status
      this.updateDatabaseConnectivity(true);

      return {
        success: true,
        data: savedConnection,
        storageMode: 'database',
        databaseAttempted: true,
        usedFallback: false,
        metadata: {
          executionTime: Date.now() - startTime,
          retries: 0,
          storageStatus: this.getStorageStatus()
        }
      };

    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.warn(`⚠️ Database storage failed for ${connectionData.platform_type}: ${errorMessage}`);

      // Update database connectivity status
      this.updateDatabaseConnectivity(false);

      // Fall back to memory storage
      try {
        console.log(`🔄 Falling back to memory storage for ${connectionData.platform_type} connection...`);
        
        // Check for duplicates in memory
        if (oauthMemoryStorage.connectionExists(
          connectionData.organization_id, 
          connectionData.platform_type, 
          connectionData.platform_user_id
        )) {
          console.log(`⚠️ Connection already exists in memory for ${connectionData.platform_type}`);
          return {
            success: false,
            storageMode: 'memory',
            databaseAttempted: true,
            usedFallback: true,
            error: 'Connection already exists',
            warning: 'Database unavailable - using memory storage',
            metadata: {
              executionTime: Date.now() - startTime,
              retries: 0,
              storageStatus: this.getStorageStatus()
            }
          };
        }

        const memoryItem = oauthMemoryStorage.add(connectionId, connectionData, 'database_unavailable');
        console.log(`✅ Memory storage successful: ${connectionId} (needs persistence)`);

        // Create a mock PlatformConnection for consistency (set as active since OAuth succeeded)
        const mockConnection: PlatformConnection = {
          id: connectionId,
          organization_id: connectionData.organization_id,
          platform_type: connectionData.platform_type as any,
          platform_user_id: connectionData.platform_user_id,
          display_name: connectionData.display_name,
          permissions_granted: connectionData.permissions_granted,
          metadata: connectionData.metadata,
          platform_workspace_id: connectionData.platform_workspace_id,
          status: 'active' as any, // Set to active since OAuth was successful
          created_at: new Date(),
          updated_at: new Date(),
          last_sync_at: new Date(), // Set sync time since connection is active
          expires_at: null,
          last_error: null
        };

        return {
          success: true,
          data: mockConnection,
          storageMode: 'memory',
          databaseAttempted: true,
          usedFallback: true,
          warning: 'Database unavailable - connection stored in memory pending persistence',
          metadata: {
            executionTime: Date.now() - startTime,
            retries: 0,
            storageStatus: this.getStorageStatus()
          }
        };

      } catch (memoryError) {
        const memoryErrorMessage = memoryError instanceof Error ? memoryError.message : 'Unknown memory error';
        console.error(`❌ Memory storage also failed: ${memoryErrorMessage}`);

        return {
          success: false,
          storageMode: 'memory',
          databaseAttempted: true,
          usedFallback: true,
          error: `Both database and memory storage failed. DB: ${errorMessage}, Memory: ${memoryErrorMessage}`,
          metadata: {
            executionTime: Date.now() - startTime,
            retries: 0,
            storageStatus: this.getStorageStatus()
          }
        };
      }
    }
  }

  /**
   * Retrieve connections from both storage layers
   */
  async getConnections(organizationId: string): Promise<StorageOperationResult<PlatformConnection[]>> {
    const startTime = Date.now();

    try {
      // Try database first
      const dbConnections = await platformConnectionRepository.findByOrganization(organizationId);
      console.log(`📊 Retrieved ${dbConnections.length} connections from database`);

      // Get memory connections as well
      const memoryItems = oauthMemoryStorage.findByOrganization(organizationId);
      const memoryConnections: PlatformConnection[] = memoryItems.map(item => ({
        id: item.id,
        organization_id: item.data.organization_id,
        platform_type: item.data.platform_type as any,
        platform_user_id: item.data.platform_user_id,
        display_name: item.data.display_name,
        permissions_granted: item.data.permissions_granted,
        metadata: item.data.metadata,
        platform_workspace_id: item.data.platform_workspace_id,
        status: 'active' as any, // Memory connections should be active (OAuth succeeded)
        created_at: item.storedAt,
        updated_at: item.storedAt,
        last_sync_at: item.storedAt, // Set sync time for active connections
        expires_at: null,
        last_error: null
      }));

      console.log(`📊 Retrieved ${memoryConnections.length} connections from memory`);

      // Combine and deduplicate connections
      const allConnections = [...dbConnections, ...memoryConnections];
      const uniqueConnections = this.deduplicateConnections(allConnections);

      this.updateDatabaseConnectivity(true);

      const warning = memoryConnections.length > 0 
        ? `${memoryConnections.length} connections from memory storage pending database persistence`
        : undefined;

      return {
        success: true,
        data: uniqueConnections,
        storageMode: memoryConnections.length > 0 ? 'hybrid' : 'database',
        databaseAttempted: true,
        usedFallback: memoryConnections.length > 0,
        warning,
        metadata: {
          executionTime: Date.now() - startTime,
          retries: 0,
          storageStatus: this.getStorageStatus()
        }
      };

    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.warn(`⚠️ Database query failed: ${errorMessage}`);

      this.updateDatabaseConnectivity(false);

      // Fall back to memory-only
      try {
        const memoryItems = oauthMemoryStorage.findByOrganization(organizationId);
        const memoryConnections: PlatformConnection[] = memoryItems.map(item => ({
          id: item.id,
          organization_id: item.data.organization_id,
          platform_type: item.data.platform_type as any,
          platform_user_id: item.data.platform_user_id,
          display_name: item.data.display_name,
          permissions_granted: item.data.permissions_granted,
          metadata: item.data.metadata,
          platform_workspace_id: item.data.platform_workspace_id,
          status: 'active' as any, // OAuth completed successfully - mark as active
          created_at: item.storedAt,
          updated_at: item.storedAt,
          last_sync_at: null,
          expires_at: null,
          last_error: null
        }));

        console.log(`📊 Retrieved ${memoryConnections.length} connections from memory (database unavailable)`);

        return {
          success: true,
          data: memoryConnections,
          storageMode: 'memory',
          databaseAttempted: true,
          usedFallback: true,
          warning: `Database unavailable - showing ${memoryConnections.length} connections from memory`,
          metadata: {
            executionTime: Date.now() - startTime,
            retries: 0,
            storageStatus: this.getStorageStatus()
          }
        };

      } catch (memoryError) {
        const memoryErrorMessage = memoryError instanceof Error ? memoryError.message : 'Unknown memory error';
        console.error(`❌ Memory query also failed: ${memoryErrorMessage}`);

        return {
          success: false,
          data: [],
          storageMode: 'memory',
          databaseAttempted: true,
          usedFallback: true,
          error: `Both database and memory queries failed. DB: ${errorMessage}, Memory: ${memoryErrorMessage}`,
          metadata: {
            executionTime: Date.now() - startTime,
            retries: 0,
            storageStatus: this.getStorageStatus()
          }
        };
      }
    }
  }

  /**
   * Get current storage status
   */
  getStorageStatus(): StorageStatus {
    const memoryStatus = oauthMemoryStorage.getStorageStatus();
    return {
      ...memoryStatus,
      databaseAvailable: this.lastDbConnectivity
    };
  }

  /**
   * Try to persist pending memory items to database
   */
  async persistPendingItems(): Promise<{ succeeded: number; failed: number; errors: string[] }> {
    const pendingItems = oauthMemoryStorage.getPendingPersistence();
    
    if (pendingItems.length === 0) {
      return { succeeded: 0, failed: 0, errors: [] };
    }

    console.log(`🔄 Attempting to persist ${pendingItems.length} items from memory to database...`);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of pendingItems) {
      try {
        // Check for existing connection to avoid duplicates
        const existing = await platformConnectionRepository.findByPlatform(
          item.data.organization_id,
          item.data.platform_type as any
        );

        if (existing.length === 0) {
          await platformConnectionRepository.create({
            organization_id: item.data.organization_id,
            platform_type: item.data.platform_type as any,
            platform_user_id: item.data.platform_user_id,
            display_name: item.data.display_name,
            permissions_granted: item.data.permissions_granted,
            metadata: item.data.metadata,
            platform_workspace_id: item.data.platform_workspace_id
          });
          
          oauthMemoryStorage.markPersisted(item.id);
          succeeded++;
          console.log(`✅ Persisted ${item.data.platform_type} connection: ${item.id}`);
        } else {
          // Connection already exists in database, just remove from memory
          oauthMemoryStorage.markPersisted(item.id);
          console.log(`ℹ️ Connection ${item.id} already exists in database, removed from memory`);
          succeeded++;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        oauthMemoryStorage.updatePersistenceAttempt(item.id, errorMessage);
        failed++;
        errors.push(`${item.id}: ${errorMessage}`);
        console.error(`❌ Failed to persist ${item.id}: ${errorMessage}`);
      }
    }

    console.log(`🎯 Persistence completed: ${succeeded} succeeded, ${failed} failed`);
    return { succeeded, failed, errors };
  }

  /**
   * Update database connectivity status
   */
  private updateDatabaseConnectivity(available: boolean): void {
    if (this.lastDbConnectivity !== available) {
      this.lastDbConnectivity = available;
      oauthMemoryStorage.updateDatabaseStatus(available);
      
      if (available) {
        console.log('✅ Database connectivity restored');
        // Try to persist pending items
        this.persistPendingItems().catch(error => {
          console.error('❌ Auto-persistence failed:', error);
        });
      } else {
        console.warn('⚠️ Database connectivity lost, switching to memory storage');
      }
    }
  }

  /**
   * Start periodic database connectivity monitoring
   */
  private startConnectivityMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(async () => {
      try {
        // Simple connectivity check - try to query one record
        await platformConnectionRepository.findById('connectivity-check');
        this.updateDatabaseConnectivity(true);
      } catch (error) {
        this.updateDatabaseConnectivity(false);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop connectivity monitoring
   */
  stopConnectivityMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Deduplicate connections by platform and user ID
   */
  private deduplicateConnections(connections: PlatformConnection[]): PlatformConnection[] {
    const seen = new Map<string, PlatformConnection>();

    for (const connection of connections) {
      const key = `${connection.platform_type}-${connection.platform_user_id}`;
      
      if (!seen.has(key)) {
        seen.set(key, connection);
      } else {
        // Prefer database connections over memory connections
        const existing = seen.get(key)!;
        if (connection.id.includes('-') && !existing.id.includes('-')) {
          // Current is memory (has timestamp), existing is database (UUID) - keep database
          continue;
        } else if (!connection.id.includes('-') && existing.id.includes('-')) {
          // Current is database, existing is memory - replace with database
          seen.set(key, connection);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Get storage statistics for monitoring and debugging
   */
  getStorageStatistics(): {
    database: { available: boolean; lastCheck: Date };
    memory: ReturnType<typeof oauthMemoryStorage.getStatistics>;
    hybrid: { pendingPersistence: number; totalConnections: number };
  } {
    const memoryStats = oauthMemoryStorage.getStatistics();
    
    return {
      database: {
        available: this.lastDbConnectivity,
        lastCheck: new Date()
      },
      memory: memoryStats,
      hybrid: {
        pendingPersistence: memoryStats.pendingPersistence,
        totalConnections: memoryStats.totalItems
      }
    };
  }
}

// Singleton instance for hybrid storage
export const hybridStorage = new HybridStorageService();