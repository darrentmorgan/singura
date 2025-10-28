/**
 * Main Application Component
 * Root component that sets up routing, providers, and global components
 */

import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import toast, { Toaster } from 'react-hot-toast';
import { OrganizationProfile, CreateOrganization, SignUp, UserProfile } from '@clerk/clerk-react';

// Layout and Auth Components
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import OAuthCallback from '@/components/auth/OAuthCallback';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ConnectionsPage from '@/pages/ConnectionsPage';
import AutomationsPage from '@/pages/AutomationsPage';
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard';

// Services and Stores
import { websocketService } from '@/services/websocket';
import { useAuth } from '@clerk/clerk-react';
import { useUIActions, useNotifications, useTheme } from '@/stores/ui';
import { CONTENT } from '@/lib/brand';

// Global Error Boundary
import ErrorBoundary from '@/components/common/ErrorBoundary';
import GlobalModal from '@/components/common/GlobalModal';

// Global Styles
import '@/index.css';

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Notification Component
const NotificationManager: React.FC = () => {
  const notifications = useNotifications();
  const processedNotificationsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    notifications.forEach(notification => {
      // Skip if already processed
      if (processedNotificationsRef.current.has(notification.id)) {
        return;
      }

      // Mark as processed
      processedNotificationsRef.current.add(notification.id);

      // Display toast based on type
      const message = notification.message || notification.title;

      if (notification.type === 'success') {
        toast.success(message, {
          duration: notification.duration || 4000,
          id: notification.id, // Use notification ID to prevent duplicates in react-hot-toast
        });
      } else if (notification.type === 'error') {
        toast.error(message, {
          duration: notification.duration || 6000,
          id: notification.id,
        });
      } else if (notification.type === 'warning') {
        toast(message, {
          icon: '⚠️',
          duration: notification.duration || 5000,
          id: notification.id,
        });
      } else if (notification.type === 'info') {
        toast(message, {
          icon: 'ℹ️',
          duration: notification.duration || 4000,
          id: notification.id,
        });
      }

      // Clean up old processed IDs after 10 seconds to prevent memory leak
      setTimeout(() => {
        processedNotificationsRef.current.delete(notification.id);
      }, 10000);
    });
  }, [notifications]);

  return null;
};

// Theme Manager
const ThemeManager: React.FC = () => {
  const theme = useTheme();

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;

    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Don't override CSS variables - let index.css handle colors
    // The theme store hex values break Tailwind's hsl(var(--primary)) function
    // Colors are properly defined in index.css for both light and dark modes
  }, [theme]);

  return null;
};

// Connection Status Manager
const ConnectionManager: React.FC = () => {
  const { isSignedIn } = useAuth();
  const { setOnlineStatus, setWebsocketStatus } = useUIActions();
  const wsConnectionAttemptedRef = React.useRef(false);

  useEffect(() => {
    // Handle online/offline status
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  useEffect(() => {
    // Skip WebSocket connection on public pages (landing page)
    const isPublicPage = window.location.pathname === '/';

    if (isPublicPage) {
      // Don't connect WebSocket on landing page
      return;
    }

    if (isSignedIn && !wsConnectionAttemptedRef.current) {
      // Connect to WebSocket when authenticated (only once)
      wsConnectionAttemptedRef.current = true;
      websocketService.connect().then(connected => {
        setWebsocketStatus(connected);
      });
    } else if (!isSignedIn) {
      // Disconnect WebSocket when not authenticated
      wsConnectionAttemptedRef.current = false;
      websocketService.disconnect();
      setWebsocketStatus(false);
    }

    return () => {
      // Cleanup only on unmount or sign-out
      if (!isSignedIn) {
        websocketService.cleanup();
      }
    };
  }, [isSignedIn, setWebsocketStatus]);

  return null;
};

// 404 Page Component
const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <h2 className="text-xl font-semibold text-foreground">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="space-x-4">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Go Back
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  </div>
);

// Placeholder pages for future implementation
const SecurityPage: React.FC = () => (
  <div className="flex-1 p-6">
    <div className="text-center py-12 space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Security Dashboard</h1>
      <p className="text-muted-foreground">
        Security analysis and compliance features coming soon.
      </p>
    </div>
  </div>
);

const AnalyticsPage: React.FC = () => <ExecutiveDashboard />;

const SettingsPage: React.FC = () => (
  <div className="flex-1 p-6">
    <UserProfile
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-xl"
        }
      }}
    />
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <Helmet>
            <title>{CONTENT.seo.title}</title>
            <meta name="description" content={CONTENT.seo.description} />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </Helmet>

          {/* Global Managers */}
          <ThemeManager />
          <ConnectionManager />
          <NotificationManager />

          {/* Global Modal */}
          <GlobalModal />

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />

          {/* Routes */}
          <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login/*" element={<LoginPage />} />
              <Route path="/sign-up/*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <SignUp
                    routing="path"
                    path="/sign-up"
                    signInUrl="/login"
                    afterSignUpUrl="/dashboard"
                    appearance={{
                      elements: {
                        rootBox: "w-full max-w-md",
                        card: "shadow-xl",
                      },
                    }}
                  />
                </div>
              } />
              <Route path="/oauth/callback" element={<OAuthCallback />} />

              {/* Protected Routes */}

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="/connections" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ConnectionsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="/connections/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ConnectionsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="/automations" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AutomationsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="/security" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SecurityPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="/analytics" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AnalyticsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SettingsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              {/* Clerk Organization Routes */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <div className="flex-1 p-6">
                      <OrganizationProfile />
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="/create-organization" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <div className="flex-1 p-6 flex items-center justify-center">
                      <CreateOrganization afterCreateOrganizationUrl="/connections" />
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              } />

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;