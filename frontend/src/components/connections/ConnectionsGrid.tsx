/**
 * Connections Grid Component
 * Grid layout for displaying platform connection cards
 */

import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlatformCard from './PlatformCard';
import { PlatformType, ConnectionStatus } from '@/types/api';
import { useConnections, useConnectionsActions, useConnectionsLoading } from '@/stores/connections';
import { useUIActions } from '@/stores/ui';
import { useMultipleConnectionStats } from '@/hooks/useConnectionStats';
import { cn } from '@/lib/utils';

const AVAILABLE_PLATFORMS: PlatformType[] = [
  'slack',
  'google',
  'jira'
  // Disabled platforms for focused MVP:
  // 'microsoft',   // Coming soon
  // 'hubspot',     // Future release  
  // 'salesforce',  // Future release
  // 'notion',      // Future release
  // 'asana',       // Future release
];

interface ConnectionsGridProps {
  showAddPlatforms?: boolean;
  maxColumns?: number;
  className?: string;
}

export const ConnectionsGrid: React.FC<ConnectionsGridProps> = ({
  showAddPlatforms = true,
  maxColumns = 4,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | 'all'>('all');
  
  // Store state
  const connections = useConnections();
  const isLoading = useConnectionsLoading();
  const { fetchConnections, fetchConnectionStats } = useConnectionsActions();
  const { showSuccess, showError } = useUIActions();

  // Fetch connection stats for all connections
  const connectionIds = connections.map(conn => conn.id);
  const { statsMap } = useMultipleConnectionStats(connectionIds);

  useEffect(() => {
    // Initial data fetch
    const loadData = async () => {
      try {
        await Promise.all([
          fetchConnections(),
          fetchConnectionStats()
        ]);
      } catch (error) {
        showError('Failed to load connection data');
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, parent page also fetches

  const handleRefreshAll = async () => {
    try {
      showSuccess('Refreshing all connections...', 'Sync');
      await Promise.all([
        fetchConnections(),
        fetchConnectionStats()
      ]);
      showSuccess('All connections refreshed', 'Sync Complete');
    } catch (error) {
      showError('Failed to refresh connections');
    }
  };

  const handleConnectNew = () => {
    // Scroll to available platforms section
    const availablePlatforms = document.getElementById('available-platforms');
    if (availablePlatforms) {
      availablePlatforms.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Get connected platforms map
  const connectedPlatformsMap = connections.reduce((map, conn) => {
    map[conn.platform_type] = conn;
    return map;
  }, {} as Record<PlatformType, typeof connections[0]>);

  // Filter connections
  const filteredConnections = connections.filter(connection => {
    const matchesSearch = connection.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         connection.platform_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || connection.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get available (not connected) platforms
  const availablePlatforms = showAddPlatforms 
    ? AVAILABLE_PLATFORMS.filter(platform => !connectedPlatformsMap[platform])
    : [];

  const gridCols = {
    1: 'grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-2 xl:grid-cols-4',
  }[Math.min(maxColumns, 4)] || 'lg:grid-cols-2 xl:grid-cols-4';

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Platform Connections</h2>
          <p className="text-sm text-muted-foreground">
            {connections.length > 0 
              ? `${connections.length} platform${connections.length !== 1 ? 's' : ''} connected`
              : 'No platforms connected yet'
            }
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isLoading}
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          {availablePlatforms.length > 0 && (
            <Button size="sm" onClick={handleConnectNew} className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Connect Platform
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {connections.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ConnectionStatus | 'all')}
              className="px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      )}

      {/* Connected Platforms Grid */}
      {filteredConnections.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Connected Platforms</h3>
          <div className={cn("grid gap-6", gridCols)}>
            {filteredConnections.map((connection) => {
              const stats = statsMap.get(connection.id);
              return (
                <PlatformCard
                  key={connection.id}
                  platform={connection.platform_type}
                  isConnected={true}
                  connection={{
                    id: connection.id,
                    status: connection.status,
                    displayName: connection.display_name,
                    lastSync: connection.last_sync_at,
                    error: connection.error_message,
                    automationCount: stats?.automationCount || 0, // Now using real automation count
                  }}
                  isLoading={isLoading}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available Platforms Grid */}
      {availablePlatforms.length > 0 && (
        <div id="available-platforms">
          <h3 className="text-lg font-semibold text-foreground mb-4">Available Platforms</h3>
          <div className={cn("grid gap-6", gridCols)}>
            {availablePlatforms.map((platform) => (
              <PlatformCard
                key={platform}
                platform={platform}
                isConnected={false}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State - Simplified */}
      {connections.length === 0 && availablePlatforms.length === 0 && !isLoading && (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">All platforms connected</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              All available platforms have been connected to your organization.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && connections.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Loading connections...</h3>
          <p className="text-muted-foreground">Please wait while we fetch your platform connections.</p>
        </div>
      )}

      {/* No Results State */}
      {filteredConnections.length === 0 && connections.length > 0 && !isLoading && (
        <div className="text-center py-8">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No connections found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectionsGrid;