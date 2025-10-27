/**
 * Protected Route Component - Clerk Integration with React Router v7
 *
 * SOLUTION: Tracks authentication state across navigation to prevent redirect loops
 * caused by Clerk's client-side auth state initialization during React Router navigation.
 *
 * Context: In library mode (Vite + BrowserRouter), auth state is purely client-side.
 * During route transitions, Clerk's auth state briefly becomes uninitialized (~50-500ms),
 * which could cause redirects to /login during legitimate navigation between protected routes.
 *
 * Implementation:
 * 1. Tracks if user was ever authenticated (wasAuthenticatedRef)
 * 2. On navigation, detects actual pathname changes vs re-renders (prevPathnameRef)
 * 3. If auth temporarily becomes uninitialized during navigation BUT user was previously
 *    authenticated, shows loading spinner instead of redirecting
 * 4. Only redirects to /login if user was never authenticated
 *
 * This prevents the cascade: /automations → /login → /dashboard when clicking components
 * on protected pages, as auth state no longer triggers redirects during navigation.
 *
 * Future: Consider migrating to React Router framework mode for true server-side auth.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';

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
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // Navigation transition guard: Wait 500ms before checking auth to allow Clerk to stabilize
  const [showContent, setShowContent] = useState(false);
  const authCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathnameRef = useRef<string>(location.pathname);

  // Track if user was ever authenticated in this session
  // This prevents redirects during navigation when auth temporarily becomes uninitialized
  const wasAuthenticatedRef = useRef<boolean>(false);

  useEffect(() => {
    // Track authentication state to prevent redirects during navigation
    if (isLoaded && isSignedIn) {
      wasAuthenticatedRef.current = true;
    }

    // Only reset auth check if pathname ACTUALLY changed (not just re-render)
    const pathnameChanged = prevPathnameRef.current !== location.pathname;

    if (pathnameChanged) {
      console.log('[ProtectedRoute] Pathname changed:', prevPathnameRef.current, '→', location.pathname);
      prevPathnameRef.current = location.pathname;

      // Clear any existing timer
      if (authCheckTimerRef.current) {
        clearTimeout(authCheckTimerRef.current);
      }

      // Reset showContent when pathname actually changes
      setShowContent(false);

      // Wait 500ms for Clerk auth to stabilize during navigation transitions
      if (isLoaded && isSignedIn) {
        authCheckTimerRef.current = setTimeout(() => {
          setShowContent(true);
        }, 500);
      }
    } else if (isLoaded && isSignedIn && !showContent) {
      // Auth state changed but pathname didn't - just update showContent
      console.log('[ProtectedRoute] Auth state changed, pathname stable');
      if (authCheckTimerRef.current) {
        clearTimeout(authCheckTimerRef.current);
      }
      authCheckTimerRef.current = setTimeout(() => {
        setShowContent(true);
      }, 500);
    }

    return () => {
      if (authCheckTimerRef.current) {
        clearTimeout(authCheckTimerRef.current);
      }
    };
  }, [location.pathname, isLoaded, isSignedIn, showContent]);

  // Debug logging
  console.log('[ProtectedRoute]', {
    pathname: location.pathname,
    isLoaded,
    isSignedIn,
    showContent,
    wasAuthenticated: wasAuthenticatedRef.current
  });

  // Show loading spinner while Clerk initializes OR during transition guard
  if (!isLoaded || (isLoaded && isSignedIn && !showContent)) {
    console.log('[ProtectedRoute] Showing loading spinner (transition guard active)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Loading...
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not signed in (after transition guard), handle appropriately
  if (!isSignedIn) {
    // If user was previously authenticated, they're just navigating between protected routes
    // Show loading spinner instead of redirecting (auth will reinitialize)
    if (wasAuthenticatedRef.current) {
      console.log('[ProtectedRoute] User was authenticated, showing spinner during navigation');
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary mr-2" />
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Loading...
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait
              </p>
            </div>
          </div>
        </div>
      );
    }

    // User was never authenticated, redirect to login
    const redirectUrl = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    console.log('[ProtectedRoute] 🚨 Redirecting to login - user not signed in', {
      currentPath: location.pathname,
      currentSearch: location.search,
      redirectUrl,
      isLoaded,
      isSignedIn,
      wasAuthenticated: wasAuthenticatedRef.current
    });
    return <Navigate to={redirectUrl} replace />;
  }

  console.log('[ProtectedRoute] User is signed in, rendering children');

  // Check permissions if required
  if (requirePermissions.length > 0 && user) {
    const userPermissions = (user.publicMetadata?.permissions as string[]) || [];
    const hasAllPermissions = requirePermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return fallback || <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};

/**
 * Higher-order component version of ProtectedRoute
 */
// eslint-disable-next-line react-refresh/only-export-components
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
 * Conditionally renders children based on user permissions from Clerk metadata
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
  const { user } = useUser();

  if (!user || !permissions.length) {
    return <>{fallback}</>;
  }

  const userPermissions = (user.publicMetadata?.permissions as string[]) || [];
  const hasPermissions = requireAll
    ? permissions.every(permission => userPermissions.includes(permission))
    : permissions.some(permission => userPermissions.includes(permission));

  return hasPermissions ? <>{children}</> : <>{fallback}</>;
};

export default ProtectedRoute;
