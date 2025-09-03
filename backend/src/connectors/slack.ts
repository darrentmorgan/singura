/**
 * Slack Platform Connector
 * Implements the PlatformConnector interface for Slack OAuth and API integration
 */

import { WebClient } from '@slack/web-api';
import { PlatformConnector, OAuthCredentials, ConnectionResult, AutomationEvent, AuditLogEntry, PermissionCheck } from './types';
import { oauthService } from '../services/oauth-service';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';

export interface SlackTeamInfo {
  id: string;
  name: string;
  domain: string;
  icon?: {
    image_original?: string;
    image_132?: string;
  };
  enterprise?: {
    id: string;
    name: string;
    domain: string;
  };
}

export interface SlackUserInfo {
  id: string;
  name: string;
  deleted: boolean;
  color?: string;
  real_name: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile: {
    display_name: string;
    real_name: string;
    email?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
    image_192?: string;
    image_512?: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
}

export interface SlackBot {
  id: string;
  deleted: boolean;
  name: string;
  app_id: string;
  user_id?: string;
  icons?: {
    image_36?: string;
    image_48?: string;
    image_72?: string;
  };
}

export interface SlackApp {
  id: string;
  name: string;
  description?: string;
  help_url?: string;
  privacy_policy_url?: string;
  app_homepage_url?: string;
  app_directory_url?: string;
  is_app_directory_approved: boolean;
  is_internal: boolean;
  additional_info?: string;
}

export interface SlackWorkflow {
  id: string;
  name: string;
  description?: string;
  is_published: boolean;
  app_id?: string;
  date_created: number;
  date_updated: number;
  team_id: string;
  creator: {
    id: string;
    username: string;
  };
}

/**
 * Slack connector implementing secure OAuth flow and automation discovery
 */
export class SlackConnector implements PlatformConnector {
  platform: 'slack' = 'slack';
  private client: WebClient | null = null;

  /**
   * Authenticate with Slack using OAuth credentials
   */
  async authenticate(credentials: OAuthCredentials): Promise<ConnectionResult> {
    try {
      // Initialize Slack WebClient with the access token
      this.client = new WebClient(credentials.accessToken, {
        timeout: 30000,
        retryConfig: {
          retries: 2,
          factor: 1.96
        }
      });

      // Test the connection and get team info
      const [authTest, teamInfo] = await Promise.all([
        this.client.auth.test(),
        this.client.team.info()
      ]);

      if (!authTest.ok || !teamInfo.ok) {
        throw new Error('Slack authentication failed');
      }

      // Extract team and user information
      const team = teamInfo.team as SlackTeamInfo;
      const user = authTest.user_id;

      return {
        success: true,
        platformUserId: authTest.user_id as string,
        platformWorkspaceId: team.id,
        displayName: `${team.name} - ${authTest.user}`,
        permissions: this.extractPermissions(authTest.scope as string),
        metadata: {
          teamId: team.id,
          teamName: team.name,
          teamDomain: team.domain,
          userId: authTest.user_id,
          botUserId: authTest.bot_id,
          scope: authTest.scope,
          enterprise: team.enterprise
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Slack authentication failed',
        errorCode: 'SLACK_AUTH_ERROR'
      };
    }
  }

  /**
   * Discover automations in the Slack workspace
   */
  async discoverAutomations(): Promise<AutomationEvent[]> {
    if (!this.client) {
      throw new Error('Slack client not authenticated');
    }

    const automations: AutomationEvent[] = [];

    try {
      // Discover workflows/automations
      const workflows = await this.discoverWorkflows();
      automations.push(...workflows);

      // Discover bots
      const bots = await this.discoverBots();
      automations.push(...bots);

      // Discover apps
      const apps = await this.discoverApps();
      automations.push(...apps);

      // Discover webhooks and slash commands
      const webhooks = await this.discoverWebhooks();
      automations.push(...webhooks);

      return automations;
    } catch (error) {
      console.error('Error discovering Slack automations:', error);
      throw new Error(`Failed to discover Slack automations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audit logs from Slack (requires admin permissions)
   */
  async getAuditLogs(since: Date): Promise<AuditLogEntry[]> {
    if (!this.client) {
      throw new Error('Slack client not authenticated');
    }

    try {
      // Note: Slack audit logs require Grid plan and admin permissions
      // TODO: Implement proper audit log API when available
      console.warn('Slack audit logs API not available, returning empty array');
      return [];
    } catch (error) {
      console.error('Error fetching Slack audit logs:', error);
      // Return empty array if audit logs aren't available
      return [];
    }
  }

  /**
   * Validate permissions and connection health
   */
  async validatePermissions(): Promise<PermissionCheck> {
    if (!this.client) {
      throw new Error('Slack client not authenticated');
    }

    try {
      // Test basic permissions
      const authTest = await this.client.auth.test();
      
      if (!authTest.ok) {
        return {
          isValid: false,
          permissions: [],
          missingPermissions: ['basic_auth'],
          errors: ['Authentication failed'],
          lastChecked: new Date()
        };
      }

      const grantedScopes = this.extractPermissions(authTest.scope as string);
      const requiredScopes = ['channels:read', 'users:read', 'team:read'];
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
          teamId: authTest.team_id,
          userId: authTest.user_id,
          botId: authTest.bot_id
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
   * Discover Slack workflows and automation
   */
  private async discoverWorkflows(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // Note: Workflow discovery might require specific scopes or enterprise features
      // This is a placeholder for when Slack provides workflow APIs
      
      // For now, we'll return empty array as apps.list API is not available
      console.warn('Slack apps.list API not available, returning empty automation array');
      return [];
    } catch (error) {
      console.error('Error discovering Slack workflows:', error);
      return [];
    }
  }

  /**
   * Discover bots in the workspace
   */
  private async discoverBots(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // TODO: Implement bots discovery when API is available  
      console.warn('Slack bots.list API not available, returning empty bot array');
      return [];
    } catch (error) {
      console.error('Error discovering Slack bots:', error);
      return [];
    }
  }

  /**
   * Discover apps in the workspace
   */
  private async discoverApps(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // TODO: Implement apps discovery when API is available
      console.warn('Slack apps.list API not available, returning empty apps array');
      return [];
    } catch (error) {
      console.error('Error discovering Slack apps:', error);
      return [];
    }
  }

  /**
   * Discover webhooks and slash commands (requires admin access)
   */
  private async discoverWebhooks(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // Note: This would require admin permissions and specific API calls
      // For now, this is a placeholder for webhook discovery
      
      // Slash commands would be discovered through admin.apps.list with detailed scopes
      // Webhooks would be discovered through workspace settings APIs (if available)
      
    } catch (error) {
      console.error('Error discovering Slack webhooks:', error);
    }

    return automations;
  }

  /**
   * Test specific permissions by making API calls
   */
  private async testPermissions(): Promise<Array<{permission: string, success: boolean, error?: string}>> {
    const tests = [];

    // Test channels:read
    try {
      const channelsTest = await this.client!.conversations.list({ limit: 1, types: 'public_channel' });
      tests.push({
        permission: 'channels:read',
        success: channelsTest.ok === true,
        error: channelsTest.ok ? undefined : channelsTest.error
      });
    } catch (error) {
      tests.push({
        permission: 'channels:read',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test users:read
    try {
      const usersTest = await this.client!.users.list({ limit: 1 });
      tests.push({
        permission: 'users:read',
        success: usersTest.ok === true,
        error: usersTest.ok ? undefined : usersTest.error
      });
    } catch (error) {
      tests.push({
        permission: 'users:read',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test team:read
    try {
      const teamTest = await this.client!.team.info();
      tests.push({
        permission: 'team:read',
        success: teamTest.ok === true,
        error: teamTest.ok ? undefined : teamTest.error
      });
    } catch (error) {
      tests.push({
        permission: 'team:read',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return tests;
  }

  /**
   * Extract permissions from Slack OAuth scope string
   */
  private extractPermissions(scope: string): string[] {
    if (!scope) return [];
    return scope.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Determine if an app has automation capabilities
   */
  private isAutomationApp(app: SlackApp): boolean {
    const automationKeywords = [
      'bot', 'workflow', 'automat', 'schedul', 'trigger', 'integrat',
      'sync', 'webhook', 'api', 'connect', 'flow', 'task', 'remind',
      'poll', 'survey', 'alert', 'notif'
    ];

    const searchText = `${app.name} ${app.description || ''}`.toLowerCase();
    return automationKeywords.some(keyword => searchText.includes(keyword)) || 
           !app.is_internal; // External apps often provide automation features
  }

  /**
   * Get an authenticated Slack client for a connection
   */
  static async getClientForConnection(connectionId: string): Promise<WebClient> {
    const accessToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'access_token'
    );

    if (!accessToken) {
      throw new Error('No access token found for Slack connection');
    }

    return new WebClient(accessToken, {
      timeout: 30000,
      retryConfig: {
        retries: 2,
        factor: 1.96
      }
    });
  }
}

// Export singleton instance
export const slackConnector = new SlackConnector();