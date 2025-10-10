/**
 * Error Logging Utility
 * Centralized error logging that can be easily upgraded to Sentry
 */

interface ErrorContext {
  [key: string]: any;
}

interface ErrorLogOptions {
  error: Error | unknown;
  errorId?: string;
  context?: ErrorContext;
  level?: 'error' | 'warning' | 'info';
}

/**
 * Log an error with context
 * TODO: Integrate with Sentry when ready
 */
export function logError(message: string, options: ErrorLogOptions): void {
  const { error, errorId, context, level = 'error' } = options;

  // Format error for console
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    message,
    errorId,
    level,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Log to console (development and production)
  if (level === 'error') {
    console.error(`[${errorId || 'ERROR'}]`, message, errorDetails);
  } else if (level === 'warning') {
    console.warn(`[${errorId || 'WARNING'}]`, message, errorDetails);
  } else {
    console.info(`[${errorId || 'INFO'}]`, message, errorDetails);
  }

  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // TODO: Send to Sentry
    // Sentry.captureException(error, {
    //   tags: { errorId },
    //   contexts: { custom: context },
    //   level,
    // });

    // For now, we could send to a custom endpoint
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorDetails),
      }).catch(() => {
        // Silently fail if error reporting endpoint is unavailable
      });
    } catch {
      // Silently fail - don't let error logging break the app
    }
  }
}

/**
 * Error IDs for categorizing errors
 */
export const ERROR_IDS = {
  // Waitlist errors
  WAITLIST_SUBMISSION_FAILED: 'WAITLIST_001',
  WAITLIST_NETWORK_ERROR: 'WAITLIST_002',
  WAITLIST_VALIDATION_ERROR: 'WAITLIST_003',
  WAITLIST_DUPLICATE_EMAIL: 'WAITLIST_004',
  WAITLIST_CONFIG_ERROR: 'WAITLIST_005',
  WAITLIST_RLS_ERROR: 'WAITLIST_006',

  // Configuration errors
  CONFIG_ERROR: 'CONFIG_001',
  SUPABASE_CONFIG_ERROR: 'CONFIG_002',

  // Network errors
  NETWORK_ERROR: 'NETWORK_001',
  API_ERROR: 'API_001',
} as const;
