/**
 * Protected Route Component
 * Handles authentication checks and redirects for protected pages
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';

import { useIsAuthenticated, useAuthUser, useAuthActions } from '@/stores/auth';
import { useUIActions } from '@/stores/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePermissions?: string[];
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requirePermissions = [],
  fallback,
}) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  
  // Auth state
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthUser();
  const { checkAuthStatus } = useAuthActions();
  
  // UI actions
  const { showWarning } = useUIActions();

  useEffect(() => {
    const checkAuth = async () => {
      // Check authentication status
      checkAuthStatus();
      
      // Small delay to allow for auth store rehydration
      setTimeout(() => {
        setIsChecking(false);
      }, 500);
    };

    checkAuth();
  }, [checkAuthStatus]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Checking authentication...
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we verify your session
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ 
          from: location,
          redirect: location.pathname + location.search 
        }}
        replace
      />
    );
  }

  // Check permissions if required
  if (requirePermissions.length > 0 && user) {
    const hasRequiredPermissions = requirePermissions.every(permission =>
      user.permissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      showWarning(
        'You do not have permission to access this page',
        'Access Denied'
      );

      // Return fallback component or redirect to dashboard
      if (fallback) {
        return <>{fallback}</>;
      }

      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};

/**
 * Higher-order component version of ProtectedRoute
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requirePermissions?: string[];
    fallback?: React.ReactNode;
  }
) => {
  const WrappedComponent = (props: P) => (
    <ProtectedRoute
      requirePermissions={options?.requirePermissions}
      fallback={options?.fallback}
    >
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Permission Check Component
 * Conditionally renders children based on user permissions
 */
interface PermissionCheckProps {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission.
}

export const PermissionCheck: React.FC<PermissionCheckProps> = ({
  children,
  permissions,
  fallback = null,
  requireAll = true,
}) => {
  const user = useAuthUser();

  if (!user || !permissions.length) {
    return <>{fallback}</>;
  }

  const hasPermissions = requireAll
    ? permissions.every(permission => user.permissions.includes(permission))
    : permissions.some(permission => user.permissions.includes(permission));

  return hasPermissions ? <>{children}</> : <>{fallback}</>;
};

export default ProtectedRoute;