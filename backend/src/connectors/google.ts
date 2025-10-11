/**
 * Google Workspace Platform Connector
 * Implements the PlatformConnector interface for Google Workspace OAuth and API integration
 */

import { google, Auth } from 'googleapis';
import { PlatformConnector, OAuthCredentials, ConnectionResult, AutomationEvent, AuditLogEntry, PermissionCheck } from './types';
import { AIAuditLogQuery, AIAuditLogResult, AIplatformAuditLog, AIPlatform } from '@singura/shared-types';
import { oauthService } from '../services/oauth-service';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';
import { googleOAuthAIDetector } from '../services/detection/google-oauth-ai-detector.service';

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
      // Detect account type first
      const accountType = await this.detectAccountType();

      console.log(`📊 Google account type: ${accountType.type}`);
      console.log(`📊 Admin access: ${accountType.hasAdminAccess}`);
      console.log(`📊 Domain: ${accountType.domain || 'Personal Gmail'}`);

      if (accountType.type === 'personal') {
        console.warn('⚠️ Personal Gmail account detected - limited discovery capabilities');
        console.warn('   Personal accounts can only detect:');
        console.warn('   - Apps Script projects (Drive API)');
        console.warn('   - OAuth applications (own tokens)');
        console.warn('   - Cannot access audit logs or service accounts');
      }

      // Apps Script projects - available for both personal and Workspace
      const appsScriptAutomations = await this.discoverAppsScriptProjects();
      automations.push(...appsScriptAutomations);

      // OAuth applications - available for both personal and Workspace
      const oauthAppAutomations = await this.discoverOAuthApplications();
      automations.push(...oauthAppAutomations);

      // Service accounts - Workspace with admin only
      if (accountType.type === 'workspace' && accountType.hasAdminAccess) {
        const serviceAccountAutomations = await this.discoverServiceAccounts();
        automations.push(...serviceAccountAutomations);
      } else {
        console.log('⏭️  Skipping service account discovery (requires Workspace admin)');
      }

      // Drive automations - available for both
      const driveAutomations = await this.discoverDriveAutomations();
      automations.push(...driveAutomations);

      console.log(`\n✅ Total Google automations discovered: ${automations.length}\n`);

      return automations;
    } catch (error) {
      console.error('Error discovering Google Workspace automations:', error);
      throw new Error(`Failed to discover Google Workspace automations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect if this is a personal Gmail account or Google Workspace account
   */
  private async detectAccountType(): Promise<{
    type: 'workspace' | 'personal';
    domain: string | null;
    hasAdminAccess: boolean;
  }> {
    if (!this.client) {
      throw new Error('Client not authenticated');
    }

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.client });
      const userInfo = await oauth2.userinfo.get();

      const domain = userInfo.data.hd; // Hosted domain (only present for Workspace)
      const isWorkspace = !!domain;

      // Test admin access
      let hasAdminAccess = false;
      if (isWorkspace) {
        try {
          const admin = google.admin({ version: 'directory_v1', auth: this.client });
          await admin.users.list({ customer: 'my_customer', maxResults: 1 });
          hasAdminAccess = true;
        } catch {
          hasAdminAccess = false;
        }
      }

      return {
        type: isWorkspace ? 'workspace' : 'personal',
        domain: domain || null,
        hasAdminAccess
      };

    } catch (error) {
      console.error('Error detecting account type:', error);
      throw error;
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
   * Get AI platform audit logs (OAuth-based detection)
   */
  async getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    if (!this.client) {
      throw new Error('Google client not authenticated');
    }

    const admin = google.admin({ version: 'reports_v1', auth: this.client });

    try {
      // Query login application for OAuth events
      const loginLogs = await admin.activities.list({
        userKey: 'all',
        applicationName: 'login',
        startTime: query.startDate.toISOString(),
        endTime: query.endDate?.toISOString(),
        maxResults: 1000,
        eventName: 'oauth2_authorize,oauth2_approve'
      });

      // Query token application for OAuth token events
      const tokenLogs = await admin.activities.list({
        userKey: 'all',
        applicationName: 'token',
        startTime: query.startDate.toISOString(),
        endTime: query.endDate?.toISOString(),
        maxResults: 1000,
        eventName: 'authorize'
      });

      // Combine and detect AI platforms
      const allEvents = [
        ...(loginLogs.data.items || []),
        ...(tokenLogs.data.items || [])
      ];

      const aiPlatformLogs = allEvents
        .map(event => googleOAuthAIDetector.detectAIPlatformLogin(event))
        .filter((log): log is AIplatformAuditLog => log !== null);

      // Filter by platform if specified
      const filteredLogs = query.platforms && query.platforms.length > 0
        ? aiPlatformLogs.filter(log => query.platforms!.includes(log.platform))
        : aiPlatformLogs;

      // Determine the primary platform from detected logs
      const detectedPlatformCounts = filteredLogs.reduce((acc, log) => {
        acc[log.platform] = (acc[log.platform] || 0) + 1;
        return acc;
      }, {} as Record<AIPlatform, number>);

      const primaryPlatform = Object.entries(detectedPlatformCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as AIPlatform | undefined;

      return {
        logs: filteredLogs,
        totalCount: filteredLogs.length,
        hasMore: !!(loginLogs.data.nextPageToken || tokenLogs.data.nextPageToken),
        nextCursor: loginLogs.data.nextPageToken || tokenLogs.data.nextPageToken || undefined,
        metadata: {
          queryTime: Date.now(),
          platform: primaryPlatform || 'chatgpt', // Default to chatgpt if no logs detected
          warnings: [],
          detectedPlatforms: googleOAuthAIDetector.getSupportedPlatforms()
        }
      };
    } catch (error) {
      console.error('Error fetching Google AI platform audit logs:', error);

      // Return empty result with error warning
      return {
        logs: [],
        totalCount: 0,
        hasMore: false,
        metadata: {
          queryTime: Date.now(),
          platform: 'chatgpt', // Default platform for error case
          warnings: [
            error instanceof Error ? error.message : 'Failed to fetch audit logs'
          ]
        }
      };
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
   * Discover Google Apps Script projects via Drive API
   * NOTE: Apps Script API v1 does NOT have a projects.list() method
   * We use Drive API to find Apps Script files by mimeType
   */
  private async discoverAppsScriptProjects(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      if (!this.client) {
        throw new Error('Google client not authenticated');
      }

      const drive = google.drive({ version: 'v3', auth: this.client });
      const script = google.script({ version: 'v1', auth: this.client });

      console.log('🔍 Searching for Apps Script projects in Drive...');

      // Find all Apps Script projects in Drive
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.script'",
        pageSize: 100,
        fields: 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,owners,shared,description)',
        orderBy: 'modifiedTime desc',
        spaces: 'drive'
      });

      if (!response.data.files || response.data.files.length === 0) {
        console.log('No Apps Script projects found in Drive');
        return [];
      }

      console.log(`📜 Found ${response.data.files.length} Apps Script projects`);

      // Process each Apps Script project
      for (const file of response.data.files) {
        try {
          // Attempt to get script content to analyze for AI platform usage
          let hasAIPlatform = { detected: false, platforms: [] as string[], confidence: 0 };
          let scriptPermissions: string[] = [];

          try {
            const scriptContent = await script.projects.getContent({
              scriptId: file.id!
            });

            hasAIPlatform = this.detectAIPlatformInScript(scriptContent);
            scriptPermissions = this.extractScriptPermissions(scriptContent);

            console.log(`  ✓ Analyzed script ${file.name}:`, {
              hasAI: hasAIPlatform.detected,
              platforms: hasAIPlatform.platforms,
              permissions: scriptPermissions.length
            });
          } catch (contentError: any) {
            // User may not have permission to read script content
            console.warn(`  ⚠ Cannot access content for script ${file.id}: ${contentError.message}`);
          }

          // Determine risk level
          let riskLevel: 'low' | 'medium' | 'high' = 'medium';
          const riskFactors: string[] = [];

          if (hasAIPlatform.detected) {
            riskLevel = 'high';
            riskFactors.push(`Integrates with AI platforms: ${hasAIPlatform.platforms.join(', ')}`);
          }

          if (file.shared) {
            riskFactors.push('Shared with other users');
            // Only upgrade from low to medium (high stays high)
            if (riskLevel !== 'high') riskLevel = 'medium';
          }

          // Check modification recency
          const modifiedDate = file.modifiedTime ? new Date(file.modifiedTime) : new Date();
          const daysSinceModified = (Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceModified < 7) {
            riskFactors.push('Recently modified (active automation)');
          }

          automations.push({
            id: `google-script-${file.id}`,
            name: file.name || 'Untitled Apps Script',
            description: file.description || undefined,
            type: 'workflow',
            platform: 'google',
            status: 'active',
            trigger: 'event',
            actions: ['execute', 'automate'],
            permissions: scriptPermissions,
            metadata: {
              scriptId: file.id,
              driveFileId: file.id,
              description: file.description,
              owners: file.owners,
              shared: file.shared,
              hasAIPlatformIntegration: hasAIPlatform.detected,
              aiPlatforms: hasAIPlatform.platforms,
              aiPlatformConfidence: hasAIPlatform.confidence,
              riskFactors,
              detectionMethod: 'drive_api_apps_script_search'
            },
            createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
            lastModified: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
            lastTriggered: file.modifiedTime ? new Date(file.modifiedTime) : null,
            riskLevel
          });

        } catch (projectError) {
          console.error(`Error processing Apps Script project ${file.id}:`, projectError);
          // Continue with next project
        }
      }

      console.log(`✅ Apps Script discovery complete: ${automations.length} projects found`);

    } catch (error) {
      console.error('Error discovering Apps Script projects:', error);
      // Don't throw - return empty array and let caller handle
      return [];
    }

    return automations;
  }

  /**
   * Detect AI platform usage in Apps Script source code
   */
  private detectAIPlatformInScript(projectContent: any): { detected: boolean; platforms: string[]; confidence: number } {
    const platforms = new Set<string>();
    let maxConfidence = 0;

    if (!projectContent.data || !projectContent.data.files) {
      return { detected: false, platforms: [], confidence: 0 };
    }

    const files = projectContent.data.files;

    for (const file of files) {
      if (!file.source) continue;

      const source = file.source.toLowerCase();

      // OpenAI / ChatGPT detection (HIGH CONFIDENCE)
      if (source.includes('api.openai.com') ||
          source.includes('openai.com/v1') ||
          source.includes('sk-') && source.includes('openai') ||
          source.includes('gpt-3') ||
          source.includes('gpt-4') ||
          source.includes('chat/completions') ||
          source.includes('chatgpt')) {
        platforms.add('openai');
        maxConfidence = Math.max(maxConfidence, 95);
      }

      // Claude / Anthropic detection (HIGH CONFIDENCE)
      if (source.includes('anthropic.com') ||
          source.includes('claude.ai') ||
          source.includes('claude-') ||
          source.includes('sk-ant-')) {
        platforms.add('claude');
        maxConfidence = Math.max(maxConfidence, 95);
      }

      // Gemini detection
      if (source.includes('generativelanguage.googleapis.com') ||
          source.includes('gemini-pro') ||
          source.includes('gemini-')) {
        platforms.add('gemini');
        maxConfidence = Math.max(maxConfidence, 90);
      }

      // Perplexity detection
      if (source.includes('perplexity.ai') ||
          source.includes('pplx-')) {
        platforms.add('perplexity');
        maxConfidence = Math.max(maxConfidence, 90);
      }

      // Generic AI API key patterns (LOW CONFIDENCE)
      if ((source.includes('sk-') || source.includes('api_key')) && platforms.size === 0) {
        platforms.add('unknown_ai_api');
        maxConfidence = Math.max(maxConfidence, 40);
      }
    }

    return {
      detected: platforms.size > 0,
      platforms: Array.from(platforms),
      confidence: maxConfidence
    };
  }

  /**
   * Extract permissions/scopes from Apps Script manifest
   */
  private extractScriptPermissions(projectContent: any): string[] {
    const permissions: string[] = [];

    if (!projectContent.data || !projectContent.data.files) {
      return permissions;
    }

    // Look for appsscript.json manifest file
    const manifestFile = projectContent.data.files.find(
      (f: any) => f.name === 'appsscript.json' || f.type === 'JSON'
    );

    if (manifestFile && manifestFile.source) {
      try {
        const manifest = JSON.parse(manifestFile.source);

        if (manifest.oauthScopes) {
          permissions.push(...manifest.oauthScopes);
        }

        if (manifest.urlFetchWhitelist) {
          permissions.push(...manifest.urlFetchWhitelist.map((url: string) => `external_url:${url}`));
        }
      } catch (parseError) {
        console.warn('Failed to parse Apps Script manifest:', parseError);
      }
    }

    return permissions;
  }

  /**
   * Discover Google Cloud Service Accounts via Audit Logs
   * NOTE: Direct service account listing requires IAM API (not available in Workspace)
   * We detect service accounts through their activity in audit logs
   */
  private async discoverServiceAccounts(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      if (!this.client) {
        throw new Error('Google client not authenticated');
      }

      const admin = google.admin({ version: 'reports_v1', auth: this.client });

      console.log('🤖 Searching for service account activity in audit logs...');

      // Query token activity to find service accounts
      const tokenResponse = await admin.activities.list({
        userKey: 'all',
        applicationName: 'token',
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        maxResults: 1000,
        eventName: 'authorize'
      });

      // Query login activity for service account authentications
      const loginResponse = await admin.activities.list({
        userKey: 'all',
        applicationName: 'login',
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: 1000
      });

      // Combine all activities
      const allActivities = [
        ...(tokenResponse.data.items || []),
        ...(loginResponse.data.items || [])
      ];

      // Group activities by service account email
      const serviceAccountMap = new Map<string, {
        email: string;
        activities: any[];
        firstSeen: Date;
        lastSeen: Date;
        scopes: Set<string>;
        clientIds: Set<string>;
      }>();

      for (const activity of allActivities) {
        const actorEmail = activity.actor?.email;

        // Service account emails end with .iam.gserviceaccount.com or .apps.googleusercontent.com
        if (actorEmail && (
          actorEmail.includes('.iam.gserviceaccount.com') ||
          actorEmail.includes('.apps.googleusercontent.com')
        )) {
          // Get activity time with null safety
          const activityTime = activity.id?.time ? new Date(activity.id.time) : new Date();

          if (!serviceAccountMap.has(actorEmail)) {
            serviceAccountMap.set(actorEmail, {
              email: actorEmail,
              activities: [],
              firstSeen: activityTime,
              lastSeen: activityTime,
              scopes: new Set(),
              clientIds: new Set()
            });
          }

          const saData = serviceAccountMap.get(actorEmail)!;
          saData.activities.push(activity);

          // Update time range
          if (activityTime < saData.firstSeen) saData.firstSeen = activityTime;
          if (activityTime > saData.lastSeen) saData.lastSeen = activityTime;

          // Extract scopes and client IDs from event parameters
          if (activity.events) {
            for (const event of activity.events) {
              if (event.parameters) {
                for (const param of event.parameters) {
                  if (param.name === 'scope' || param.name === 'oauth_scopes') {
                    const scopes = param.multiValue || [param.value];
                    // Add null check for scope values
                    if (scopes) {
                      scopes.forEach((scope: string | undefined) => {
                        if (scope) saData.scopes.add(scope);
                      });
                    }
                  }
                  if (param.name === 'client_id' || param.name === 'oauth_client_id') {
                    if (param.value) saData.clientIds.add(param.value);
                  }
                }
              }
            }
          }
        }
      }

      if (serviceAccountMap.size === 0) {
        console.log('No service accounts found in audit logs');
        return [];
      }

      console.log(`🤖 Discovered ${serviceAccountMap.size} service accounts via audit logs`);

      // Convert service account data to AutomationEvent format
      for (const [email, saData] of serviceAccountMap.entries()) {
        // Determine service account name
        const emailParts = email.split('@');
        const saName = (emailParts[0] || email)
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());

        // Assess risk
        const riskAssessment = this.assessServiceAccountRiskFromActivity({
          email,
          activityCount: saData.activities.length,
          scopes: Array.from(saData.scopes),
          daysSinceLastSeen: (Date.now() - saData.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
        });

        automations.push({
          id: `google-sa-${Buffer.from(email).toString('base64').substring(0, 20)}`,
          name: `Service Account: ${saName}`,
          description: 'Automated service account detected via audit logs',
          type: 'integration',
          platform: 'google',
          status: 'active',
          trigger: 'api_key',
          actions: ['data_access', 'api_calls', 'authentication'],
          permissions: Array.from(saData.scopes),
          metadata: {
            email,
            activityCount: saData.activities.length,
            firstSeen: saData.firstSeen.toISOString(),
            lastSeen: saData.lastSeen.toISOString(),
            scopeCount: saData.scopes.size,
            clientIdCount: saData.clientIds.size,
            scopes: Array.from(saData.scopes),
            clientIds: Array.from(saData.clientIds),
            detectionMethod: 'audit_log_analysis',
            riskFactors: riskAssessment.riskFactors
          },
          createdAt: saData.firstSeen,
          lastTriggered: saData.lastSeen,
          lastModified: saData.lastSeen,
          riskLevel: riskAssessment.level
        });
      }

      console.log(`✅ Service account discovery complete: ${automations.length} accounts found`);

    } catch (error: any) {
      console.error('Error discovering service accounts:', error);

      // Service account discovery requires admin permissions
      // Don't throw - just return empty array and log warning
      if (error.message?.includes('auth') || error.message?.includes('permission')) {
        console.warn('⚠ Service account discovery requires admin permissions - skipping');
        return [];
      }

      return [];
    }

    return automations;
  }

  /**
   * Assess service account risk based on activity patterns
   */
  private assessServiceAccountRiskFromActivity(sa: {
    email: string;
    activityCount: number;
    scopes: string[];
    daysSinceLastSeen: number;
  }): { level: 'low' | 'medium' | 'high'; score: number; riskFactors: string[] } {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // High activity = higher risk
    if (sa.activityCount > 100) {
      riskScore += 20;
      riskFactors.push(`High activity: ${sa.activityCount} events in 30 days`);
    } else if (sa.activityCount > 50) {
      riskScore += 10;
      riskFactors.push(`Moderate activity: ${sa.activityCount} events`);
    }

    // Check for sensitive scopes
    const sensitiveScopePatterns = [
      'admin', 'directory', 'drive', 'gmail',
      'calendar', 'contacts', 'sheets', 'docs'
    ];

    const sensitiveScopes = sa.scopes.filter(scope =>
      sensitiveScopePatterns.some(pattern => scope.toLowerCase().includes(pattern))
    );

    if (sensitiveScopes.length > 5) {
      riskScore += 30;
      riskFactors.push(`Excessive sensitive permissions: ${sensitiveScopes.length} scopes`);
    } else if (sensitiveScopes.length > 0) {
      riskScore += 15;
      riskFactors.push(`Sensitive data access: ${sensitiveScopes.slice(0, 3).join(', ')}`);
    }

    // Recent activity indicates active automation
    if (sa.daysSinceLastSeen < 1) {
      riskScore += 10;
      riskFactors.push('Active within last 24 hours');
    } else if (sa.daysSinceLastSeen < 7) {
      riskScore += 5;
      riskFactors.push('Active within last week');
    }

    // Detect third-party integrations by email patterns
    const thirdPartyPatterns = ['zapier', 'integromat', 'make', 'automate', 'n8n', 'tray'];
    const isThirdParty = thirdPartyPatterns.some(pattern =>
      sa.email.toLowerCase().includes(pattern)
    );

    if (isThirdParty) {
      riskScore += 20;
      riskFactors.push('Third-party automation platform detected');
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high';
    if (riskScore >= 50) level = 'high';
    else if (riskScore >= 25) level = 'medium';
    else level = 'low';

    return { level, score: riskScore, riskFactors };
  }

  /**
   * Discover OAuth applications with AI platform detection
   */
  private async discoverOAuthApplications(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      if (!this.client) {
        throw new Error('Google client not authenticated');
      }

      const admin = google.admin({ version: 'directory_v1', auth: this.client });

      console.log('🔐 Searching for OAuth applications...');

      try {
        // List OAuth tokens for the authenticated user
        const response = await admin.tokens.list({
          userKey: 'me'
        });

        if (!response.data.items || response.data.items.length === 0) {
          console.log('No OAuth applications found');
          return [];
        }

        console.log(`🔐 Found ${response.data.items.length} OAuth applications`);

        for (const token of response.data.items) {
          // Detect if this is an AI platform
          const aiDetection = this.detectAIPlatformFromOAuth(token);

          // Assess risk based on scopes and AI platform status
          const riskAssessment = this.assessOAuthAppRisk(token, aiDetection);

          automations.push({
            id: `google-oauth-${token.clientId}`,
            name: token.displayText || `OAuth App: ${token.clientId}`,
            description: aiDetection.detected
              ? `${aiDetection.platformName} AI Platform Integration`
              : 'Third-party OAuth application',
            type: 'integration',
            platform: 'google',
            status: 'active',
            trigger: 'api_call',
            actions: ['access', 'authenticate', 'data_read'],
            permissions: token.scopes || [],
            metadata: {
              clientId: token.clientId,
              scopes: token.scopes,
              scopeCount: token.scopes?.length || 0,
              displayText: token.displayText,
              anonymous: token.anonymous,
              nativeApp: token.nativeApp,
              isAIPlatform: aiDetection.detected,
              aiPlatformType: aiDetection.platform,
              aiPlatformName: aiDetection.platformName,
              aiPlatformConfidence: aiDetection.confidence,
              detectionMethod: 'oauth_tokens_api',
              riskFactors: riskAssessment.riskFactors
            },
            createdAt: new Date(), // Token API doesn't provide creation date
            lastTriggered: null,
            riskLevel: riskAssessment.level
          });
        }

        console.log(`✅ OAuth app discovery complete: ${automations.length} apps found`);

      } catch (adminError: any) {
        // Check if it's a permission error
        if (adminError.message?.includes('auth') || adminError.message?.includes('permission')) {
          console.log('⚠ OAuth app discovery requires admin permissions - skipping');
        } else {
          console.error('OAuth app discovery error:', adminError);
        }
      }

    } catch (error) {
      console.error('Error discovering OAuth applications:', error);
    }

    return automations;
  }

  /**
   * Detect AI platforms from OAuth application metadata
   */
  private detectAIPlatformFromOAuth(token: any): {
    detected: boolean;
    platform: string | null;
    platformName: string | null;
    confidence: number;
  } {
    const displayText = (token.displayText || '').toLowerCase();
    const clientId = (token.clientId || '').toLowerCase();

    // OpenAI / ChatGPT detection (HIGH CONFIDENCE) - THIS IS THE KEY ONE
    if (displayText.includes('openai') ||
        displayText.includes('chatgpt') ||
        displayText.includes('gpt-') ||
        clientId.includes('openai') ||
        clientId.includes('chatgpt')) {
      return {
        detected: true,
        platform: 'openai',
        platformName: 'OpenAI / ChatGPT',
        confidence: 95
      };
    }

    // Claude / Anthropic detection (HIGH CONFIDENCE)
    if (displayText.includes('claude') ||
        displayText.includes('anthropic') ||
        clientId.includes('anthropic') ||
        clientId.includes('claude')) {
      return {
        detected: true,
        platform: 'claude',
        platformName: 'Claude (Anthropic)',
        confidence: 95
      };
    }

    // Gemini detection (Google's own AI)
    if (displayText.includes('gemini') ||
        displayText.includes('generativelanguage') ||
        clientId.includes('gemini')) {
      return {
        detected: true,
        platform: 'gemini',
        platformName: 'Gemini (Google)',
        confidence: 90
      };
    }

    // Perplexity detection
    if (displayText.includes('perplexity') ||
        clientId.includes('perplexity')) {
      return {
        detected: true,
        platform: 'perplexity',
        platformName: 'Perplexity AI',
        confidence: 90
      };
    }

    // Generic AI assistant patterns (MEDIUM CONFIDENCE)
    const aiKeywords = ['ai', 'gpt', 'chat', 'assistant', 'bot', 'copilot'];
    const hasAIKeyword = aiKeywords.some(keyword =>
      displayText.includes(keyword) || clientId.includes(keyword)
    );

    if (hasAIKeyword) {
      return {
        detected: true,
        platform: 'unknown_ai',
        platformName: 'Unknown AI Platform',
        confidence: 60
      };
    }

    return {
      detected: false,
      platform: null,
      platformName: null,
      confidence: 0
    };
  }

  /**
   * Assess OAuth app risk based on scopes and AI platform status
   */
  private assessOAuthAppRisk(
    token: any,
    aiDetection: { detected: boolean; platform: string | null }
  ): { level: 'low' | 'medium' | 'high'; score: number; riskFactors: string[] } {
    let riskScore = 0;
    const riskFactors: string[] = [];

    const scopes = token.scopes || [];

    // AI platforms are automatically higher risk
    if (aiDetection.detected) {
      riskScore += 30;
      riskFactors.push(`AI platform integration: ${aiDetection.platform}`);
    }

    // Sensitive scope detection
    const sensitiveScopePatterns = [
      { pattern: 'drive', severity: 15, name: 'Google Drive access' },
      { pattern: 'gmail', severity: 20, name: 'Gmail access' },
      { pattern: 'calendar', severity: 10, name: 'Calendar access' },
      { pattern: 'contacts', severity: 15, name: 'Contacts access' },
      { pattern: 'admin', severity: 30, name: 'Admin privileges' },
      { pattern: 'directory', severity: 25, name: 'Directory access' }
    ];

    for (const { pattern, severity, name } of sensitiveScopePatterns) {
      const matchingScopes = scopes.filter((scope: string) =>
        scope.toLowerCase().includes(pattern)
      );

      if (matchingScopes.length > 0) {
        riskScore += severity;
        riskFactors.push(`${name}: ${matchingScopes.length} scope(s)`);
      }
    }

    // Excessive scopes
    if (scopes.length > 10) {
      riskScore += 15;
      riskFactors.push(`Excessive permissions: ${scopes.length} scopes`);
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high';
    if (riskScore >= 50) level = 'high';
    else if (riskScore >= 25) level = 'medium';
    else level = 'low';

    return { level, score: riskScore, riskFactors };
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
  private assessAppsScriptRisk(project: { permissions: string[]; isPublic?: boolean; hasBindings?: boolean; triggers: string[]; functions: string[]; updateTime: string }): { score: number; level: 'low' | 'medium' | 'high'; riskFactors: string[] } {
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
  private assessServiceAccountRisk(serviceAccount: { roles: string[]; keyCount: number; isActive?: boolean; lastUsed: string; name: string }): { score: number; level: 'low' | 'medium' | 'high' } {
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