/**
 * Base repository class providing common database operations
 * All entity repositories should extend this class for consistency
 */

import { db } from '../pool';
import { 
  DatabaseQueryResult, 
  PaginatedResult, 
  PaginationOptions,
  ValidationError 
} from '../../types/database';

export abstract class BaseRepository<T, CreateInput, UpdateInput, Filters = any> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await db.query<T>(query, [id]);
    const row = result.rows[0];
    return row ? row : null;
  }

  /**
   * Find all records with optional filters and pagination
   */
  async findMany(
    filters?: Filters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { whereClause, params } = this.buildWhereClause(filters);
    const { limit, offset, orderBy } = this.buildPaginationClause(pagination);

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName}${whereClause}`;
    const countResult = await db.query<{ count: string }>(countQuery, params);
    const countRow = countResult.rows[0];
    if (!countRow) {
      throw new Error('Failed to get count from database');
    }
    const total = parseInt(countRow.count, 10);

    // Get paginated data
    const dataQuery = `SELECT * FROM ${this.tableName}${whereClause}${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataResult = await db.query<T>(dataQuery, [...params, limit, offset]);

    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      }
    };
  }

  /**
   * Find a single record by filters
   */
  async findOne(filters: Filters): Promise<T | null> {
    const { whereClause, params } = this.buildWhereClause(filters);
    const query = `SELECT * FROM ${this.tableName}${whereClause} LIMIT 1`;
    const result = await db.query<T>(query, params);
    const row = result.rows[0];
    return row ? row : null;
  }

  /**
   * Create a new record
   */
  async create(data: CreateInput): Promise<T> {
    const { columns, values, placeholders } = this.buildInsertClause(data);
    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;
    const result = await db.query<T>(query, values);
    
    const row = result.rows[0];
    if (!row) {
      throw new Error(`Failed to create record in ${this.tableName}`);
    }
    
    return row;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateInput): Promise<T | null> {
    const { setClause, params } = this.buildUpdateClause(data);
    
    if (setClause === '') {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.primaryKey} = $${params.length + 1}
      RETURNING *
    `;
    
    const result = await db.query<T>(query, [...params, id]);
    const row = result.rows[0];
    return row ? row : null;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 LIMIT 1`;
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }

  /**
   * Count records with optional filters
   */
  async count(filters?: Filters): Promise<number> {
    const { whereClause, params } = this.buildWhereClause(filters);
    const query = `SELECT COUNT(*) as count FROM ${this.tableName}${whereClause}`;
    const result = await db.query<{ count: string }>(query, params);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to get count from database');
    }
    return parseInt(row.count, 10);
  }

  /**
   * Execute a raw query
   */
  protected async executeQuery<R = any>(query: string, params?: any[]): Promise<DatabaseQueryResult<R>> {
    return db.query<R>(query, params);
  }

  /**
   * Build WHERE clause from filters
   */
  protected buildWhereClause(filters?: Filters): { whereClause: string; params: any[] } {
    if (!filters || Object.keys(filters).length === 0) {
      return { whereClause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle array values (IN clause)
        if (Array.isArray(value)) {
          if (value.length > 0) {
            const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
            conditions.push(`${key} IN (${placeholders})`);
            params.push(...value);
          }
        }
        // Handle object values with operators
        else if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([operator, operatorValue]) => {
            switch (operator) {
              case 'gt':
                conditions.push(`${key} > $${paramIndex++}`);
                params.push(operatorValue);
                break;
              case 'gte':
                conditions.push(`${key} >= $${paramIndex++}`);
                params.push(operatorValue);
                break;
              case 'lt':
                conditions.push(`${key} < $${paramIndex++}`);
                params.push(operatorValue);
                break;
              case 'lte':
                conditions.push(`${key} <= $${paramIndex++}`);
                params.push(operatorValue);
                break;
              case 'like':
                conditions.push(`${key} ILIKE $${paramIndex++}`);
                params.push(`%${operatorValue}%`);
                break;
              case 'not':
                conditions.push(`${key} != $${paramIndex++}`);
                params.push(operatorValue);
                break;
              default:
                conditions.push(`${key} = $${paramIndex++}`);
                params.push(operatorValue);
            }
          });
        }
        // Handle simple equality
        else {
          conditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
    });

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  }

  /**
   * Build pagination clause
   */
  protected buildPaginationClause(pagination?: PaginationOptions): {
    limit: number;
    offset: number;
    orderBy: string;
  } {
    const limit = Math.min(pagination?.limit || 20, 100); // Max 100 items per page
    const page = Math.max(pagination?.page || 1, 1);
    const offset = (page - 1) * limit;
    
    const sortBy = pagination?.sort_by || this.primaryKey;
    const sortOrder = pagination?.sort_order || 'DESC';
    const orderBy = ` ORDER BY ${sortBy} ${sortOrder}`;

    return { limit, offset, orderBy };
  }

  /**
   * Build INSERT clause from data
   */
  protected buildInsertClause(data: CreateInput | UpdateInput): {
    columns: string;
    values: any[];
    placeholders: string;
  } {
    const entries = Object.entries(data as Record<string, any>).filter(
      ([_, value]) => value !== undefined
    );

    const columns = entries.map(([key]) => key).join(', ');
    const values = entries.map(([_, value]) => value);
    const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ');

    return { columns, values, placeholders };
  }

  /**
   * Build UPDATE SET clause from data
   */
  protected buildUpdateClause(data: UpdateInput): {
    setClause: string;
    params: any[];
  } {
    const entries = Object.entries(data as Record<string, any>).filter(
      ([_, value]) => value !== undefined
    );

    if (entries.length === 0) {
      return { setClause: '', params: [] };
    }

    const setClause = entries
      .map(([key], index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const params = entries.map(([_, value]) => value);

    return { setClause, params };
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(data: any, requiredFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];

    requiredFields.forEach(field => {
      if (!data[field] && data[field] !== 0) {
        errors.push({
          field,
          message: `${field} is required`,
          value: data[field]
        });
      }
    });

    return errors;
  }

  /**
   * Sanitize input data by removing undefined values
   */
  protected sanitizeInput<TInput>(data: TInput): Partial<TInput> {
    const sanitized: Partial<TInput> = {};
    
    Object.entries(data as Record<string, any>).forEach(([key, value]) => {
      if (value !== undefined) {
        (sanitized as any)[key] = value;
      }
    });

    return sanitized;
  }
}