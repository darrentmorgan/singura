/**
 * Clerk Connection Wrapper
 *
 * Wraps platform connection functionality with Clerk organization context
 * Ensures OAuth flows include the user's organization ID
 */

import React from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { PlatformCard } from './PlatformCard';
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
    automationCount: 0, // TODO: Get from metadata if available
  } : undefined;

  return <PlatformCard {...props} connection={mappedConnection} />;
};

/**
 * Hook to get Clerk organization ID for OAuth flows
 */
export function useClerkOrgId(): string | null {
  const { organization } = useOrganization();
  return organization?.id || null;
}
