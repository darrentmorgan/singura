/**
 * Connections Page
 * Main page for managing platform connections
 */

import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';

import ConnectionsGrid from '@/components/connections/ConnectionsGrid';
import { BRAND } from '@/lib/brand';
import { useConnectionsActions, useConnectionStats, useConnectionsLoading } from '@/stores/connections';
import { useUIActions } from '@/stores/ui';

export const ConnectionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const connectionStats = useConnectionStats();
  const isLoading = useConnectionsLoading();
  const { fetchConnections, fetchConnectionStats } = useConnectionsActions();
  const { showError, showSuccess } = useUIActions();

  // Track if OAuth callback has been processed to prevent duplicates
  const oauthProcessedRef = useRef(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Check for OAuth completion parameters
        const success = searchParams.get('success');
        const platform = searchParams.get('platform');
        const error = searchParams.get('error');

        // Only process OAuth callback once
        if ((success === 'true' || success === 'false') && platform && !oauthProcessedRef.current) {
          oauthProcessedRef.current = true;

          if (success === 'true') {
            // Show success message
            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            showSuccess(`${platformName} connected successfully!`, 'Platform Connected');
          } else {
            // Show error message
            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            const errorMessage = error ? `Connection failed: ${error}` : 'Connection failed';
            showError(`${platformName} connection failed: ${errorMessage}`, 'Connection Failed');
          }

          // Clear the URL parameters after processing
          setSearchParams(new URLSearchParams());
        }

        await Promise.all([
          fetchConnections(),
          fetchConnectionStats()
        ]);
      } catch (error) {
        showError('Failed to load connections data');
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Re-run when OAuth callback adds search params, action functions are stable

  return (
    <>
      <Helmet>
        <title>Platform Connections - {BRAND.name}</title>
        <meta name="description" content="Manage your platform connections and integrations" />
      </Helmet>

      <div className="flex-1 space-y-8 p-6">
        {/* Page Header with Stats */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="connections-page-title">Platform Connections</h1>
            <p className="text-muted-foreground mt-1">
              Connect and manage your organization&apos;s platforms to discover automations and monitor security.
            </p>
          </div>

          {/* Connection Stats */}
          {connectionStats && !isLoading && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <p className="text-sm font-medium text-muted-foreground">Total Connections</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">{connectionStats.total}</p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">{connectionStats.active}</p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <p className="text-sm font-medium text-muted-foreground">Errors</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">{connectionStats.error}</p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">{connectionStats.inactive}</p>
              </div>
            </div>
          )}
        </div>

        {/* Connections Grid */}
        <ConnectionsGrid showAddPlatforms={true} />
      </div>
    </>
  );
};

export default ConnectionsPage;