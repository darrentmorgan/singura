/**
 * Clerk Headers Utility
 * Provides Clerk authentication context headers for API requests
 */

/**
 * Get Clerk authentication headers for backend middleware
 * This function safely accesses Clerk's global state
 *
 * @returns Record of headers or null if Clerk not initialized
 */
interface ClerkInstance {
  user?: { id?: string };
  session?: { id?: string };
  organization?: { id?: string };
}

export function getClerkAuthHeaders(): Record<string, string> | null {
  try {
    // Access Clerk's global instance
    const clerk = (window as { Clerk?: ClerkInstance }).Clerk;

    if (!clerk || !clerk.user) {
      return null;
    }

    const headers: Record<string, string> = {};

    // Add user ID (required)
    if (clerk.user.id) {
      headers['x-clerk-user-id'] = clerk.user.id;
    }

    // Add session ID if available
    if (clerk.session?.id) {
      headers['x-clerk-session-id'] = clerk.session.id;
    }

    // Add organization ID if user has selected an organization
    if (clerk.organization?.id) {
      headers['x-clerk-organization-id'] = clerk.organization.id;
    }

    // Only return headers if we have at least the user ID
    return headers['x-clerk-user-id'] ? headers : null;
  } catch (error) {
    console.warn('Could not retrieve Clerk headers:', error);
    return null;
  }
}
