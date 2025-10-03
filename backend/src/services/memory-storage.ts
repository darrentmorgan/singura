/**
 * In-Memory Storage Service for OAuth Callback Fallback
 * Provides resilient storage when database is unavailable
 */

import {
  OAuthConnectionData,
  MemoryStorageItem,
  OAuthMemoryStorage,
  StorageStatus,
  StorageMode,
  HybridStorageConfig,
  StorageOperationResult
} from '@saas-xray/shared-types';

/**
 * Configuration for in-memory storage
 */
const DEFAULT_CONFIG: HybridStorageConfig = {
  enableMemoryFallback: true,
  maxMemoryItems: 100,
  memoryRetentionMinutes: 60,
  dbReconnectInterval: 30000, // 30 seconds
  maxDbReconnectAttempts: 5,
  autoPersistOnReconnect: true,
  logLevel: 'info'
};

/**
 * In-memory OAuth connection storage implementation
 */
class OAuthMemoryStorageImpl implements OAuthMemoryStorage {
  private storage = new Map<string, MemoryStorageItem<OAuthConnectionData>>();
  private config: HybridStorageConfig;
  private lastDbCheck: Date = new Date();
  private dbAvailable: boolean = false;

  constructor(config: Partial<HybridStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add OAuth connection data to memory storage
   */
  add(id: string, data: OAuthConnectionData, reason: string = 'database_unavailable'): MemoryStorageItem<OAuthConnectionData> {
    // Check memory limits
    if (this.storage.size >= this.config.maxMemoryItems) {
      this.cleanupExpiredItems();
      
      if (this.storage.size >= this.config.maxMemoryItems) {
        // Remove oldest item to make space
        const oldestKey = Array.from(this.storage.keys())[0];
        if (oldestKey !== undefined) {
          this.storage.delete(oldestKey);
          this.log('warn', `Removed oldest item ${oldestKey} to make space for new connection`);
        }
      }
    }

    const now = new Date();
    const item: MemoryStorageItem<OAuthConnectionData> = {
      id,
      data,
      storedAt: now,
      needsPeristence: reason === 'database_unavailable',
      metadata: {
        originalAttempt: now,
        reason: reason as any,
        persistenceAttempts: 0,
        lastPersistenceAttempt: undefined,
        lastPersistenceError: undefined
      }
    };

    this.storage.set(id, item);
    this.log('info', `Stored OAuth connection in memory: ${id} (reason: ${reason})`);

    return item;
  }

  /**
   * Get OAuth connection data from memory storage
   */
  get(id: string): MemoryStorageItem<OAuthConnectionData> | null {
    const item = this.storage.get(id);
    if (!item) {
      return null;
    }

    // Check if item has expired
    const expirationTime = new Date(item.storedAt.getTime() + (this.config.memoryRetentionMinutes * 60 * 1000));
    if (new Date() > expirationTime) {
      this.storage.delete(id);
      this.log('info', `Removed expired item from memory: ${id}`);
      return null;
    }

    return item;
  }

  /**
   * Get all items from memory storage
   */
  getAll(): MemoryStorageItem<OAuthConnectionData>[] {
    this.cleanupExpiredItems();
    return Array.from(this.storage.values());
  }

  /**
   * Remove item from memory storage
   */
  remove(id: string): boolean {
    const existed = this.storage.has(id);
    this.storage.delete(id);
    if (existed) {
      this.log('info', `Removed OAuth connection from memory: ${id}`);
    }
    return existed;
  }

  /**
   * Clear all items from memory storage
   */
  clear(): number {
    const count = this.storage.size;
    this.storage.clear();
    this.log('info', `Cleared ${count} items from memory storage`);
    return count;
  }

  /**
   * Get items that need database persistence
   */
  getPendingPersistence(): MemoryStorageItem<OAuthConnectionData>[] {
    this.cleanupExpiredItems();
    return Array.from(this.storage.values()).filter(item => item.needsPeristence);
  }

  /**
   * Mark item as persisted (remove from memory)
   */
  markPersisted(id: string): boolean {
    const item = this.storage.get(id);
    if (item) {
      this.storage.delete(id);
      this.log('info', `Marked OAuth connection as persisted, removed from memory: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Update persistence attempt metadata
   */
  updatePersistenceAttempt(id: string, error?: string): void {
    const item = this.storage.get(id);
    if (item) {
      item.metadata.persistenceAttempts++;
      item.metadata.lastPersistenceAttempt = new Date();
      
      if (error) {
        item.metadata.lastPersistenceError = error;
        this.log('warn', `Persistence attempt ${item.metadata.persistenceAttempts} failed for ${id}: ${error}`);
      } else {
        item.metadata.lastPersistenceError = undefined;
      }
      
      this.storage.set(id, item);
    }
  }

  /**
   * Get current storage status
   */
  getStorageStatus(): StorageStatus {
    this.cleanupExpiredItems();
    
    const memoryItems = this.storage.size;
    const pendingItems = this.getPendingPersistence().length;
    
    let mode: StorageMode = 'database';
    let warning: string | undefined;

    if (!this.dbAvailable) {
      mode = memoryItems > 0 ? 'memory' : 'database';
      if (memoryItems > 0) {
        warning = `Database unavailable. ${memoryItems} connections stored in memory (${pendingItems} pending persistence).`;
      }
    } else if (pendingItems > 0) {
      mode = 'hybrid';
      warning = `${pendingItems} connections pending database persistence.`;
    }

    return {
      mode,
      databaseAvailable: this.dbAvailable,
      memoryItems,
      lastDbCheck: this.lastDbCheck,
      warning
    };
  }

  /**
   * Find connections by organization
   */
  findByOrganization(organizationId: string): MemoryStorageItem<OAuthConnectionData>[] {
    this.cleanupExpiredItems();
    return Array.from(this.storage.values()).filter(
      item => item.data.organization_id === organizationId
    );
  }

  /**
   * Find connections by platform
   */
  findByPlatform(organizationId: string, platform: string): MemoryStorageItem<OAuthConnectionData>[] {
    this.cleanupExpiredItems();
    return Array.from(this.storage.values()).filter(
      item => item.data.organization_id === organizationId && 
              item.data.platform_type === platform
    );
  }

  /**
   * Check if connection already exists
   */
  connectionExists(organizationId: string, platform: string, userId: string): boolean {
    this.cleanupExpiredItems();
    return Array.from(this.storage.values()).some(
      item => item.data.organization_id === organizationId &&
               item.data.platform_type === platform &&
               item.data.platform_user_id === userId
    );
  }

  /**
   * Update database availability status
   */
  updateDatabaseStatus(available: boolean): void {
    this.dbAvailable = available;
    this.lastDbCheck = new Date();
    
    this.log('info', `Database status updated: ${available ? 'available' : 'unavailable'}`);
    
    if (available && this.config.autoPersistOnReconnect) {
      const pendingItems = this.getPendingPersistence();
      if (pendingItems.length > 0) {
        this.log('info', `Database reconnected. ${pendingItems.length} items ready for persistence.`);
      }
    }
  }

  /**
   * Cleanup expired items from memory
   */
  private cleanupExpiredItems(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.storage.entries()) {
      const expirationTime = new Date(item.storedAt.getTime() + (this.config.memoryRetentionMinutes * 60 * 1000));
      if (now > expirationTime) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      expiredKeys.forEach(key => this.storage.delete(key));
      this.log('info', `Cleaned up ${expiredKeys.length} expired items from memory`);
    }
  }

  /**
   * Log message based on configured log level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [MemoryStorage] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'debug':
        case 'info':
          console.log(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
      }
    }
  }

  /**
   * Get storage statistics for monitoring
   */
  getStatistics(): {
    totalItems: number;
    pendingPersistence: number;
    averageAge: number;
    oldestItem: Date | null;
    newestItem: Date | null;
    failedPersistenceAttempts: number;
  } {
    this.cleanupExpiredItems();
    
    const items = Array.from(this.storage.values());
    const now = new Date();
    
    const ages = items.map(item => now.getTime() - item.storedAt.getTime());
    const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
    
    const sortedByAge = items.sort((a, b) => a.storedAt.getTime() - b.storedAt.getTime());
    const oldestItem = sortedByAge.length > 0 ? sortedByAge[0]?.storedAt || null : null;
    const newestItem = sortedByAge.length > 0 ? sortedByAge[sortedByAge.length - 1]?.storedAt || null : null;
    
    const failedPersistenceAttempts = items
      .filter(item => item.metadata.lastPersistenceError)
      .reduce((sum, item) => sum + item.metadata.persistenceAttempts, 0);

    return {
      totalItems: items.length,
      pendingPersistence: this.getPendingPersistence().length,
      averageAge: Math.round(averageAge / 1000), // Convert to seconds
      oldestItem,
      newestItem,
      failedPersistenceAttempts
    };
  }
}

// Singleton instance for OAuth memory storage
export const oauthMemoryStorage = new OAuthMemoryStorageImpl();

// Export the class for testing and custom configurations
export { OAuthMemoryStorageImpl };