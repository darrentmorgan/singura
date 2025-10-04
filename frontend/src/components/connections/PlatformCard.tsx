/**
 * Platform Card Component
 * Displays platform connection status and actions
 */

import React from 'react';
import { useOrganization } from '@clerk/clerk-react';
import {
  Link2,
  RotateCw,
  Unlink,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  ExternalLink,
  Search,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const { organization } = useOrganization();
  const { initiateOAuth, disconnectPlatform, retryConnection, refreshConnection } = useConnectionsActions();
  const { startDiscovery } = useAutomationsActions();
  const discoveryResult = useDiscoveryByConnectionId(connection?.id || '');
  const { showSuccess, showError, openModal } = useUIActions();

  const handleConnect = async () => {
    try {
      // Get Clerk organization ID
      const orgId = organization?.id;

      if (!orgId) {
        showError('Please create or join an organization first', 'Organization Required');
        return;
      }

      const authUrl = await initiateOAuth(platform, orgId);
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
      "flex flex-col min-h-[240px]", // Consistent card height and flex layout
      isConnected && connection?.status === 'active' && "ring-2 ring-green-200 dark:ring-green-800",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6"> {/* Increased margin bottom */}
        <div className="flex items-center space-x-3 flex-1 min-w-0"> {/* Added flex-1 and min-w-0 for text wrapping */}
          <div className="text-3xl flex-shrink-0">{config.icon}</div> {/* Prevent icon shrinking */}
          <div className="min-w-0 flex-1"> {/* Allow text to wrap properly */}
            <h3 className="font-semibold text-lg text-foreground truncate">{config.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{config.description}</p> {/* Allow 2 line description */}
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center space-x-2 flex-shrink-0 ml-4"> {/* Added margin-left for breathing room */}
          {getStatusIcon()}
          <span className={cn(
            "text-sm font-medium whitespace-nowrap", // Prevent wrapping of status text
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
        <div className="flex-1 space-y-4 mb-6"> {/* Added flex-1 to push actions to bottom */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3"> {/* Added background container */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Account:</span>
              <span className="font-semibold text-foreground truncate ml-2 max-w-[60%]">{connection.displayName}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Last sync:</span>
              <span className="text-foreground font-medium">{formatLastSync(connection.lastSync)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Automations:</span>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-blue-600" /> {/* Enhanced icon color */}
                <span className="font-semibold text-foreground">
                  {discoveryResult ? discoveryResult.automations.length : (connection.automationCount || 0)}
                </span>
              </div>
            </div>
          </div>

          {connection.error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  {connection.error}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        {!isConnected ? (
          <Button 
            onClick={handleConnect}
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 h-10"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Connect
          </Button>
        ) : (
          <>
            {/* Primary Actions - Responsive Layout */}
            <div className="flex items-center gap-2 flex-1 min-w-0"> {/* Added min-w-0 for proper flex behavior */}
              {connection?.status === 'error' ? (
                <Button
                  onClick={handleRetry}
                  size="sm"
                  disabled={isLoading}
                  className="bg-orange-600 text-white hover:bg-orange-700 flex-shrink-0"
                >
                  <RotateCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Retry</span> {/* Hide text on mobile */}
                </Button>
              ) : connection?.status === 'active' ? (
                <Button
                  onClick={handleDiscoverAutomations}
                  size="sm"
                  disabled={isLoading}
                  className="bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0"
                >
                  <Search className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Discover</span> {/* Hide text on mobile */}
                </Button>
              ) : (
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 flex-shrink-0"
                >
                  <RotateCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span> {/* Hide text on mobile */}
                </Button>
              )}
              
              {/* Connection Status Badge - Only show on larger screens when connected */}
              <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </div>
            </div>

            {/* Secondary Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 flex-shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56"> {/* Wider for better readability */}
                <DropdownMenuItem onClick={handleRefresh} disabled={isLoading}>
                  <RotateCw className="h-4 w-4 mr-3" />
                  Refresh Connection
                </DropdownMenuItem>
                
                {connection?.status === 'active' && (
                  <DropdownMenuItem onClick={handleDiscoverAutomations} disabled={isLoading}>
                    <Search className="h-4 w-4 mr-3" />
                    Discover Automations
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={handleViewDetails}>
                  <ExternalLink className="h-4 w-4 mr-3" />
                  View Details
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleDisconnect}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                >
                  <Unlink className="h-4 w-4 mr-3" />
                  Disconnect Platform
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformCard;