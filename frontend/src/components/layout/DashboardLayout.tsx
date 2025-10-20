/**
 * Dashboard Layout Component
 * Main application layout with header, sidebar, and content area
 */

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

import Header from './Header';
import Sidebar from './Sidebar';
import { useUIActions } from '@/stores/ui';
import { useConnectionsActions } from '@/stores/connections';
import { websocketService } from '@/services/websocket';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();

  // Actions
  const { setOnlineStatus } = useUIActions();
  const { fetchConnections, fetchConnectionStats } = useConnectionsActions();

  // Initialize data and connections on mount
  useEffect(() => {
    if (!isSignedIn) return;

    const initializeApp = async () => {
      try {
        // Fetch initial data
        await Promise.all([
          fetchConnections(),
          fetchConnectionStats(),
        ]);

        // Connect to WebSocket for real-time updates
        await websocketService.connect();
      } catch (error) {
        console.error('Failed to initialize application:', error);
      }
    };

    initializeApp();

    // Set up online/offline listeners
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        // TODO: Open global search
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSignedIn, fetchConnections, fetchConnectionStats, setOnlineStatus]);

  // Don't render layout if not authenticated (auth guard should handle this)
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />
      
      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="h-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;