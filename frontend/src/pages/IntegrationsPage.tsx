/**
 * Integrations Page
 * Displays third-party OAuth integrations (type: 'integration')
 */

import React, { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Puzzle, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import AutomationsList from '@/components/automations/AutomationsList';
import {
  useAutomationsActions,
  useAutomationsLoading,
  useAutomations
} from '@/stores/automations';
import { useConnections, useConnectionsActions } from '@/stores/connections';
import { useUIActions } from '@/stores/ui';

export const IntegrationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Store state
  const connections = useConnections();
  const isLoading = useAutomationsLoading();
  const allAutomations = useAutomations();

  // Filter to show ONLY integrations (type: 'integration')
  const integrations = useMemo(() => {
    return allAutomations.filter(a => a.type === 'integration');
  }, [allAutomations]);

  // Actions
  const { fetchAutomations, fetchAutomationStats, setFilters } = useAutomationsActions();
  const { fetchConnections } = useConnectionsActions();
  const { showError } = useUIActions();

  // Set type filter to 'integration' when page mounts
  useEffect(() => {
    setFilters({ type: 'integration' });

    return () => {
      // Clear type filter when unmounting
      setFilters({ type: undefined });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchConnections(),
          fetchAutomations(),
          fetchAutomationStats()
        ]);
      } catch (error) {
        showError('Failed to load integrations data');
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, action functions are stable

  const activeConnections = connections.filter(conn => conn.status === 'active');

  // Calculate integration statistics
  const integrationStats = useMemo(() => {
    const byPlatform = integrations.reduce((acc, integration) => {
      acc[integration.platform] = (acc[integration.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byRisk = {
      low: integrations.filter(i => i.riskLevel === 'low').length,
      medium: integrations.filter(i => i.riskLevel === 'medium').length,
      high: integrations.filter(i => i.riskLevel === 'high').length,
    };

    const byStatus = {
      active: integrations.filter(i => i.status === 'active').length,
      inactive: integrations.filter(i => i.status === 'inactive').length,
      error: integrations.filter(i => i.status === 'error').length,
    };

    return { byPlatform, byRisk, byStatus };
  }, [integrations]);

  return (
    <>
      <Helmet>
        <title>Integrations - {BRAND.name}</title>
        <meta name="description" content="Monitor and manage third-party OAuth applications connected to your platforms" />
      </Helmet>

      <div className="flex-1 space-y-8 p-6">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground">Third-party Integrations</h1>
              <p className="text-muted-foreground">
                Monitor and manage OAuth applications and third-party integrations connected to your platforms.
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
            </div>
          </div>

          {/* Integration Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Integrations</p>
                <Puzzle className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {integrations.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeConnections.length} active connection{activeConnections.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {integrationStats.byStatus.active}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Currently running
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {integrationStats.byRisk.high}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Requires review
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Platforms</p>
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {Object.keys(integrationStats.byPlatform).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Connected sources
              </p>
            </div>
          </div>
        </div>

        {/* No Connections State */}
        {connections.length === 0 && !isLoading && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Puzzle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">No platforms connected</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                To discover third-party integrations, you need to connect at least one platform first.
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
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">No active connections</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your connected platforms need to be active to discover integrations.
                Check your connection status and retry failed connections.
              </p>
            </div>
            <Button onClick={() => navigate('/connections')}>
              Check Connections
            </Button>
          </div>
        )}

        {/* Integrations List - Only show integrations */}
        {activeConnections.length > 0 && (
          <AutomationsList
            showPlatformFilter={true}
            showHeader={true}
          />
        )}

        {/* No Integrations Found State */}
        {integrations.length === 0 && activeConnections.length > 0 && !isLoading && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Puzzle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">No third-party integrations detected</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Run discovery scans on your connected platforms to find third-party OAuth applications and integrations.
              </p>
            </div>
            <Button onClick={() => navigate('/automations')}>
              Start Discovery Scan
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default IntegrationsPage;
