/**
 * In-Memory Storage Types for OAuth Callback Fallback
 * Used when database connectivity is unavailable during OAuth flows
 */

/**
 * Storage mode indicator for tracking persistence strategy
 */
export type StorageMode = 'database' | 'memory' | 'hybrid';

/**
 * Storage status with detailed persistence information
 */
export interface StorageStatus {
  /** Current storage mode being used */
  mode: StorageMode;
  
  /** Whether database is currently available */
  databaseAvailable: boolean;
  
  /** Number of items in memory storage */
  memoryItems: number;
  
  /** Last database connectivity check */
  lastDbCheck: Date;
  
  /** Warning message if using fallback storage */
  warning?: string;
}

/**
 * In-memory storage item with metadata
 */
export interface MemoryStorageItem<T> {
  /** Unique identifier for the stored item */
  id: string;
  
  /** The actual data being stored */
  data: T;
  
  /** When this item was stored in memory */
  storedAt: Date;
  
  /** Whether this item needs to be persisted to database */
  needsPeristence: boolean;
  
  /** Storage metadata */
  metadata: {
    /** Original storage attempt timestamp */
    originalAttempt: Date;
    
    /** Reason for memory storage */
    reason: 'database_unavailable' | 'manual_override' | 'testing';
    
    /** Number of database persistence attempts */
    persistenceAttempts: number;
    
    /** Last persistence attempt timestamp */
    lastPersistenceAttempt?: Date;
    
    /** Error from last persistence attempt */
    lastPersistenceError?: string;
  };
}

/**
 * OAuth connection data for in-memory storage
 */
export interface OAuthConnectionData {
  /** Organization ID */
  organization_id: string;
  
  /** Platform type (slack, google, microsoft) */
  platform_type: string;
  
  /** Platform-specific user ID */
  platform_user_id: string;
  
  /** Display name for the connection */
  display_name: string;
  
  /** OAuth permissions granted */
  permissions_granted: string[];
  
  /** Platform-specific metadata */
  metadata: Record<string, any>;
  
  /** Connection status */
  status?: string;
  
  /** Platform workspace ID if applicable */
  platform_workspace_id?: string;
}

/**
 * Memory storage operations interface
 */
export interface MemoryStorageOperations<T> {
  /** Add item to memory storage */
  add(id: string, data: T, reason?: string): MemoryStorageItem<T>;
  
  /** Get item from memory storage */
  get(id: string): MemoryStorageItem<T> | null;
  
  /** Get all items from memory storage */
  getAll(): MemoryStorageItem<T>[];
  
  /** Remove item from memory storage */
  remove(id: string): boolean;
  
  /** Clear all items from memory storage */
  clear(): number;
  
  /** Get items that need database persistence */
  getPendingPersistence(): MemoryStorageItem<T>[];
  
  /** Mark item as persisted (remove from memory) */
  markPersisted(id: string): boolean;
  
  /** Update persistence attempt metadata */
  updatePersistenceAttempt(id: string, error?: string): void;
  
  /** Get current storage status */
  getStorageStatus(): StorageStatus;
}

/**
 * OAuth-specific memory storage interface
 */
export interface OAuthMemoryStorage extends MemoryStorageOperations<OAuthConnectionData> {
  /** Find connections by organization */
  findByOrganization(organizationId: string): MemoryStorageItem<OAuthConnectionData>[];
  
  /** Find connections by platform */
  findByPlatform(organizationId: string, platform: string): MemoryStorageItem<OAuthConnectionData>[];
  
  /** Check if connection already exists */
  connectionExists(organizationId: string, platform: string, userId: string): boolean;
}

/**
 * Storage operation result with detailed status
 */
export interface StorageOperationResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** The stored or retrieved data */
  data?: T;
  
  /** Storage mode used for this operation */
  storageMode: StorageMode;
  
  /** Whether database was attempted */
  databaseAttempted: boolean;
  
  /** Whether operation used fallback storage */
  usedFallback: boolean;
  
  /** Warning message if applicable */
  warning?: string;
  
  /** Error message if operation failed */
  error?: string;
  
  /** Additional metadata about the operation */
  metadata?: {
    /** Time taken for the operation */
    executionTime: number;
    
    /** Number of retries attempted */
    retries: number;
    
    /** Storage status at time of operation */
    storageStatus: StorageStatus;
  };
}

/**
 * Hybrid storage configuration
 */
export interface HybridStorageConfig {
  /** Enable in-memory fallback */
  enableMemoryFallback: boolean;
  
  /** Maximum items to store in memory */
  maxMemoryItems: number;
  
  /** How long to keep items in memory (minutes) */
  memoryRetentionMinutes: number;
  
  /** Database reconnection attempt interval (ms) */
  dbReconnectInterval: number;
  
  /** Maximum database reconnection attempts */
  maxDbReconnectAttempts: number;
  
  /** Whether to auto-persist memory items when DB becomes available */
  autoPersistOnReconnect: boolean;
  
  /** Log level for storage operations */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}