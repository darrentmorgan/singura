/**
 * Main Application Component
 * Root component that sets up routing, providers, and global components
 */

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import toast, { Toaster } from 'react-hot-toast';

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

const App: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

          {/* Router Provider (passed as children from main.tsx) */}
          {children}
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;