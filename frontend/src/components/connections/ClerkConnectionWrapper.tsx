/**
 * Clerk Connection Wrapper
 *
 * Wraps platform connection functionality with Clerk organization context
 * Ensures OAuth flows include the user's organization ID
 */

import React from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { PlatformCard } from './PlatformCard';
import { useConnectionStats } from '@/hooks/useConnectionStats';
import type { PlatformType } from '@singura/shared-types';
import type { PlatformConnection } from '@/types/api';

interface ClerkConnectionWrapperProps {
  platform: PlatformType;
  isConnected?: boolean;
  connection?: PlatformConnection;
  isLoading?: boolean;
  className?: string;
}

/**
 * Wrapper that provides Clerk organization context to PlatformCard
 */
export const ClerkConnectionWrapper: React.FC<ClerkConnectionWrapperProps> = (props) => {
  const { organization } = useOrganization();

  // Fetch connection stats if we have a connection (must call hooks unconditionally)
  const { stats } = useConnectionStats({
    connectionId: props.connection?.id || '',
    enabled: !!props.connection?.id && !!organization
  });

  // If no organization, show message to create one
  if (!organization) {
    return (
      <div className="bg-card border rounded-lg p-6 text-center">
        <h3 className="font-semibold text-foreground mb-2">Organization Required</h3>
        <p className="text-sm text-muted-foreground">
          Please create or join an organization to connect platforms.
        </p>
      </div>
    );
  }

  // Pass through to PlatformCard with organization context available
  // Map connection to match PlatformCard's expected type
  const mappedConnection = props.connection ? {
    id: props.connection.id,
    status: props.connection.status,
    displayName: props.connection.display_name,
    lastSync: props.connection.last_sync_at,
    error: props.connection.error_message,
    automationCount: stats?.automationCount || 0, // Now using real automation count from stats
  } : undefined;

  return <PlatformCard {...props} connection={mappedConnection} />;
};

/**
 * Hook to get Clerk organization ID for OAuth flows
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useClerkOrgId(): string | null {
  const { organization } = useOrganization();
  return organization?.id || null;
}
