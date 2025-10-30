/**
 * Vendor Grouped View Component
 * Renders vendor groups in a responsive grid layout
 */

import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VendorGroupCard } from './VendorGroupCard';
import type { VendorGroup, AutomationDiscovery } from '@/types/api';

interface VendorGroupedViewProps {
  vendorGroups: VendorGroup[];
  onViewDetails?: (automation: AutomationDiscovery) => void;
  isLoading?: boolean;
  className?: string;
}

export const VendorGroupedView: React.FC<VendorGroupedViewProps> = ({
  vendorGroups,
  onViewDetails,
  isLoading,
  className,
}) => {
  // Show loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border rounded-lg p-6 animate-pulse"
          >
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show empty state
  if (vendorGroups.length === 0) {
    return (
      <div className={cn('text-center py-12 space-y-4', className)}>
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">No vendor groups found</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            No OAuth applications discovered yet. Connect platforms and run discovery scans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-6',
        'grid-cols-1',
        'md:grid-cols-2',
        'lg:grid-cols-3',
        className
      )}
    >
      {vendorGroups.map((vendorGroup) => (
        <VendorGroupCard
          key={`${vendorGroup.vendorName}-${vendorGroup.platform}`}
          vendorGroup={vendorGroup}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
};

export default VendorGroupedView;
