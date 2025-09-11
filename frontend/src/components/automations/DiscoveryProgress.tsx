/**
 * Discovery Progress Component
 * Shows real-time progress of automation discovery scans
 */

import React from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertTriangle,
  Shield,
  Bot
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DiscoveryProgress as DiscoveryProgressType } from '@/types/api';
import { cn } from '@/lib/utils';

// Stage configurations
const stageConfig = {
  started: {
    icon: Clock,
    label: 'Initializing',
    description: 'Starting automation discovery...',
    color: 'text-blue-600',
  },
  authenticating: {
    icon: Shield,
    label: 'Authenticating',
    description: 'Verifying platform credentials...',
    color: 'text-yellow-600',
  },
  discovering: {
    icon: Search,
    label: 'Discovering',
    description: 'Scanning for automations...',
    color: 'text-blue-600',
  },
  analyzing: {
    icon: Bot,
    label: 'Analyzing',
    description: 'Analyzing security and permissions...',
    color: 'text-purple-600',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    description: 'Discovery completed successfully',
    color: 'text-green-600',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    description: 'Discovery failed',
    color: 'text-red-600',
  },
};

interface DiscoveryProgressProps {
  progress: DiscoveryProgressType;
  onCancel?: () => void;
  onRetry?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const DiscoveryProgress: React.FC<DiscoveryProgressProps> = ({
  progress,
  onCancel,
  onRetry,
  showDetails = true,
  className,
}) => {
  // Safe access to config with fallback for unknown stages
  const config = stageConfig[progress.stage] || stageConfig['started'];
  const isInProgress = progress.stage && !['completed', 'failed'].includes(progress.stage);
  const isCompleted = progress.stage === 'completed';
  const isFailed = progress.stage === 'failed';

  const IconComponent = config.icon;

  return (
    <div className={cn(
      "bg-card border rounded-lg p-6 space-y-4",
      isCompleted && "border-green-200 dark:border-green-800",
      isFailed && "border-red-200 dark:border-red-800",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-full",
            isCompleted && "bg-green-100 dark:bg-green-900/20",
            isFailed && "bg-red-100 dark:bg-red-900/20",
            isInProgress && "bg-blue-100 dark:bg-blue-900/20"
          )}>
            {isInProgress ? (
              <Loader2 className={cn("h-5 w-5 animate-spin", config.color)} />
            ) : (
              <IconComponent className={cn("h-5 w-5", config.color)} />
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              Automation Discovery
            </h3>
            <p className="text-sm text-muted-foreground">
              Connection ID: {progress.connectionId || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isInProgress && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          
          {isFailed && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={cn("font-medium", config.color)}>
            {config.label}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress.progress || 0)}%
          </span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300 ease-out",
              isCompleted && "bg-green-500",
              isFailed && "bg-red-500",
              isInProgress && "bg-blue-500"
            )}
            style={{ width: `${progress.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="space-y-2">
        <p className="text-sm text-foreground">
          {progress.message || config.description}
        </p>
        
        {isFailed && progress.message && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-medium">Discovery Failed</p>
              <p className="mt-1">{progress.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stage Details */}
      {showDetails && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Stage</p>
              <p className="font-medium text-foreground">{config.label}</p>
            </div>
            
            <div>
              <p className="text-muted-foreground">Progress</p>
              <p className="font-medium text-foreground">{Math.round(progress.progress || 0)}% Complete</p>
            </div>
            
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className={cn("font-medium", config.color)}>
                {isInProgress ? 'In Progress' : config.label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Summary */}
      {isCompleted && showDetails && (
        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <p className="text-sm font-medium">
              Discovery completed successfully! Check the automations tab to view results.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryProgress;