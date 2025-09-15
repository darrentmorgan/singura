/**
 * Base Supabase Repository - NextJS Compatible
 * Maintains T | null architecture and shared-types integration
 * Provides identical patterns to backend repository but using Supabase client
 */

import { supabase, handleSupabaseError, executeWithRetry } from '../supabase';
import type { 
  PaginatedResult, 
  PaginationOptions,
  ValidationError 
} from '@saas-xray/shared-types';

export type DatabaseFilter<T> = {
  [K in keyof T]?: T[K] extends string 
    ? string | string[] 
    : T[K] extends number 
    ? number | number[] 
    : T[K] extends Date 
    ? Date | { from?: Date; to?: Date }
    : T[K] extends boolean
    ? boolean
    : unknown;
};

export interface SupabaseQueryBuilder<T> {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  pagination?: PaginationOptions;
}

/**
 * Base repository class for Supabase operations
 * Maintains identical API to backend repositories for consistency
 */
export abstract class BaseSupabaseRepository<
  T extends Record<string, unknown>, 
  CreateInput extends Record<string, unknown>, 
  UpdateInput extends Record<string, unknown>, 
  Filters = DatabaseFilter<T>
> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Find a single record by ID
   * Returns T | null to maintain existing pattern
   */
  async findById(id: string): Promise<T | null> {
    return executeWithRetry(async () => {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq(this.primaryKey, id)
        .single();

      if (error) {
        // Handle "not found" as null return, not error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw handleSupabaseError(error);
      }

      return data as T;
    });
  }

  /**
   * Find all records with optional filters and pagination
   * Maintains identical API to backend implementation
   */
  async findMany(
    filters?: Filters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    return executeWithRetry(async () => {
      let query = supabase.from(this.tableName).select('*', { count: 'exact' });

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Apply pagination
      const limit = Math.min(pagination?.limit || 20, 100);
      const page = Math.max(pagination?.page || 1, 1);
      const offset = (page - 1) * limit;

      // Apply sorting
      const sortBy = pagination?.sort_by || this.primaryKey;
      const sortOrder = pagination?.sort_order === 'ASC' ? { ascending: true } : { ascending: false };
      
      query = query
        .order(sortBy, sortOrder)
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        throw handleSupabaseError(error);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: (data || []) as T[],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      };
    });
  }

  /**
   * Find a single record by filters
   * Returns T | null to maintain existing pattern
   */
  async findOne(filters: Filters): Promise<T | null> {
    return executeWithRetry(async () => {
      let query = supabase.from(this.tableName).select('*');
      
      query = this.applyFilters(query, filters);
      
      const { data, error } = await query.limit(1).single();

      if (error) {
        // Handle "not found" as null return, not error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw handleSupabaseError(error);
      }

      return data as T;
    });
  }

  /**
   * Create a new record
   * Maintains identical API to backend implementation
   */
  async create(data: CreateInput): Promise<T> {
    return executeWithRetry(async () => {
      const sanitizedData = this.sanitizeInput(data);
      
      const { data: createdData, error } = await supabase
        .from(this.tableName)
        .insert(sanitizedData)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      if (!createdData) {
        throw new Error(`Failed to create record in ${this.tableName}`);
      }

      return createdData as T;
    });
  }

  /**
   * Update a record by ID
   * Returns T | null to maintain existing pattern
   */
  async update(id: string, data: UpdateInput): Promise<T | null> {
    return executeWithRetry(async () => {
      const sanitizedData = this.sanitizeInput(data);
      
      if (Object.keys(sanitizedData).length === 0) {
        throw new Error('No fields to update');
      }

      const { data: updatedData, error } = await supabase
        .from(this.tableName)
        .update(sanitizedData)
        .eq(this.primaryKey, id)
        .select()
        .single();

      if (error) {
        // Handle "not found" as null return, not error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw handleSupabaseError(error);
      }

      return updatedData as T;
    });
  }

  /**
   * Delete a record by ID
   * Returns boolean to maintain existing pattern
   */
  async delete(id: string): Promise<boolean> {
    return executeWithRetry(async () => {
      const { error, count } = await supabase
        .from(this.tableName)
        .delete({ count: 'exact' })
        .eq(this.primaryKey, id);

      if (error) {
        throw handleSupabaseError(error);
      }

      return (count || 0) > 0;
    });
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    return executeWithRetry(async () => {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.primaryKey)
        .eq(this.primaryKey, id)
        .limit(1);

      if (error) {
        throw handleSupabaseError(error);
      }

      return (data || []).length > 0;
    });
  }

  /**
   * Count records with optional filters
   */
  async count(filters?: Filters): Promise<number> {
    return executeWithRetry(async () => {
      let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true });

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { count, error } = await query;

      if (error) {
        throw handleSupabaseError(error);
      }

      return count || 0;
    });
  }

  /**
   * Execute a raw query using Supabase RPC
   */
  protected async executeRPC<R>(
    functionName: string, 
    params?: Record<string, unknown>
  ): Promise<R[]> {
    return executeWithRetry(async () => {
      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        throw handleSupabaseError(error);
      }

      return data as R[];
    });
  }

  /**
   * Apply filters to Supabase query
   * Handles various filter types and operators
   */
  protected applyFilters(query: any, filters: Filters): any {
    const filterRecord = filters as Record<string, unknown>;
    
    Object.entries(filterRecord).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array values (IN clause)
          if (value.length > 0) {
            query = query.in(key, value);
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle operator objects
          Object.entries(value).forEach(([operator, operatorValue]) => {
            if (operatorValue === undefined || operatorValue === null) return;
            
            switch (operator) {
              case 'gt':
                query = query.gt(key, operatorValue);
                break;
              case 'gte':
                query = query.gte(key, operatorValue);
                break;
              case 'lt':
                query = query.lt(key, operatorValue);
                break;
              case 'lte':
                query = query.lte(key, operatorValue);
                break;
              case 'like':
                query = query.ilike(key, `%${String(operatorValue)}%`);
                break;
              case 'not':
                query = query.neq(key, operatorValue);
                break;
              case 'in':
                if (Array.isArray(operatorValue) && operatorValue.length > 0) {
                  query = query.in(key, operatorValue);
                }
                break;
              default:
                query = query.eq(key, operatorValue);
            }
          });
        } else {
          // Handle simple equality
          query = query.eq(key, value);
        }
      }
    });

    return query;
  }

  /**
   * Validate required fields
   * Maintains compatibility with backend validation
   */
  protected validateRequiredFields<D extends Record<string, unknown>>(
    data: D, 
    requiredFields: string[]
  ): ValidationError[] {
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
   * Maintains compatibility with backend implementation
   */
  protected sanitizeInput<TInput>(data: TInput): Partial<TInput> {
    const sanitized: Partial<TInput> = {};
    
    if (typeof data !== 'object' || data === null) {
      throw new Error('Data to sanitize must be an object');
    }
    
    const dataRecord = data as Record<string, unknown>;
    
    Object.entries(dataRecord).forEach(([key, value]) => {
      if (value !== undefined) {
        (sanitized as Record<string, unknown>)[key] = value;
      }
    });

    return sanitized;
  }
}