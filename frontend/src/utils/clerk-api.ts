/**
 * Clerk-Aware API Client Utilities
 *
 * Provides helper functions for making API calls with Clerk authentication
 * Automatically includes user ID, organization ID, and session token in requests
 */

import { useAuth, useOrganization } from '@clerk/clerk-react';

/**
 * Hook to get Clerk-authenticated API headers
 *
 * Includes:
 * - Authorization: Bearer {sessionToken}
 * - X-Clerk-User-Id: {userId}
 * - X-Clerk-Organization-Id: {organizationId}
 * - X-Clerk-Session-Id: {sessionId}
 */
export function useClerkAPIHeaders() {
  const { getToken, userId, sessionId } = useAuth();
  const { organization } = useOrganization();

  const getHeaders = async (): Promise<Record<string, string>> => {
    const token = await getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (userId) {
      headers['X-Clerk-User-Id'] = userId;
    }

    if (organization?.id) {
      headers['X-Clerk-Organization-Id'] = organization.id;
    }

    if (sessionId) {
      headers['X-Clerk-Session-Id'] = sessionId;
    }

    return headers;
  };

  return { getHeaders, userId, organizationId: organization?.id, sessionId };
}

/**
 * Make an authenticated API request with Clerk credentials
 *
 * @param url API endpoint URL
 * @param options Fetch options
 * @param clerkHeaders Headers from useClerkAPIHeaders()
 */
export async function clerkFetch(
  url: string,
  options: RequestInit = {},
  clerkHeaders: Record<string, string>
): Promise<Response> {
  const headers = {
    ...clerkHeaders,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Get Clerk organization ID for OAuth flows
 *
 * Used when initiating OAuth connections to include org ID in state parameter
 */
export function getClerkOrgIdForOAuth(): string {
  // This will be called from a component with useOrganization hook
  // For now, return placeholder - actual implementation in component
  return '';
}
