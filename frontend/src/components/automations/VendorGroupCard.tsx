/**
 * Vendor Group Card Component
 * Displays vendor-grouped OAuth applications with expand/collapse functionality
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { VendorGroup } from '@/types/api';
import type { AutomationDiscovery } from '@/types/api';

// Risk level colors matching AutomationCard
const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  high: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  critical: 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:text-white dark:border-red-800',
  unknown: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
};

interface VendorGroupCardProps {
  vendorGroup: VendorGroup;
  onViewDetails?: (automation: AutomationDiscovery) => void;
  className?: string;
}

export const VendorGroupCard: React.FC<VendorGroupCardProps> = ({
  vendorGroup,
  onViewDetails,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
      case 'critical':
        return <AlertTriangle className="h-3.5 w-3.5" />;
      default:
        return <Shield className="h-3.5 w-3.5" />;
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleExpand();
    }
  };

  // Sort applications by scopeCount descending
  const sortedApplications = [...vendorGroup.applications].sort((a, b) => {
    const aScopes = a.permissions?.length || 0;
    const bScopes = b.permissions?.length || 0;
    return bScopes - aScopes;
  });

  const vendorAppsId = `vendor-apps-${vendorGroup.vendorName.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      className={cn(
        'bg-card border rounded-lg transition-all duration-200 hover:shadow-md',
        isExpanded && 'shadow-md',
        className
      )}
    >
      {/* Header - Clickable to expand/collapse */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={vendorAppsId}
        className={cn(
          'p-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg',
          'transition-colors duration-150'
        )}
        onClick={handleToggleExpand}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Vendor Name */}
            <div className="flex items-center space-x-3 mb-3">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {vendorGroup.vendorName}
              </h3>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {/* Application Count */}
              <div className="flex items-center space-x-1.5 text-muted-foreground">
                <span className="font-medium text-foreground">{vendorGroup.applicationCount}</span>
                <span>application{vendorGroup.applicationCount !== 1 ? 's' : ''}</span>
              </div>

              {/* Platform */}
              <div className="flex items-center space-x-1.5 text-muted-foreground">
                <span className="text-xs">•</span>
                <span className="capitalize">{vendorGroup.platform}</span>
              </div>

              {/* Risk Badge */}
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                  riskColors[vendorGroup.highestRiskLevel] || riskColors.unknown
                )}
              >
                {getRiskIcon(vendorGroup.highestRiskLevel)}
                <span className="ml-1.5 capitalize">{vendorGroup.highestRiskLevel} Risk</span>
              </span>

              {/* Last Seen */}
              <div className="flex items-center space-x-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDate(vendorGroup.lastSeen)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content - Individual Applications */}
      {isExpanded && (
        <div
          id={vendorAppsId}
          className="border-t animate-in slide-in-from-top-2 duration-150"
        >
          <div className="p-4 space-y-3 bg-muted/30">
            {sortedApplications.map((app) => (
              <div
                key={app.id}
                className={cn(
                  'pl-6 pr-4 py-3 bg-card border-l-4 rounded-md cursor-pointer',
                  'hover:bg-accent/50 transition-colors duration-150',
                  app.riskLevel === 'high' || app.riskLevel === 'critical'
                    ? 'border-l-red-500'
                    : app.riskLevel === 'medium'
                    ? 'border-l-yellow-500'
                    : 'border-l-green-500'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails?.(app);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewDetails?.(app);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* App Name */}
                    <p className="font-medium text-foreground truncate">{app.name}</p>

                    {/* App Metadata */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      {/* Permission Count */}
                      {app.permissions && app.permissions.length > 0 ? (
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3" />
                          <span>
                            {app.permissions.length} permission
                            {app.permissions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : null}

                      {/* Client ID */}
                      {app.metadata?.clientId && typeof app.metadata.clientId === 'string' ? (
                        <React.Fragment>
                          <span>•</span>
                          <span className="font-mono">
                            {app.metadata.clientId.length > 40
                              ? `${app.metadata.clientId.slice(0, 40)}...`
                              : app.metadata.clientId}
                          </span>
                        </React.Fragment>
                      ) : null}
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ml-3 flex-shrink-0',
                      riskColors[app.riskLevel] || riskColors.unknown
                    )}
                  >
                    {getRiskIcon(app.riskLevel)}
                    <span className="ml-1 capitalize">{app.riskLevel}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          <div className="p-4 border-t bg-muted/10">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                // Could navigate to filtered view
              }}
            >
              View All {vendorGroup.applicationCount} Applications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorGroupCard;
