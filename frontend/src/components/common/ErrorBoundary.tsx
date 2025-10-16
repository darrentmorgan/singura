/**
 * Error Boundary Component
 * Production-grade error boundary with Sentry integration and session replay
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import * as Sentry from '@sentry/react';

import { Button } from '@/components/ui/button';
import { logError, ERROR_IDS } from '@/lib/errorLogger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to our error logger (which includes Sentry)
    logError('Unhandled error caught by Error Boundary', {
      error,
      errorId: 'ERROR_BOUNDARY_CATCH',
      context: {
        component: 'ErrorBoundary',
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
      level: 'error',
    });

    // Also capture directly to Sentry with additional context
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag('error_boundary', true);
        scope.setContext('errorInfo', {
          componentStack: errorInfo.componentStack,
        });
        scope.setLevel('error');

        // Add user context if available
        const client = Sentry.getCurrentScope().getClient();
        const user = Sentry.getCurrentScope().getUser();
        if (user) {
          scope.setUser(user);
        }

        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      });
    }

    // Send to backend error tracking endpoint
    if (import.meta.env.PROD) {
      fetch('/api/errors/boundary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Silently fail
      });
    }
  };

  private handleReportError = () => {
    if (this.state.error) {
      // Trigger session replay if available
      if (import.meta.env.VITE_SENTRY_DSN) {
        // Force capture the current replay session by sending a message
        Sentry.captureMessage('User reported error from Error Boundary', 'info');
      }

      // Show confirmation
      alert('Error report sent. Thank you for your feedback!');
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      // Use custom fallback if provided
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} reset={this.handleReset} />;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">
                We apologize for the inconvenience. An unexpected error occurred while loading this page.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-muted border rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold text-foreground">Error Details</h3>
                <div className="text-sm font-mono bg-background border rounded p-3 overflow-auto">
                  <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-muted-foreground whitespace-pre-wrap text-xs">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <Button onClick={this.handleReload} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>

              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>

              {import.meta.env.VITE_SENTRY_DSN && (
                <Button onClick={this.handleReportError} variant="secondary">
                  <Bug className="h-4 w-4 mr-2" />
                  Report Error
                </Button>
              )}
            </div>

            {/* Help Text */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p>If this problem persists, please try:</p>
              <ul className="list-disc list-inside text-left inline-block space-y-1">
                <li>Clearing your browser cache and cookies</li>
                <li>Disabling browser extensions temporarily</li>
                <li>Using a different browser or incognito mode</li>
                <li>Contacting support if the issue continues</li>
              </ul>
            </div>

            {/* Support Contact */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Need help? Contact our support team at{' '}
                <a 
                  href="mailto:support@saasxray.com" 
                  className="text-primary hover:underline"
                >
                  support@saasxray.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;