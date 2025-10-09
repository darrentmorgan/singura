/**
 * Automation Card Component
 * Displays individual automation details with status and risk indicators
 */

import React from 'react';
import { 
  Bot, 
  Workflow, 
  Webhook, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Eye,
  MoreVertical,
  Calendar,
  User,
  Shield
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AutomationDiscovery, RiskLevel, AutomationStatus } from '@/types/api';
import { cn } from '@/lib/utils';

// Automation type icons
const automationTypeIcons = {
  bot: Bot,
  workflow: Workflow,
  integration: Zap,
  webhook: Webhook,
  app: Zap,
};

// Risk level colors
const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  high: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  critical: 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:text-white dark:border-red-800',
  unknown: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
};

// Status colors
const statusColors = {
  active: 'text-green-600',
  inactive: 'text-gray-600',
  error: 'text-red-600',
  unknown: 'text-yellow-600',
};

interface AutomationCardProps {
  automation: AutomationDiscovery;
  onViewDetails?: (automation: AutomationDiscovery) => void;
  onToggleStatus?: (automationId: string) => void;
  showPlatform?: boolean;
  compact?: boolean;
  className?: string;
}

export const AutomationCard: React.FC<AutomationCardProps> = ({
  automation,
  onViewDetails,
  onToggleStatus,
  showPlatform = true,
  compact = false,
  className,
}) => {
  const TypeIcon = automationTypeIcons[automation.type] || Bot;

  const handleViewDetails = () => {
    onViewDetails?.(automation);
  };

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStatus?.(automation.id);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getStatusIcon = () => {
    switch (automation.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRiskIcon = () => {
    switch (automation.riskLevel) {
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      case 'medium':
        return <Shield className="h-3 w-3" />;
      case 'low':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  if (compact) {
    return (
      <div 
        className={cn(
          "bg-card border rounded-md p-4 hover:shadow-sm transition-all duration-200 cursor-pointer",
          className
        )}
        onClick={handleViewDetails}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <TypeIcon className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{automation.name}</p>
              <p className="text-sm text-muted-foreground">
                {automation.type} • {automation.platform}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
              riskColors[automation.riskLevel] || riskColors.unknown
            )}>
              {getRiskIcon()}
              <span className="ml-1 capitalize">{automation.riskLevel || 'Unknown'}</span>
            </span>
            {getStatusIcon()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "bg-card border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer",
        automation.riskLevel === 'high' && "ring-2 ring-red-200 dark:ring-red-800",
        className
      )}
      onClick={handleViewDetails}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TypeIcon className="h-6 w-6 text-primary" />
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg text-foreground truncate">
              {automation.name}
            </h3>
            {automation.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {automation.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Show more options menu
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-3">
        {/* Platform and Type */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {showPlatform && (
              <div className="flex items-center space-x-1">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium text-foreground capitalize">{automation.platform}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium text-foreground capitalize">{automation.type}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={cn(
              "text-sm font-medium capitalize",
              statusColors[automation.status]
            )}>
              {automation.status}
            </span>
          </div>
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between">
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
            riskColors[automation.riskLevel] || riskColors.unknown
          )}>
            {getRiskIcon()}
            <span className="ml-2 capitalize">{automation.riskLevel || 'Unknown'} Risk</span>
          </span>

          {automation.permissions && automation.permissions.length > 0 && (
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>{automation.permissions.length} permission{automation.permissions.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {automation.createdAt && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDate(automation.createdAt)}</span>
            </div>
          )}

          {automation.lastTriggered && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Last run {formatDate(automation.lastTriggered)}</span>
            </div>
          )}
        </div>

        {/* Creator */}
        {automation.createdBy && (
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Created by {automation.createdBy}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewDetails}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>

        {onToggleStatus && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleStatus}
            className={cn(
              automation.status === 'active' 
                ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
            )}
          >
            {automation.status === 'active' ? 'Disable' : 'Enable'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AutomationCard;