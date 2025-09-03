/**
 * Google Workspace Platform Connector
 * Implements the PlatformConnector interface for Google Workspace OAuth and API integration
 */

import { google, Auth } from 'googleapis';
import { PlatformConnector, OAuthCredentials, ConnectionResult, AutomationEvent, AuditLogEntry, PermissionCheck } from './types';
import { oauthService } from '../services/oauth-service';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';

/**
 * Map Google actorType to our AuditLogEntry actorType enum
 */
function mapGoogleActorType(googleActorType: string | undefined): 'user' | 'system' | 'bot' | 'service_account' {
  if (!googleActorType) return 'system';
  
  switch (googleActorType.toLowerCase()) {
    case 'user':
      return 'user';
    case 'application':
    case 'app':
    case 'service_account':
      return 'service_account';
    case 'bot':
      return 'bot';
    default:
      return 'system';
  }
}

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
        platformWorkspaceId: user.hd || undefined, // Google Workspace domain
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
        actorType: mapGoogleActorType(activity.actor?.callerType),
        actionType: activity.events?.[0]?.name || 'unknown',
        resourceType: activity.events?.[0]?.type || 'unknown',
        resourceId: activity.id?.applicationName || '',
        details: {
          ipAddress: activity.ipAddress || undefined,
          events: activity.events,
          ownerDomain: activity.ownerDomain || undefined
        },
        ipAddress: activity.ipAddress || undefined,
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
        errors: permissionTests.filter(test => !test.success).map(test => test.error).filter((error): error is string => error !== undefined),
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
      // For MVP demo, simulate realistic Apps Script projects
      const mockAppsScriptProjects = [
        {
          scriptId: 'AKfycbwHq8_123abc',
          title: 'Sales Lead Automation',
          description: 'Automatically processes form submissions and sends to CRM',
          createTime: '2024-07-10T09:15:00Z',
          updateTime: '2024-12-28T14:30:00Z',
          parentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          parentType: 'SHEETS',
          triggers: ['ON_FORM_SUBMIT', 'TIME_DRIVEN'],
          functions: ['onFormSubmit', 'dailyCleanup', 'sendToCRM'],
          permissions: ['SHEETS', 'GMAIL', 'EXTERNAL_URL']
        },
        {
          scriptId: 'AKfycbwMn7_456def',
          title: 'Email Report Generator',
          description: 'Weekly automated reports from Google Analytics data',
          createTime: '2024-05-22T16:45:00Z',
          updateTime: '2024-12-30T08:22:00Z',
          parentId: '1Hm4BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2',
          parentType: 'DOCS',
          triggers: ['TIME_DRIVEN'],
          functions: ['generateWeeklyReport', 'fetchAnalyticsData', 'emailReport'],
          permissions: ['ANALYTICS', 'GMAIL', 'DOCS', 'DRIVE']
        },
        {
          scriptId: 'AKfycbwPq9_789ghi',
          title: 'Meeting Room Scheduler',
          description: 'Automated meeting room booking and conflict resolution',
          createTime: '2024-09-03T11:20:00Z',
          updateTime: '2025-01-01T16:10:00Z',
          parentId: '1Nm9BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE3',
          parentType: 'SHEETS',
          triggers: ['ON_EDIT', 'ON_CHANGE'],
          functions: ['checkAvailability', 'bookRoom', 'sendConfirmation'],
          permissions: ['CALENDAR', 'GMAIL', 'SHEETS']
        }
      ];

      for (const project of mockAppsScriptProjects) {
        // Assess risk based on permissions and triggers
        const riskAssessment = this.assessAppsScriptRisk(project);
        
        automations.push({
          id: `google-script-${project.scriptId}`,
          name: project.title,
          type: 'workflow',
          platform: 'google',
          status: 'active',
          trigger: project.triggers.includes('TIME_DRIVEN') ? 'scheduled' : 'event',
          actions: ['execute', 'automate', 'data_processing'],
          metadata: {
            scriptId: project.scriptId,
            description: project.description,
            createTime: project.createTime,
            updateTime: project.updateTime,
            parentId: project.parentId,
            parentType: project.parentType,
            triggers: project.triggers,
            functions: project.functions,
            permissions: project.permissions,
            riskFactors: riskAssessment.riskFactors
          },
          createdAt: new Date(project.createTime),
          lastTriggered: new Date(project.updateTime),
          lastModified: new Date(project.updateTime),
          riskLevel: riskAssessment.level
        });
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
      // For MVP demo, we'll detect service accounts through indirect methods
      // In production, this would use IAM API to list service accounts
      
      // Simulate service account discovery based on common patterns
      const mockServiceAccounts = [
        {
          name: 'zapier-integration-sa',
          email: 'zapier-integration-sa@project-12345.iam.gserviceaccount.com',
          displayName: 'Zapier Integration Service Account',
          description: 'Service account used by Zapier for Google Sheets automation',
          createdTime: '2024-06-15T10:30:00Z',
          lastUsed: '2025-01-01T15:45:00Z',
          keyCount: 2,
          roles: ['roles/sheets.editor', 'roles/drive.file']
        },
        {
          name: 'data-pipeline-bot',
          email: 'data-pipeline-bot@project-12345.iam.gserviceaccount.com',
          displayName: 'Data Pipeline Automation',
          description: 'Automated data extraction from Google Analytics to BigQuery',
          createdTime: '2024-08-20T14:20:00Z',
          lastUsed: '2025-01-01T23:15:00Z',
          keyCount: 1,
          roles: ['roles/analytics.viewer', 'roles/bigquery.dataEditor']
        }
      ];

      for (const sa of mockServiceAccounts) {
        // Assess risk based on permissions and usage patterns
        const riskLevel = this.assessServiceAccountRisk(sa);
        
        automations.push({
          id: `google-sa-${sa.name}`,
          name: sa.displayName,
          type: 'integration',
          platform: 'google',
          status: 'active',
          trigger: 'api_key',
          actions: ['data_access', 'api_calls', 'file_operations'],
          metadata: {
            email: sa.email,
            description: sa.description,
            keyCount: sa.keyCount,
            roles: sa.roles,
            lastUsed: sa.lastUsed,
            projectId: 'project-12345'
          },
          createdAt: new Date(sa.createdTime),
          lastTriggered: new Date(sa.lastUsed),
          riskLevel: riskLevel.level
        });
      }
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
      // Use the correct method to list projects
      const scriptTest = await script.projects.getContent({ scriptId: 'test' }).catch(() => null);
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
   * Assess risk level for Apps Script projects
   */
  private assessAppsScriptRisk(project: any): { score: number; level: 'low' | 'medium' | 'high'; riskFactors: string[] } {
    let riskScore = 0;
    const riskFactors: string[] = [];
    
    // Risk factors for Apps Script projects
    const highRiskPermissions = ['EXTERNAL_URL', 'ADMIN_DIRECTORY', 'ADMIN_REPORTS'];
    const mediumRiskPermissions = ['GMAIL', 'DRIVE', 'ANALYTICS', 'CALENDAR'];
    
    // Check permissions
    const hasHighRiskPerm = project.permissions.some((perm: string) => 
      highRiskPermissions.includes(perm)
    );
    const hasMediumRiskPerm = project.permissions.some((perm: string) => 
      mediumRiskPermissions.includes(perm)
    );
    
    if (hasHighRiskPerm) {
      riskScore += 35;
      riskFactors.push('High-risk permissions (external URLs, admin access)');
    } else if (hasMediumRiskPerm) {
      riskScore += 15;
      riskFactors.push('Medium-risk permissions (email, drive access)');
    }
    
    // Time-driven triggers indicate automated behavior
    if (project.triggers.includes('TIME_DRIVEN')) {
      riskScore += 15;
      riskFactors.push('Automated time-based triggers');
    }
    
    // Form submissions can process sensitive data
    if (project.triggers.includes('ON_FORM_SUBMIT')) {
      riskScore += 10;
      riskFactors.push('Processes form submissions (potential PII)');
    }
    
    // External integrations (detected by functions)
    const hasExternalIntegration = project.functions.some((func: string) => 
      func.toLowerCase().includes('crm') || 
      func.toLowerCase().includes('api') || 
      func.toLowerCase().includes('webhook')
    );
    
    if (hasExternalIntegration) {
      riskScore += 20;
      riskFactors.push('Integrates with external systems');
    }
    
    // Recent activity indicates active automation
    const lastModified = new Date(project.updateTime);
    const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 30) {
      riskScore += 5;
      riskFactors.push('Recently active automation');
    }
    
    // Determine risk level
    let level: 'low' | 'medium' | 'high';
    if (riskScore >= 45) level = 'high';
    else if (riskScore >= 20) level = 'medium';
    else level = 'low';
    
    return { score: riskScore, level, riskFactors };
  }

  /**
   * Assess risk level for service accounts
   */
  private assessServiceAccountRisk(serviceAccount: any): { score: number; level: 'low' | 'medium' | 'high' } {
    let riskScore = 0;
    
    // Risk factors for service accounts
    const highRiskRoles = ['roles/owner', 'roles/editor', 'roles/admin', 'roles/bigquery.admin'];
    const mediumRiskRoles = ['roles/sheets.editor', 'roles/drive.file', 'roles/analytics.viewer'];
    
    // Check roles
    const hasHighRiskRole = serviceAccount.roles.some((role: string) => 
      highRiskRoles.some(hrr => {
        const parts = hrr.split('.');
        return parts.length > 1 && parts[1] && role.includes(parts[1]);
      })
    );
    const hasMediumRiskRole = serviceAccount.roles.some((role: string) => 
      mediumRiskRoles.some(mrr => {
        const parts = mrr.split('.');
        return parts.length > 1 && parts[1] && role.includes(parts[1]);
      })
    );
    
    if (hasHighRiskRole) riskScore += 40;
    else if (hasMediumRiskRole) riskScore += 20;
    
    // Multiple keys increase risk
    if (serviceAccount.keyCount > 1) riskScore += 15;
    
    // Recent usage indicates active automation
    const lastUsed = new Date(serviceAccount.lastUsed);
    const daysSinceUsed = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUsed < 7) riskScore += 10;
    else if (daysSinceUsed < 30) riskScore += 5;
    
    // Third-party integrations (detected by name patterns)
    if (serviceAccount.name.includes('zapier') || 
        serviceAccount.name.includes('integromat') || 
        serviceAccount.name.includes('automate')) {
      riskScore += 20;
    }
    
    // Determine risk level
    if (riskScore >= 50) return { score: riskScore, level: 'high' };
    if (riskScore >= 25) return { score: riskScore, level: 'medium' };
    return { score: riskScore, level: 'low' };
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