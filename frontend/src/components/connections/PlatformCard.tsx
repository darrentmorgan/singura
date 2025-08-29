/**
 * Platform Card Component
 * Displays platform connection status and actions
 */

import React from 'react';
import { 
  Link2, 
  RotateCw, 
  Unlink, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Zap,
  ExternalLink,
  Search
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PlatformType, ConnectionStatus } from '@/types/api';
import { useConnectionsActions } from '@/stores/connections';
import { useAutomationsActions, useDiscoveryByConnectionId } from '@/stores/automations';
import { useUIActions } from '@/stores/ui';
import { cn } from '@/lib/utils';

// Platform configurations
const platformConfigs = {
  slack: {
    name: 'Slack',
    icon: '💬',
    color: 'purple',
    description: 'Team communication and collaboration platform',
  },
  google: {
    name: 'Google Workspace',
    icon: '🌐',
    color: 'blue',
    description: 'Productivity and collaboration tools',
  },
  microsoft: {
    name: 'Microsoft 365',
    icon: '💼',
    color: 'blue',
    description: 'Office applications and services',
  },
  hubspot: {
    name: 'HubSpot',
    icon: '🎯',
    color: 'orange',
    description: 'CRM and marketing automation',
  },
  salesforce: {
    name: 'Salesforce',
    icon: '☁️',
    color: 'blue',
    description: 'Customer relationship management',
  },
  notion: {
    name: 'Notion',
    icon: '📝',
    color: 'gray',
    description: 'Workspace for notes and collaboration',
  },
  asana: {
    name: 'Asana',
    icon: '✅',
    color: 'red',
    description: 'Project and task management',
  },
  jira: {
    name: 'Jira',
    icon: '🔧',
    color: 'blue',
    description: 'Issue tracking and project management',
  },
};

interface PlatformCardProps {
  platform: PlatformType;
  isConnected?: boolean;
  connection?: {
    id: string;
    status: ConnectionStatus;
    displayName: string;
    lastSync?: string;
    error?: string;
    automationCount?: number;
  };
  isLoading?: boolean;
  className?: string;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({
  platform,
  isConnected = false,
  connection,
  isLoading = false,
  className,
}) => {
  const config = platformConfigs[platform];
  const { initiateOAuth, disconnectPlatform, retryConnection, refreshConnection } = useConnectionsActions();
  const { startDiscovery } = useAutomationsActions();
  const discoveryResult = useDiscoveryByConnectionId(connection?.id || '');
  const { showSuccess, showError, openModal } = useUIActions();

  const handleConnect = async () => {
    try {
      const authUrl = await initiateOAuth(platform);
      if (authUrl) {
        // Open OAuth flow in same window for better UX
        window.location.href = authUrl;
      }
    } catch (error) {
      showError(`Failed to connect to ${config.name}`);
    }
  };

  const handleDisconnect = () => {
    openModal({
      type: 'confirm',
      title: `Disconnect ${config.name}`,
      content: `Are you sure you want to disconnect from ${config.name}? This will stop monitoring automations on this platform.`,
      actions: [
        {
          label: 'Cancel',
          action: () => {},
          variant: 'secondary',
        },
        {
          label: 'Disconnect',
          action: async () => {
            if (connection) {
              const success = await disconnectPlatform(connection.id);
              if (success) {
                showSuccess(`Disconnected from ${config.name}`);
              }
            }
          },
          variant: 'destructive',
        },
      ],
    });
  };

  const handleRetry = async () => {
    if (!connection) return;
    
    const success = await retryConnection(connection.id);
    if (success) {
      showSuccess(`Retrying connection to ${config.name}`);
    }
  };

  const handleRefresh = async () => {
    if (!connection) return;
    
    const success = await refreshConnection(connection.id);
    if (success) {
      showSuccess(`Refreshing ${config.name} data`);
    }
  };

  const handleViewDetails = () => {
    if (connection) {
      window.location.href = `/connections/${connection.id}`;
    }
  };

  const handleDiscoverAutomations = async () => {
    if (!connection) return;
    
    try {
      showSuccess('Starting automation discovery...', 'Discovery');
      const success = await startDiscovery(connection.id);
      if (success) {
        showSuccess('Automation discovery completed successfully', 'Discovery Complete');
      } else {
        showError('Failed to discover automations', 'Discovery Failed');
      }
    } catch (error) {
      showError(`Failed to discover automations: ${error instanceof Error ? error.message : 'Unknown error'}`, 'Discovery Failed');
    }
  };

  const getStatusIcon = () => {
    if (!isConnected || !connection) return null;

    switch (connection.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (!isConnected || !connection) return 'Not connected';

    switch (connection.status) {
      case 'active':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'pending':
        return 'Connecting...';
      case 'expired':
        return 'Expired';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "bg-card border rounded-lg p-6 hover:shadow-md transition-all duration-200",
      isConnected && connection?.status === 'active' && "ring-2 ring-green-200 dark:ring-green-800",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{config.icon}</div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">{config.name}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={cn(
            "text-sm font-medium",
            connection?.status === 'active' && "text-green-600",
            connection?.status === 'error' && "text-red-600",
            connection?.status === 'pending' && "text-yellow-600",
            !isConnected && "text-muted-foreground"
          )}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Connection Details */}
      {isConnected && connection && (
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Account:</span>
            <span className="font-medium text-foreground">{connection.displayName}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Last sync:</span>
            <span className="text-foreground">{formatLastSync(connection.lastSync)}</span>
          </div>

          {(connection.automationCount !== undefined || discoveryResult) && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Automations:</span>
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-primary" />
                <span className="font-medium text-foreground">
                  {discoveryResult ? discoveryResult.automations.length : (connection.automationCount || 0)}
                </span>
              </div>
            </div>
          )}

          {connection.error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {connection.error}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isConnected ? (
            <Button 
              onClick={handleConnect}
              disabled={isLoading}
              loading={isLoading}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <>
              {connection?.status === 'error' && (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              {connection?.status === 'active' && (
                <Button
                  onClick={handleDiscoverAutomations}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Discover
                </Button>
              )}
              
              <Button
                onClick={handleViewDetails}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Details
              </Button>
            </>
          )}
        </div>

        {isConnected && (
          <Button
            onClick={handleDisconnect}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Unlink className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
};

export default PlatformCard;