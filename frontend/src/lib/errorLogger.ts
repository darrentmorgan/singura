/**
 * Error Logging Utility
 * Production-grade error logging with Sentry integration
 */

import * as Sentry from '@sentry/react';

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
 * Integrated with Sentry for production error tracking
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

  // Send to Sentry in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    // Add breadcrumb for context
    Sentry.addBreadcrumb({
      message,
      level: level === 'warning' ? 'warning' : level === 'error' ? 'error' : 'info',
      category: 'app.log',
      data: context,
      timestamp: Date.now() / 1000,
    });

    // Capture the exception or message
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: {
          errorId: errorId || 'unknown',
          component: context?.component || 'unknown',
        },
        contexts: {
          custom: context || {},
          app: {
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
        },
        level: level === 'warning' ? 'warning' : level === 'error' ? 'error' : 'info',
        extra: errorDetails,
      });
    } else {
      // For non-Error objects, capture as message
      Sentry.captureMessage(message, {
        tags: {
          errorId: errorId || 'unknown',
        },
        contexts: {
          custom: context || {},
        },
        level: level === 'warning' ? 'warning' : level === 'error' ? 'error' : 'info',
        extra: errorDetails,
      });
    }
  }

  // Also send to backend API for additional logging
  if (import.meta.env.PROD) {
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
 * Initialize Sentry (should be called from main.tsx)
 */
export function initializeSentry(): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          maskAllInputs: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        // Filter out certain errors if needed
        if (event.exception?.values?.[0]?.type === 'NetworkError') {
          return null; // Don't send network errors to Sentry
        }
        return event;
      },
    });
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
