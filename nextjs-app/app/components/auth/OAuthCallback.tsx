/**
 * OAuth Callback Component
 * Handles OAuth callback from external platforms (Slack, Google, etc.)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';

import { useConnectionsActions } from '@/stores/connections';
import { useUIActions } from '@/stores/ui';
import { Button } from '@/components/ui/button';

interface OAuthCallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  platform?: string;
}

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<OAuthCallbackState>({
    status: 'loading',
    message: 'Processing OAuth callback...',
  });

  // Store actions
  const { handleOAuthCallback } = useConnectionsActions();
  const { showSuccess, showError } = useUIActions();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extract OAuth parameters from URL
        const code = searchParams.get('code');
        const stateParam = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors (user denied, etc.)
        if (error) {
          let errorMessage = 'OAuth authorization failed';
          
          switch (error) {
            case 'access_denied':
              errorMessage = 'Authorization was denied. Please try again if you want to connect this platform.';
              break;
            case 'invalid_request':
              errorMessage = 'Invalid OAuth request. Please try connecting again.';
              break;
            case 'unauthorized_client':
              errorMessage = 'OAuth client is not authorized. Please contact support.';
              break;
            case 'unsupported_response_type':
              errorMessage = 'Unsupported OAuth response type. Please contact support.';
              break;
            case 'invalid_scope':
              errorMessage = 'Invalid OAuth scope requested. Please contact support.';
              break;
            case 'server_error':
              errorMessage = 'OAuth server error. Please try again later.';
              break;
            case 'temporarily_unavailable':
              errorMessage = 'OAuth service is temporarily unavailable. Please try again later.';
              break;
            default:
              errorMessage = errorDescription || errorMessage;
          }

          setState({
            status: 'error',
            message: errorMessage,
          });

          showError(errorMessage, 'OAuth Failed');
          return;
        }

        // Validate required parameters
        if (!code || !stateParam) {
          setState({
            status: 'error',
            message: 'Missing required OAuth parameters. Please try connecting again.',
          });
          showError('Invalid OAuth callback parameters', 'OAuth Failed');
          return;
        }

        setState({
          status: 'loading',
          message: 'Connecting to platform...',
        });

        // Process the OAuth callback
        const success = await handleOAuthCallback(code, stateParam);

        if (success) {
          setState({
            status: 'success',
            message: 'Successfully connected to platform! Redirecting...',
          });

          showSuccess('Platform connected successfully', 'OAuth Complete');

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          setState({
            status: 'error',
            message: 'Failed to complete OAuth connection. Please try again.',
          });
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred during OAuth callback';

        setState({
          status: 'error',
          message: errorMessage,
        });

        showError(errorMessage, 'OAuth Failed');
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate, showSuccess, showError]);

  const handleReturnToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleRetry = () => {
    // Clear current state and restart the process
    setState({
      status: 'loading',
      message: 'Retrying OAuth callback...',
    });

    // Trigger the callback process again
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border shadow-sm p-8 text-center space-y-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground">SaaS X-Ray</h1>
          </div>

          {/* Status Icon and Message */}
          <div className="space-y-4">
            {state.status === 'loading' && (
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Processing Connection
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {state.message}
                  </p>
                </div>
              </div>
            )}

            {state.status === 'success' && (
              <div className="flex flex-col items-center space-y-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Connection Successful!
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {state.message}
                  </p>
                </div>
              </div>
            )}

            {state.status === 'error' && (
              <div className="flex flex-col items-center space-y-3">
                <XCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Connection Failed
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {state.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {state.status === 'error' && (
            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button 
                onClick={handleReturnToDashboard} 
                variant="outline" 
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </div>
          )}

          {state.status === 'success' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                You will be automatically redirected in a few seconds...
              </p>
              <Button 
                onClick={handleReturnToDashboard} 
                variant="outline" 
                className="w-full"
              >
                Continue to Dashboard
              </Button>
            </div>
          )}

          {state.status === 'loading' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75" />
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150" />
              </div>
              <p className="text-xs text-muted-foreground">
                Please wait while we complete the connection...
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              If you continue to experience issues, please{' '}
              <button
                type="button"
                className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                onClick={() => {
                  // TODO: Implement support contact
                  showError('Support contact functionality coming soon');
                }}
              >
                contact support
              </button>
              {' '}for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;