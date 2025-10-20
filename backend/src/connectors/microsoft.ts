/**
 * Microsoft 365 Platform Connector
 * Implements the PlatformConnector interface for Microsoft 365 OAuth and Graph API integration
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { PlatformConnector, OAuthCredentials, ConnectionResult, AutomationEvent, AuditLogEntry, PermissionCheck } from './types';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';

export interface MicrosoftUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
}

export interface PowerAutomateFlow {
  name: string;
  id: string;
  displayName: string;
  state: 'Started' | 'Stopped' | 'Suspended';
  createdTime: string;
  lastModifiedTime: string;
  definition: any;
  trigger?: {
    type: string;
    kind: string;
  };
}

export interface AzureAppRegistration {
  id: string;
  appId: string;
  displayName: string;
  signInAudience: string;
  publisherDomain?: string;
  homepage?: string;
  createdDateTime: string;
  keyCredentials?: Array<{
    keyId: string;
    usage: string;
    type: string;
    startDateTime?: string;
    endDateTime?: string;
  }>;
  passwordCredentials?: Array<{
    keyId: string;
    displayName?: string;
    hint?: string;
    startDateTime?: string;
    endDateTime?: string;
  }>;
}

export interface TeamsApp {
  id: string;
  externalId?: string;
  displayName: string;
  distributionMethod: string;
}

/**
 * Custom authentication provider for Microsoft Graph
 */
class TokenAuthenticationProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

/**
 * Microsoft 365 connector implementing secure OAuth flow and automation discovery
 */
export class MicrosoftConnector implements PlatformConnector {
  platform: 'microsoft' = 'microsoft';
  private client: Client | null = null;
  private currentCredentials: OAuthCredentials | null = null;

  /**
   * Authenticate with Microsoft 365 using OAuth credentials
   */
  async authenticate(credentials: OAuthCredentials): Promise<ConnectionResult> {
    try {
      // Store credentials for later use
      this.currentCredentials = credentials;
      
      // Initialize Microsoft Graph client
      const authProvider = new TokenAuthenticationProvider(credentials.accessToken);
      this.client = Client.initWithMiddleware({ authProvider });

      // Test the connection and get user info
      const user = await this.client.api('/me').get();

      if (!user) {
        throw new Error('Failed to retrieve user information');
      }

      return {
        success: true,
        platformUserId: user.id,
        platformWorkspaceId: this.extractTenantId(user) || undefined, 
        displayName: `${user.displayName} (${user.userPrincipalName})`,
        permissions: this.extractPermissions(credentials.scope),
        metadata: {
          userPrincipalName: user.userPrincipalName,
          displayName: user.displayName,
          mail: user.mail,
          jobTitle: user.jobTitle,
          officeLocation: user.officeLocation,
          mobilePhone: user.mobilePhone,
          businessPhones: user.businessPhones,
          tenantId: this.extractTenantId(user)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Microsoft 365 authentication failed',
        errorCode: 'MICROSOFT_AUTH_ERROR'
      };
    }
  }

  /**
   * Discover automations in Microsoft 365
   */
  async discoverAutomations(): Promise<AutomationEvent[]> {
    if (!this.client) {
      console.error('Microsoft client not authenticated - cannot discover automations');
      return [];
    }

    const automations: AutomationEvent[] = [];

    try {
      // Discover Power Automate flows
      const flowAutomations = await this.discoverPowerAutomateFlows();
      automations.push(...flowAutomations);

      // Discover Azure App Registrations
      const appRegistrations = await this.discoverAzureAppRegistrations();
      automations.push(...appRegistrations);

      // Discover Teams apps
      const teamsApps = await this.discoverTeamsApps();
      automations.push(...teamsApps);

      // Discover SharePoint workflows
      const sharepointAutomations = await this.discoverSharePointWorkflows();
      automations.push(...sharepointAutomations);

      // Discover Power Apps
      const powerApps = await this.discoverPowerApps();
      automations.push(...powerApps);

      return automations;
    } catch (error) {
      console.error('Error discovering Microsoft 365 automations:', error);
      // Return empty array on error for graceful degradation
      return [];
    }
  }

  /**
   * Get audit logs from Microsoft 365 (requires admin permissions)
   */
  async getAuditLogs(since: Date): Promise<AuditLogEntry[]> {
    if (!this.client) {
      throw new Error('Microsoft client not authenticated');
    }

    try {
      // Microsoft Graph audit logs require admin permissions
      const response = await this.client
        .api('/auditLogs/directoryAudits')
        .filter(`activityDateTime ge ${since.toISOString()}`)
        .top(1000)
        .get();

      if (!response.value) {
        return [];
      }

      return response.value.map((audit: any) => {
        // Type guard for audit object
        const activityDateTime = audit.activityDateTime && typeof audit.activityDateTime === 'string' 
          ? audit.activityDateTime 
          : new Date().toISOString();
        
        const initiatedBy = audit.initiatedBy || {};
        const targetResources = Array.isArray(audit.targetResources) ? audit.targetResources : [];
        const firstTarget = targetResources[0] || {};
        
        return {
        id: audit.id || 'unknown',
        timestamp: new Date(activityDateTime),
        actorId: (initiatedBy.user?.userPrincipalName || initiatedBy.app?.displayName || 'system') as string,
        actorType: initiatedBy.user ? 'user' : 'service_account' as const,
        actionType: (audit.activityDisplayName || 'unknown') as string,
        resourceType: (firstTarget.type || 'unknown') as string,
        resourceId: (firstTarget.id || '') as string,
        details: {
          category: audit.category,
          correlationId: audit.correlationId,
          result: audit.result,
          resultReason: audit.resultReason,
          additionalDetails: audit.additionalDetails,
          targetResources: audit.targetResources
        },
        ipAddress: undefined, // Not always available
        userAgent: undefined // Not available in Microsoft audit logs
      };
      });
    } catch (error) {
      console.error('Error fetching Microsoft 365 audit logs:', error);
      // Return empty array if audit logs aren't available
      return [];
    }
  }

  /**
   * Validate permissions and connection health
   */
  async validatePermissions(): Promise<PermissionCheck> {
    if (!this.client) {
      throw new Error('Microsoft client not authenticated');
    }

    try {
      // Test basic permissions
      const user = await this.client.api('/me').get();
      
      if (!user) {
        return {
          isValid: false,
          permissions: [],
          missingPermissions: ['basic_auth'],
          errors: ['Authentication failed'],
          lastChecked: new Date()
        };
      }

      const grantedScopes = this.extractPermissions(this.currentCredentials?.scope);
      const requiredScopes = ['User.Read'];
      const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));

      // Test specific API calls to validate permissions
      const permissionTests = await this.testPermissions();

      return {
        isValid: missingScopes.length === 0 && permissionTests.every(test => test.success),
        permissions: grantedScopes,
        missingPermissions: [
          ...missingScopes,
          ...permissionTests.filter(test => !test.success).map(test => test.permission)
        ],
        errors: permissionTests.filter(test => !test.success).map(test => test.error || 'Unknown error'),
        lastChecked: new Date(),
        metadata: {
          userPrincipalName: user.userPrincipalName,
          displayName: user.displayName,
          tenantId: this.extractTenantId(user)
        }
      };
    } catch (error) {
      return {
        isValid: false,
        permissions: [],
        missingPermissions: ['basic_auth'],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Discover Power Automate flows
   */
  private async discoverPowerAutomateFlows(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // Power Automate API discovery
      // Note: This requires specific Power Platform APIs which might not be available through Graph
      // In a full implementation, you'd use the Power Platform APIs directly
      
      // For now, we'll use a placeholder approach that could detect flows through other means
      // or when Power Platform connector APIs become available in Microsoft Graph
      
    } catch (error) {
      console.error('Error discovering Power Automate flows:', error);
    }

    return automations;
  }

  /**
   * Discover Azure App Registrations
   */
  private async discoverAzureAppRegistrations(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // Requires Azure AD admin permissions
      const response = await this.client!.api('/applications').get();

      if (response.value) {
        for (const app of response.value) {
          automations.push({
            id: `microsoft-app-${app.id}`,
            name: app.displayName,
            type: 'integration',
            platform: 'microsoft',
            status: 'active',
            trigger: 'api_call',
            actions: ['authenticate', 'authorize'],
            metadata: {
              appId: app.appId,
              signInAudience: app.signInAudience,
              publisherDomain: app.publisherDomain,
              homepage: app.homepage,
              keyCredentials: app.keyCredentials?.length || 0,
              passwordCredentials: app.passwordCredentials?.length || 0
            },
            createdAt: app.createdDateTime ? new Date(app.createdDateTime) : new Date(),
            lastTriggered: null
          });
        }
      }
    } catch (error) {
      // User doesn't have admin permissions for app registrations
      console.log('Admin permissions not available for Azure app registration discovery');
    }

    return automations;
  }

  /**
   * Discover Microsoft Teams apps
   */
  private async discoverTeamsApps(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      const response = await this.client!.api('/me/teamwork/installedApps').expand('teamsApp').get();

      if (response.value) {
        for (const app of response.value) {
          const teamsApp = app.teamsApp;
          if (teamsApp) {
            automations.push({
              id: `microsoft-teams-app-${teamsApp.id}`,
              name: teamsApp.displayName,
              type: 'integration',
              platform: 'microsoft',
              status: 'active',
              trigger: 'message',
              actions: ['respond', 'notify'],
              metadata: {
                teamsAppId: teamsApp.id,
                externalId: teamsApp.externalId,
                distributionMethod: teamsApp.distributionMethod
              },
              createdAt: new Date(),
              lastTriggered: null
            });
          }
        }
      }
    } catch (error) {
      console.error('Error discovering Teams apps:', error);
    }

    return automations;
  }

  /**
   * Discover SharePoint workflows
   */
  private async discoverSharePointWorkflows(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // SharePoint workflow discovery would require specific SharePoint APIs
      // This is a placeholder for when SharePoint workflow APIs are available
      
      const sites = await this.client!.api('/sites').get();
      
      if (sites.value) {
        for (const site of sites.value) {
          // Look for SharePoint lists that might contain workflows
          try {
            const lists = await this.client!.api(`/sites/${site.id}/lists`).get();
            
            // Filter for lists that might be automation-related
            if (lists.value) {
              const workflowLists = lists.value.filter((list: any) => {
                const displayName = list.displayName;
                return displayName && 
                  typeof displayName === 'string' && 
                  (displayName.toLowerCase().includes('workflow') ||
                   displayName.toLowerCase().includes('automation'));
              });

              for (const list of workflowLists) {
                automations.push({
                  id: `microsoft-sharepoint-workflow-${list.id}`,
                  name: `SharePoint: ${list.displayName}`,
                  type: 'workflow',
                  platform: 'microsoft',
                  status: 'active',
                  trigger: 'item_change',
                  actions: ['process', 'notify'],
                  metadata: {
                    listId: list.id,
                    siteId: site.id,
                    siteName: site.displayName,
                    listTemplate: list.template
                  },
                  createdAt: list.createdDateTime ? new Date(list.createdDateTime) : new Date(),
                  lastTriggered: null
                });
              }
            }
          } catch (siteError) {
            // Continue if we can't access this specific site
            console.log(`Could not access site ${site.id}:`, siteError);
          }
        }
      }
    } catch (error) {
      console.error('Error discovering SharePoint workflows:', error);
    }

    return automations;
  }

  /**
   * Discover Power Apps
   */
  private async discoverPowerApps(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // Power Apps discovery would require Power Platform APIs
      // This is a placeholder for when Power Apps APIs become available through Graph
      
    } catch (error) {
      console.error('Error discovering Power Apps:', error);
    }

    return automations;
  }

  /**
   * Test specific permissions by making API calls
   */
  private async testPermissions(): Promise<Array<{permission: string, success: boolean, error?: string}>> {
    const tests = [];

    // Test user profile access
    try {
      const userTest = await this.client!.api('/me').get();
      tests.push({
        permission: 'User.Read',
        success: !!userTest,
        error: undefined
      });
    } catch (error) {
      tests.push({
        permission: 'User.Read',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test directory read access
    try {
      const dirTest = await this.client!.api('/users').top(1).get();
      tests.push({
        permission: 'Directory.Read.All',
        success: !!dirTest.value,
        error: undefined
      });
    } catch (error) {
      tests.push({
        permission: 'Directory.Read.All',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test applications read access
    try {
      const appTest = await this.client!.api('/applications').top(1).get();
      tests.push({
        permission: 'Application.Read.All',
        success: !!appTest.value,
        error: undefined
      });
    } catch (error) {
      tests.push({
        permission: 'Application.Read.All',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return tests;
  }

  /**
   * Extract permissions from Microsoft OAuth scope string
   */
  private extractPermissions(scope?: string | any): string[] {
    if (typeof scope === 'string') {
      return scope.split(' ').map(s => s.trim()).filter(s => s.length > 0);
    }
    // For cases where scope might be embedded in auth provider
    return [];
  }

  /**
   * Extract tenant ID from user object
   */
  private extractTenantId(user: any): string | null {
    // Try to extract tenant ID from user principal name or other fields
    if (user.userPrincipalName && typeof user.userPrincipalName === 'string') {
      const domain = user.userPrincipalName.split('@')[1];
      return domain || null;
    }
    return null;
  }

  /**
   * Get an authenticated Microsoft Graph client for a connection
   */
  static async getClientForConnection(connectionId: string): Promise<Client> {
    const accessToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'access_token'
    );

    if (!accessToken) {
      throw new Error('No access token found for Microsoft connection');
    }

    const authProvider = new TokenAuthenticationProvider(accessToken);
    return Client.initWithMiddleware({ authProvider });
  }
}

// Export singleton instance
export const microsoftConnector = new MicrosoftConnector();