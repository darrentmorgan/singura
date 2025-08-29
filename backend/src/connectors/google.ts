/**
 * Google Workspace Platform Connector
 * Implements the PlatformConnector interface for Google Workspace OAuth and API integration
 */

import { google, Auth } from 'googleapis';
import { PlatformConnector, OAuthCredentials, ConnectionResult, AutomationEvent, AuditLogEntry, PermissionCheck } from './types';
import { oauthService } from '../services/oauth-service';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';

export interface GoogleAppsScriptProject {
  scriptId: string;
  title: string;
  description?: string;
  parentId?: string;
  createTime?: string;
  updateTime?: string;
  function?: string[];
  executionApi?: {
    accessLevel: string;
  };
}

export interface GoogleServiceAccount {
  name: string;
  projectId: string;
  uniqueId: string;
  email: string;
  displayName: string;
  description?: string;
  oauth2ClientId?: string;
  disabled: boolean;
  etag: string;
}

export interface GoogleOAuthApp {
  clientId: string;
  clientType: string;
  name: string;
  scopes: string[];
  domain?: string;
  creationTime: string;
}

/**
 * Google Workspace connector implementing secure OAuth flow and automation discovery
 */
export class GoogleConnector implements PlatformConnector {
  platform: 'google' = 'google';
  private client: Auth.OAuth2Client | null = null;

  /**
   * Authenticate with Google using OAuth credentials
   */
  async authenticate(credentials: OAuthCredentials): Promise<ConnectionResult> {
    try {
      // Initialize Google OAuth2 client
      this.client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials
      this.client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        token_type: credentials.tokenType,
        expiry_date: credentials.expiresAt ? credentials.expiresAt.getTime() : undefined
      });

      // Test the connection and get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: this.client });
      const userInfo = await oauth2.userinfo.get();

      if (!userInfo.data) {
        throw new Error('Failed to retrieve user information');
      }

      const user = userInfo.data;

      return {
        success: true,
        platformUserId: user.id as string,
        platformWorkspaceId: user.hd || null, // Google Workspace domain
        displayName: `${user.name} (${user.email})`,
        permissions: this.extractPermissions(credentials.scope),
        metadata: {
          email: user.email,
          name: user.name,
          picture: user.picture,
          verified_email: user.verified_email,
          locale: user.locale,
          domain: user.hd,
          given_name: user.given_name,
          family_name: user.family_name
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google authentication failed',
        errorCode: 'GOOGLE_AUTH_ERROR'
      };
    }
  }

  /**
   * Discover automations in Google Workspace
   */
  async discoverAutomations(): Promise<AutomationEvent[]> {
    if (!this.client) {
      throw new Error('Google client not authenticated');
    }

    const automations: AutomationEvent[] = [];

    try {
      // Discover Apps Script projects
      const appsScriptAutomations = await this.discoverAppsScriptProjects();
      automations.push(...appsScriptAutomations);

      // Discover Service Accounts
      const serviceAccountAutomations = await this.discoverServiceAccounts();
      automations.push(...serviceAccountAutomations);

      // Discover OAuth applications
      const oauthAppAutomations = await this.discoverOAuthApplications();
      automations.push(...oauthAppAutomations);

      // Discover Drive automations (shared folders, scripts)
      const driveAutomations = await this.discoverDriveAutomations();
      automations.push(...driveAutomations);

      return automations;
    } catch (error) {
      console.error('Error discovering Google Workspace automations:', error);
      throw new Error(`Failed to discover Google Workspace automations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audit logs from Google Admin SDK (requires admin permissions)
   */
  async getAuditLogs(since: Date): Promise<AuditLogEntry[]> {
    if (!this.client) {
      throw new Error('Google client not authenticated');
    }

    try {
      const admin = google.admin({ version: 'reports_v1', auth: this.client });
      
      const response = await admin.activities.list({
        userKey: 'all',
        applicationName: 'admin',
        startTime: since.toISOString(),
        maxResults: 1000
      });

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map(activity => ({
        id: activity.id?.uniqueQualifier || 'unknown',
        timestamp: new Date(activity.id?.time || Date.now()),
        actorId: activity.actor?.email || 'system',
        actorType: activity.actor?.callerType || 'user',
        actionType: activity.events?.[0]?.name || 'unknown',
        resourceType: activity.events?.[0]?.type || 'unknown',
        resourceId: activity.id?.applicationName || '',
        details: {
          ipAddress: activity.ipAddress,
          events: activity.events,
          ownerDomain: activity.ownerDomain
        },
        ipAddress: activity.ipAddress,
        userAgent: undefined // Not available in Google Admin reports
      }));
    } catch (error) {
      console.error('Error fetching Google Workspace audit logs:', error);
      // Return empty array if audit logs aren't available
      return [];
    }
  }

  /**
   * Validate permissions and connection health
   */
  async validatePermissions(): Promise<PermissionCheck> {
    if (!this.client) {
      throw new Error('Google client not authenticated');
    }

    try {
      // Test basic permissions
      const oauth2 = google.oauth2({ version: 'v2', auth: this.client });
      const userInfo = await oauth2.userinfo.get();
      
      if (!userInfo.data) {
        return {
          isValid: false,
          permissions: [],
          missingPermissions: ['basic_auth'],
          errors: ['Authentication failed'],
          lastChecked: new Date()
        };
      }

      const grantedScopes = this.extractPermissions(this.client.credentials.scope);
      const requiredScopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];
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
        errors: permissionTests.filter(test => !test.success).map(test => test.error),
        lastChecked: new Date(),
        metadata: {
          email: userInfo.data.email,
          domain: userInfo.data.hd,
          verified: userInfo.data.verified_email
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
   * Discover Google Apps Script projects
   */
  private async discoverAppsScriptProjects(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      const script = google.script({ version: 'v1', auth: this.client! });
      const response = await script.projects.list({
        pageSize: 50
      });

      if (response.data.projects) {
        for (const project of response.data.projects) {
          automations.push({
            id: `google-script-${project.scriptId}`,
            name: project.title || 'Untitled Script',
            type: 'workflow',
            platform: 'google',
            status: 'active',
            trigger: 'event',
            actions: ['execute', 'automate'],
            metadata: {
              scriptId: project.scriptId,
              description: project.description,
              createTime: project.createTime,
              updateTime: project.updateTime,
              parentId: project.parentId
            },
            createdAt: project.createTime ? new Date(project.createTime) : new Date(),
            lastTriggered: null,
            lastModified: project.updateTime ? new Date(project.updateTime) : undefined
          });
        }
      }
    } catch (error) {
      console.error('Error discovering Apps Script projects:', error);
    }

    return automations;
  }

  /**
   * Discover Google Cloud Service Accounts
   */
  private async discoverServiceAccounts(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // This requires Service Account credentials and Cloud Resource Manager API
      // For now, we'll detect service accounts through indirect methods
      // In a full implementation, you'd use the IAM API to list service accounts
      
      // Placeholder for service account discovery
      // This would require additional permissions and setup
    } catch (error) {
      console.error('Error discovering Google Service Accounts:', error);
    }

    return automations;
  }

  /**
   * Discover OAuth applications
   */
  private async discoverOAuthApplications(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // OAuth app discovery would require Admin SDK Directory API
      // with admin permissions to list authorized applications
      const admin = google.admin({ version: 'directory_v1', auth: this.client! });
      
      // This requires admin privileges
      try {
        const response = await admin.tokens.list({
          userKey: 'me'
        });

        if (response.data.items) {
          for (const token of response.data.items) {
            automations.push({
              id: `google-oauth-${token.clientId}`,
              name: token.displayText || 'OAuth Application',
              type: 'integration',
              platform: 'google',
              status: 'active',
              trigger: 'api_call',
              actions: ['access', 'authenticate'],
              metadata: {
                clientId: token.clientId,
                scopes: token.scopes,
                displayText: token.displayText,
                anonymous: token.anonymous,
                nativeApp: token.nativeApp
              },
              createdAt: new Date(),
              lastTriggered: null
            });
          }
        }
      } catch (adminError) {
        // User doesn't have admin permissions, skip OAuth app discovery
        console.log('Admin permissions not available for OAuth app discovery');
      }
    } catch (error) {
      console.error('Error discovering Google OAuth applications:', error);
    }

    return automations;
  }

  /**
   * Discover Google Drive automations
   */
  private async discoverDriveAutomations(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      const drive = google.drive({ version: 'v3', auth: this.client! });
      
      // Look for shared drives and automation-related files
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.script' or name contains 'automation' or name contains 'workflow'",
        pageSize: 50,
        fields: 'files(id,name,mimeType,createdTime,modifiedTime,owners,shared)'
      });

      if (response.data.files) {
        for (const file of response.data.files) {
          if (file.mimeType === 'application/vnd.google-apps.script') {
            automations.push({
              id: `google-drive-script-${file.id}`,
              name: file.name || 'Untitled Drive Script',
              type: 'workflow',
              platform: 'google',
              status: 'active',
              trigger: 'event',
              actions: ['execute'],
              metadata: {
                fileId: file.id,
                mimeType: file.mimeType,
                owners: file.owners,
                shared: file.shared,
                driveLocation: true
              },
              createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
              lastTriggered: null,
              lastModified: file.modifiedTime ? new Date(file.modifiedTime) : undefined
            });
          }
        }
      }
    } catch (error) {
      console.error('Error discovering Google Drive automations:', error);
    }

    return automations;
  }

  /**
   * Test specific permissions by making API calls
   */
  private async testPermissions(): Promise<Array<{permission: string, success: boolean, error?: string}>> {
    const tests = [];

    // Test userinfo access
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.client! });
      const userInfoTest = await oauth2.userinfo.get();
      tests.push({
        permission: 'userinfo.profile',
        success: !!userInfoTest.data,
        error: undefined
      });
    } catch (error) {
      tests.push({
        permission: 'userinfo.profile',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test Apps Script access
    try {
      const script = google.script({ version: 'v1', auth: this.client! });
      const scriptTest = await script.projects.list({ pageSize: 1 });
      tests.push({
        permission: 'script.projects.readonly',
        success: true,
        error: undefined
      });
    } catch (error) {
      tests.push({
        permission: 'script.projects.readonly',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test Drive access
    try {
      const drive = google.drive({ version: 'v3', auth: this.client! });
      const driveTest = await drive.files.list({ pageSize: 1 });
      tests.push({
        permission: 'drive.readonly',
        success: !!driveTest.data,
        error: undefined
      });
    } catch (error) {
      tests.push({
        permission: 'drive.readonly',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return tests;
  }

  /**
   * Extract permissions from Google OAuth scope string
   */
  private extractPermissions(scope?: string): string[] {
    if (!scope) return [];
    return scope.split(' ').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Get an authenticated Google client for a connection
   */
  static async getClientForConnection(connectionId: string): Promise<Auth.OAuth2Client> {
    const accessToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'access_token'
    );

    const refreshToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'refresh_token'
    );

    if (!accessToken) {
      throw new Error('No access token found for Google connection');
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    return client;
  }
}

// Export singleton instance
export const googleConnector = new GoogleConnector();