/**
 * Automations Page
 * Main page for viewing discovered automations and managing discovery
 */

import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Play, Pause } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import AutomationsList from '@/components/automations/AutomationsList';
import DiscoveryProgress from '@/components/automations/DiscoveryProgress';
import { 
  useAutomationsActions, 
  useDiscoveryProgress, 
  useAutomationsLoading,
  useAutomationsStats
} from '@/stores/automations';
import { useConnections, useConnectionsActions } from '@/stores/connections';
import { useUIActions } from '@/stores/ui';

export const AutomationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeDiscoveries, setActiveDiscoveries] = useState<string[]>([]);

  // Store state
  const connections = useConnections();
  const discoveryProgress = useDiscoveryProgress();
  const isLoading = useAutomationsLoading();
  const automationStats = useAutomationsStats();

  // Actions
  const {
    fetchAutomations,
    fetchAutomationStats,
    startDiscovery,
    refreshDiscovery
  } = useAutomationsActions();
  const { fetchConnections } = useConnectionsActions();
  const { showSuccess, showError, showWarning, openModal } = useUIActions();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchConnections(),
          fetchAutomations(),
          fetchAutomationStats()
        ]);
      } catch (error) {
        showError('Failed to load automations data');
      }
    };

    loadInitialData();
  }, [fetchConnections, fetchAutomations, fetchAutomationStats, showError]);

  // Track active discoveries
  useEffect(() => {
    const active = Object.entries(discoveryProgress)
      .filter(([_, progress]) => !['completed', 'failed'].includes(progress.stage))
      .map(([connectionId]) => connectionId);
    
    setActiveDiscoveries(active);
  }, [discoveryProgress]);

  const handleStartDiscovery = async (connectionId: string) => {
    try {
      const success = await startDiscovery(connectionId);
      if (success) {
        showSuccess('Discovery started successfully', 'Discovery Started');
      }
    } catch (error) {
      showError('Failed to start discovery');
    }
  };

  const handleBulkDiscovery = () => {
    const activeConnections = connections.filter(conn => conn.status === 'active');
    
    if (activeConnections.length === 0) {
      showWarning('No active connections available for discovery');
      return;
    }

    openModal({
      type: 'confirm',
      title: 'Start Bulk Discovery',
      content: `This will start automation discovery on ${activeConnections.length} active connection${activeConnections.length !== 1 ? 's' : ''}. This process may take several minutes to complete.`,
      actions: [
        {
          label: 'Cancel',
          action: () => {},
          variant: 'secondary',
        },
        {
          label: 'Start Discovery',
          action: async () => {
            showSuccess(`Starting discovery on ${activeConnections.length} connections...`);
            
            // Start discovery for all active connections
            const promises = activeConnections.map(conn => startDiscovery(conn.id));
            
            try {
              const results = await Promise.allSettled(promises);
              const successful = results.filter(r => r.status === 'fulfilled').length;
              const failed = results.length - successful;
              
              if (successful > 0) {
                showSuccess(`Discovery started on ${successful} connection${successful !== 1 ? 's' : ''}`);
              }
              
              if (failed > 0) {
                showWarning(`Failed to start discovery on ${failed} connection${failed !== 1 ? 's' : ''}`);
              }
            } catch (error) {
              showError('Failed to start bulk discovery');
            }
          },
          variant: 'primary',
        },
      ],
    });
  };

  const handleRefreshDiscovery = async (connectionId: string) => {
    try {
      const success = await refreshDiscovery(connectionId);
      if (success) {
        showSuccess('Discovery refreshed successfully');
      }
    } catch (error) {
      showError('Failed to refresh discovery');
    }
  };

  const activeConnections = connections.filter(conn => conn.status === 'active');
  const hasActiveDiscoveries = activeDiscoveries.length > 0;

  return (
    <>
      <Helmet>
        <title>Automations - {BRAND.name}</title>
        <meta name="description" content="View and manage discovered automations across your platforms" />
      </Helmet>

      <div className="flex-1 space-y-8 p-6">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground">Automation Discovery</h1>
              <p className="text-muted-foreground">
                Discover and monitor automations across your connected platforms.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => navigate('/connections')}
                disabled={connections.length === 0}
              >
                Manage Connections
              </Button>
              
              <Button
                onClick={handleBulkDiscovery}
                disabled={activeConnections.length === 0 || hasActiveDiscoveries}
                loading={hasActiveDiscoveries}
              >
                <Play className="h-4 w-4 mr-2" />
                {hasActiveDiscoveries ? 'Discovery Running...' : 'Start Discovery'}
              </Button>
            </div>
          </div>

          {/* Connection Status Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <p className="text-sm font-medium text-muted-foreground">Total Connections</p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{connections.length}</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <p className="text-sm font-medium text-muted-foreground">Active</p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{activeConnections.length}</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <p className="text-sm font-medium text-muted-foreground">Discovering</p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{activeDiscoveries.length}</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <p className="text-sm font-medium text-muted-foreground">Automations</p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {automationStats?.totalAutomations || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Active Discovery Progress */}
        {hasActiveDiscoveries && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Active Discoveries</h2>
            <div className="space-y-4">
              {activeDiscoveries.map(connectionId => {
                const progress = discoveryProgress[connectionId];

                return (
                  <DiscoveryProgress
                    key={connectionId}
                    progress={progress}
                    onRetry={() => handleRefreshDiscovery(connectionId)}
                    showDetails={true}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* No Connections State */}
        {connections.length === 0 && !isLoading && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">No platforms connected</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                To discover automations, you need to connect at least one platform first.
              </p>
            </div>
            <Button onClick={() => navigate('/connections')}>
              Connect Your First Platform
            </Button>
          </div>
        )}

        {/* No Active Connections State */}
        {connections.length > 0 && activeConnections.length === 0 && !isLoading && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Pause className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">No active connections</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your connected platforms need to be active to run automation discovery.
                Check your connection status and retry failed connections.
              </p>
            </div>
            <Button onClick={() => navigate('/connections')}>
              Check Connections
            </Button>
          </div>
        )}

        {/* Individual Connection Discovery */}
        {activeConnections.length > 0 && !hasActiveDiscoveries && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Discovery by Connection
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeConnections.map(connection => (
                <div key={connection.id} className="bg-card border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {connection.display_name}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {connection.platform_type}
                      </p>
                    </div>
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Last sync: {connection.last_sync_at 
                        ? new Date(connection.last_sync_at).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                    
                    <Button
                      size="sm"
                      onClick={() => handleStartDiscovery(connection.id)}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Discovery
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automations List */}
        <AutomationsList
          showPlatformFilter={true}
          showHeader={true}
        />
      </div>
    </>
  );
};

export default AutomationsPage;