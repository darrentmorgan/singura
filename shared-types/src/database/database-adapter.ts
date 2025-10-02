/**
 * Database Adapter Interface
 *
 * Provides abstraction layer for database operations, supporting both
 * local PostgreSQL (development) and cloud providers (Supabase, Neon, etc.).
 *
 * This adapter pattern allows seamless switching between local and cloud
 * databases without changing application code.
 *
 * @module database/database-adapter
 */

/**
 * Database provider type
 */
export type DatabaseProvider = 'local' | 'supabase' | 'neon' | 'planetscale';

/**
 * Unified database adapter configuration
 */
export interface DatabaseAdapterConfig {
  /** Database provider */
  provider: DatabaseProvider;

  /** Local PostgreSQL configuration */
  local?: LocalDatabaseConfig;

  /** Supabase configuration */
  supabase?: SupabaseDatabaseConfig;

  /** Neon configuration */
  neon?: NeonDatabaseConfig;

  /** PlanetScale configuration */
  planetscale?: PlanetScaleDatabaseConfig;
}

/**
 * Local PostgreSQL configuration (Docker or standalone)
 */
export interface LocalDatabaseConfig {
  /** Database host */
  host: string;

  /** Database port */
  port: number;

  /** Database name */
  database: string;

  /** Database user */
  user: string;

  /** Database password */
  password: string;

  /** Enable SSL */
  ssl?: boolean | {
    /** Reject unauthorized certificates */
    rejectUnauthorized?: boolean;
    /** CA certificate */
    ca?: string;
  };

  /** Connection pool settings */
  pool?: {
    /** Maximum pool size */
    max?: number;
    /** Minimum pool size */
    min?: number;
    /** Idle timeout (ms) */
    idleTimeoutMillis?: number;
    /** Connection timeout (ms) */
    connectionTimeoutMillis?: number;
  };
}

/**
 * Supabase database configuration
 */
export interface SupabaseDatabaseConfig {
  /** Supabase project URL */
  url: string;

  /** Supabase anonymous/public key */
  anonKey: string;

  /** Supabase service role key (backend only) */
  serviceKey?: string;

  /** Direct PostgreSQL connection string (pooled via PgBouncer) */
  connectionPoolUrl: string;

  /** Enable Supabase Realtime */
  enableRealtime?: boolean;

  /** Realtime schema */
  realtimeSchema?: string;
}

/**
 * Neon database configuration
 */
export interface NeonDatabaseConfig {
  /** Neon connection string */
  connectionString: string;

  /** Enable connection pooling */
  pooled?: boolean;

  /** Project ID */
  projectId?: string;

  /** Branch name */
  branchName?: string;
}

/**
 * PlanetScale database configuration
 */
export interface PlanetScaleDatabaseConfig {
  /** PlanetScale connection string */
  connectionString: string;

  /** Organization name */
  organization?: string;

  /** Database name */
  database?: string;

  /** Branch name */
  branch?: string;
}

/**
 * Database adapter interface
 */
export interface DatabaseAdapter {
  /** Database provider type */
  provider: DatabaseProvider;

  /**
   * Connect to database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from database
   */
  disconnect(): Promise<void>;

  /**
   * Execute a SQL query
   *
   * @param sql - SQL query string
   * @param params - Query parameters (parameterized queries)
   * @returns Query result
   */
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;

  /**
   * Execute a transaction
   *
   * @param callback - Transaction callback with transaction client
   * @returns Transaction result
   */
  transaction<T>(callback: (client: TransactionClient) => Promise<T>): Promise<T>;

  /**
   * Test database connection health
   *
   * @returns Health check result
   */
  healthCheck?(): Promise<DatabaseHealthCheck>;

  /**
   * Get connection pool statistics
   *
   * @returns Pool stats
   */
  getPoolStats?(): Promise<PoolStatistics>;
}

/**
 * Query result
 */
export interface QueryResult<T> {
  /** Result rows */
  rows: T[];

  /** Number of rows affected/returned */
  rowCount: number;

  /** Query execution time (ms) */
  executionTime?: number;

  /** Additional fields returned by specific providers */
  [key: string]: any;
}

/**
 * Transaction client for executing queries within a transaction
 */
export interface TransactionClient {
  /**
   * Execute query within transaction
   */
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;

  /**
   * Commit transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollback(): Promise<void>;

  /**
   * Create savepoint
   */
  savepoint?(name: string): Promise<void>;

  /**
   * Release savepoint
   */
  releaseSavepoint?(name: string): Promise<void>;

  /**
   * Rollback to savepoint
   */
  rollbackToSavepoint?(name: string): Promise<void>;
}

/**
 * Database health check result
 */
export interface DatabaseHealthCheck {
  /** Overall health status */
  healthy: boolean;

  /** Provider */
  provider: DatabaseProvider;

  /** Response time for ping (ms) */
  pingTime: number;

  /** Active connections */
  activeConnections: number;

  /** Maximum connections */
  maxConnections: number;

  /** Database size (bytes) */
  databaseSize?: number;

  /** Last successful query */
  lastSuccessfulQuery?: Date;

  /** Errors (if unhealthy) */
  errors?: string[];

  /** Timestamp of check */
  checkedAt: Date;
}

/**
 * Connection pool statistics
 */
export interface PoolStatistics {
  /** Total connections in pool */
  totalConnections: number;

  /** Active (in-use) connections */
  activeConnections: number;

  /** Idle connections */
  idleConnections: number;

  /** Waiting clients */
  waitingCount: number;

  /** Pool configuration */
  config: {
    max: number;
    min: number;
    idleTimeout: number;
  };

  /** Pool uptime (ms) */
  uptime: number;
}

/**
 * Migration tracking
 */
export interface MigrationRecord {
  /** Migration ID */
  id: number;

  /** Migration filename */
  filename: string;

  /** When applied */
  applied_at: Date;

  /** Execution time (ms) */
  execution_time?: number;

  /** Checksum of migration file */
  checksum?: string;
}

/**
 * Database adapter migration status
 */
export interface DatabaseMigrationStatus {
  /** Applied migrations */
  applied: MigrationRecord[];

  /** Pending migrations */
  pending: string[];

  /** Total migrations */
  total: number;

  /** Current migration version */
  currentVersion: number;

  /** Latest available version */
  latestVersion: number;

  /** Migration health */
  healthy: boolean;
}

/**
 * Database adapter factory
 */
export interface DatabaseAdapterFactory {
  /**
   * Create database adapter based on configuration
   *
   * @param config - Database adapter configuration
   * @returns Database adapter instance
   */
  createAdapter(config: DatabaseAdapterConfig): DatabaseAdapter;

  /**
   * Get adapter for specific provider
   *
   * @param provider - Provider type
   * @param config - Provider-specific config
   * @returns Database adapter instance
   */
  getAdapter(
    provider: 'local',
    config: LocalDatabaseConfig
  ): DatabaseAdapter;
  getAdapter(
    provider: 'supabase',
    config: SupabaseDatabaseConfig
  ): DatabaseAdapter;
  getAdapter(
    provider: 'neon',
    config: NeonDatabaseConfig
  ): DatabaseAdapter;
  getAdapter(
    provider: 'planetscale',
    config: PlanetScaleDatabaseConfig
  ): DatabaseAdapter;
}

/**
 * Database connection event
 */
export interface DatabaseConnectionEvent {
  /** Event type */
  type: 'connect' | 'disconnect' | 'error' | 'query' | 'transaction';

  /** Provider */
  provider: DatabaseProvider;

  /** Timestamp */
  timestamp: Date;

  /** Event details */
  details?: {
    /** Query SQL (if type is 'query') */
    sql?: string;
    /** Execution time (ms) */
    executionTime?: number;
    /** Error message (if type is 'error') */
    error?: string;
    /** Rows affected */
    rowsAffected?: number;
  };
}

/**
 * Database adapter metrics for monitoring
 */
export interface DatabaseAdapterMetrics {
  /** Provider */
  provider: DatabaseProvider;

  /** Time period */
  period: {
    start: Date;
    end: Date;
  };

  /** Query statistics */
  queries: {
    /** Total queries executed */
    total: number;
    /** Successful queries */
    successful: number;
    /** Failed queries */
    failed: number;
    /** Average execution time (ms) */
    averageExecutionTime: number;
    /** Slowest query time (ms) */
    slowestQuery: number;
  };

  /** Transaction statistics */
  transactions: {
    /** Total transactions */
    total: number;
    /** Committed transactions */
    committed: number;
    /** Rolled back transactions */
    rolledBack: number;
    /** Average transaction time (ms) */
    averageTransactionTime: number;
  };

  /** Connection statistics */
  connections: {
    /** Peak concurrent connections */
    peakConcurrent: number;
    /** Average active connections */
    averageActive: number;
    /** Connection errors */
    errors: number;
  };

  /** Data transfer */
  dataTransfer: {
    /** Bytes sent to database */
    bytesSent: number;
    /** Bytes received from database */
    bytesReceived: number;
  };
}
