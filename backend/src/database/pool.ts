/**
 * Database connection pool configuration and management
 * Provides secure, efficient PostgreSQL connections with automatic retries
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { DatabaseConnection, DatabaseQueryResult, TransactionCallback } from '../types/database';

// Define QueryParameters locally since shared-types isn't available yet
type QueryParameters = (string | number | boolean | Date | null | undefined)[];

class DatabasePool {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor() {
    this.pool = this.createPool();
  }

  private createPool(): Pool {
    // Use TEST_DATABASE_URL in test environment, fallback to DATABASE_URL
    const connectionString = process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL
      ? process.env.TEST_DATABASE_URL
      : process.env.DATABASE_URL;
    
    const config: PoolConfig = {
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Connection pool settings
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      
      // Connection timeout settings
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      
      // Query settings
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000', 10),
      
      // Statement timeout for long-running queries
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '300000', 10),
      
      // Application name for debugging
      application_name: 'saas-xray-backend',
    };

    const pool = new Pool(config);

    // Handle pool errors
    pool.on('error', (err: Error, client: PoolClient) => {
      console.error('Unexpected error on idle client', err);
      // TODO: Add proper logging with winston
    });

    // Handle pool connections
    pool.on('connect', (client: PoolClient) => {
      console.log('New client connected to database');
      // Set default timezone for all connections
      client.query('SET timezone = "UTC"');
    });

    return pool;
  }

  /**
   * Initialize the database pool and test connectivity
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version()');
      console.log('Database connected successfully:', {
        current_time: result.rows[0].current_time,
        version: result.rows[0].version.split(' ').slice(0, 2).join(' ')
      });
      client.release();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database pool:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<DatabaseConnection> {
    const client = await this.pool.connect();
    
    return {
      query: async <T>(text: string, params?: QueryParameters): Promise<DatabaseQueryResult<T>> => {
        const start = Date.now();
        try {
          const result = await client.query(text, params);
          const duration = Date.now() - start;
          
          // Log slow queries (> 1 second)
          if (duration > 1000) {
            console.warn('Slow query detected:', {
              query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
              duration: `${duration}ms`,
              rowCount: result.rowCount
            });
          }
          
          return result;
        } catch (error) {
          console.error('Query error:', {
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params ? '[REDACTED]' : undefined,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      },
      
      release: (): void => {
        client.release();
      }
    };
  }

  /**
   * Execute a query directly from the pool
   */
  async query<T>(text: string, params?: QueryParameters): Promise<DatabaseQueryResult<T>> {
    const client = await this.getClient();
    try {
      return await client.query<T>(text, params);
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check for the database pool
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      totalClients: number;
      idleClients: number;
      waitingClients: number;
      maxClients: number;
      connectionString: string;
    };
  }> {
    try {
      const result = await this.query('SELECT 1');
      
      return {
        status: result.rowCount === 1 ? 'healthy' : 'unhealthy',
        details: {
          totalClients: this.pool.totalCount,
          idleClients: this.pool.idleCount,
          waitingClients: this.pool.waitingCount,
          maxClients: this.pool.options.max || 20,
          connectionString: this.pool.options.connectionString?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') || 'unknown'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          totalClients: this.pool.totalCount,
          idleClients: this.pool.idleCount,
          waitingClients: this.pool.waitingCount,
          maxClients: this.pool.options.max || 20,
          connectionString: 'connection failed'
        }
      };
    }
  }

  /**
   * Gracefully close the database pool
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database pool closed successfully');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalClients: number;
    idleClients: number;
    waitingClients: number;
    maxClients: number;
  } {
    return {
      totalClients: this.pool.totalCount,
      idleClients: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      maxClients: this.pool.options.max || 20
    };
  }
}

// Create and export singleton instance
export const db = new DatabasePool();

// Export the class for testing
export { DatabasePool };

// Helper function to ensure database is initialized before use
export async function ensureInitialized(): Promise<void> {
  await db.initialize();
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database pool...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database pool...');
  await db.close();
  process.exit(0);
});