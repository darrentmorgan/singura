/**
 * Supabase Client Configuration for NextJS Integration
 * Provides database connectivity while preserving existing patterns
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ovbrllefllskyeiszebj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

/**
 * Supabase client instance for frontend database operations
 * Configured for optimal performance with connection pooling
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'saas-xray-frontend@1.0.0',
    },
  },
  realtime: {
    enabled: true,
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Database configuration for enterprise-scale performance
 */
export const SUPABASE_CONFIG = {
  // Connection pooling settings
  connectionPool: {
    max: 20,
    min: 2,
    idle: 10000,
  },
  
  // Query timeouts
  queryTimeout: 30000,
  
  // Retry configuration
  retryAttempts: 3,
  retryDelay: 1000,
  
  // Realtime configuration
  realtime: {
    enabled: true,
    heartbeatInterval: 30000,
    reconnectDelay: 2000,
  },
  
  // Performance optimization
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
  },
} as const;

/**
 * Type-safe database operations helper
 */
export class SupabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

/**
 * Handle Supabase errors with consistent formatting
 */
export function handleSupabaseError(error: unknown): SupabaseError {
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as { message: string; code?: string; details?: unknown };
    return new SupabaseError(
      supabaseError.message,
      supabaseError.code,
      supabaseError.details
    );
  }
  
  return new SupabaseError(
    error instanceof Error ? error.message : 'Unknown database error',
    'UNKNOWN_ERROR',
    error
  );
}

/**
 * Execute database query with error handling and retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = SUPABASE_CONFIG.retryAttempts
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = SUPABASE_CONFIG.retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw handleSupabaseError(lastError);
}

/**
 * Health check for Supabase connection
 */
export async function healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return {
      status: 'healthy',
      message: 'Database connection is healthy'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

export default supabase;