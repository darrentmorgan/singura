/**
 * Loading States Components
 * Various loading states for different parts of the application
 */

import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardSkeleton, ListSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

// Page Loading State
interface PageLoadingProps {
  message?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = "Loading...", 
  className 
}) => (
  <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
    <LoadingSpinner size="lg" text={message} />
  </div>
);

// Connection Error State
interface ConnectionErrorProps {
  onRetry?: () => void;
  message?: string;
  className?: string;
}

export const ConnectionError: React.FC<ConnectionErrorProps> = ({
  onRetry,
  message = "Connection failed",
  className
}) => (
  <div className={cn("text-center py-8 space-y-4", className)}>
    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
      <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-foreground">Connection Error</h3>
      <p className="text-muted-foreground mt-1">{message}</p>
    </div>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    )}
  </div>
);

// Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className
}) => (
  <div className={cn("text-center py-12 space-y-4", className)}>
    {icon && (
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
        {icon}
      </div>
    )}
    <div>
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          {description}
        </p>
      )}
    </div>
    {action && (
      <Button onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

// Dashboard Loading Skeleton
export const DashboardLoadingSkeleton: React.FC = () => (
  <div className="flex-1 space-y-8 p-6">
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-4 w-96 bg-muted rounded animate-pulse" />
    </div>

    {/* Metrics skeleton */}
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Content skeleton */}
    <div className="grid gap-6 lg:grid-cols-2">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

// Connections Loading Skeleton
export const ConnectionsLoadingSkeleton: React.FC = () => (
  <div className="flex-1 space-y-8 p-6">
    {/* Header skeleton */}
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>

    {/* Grid skeleton */}
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Automations Loading Skeleton
export const AutomationsLoadingSkeleton: React.FC = () => (
  <div className="flex-1 space-y-8 p-6">
    {/* Header skeleton */}
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex space-x-2">
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-36 bg-muted rounded animate-pulse" />
        </div>
      </div>
      
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>

    {/* Filters skeleton */}
    <div className="flex space-x-4">
      <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
      <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      <div className="h-10 w-32 bg-muted rounded animate-pulse" />
    </div>

    {/* List skeleton */}
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Inline Loading
interface InlineLoadingProps {
  text?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = "Loading...",
  size = 'sm',
  className
}) => (
  <div className={cn("flex items-center space-x-2", className)}>
    <RefreshCw className={cn(
      "animate-spin text-muted-foreground",
      size === 'sm' ? "h-4 w-4" : "h-5 w-5"
    )} />
    <span className={cn(
      "text-muted-foreground",
      size === 'sm' ? "text-sm" : "text-base"
    )}>
      {text}
    </span>
  </div>
);

// Network Status Indicator
interface NetworkStatusProps {
  isOnline: boolean;
  isConnected: boolean;
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  isOnline,
  isConnected,
  className
}) => (
  <div className={cn("flex items-center space-x-2", className)}>
    {isOnline ? (
      <Wifi className="h-4 w-4 text-green-500" />
    ) : (
      <WifiOff className="h-4 w-4 text-red-500" />
    )}
    <div className="flex items-center space-x-1">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-green-500" : "bg-red-500"
      )} />
      <span className="text-xs text-muted-foreground">
        {isOnline ? (isConnected ? "Connected" : "Offline") : "No Internet"}
      </span>
    </div>
  </div>
);

export default {
  PageLoading,
  ConnectionError,
  EmptyState,
  DashboardLoadingSkeleton,
  ConnectionsLoadingSkeleton,
  AutomationsLoadingSkeleton,
  InlineLoading,
  NetworkStatus
};