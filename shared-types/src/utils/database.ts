/**
 * Database utility types and interfaces
 */

import { UUID, Timestamps, SoftDeleteTimestamps } from './common';

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Soft deletable entity
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: Date;
}

/**
 * Repository interface for CRUD operations
 */
export interface Repository<T extends BaseEntity> {
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  findById(id: UUID): Promise<T | null>;
  findMany(filter?: Partial<T>): Promise<T[]>;
  update(id: UUID, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T>;
  delete(id: UUID): Promise<boolean>;
  exists(id: UUID): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
}

/**
 * Paginated repository interface
 */
export interface PaginatedRepository<T extends BaseEntity> extends Repository<T> {
  findPaginated(
    filter?: Partial<T>,
    pagination?: { offset: number; limit: number },
    sort?: { field: keyof T; direction: 'asc' | 'desc' }
  ): Promise<{
    items: T[];
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  }>;
}

/**
 * Query builder interface
 */
export interface QueryBuilder<T> {
  select(fields?: (keyof T)[]): QueryBuilder<T>;
  where(field: keyof T, operator: QueryOperator, value: unknown): QueryBuilder<T>;
  whereIn(field: keyof T, values: unknown[]): QueryBuilder<T>;
  whereNotNull(field: keyof T): QueryBuilder<T>;
  orderBy(field: keyof T, direction?: 'asc' | 'desc'): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  offset(count: number): QueryBuilder<T>;
  join<U>(
    table: string, 
    localField: keyof T, 
    foreignField: keyof U
  ): QueryBuilder<T & U>;
  execute(): Promise<T[]>;
  first(): Promise<T | null>;
  count(): Promise<number>;
}

/**
 * Query operators
 */
export type QueryOperator = 
  | '=' | '!=' | '>' | '>=' | '<' | '<='
  | 'LIKE' | 'ILIKE' | 'NOT LIKE' | 'NOT ILIKE'
  | 'IS NULL' | 'IS NOT NULL'
  | 'IN' | 'NOT IN'
  | 'BETWEEN' | 'NOT BETWEEN';

/**
 * Database transaction interface
 */
export interface Transaction {
  id: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isCompleted(): boolean;
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Database migration interface
 */
export interface Migration {
  version: string;
  name: string;
  up(connection: DatabaseConnection): Promise<void>;
  down(connection: DatabaseConnection): Promise<void>;
}

/**
 * Migration manager interface
 */
export interface MigrationManager {
  runMigrations(): Promise<void>;
  rollbackMigration(version: string): Promise<void>;
  getMigrationStatus(): Promise<MigrationStatus[]>;
  createMigration(name: string): Promise<string>;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  version: string;
  name: string;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'failed';
  error?: string;
}

/**
 * Database schema types
 */
export type ColumnType = 
  | 'varchar' | 'text' | 'char'
  | 'int' | 'bigint' | 'smallint'
  | 'decimal' | 'numeric' | 'real' | 'double'
  | 'boolean'
  | 'date' | 'timestamp' | 'time'
  | 'json' | 'jsonb'
  | 'uuid'
  | 'bytea';

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  defaultValue?: unknown;
  primaryKey?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  };
  check?: string;
  comment?: string;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
  comment?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
  where?: string;
}

export interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  references?: {
    table: string;
    columns: string[];
  };
  expression?: string;
}

/**
 * Database pool configuration
 */
export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  createTimeoutMillis: number;
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  pool?: PoolConfig;
  connectionTimeoutMillis?: number;
  queryTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Database health check
 */
export interface DatabaseHealth {
  isConnected: boolean;
  connectionCount: number;
  maxConnections: number;
  avgQueryTime: number;
  totalQueries: number;
  lastError?: {
    message: string;
    timestamp: Date;
  };
}

/**
 * Audit log entry for database operations
 */
export interface DatabaseAuditEntry {
  id: UUID;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  tableName: string;
  recordId?: string;
  userId?: UUID;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Soft delete utilities
 */
export interface SoftDeleteOptions {
  deletedAtColumn: string;
  includeDeleted: boolean;
  onlyDeleted: boolean;
}

/**
 * Bulk operation types
 */
export interface BulkInsertOptions {
  batchSize?: number;
  onConflict?: 'ignore' | 'update' | 'error';
  updateFields?: string[];
}

export interface BulkUpdateOptions {
  batchSize?: number;
  whereClause?: string;
  whereParams?: unknown[];
}

export interface BulkDeleteOptions {
  batchSize?: number;
  soft?: boolean;
  cascade?: boolean;
}

/**
 * Database event types
 */
export interface DatabaseEvent<T = unknown> {
  type: 'insert' | 'update' | 'delete';
  table: string;
  recordId: string;
  data: T;
  timestamp: Date;
  userId?: UUID;
}

/**
 * Change tracking
 */
export interface ChangeTrackingConfig {
  enabled: boolean;
  tables: string[];
  includeOldValues: boolean;
  includeNewValues: boolean;
  trackDeletes: boolean;
  retentionDays: number;
}

export interface ChangeLogEntry {
  id: UUID;
  tableName: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  columnName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedBy?: UUID;
  changedAt: Date;
}

/**
 * Database backup and restore
 */
export interface BackupConfig {
  schedule: string; // cron expression
  retention: number; // days
  compression: boolean;
  encryption: boolean;
  destination: string;
}

export interface BackupInfo {
  id: UUID;
  filename: string;
  size: number;
  createdAt: Date;
  checksum: string;
  compressed: boolean;
  encrypted: boolean;
  tables: string[];
}

export interface RestoreOptions {
  backupId: UUID;
  tables?: string[];
  dropExisting?: boolean;
  skipData?: boolean;
  skipSchema?: boolean;
}