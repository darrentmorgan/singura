/**
 * Google API Client Service
 * Production implementation for live Google Workspace shadow AI detection
 * Implements GoogleAPIClient interface with real Google OAuth credentials
 * Following CLAUDE.md Types-Tests-Code methodology - Phase 4.1.1
 */

import { google, Auth } from 'googleapis';
import { AutomationEvent } from '../connectors/types';
import {
  GoogleAPIClient,
  GoogleOAuthCredentials,
  GoogleAuditLogOptions,
  GoogleAuditLogResponse,
  GoogleUserActivity,
  GoogleLoginEvent,
  GoogleDriveActivityOptions,
  GoogleDriveEvent,
  GoogleFileShareEvent,
  GooglePermissionEvent,
  GoogleAppsScriptProject,
  GoogleScriptExecution,
  GoogleEmailAutomation,
  GoogleEmailFilter,
  GoogleServiceAccountInfo,
  GoogleWorkspaceEvent,
  DateRange
} from '@singura/shared-types';

export class GoogleAPIClientService implements GoogleAPIClient {
  private auth: Auth.OAuth2Client;
  private adminReports: any; // Google Admin SDK client
  private drive: any; // Google Drive API client  
  private gmail: any; // Gmail API client
  private credentials: GoogleOAuthCredentials | null = null;
  private isAuthenticated = false;

  constructor() {
    // Initialize Google API clients with OAuth credentials for token refresh
    // CRITICAL: Client credentials are required for refreshAccessToken() to work
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.adminReports = google.admin({ version: 'reports_v1', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });

    console.log('GoogleAPIClientService initialized for production Google Workspace integration');
  }

  /**
   * Initialize with OAuth credentials for authenticated API access
   */
  async initialize(credentials: GoogleOAuthCredentials): Promise<boolean> {
    try {
      this.credentials = credentials;

      // Handle expiresAt as either Date or string (from database)
      const expiryDate = credentials.expiresAt
        ? (credentials.expiresAt instanceof Date
          ? credentials.expiresAt.getTime()
          : new Date(credentials.expiresAt).getTime())
        : undefined;

      // Set OAuth credentials for Google API client
      this.auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        token_type: credentials.tokenType,
        expiry_date: expiryDate
      });

      // Handle expiresAt for logging (can be Date or string from database)
      const expiresAtStr = credentials.expiresAt
        ? (credentials.expiresAt instanceof Date
          ? credentials.expiresAt.toISOString()
          : credentials.expiresAt)
        : undefined;

      console.log('Google API Client initialized with OAuth credentials:', {
        hasAccessToken: !!credentials.accessToken,
        hasRefreshToken: !!credentials.refreshToken,
        scopes: credentials.scope,
        domain: credentials.domain,
        expiresAt: expiresAtStr
      });

      // Validate credentials with test API call
      const isValid = await this.validateCredentials();
      this.isAuthenticated = isValid;
      
      return isValid;
    } catch (error) {
      console.error('Failed to initialize Google API client:', error);
      return false;
    }
  }

  /**
   * Validate current OAuth credentials with test API call
   */
  async validateCredentials(): Promise<boolean> {
    try {
      if (!this.credentials) {
        return false;
      }

      // Test credentials with OAuth2 userinfo call
      const oauth2 = google.oauth2({ version: 'v2', auth: this.auth });
      const response = await oauth2.userinfo.get();
      
      if (response.data.id && response.data.email) {
        console.log('Google OAuth credentials validated successfully:', {
          userId: response.data.id,
          email: response.data.email?.substring(0, 3) + '...',
          verifiedEmail: response.data.verified_email
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Google OAuth credential validation failed:', error);
      return false;
    }
  }

  /**
   * Refresh OAuth tokens if needed
   */
  async refreshTokensIfNeeded(): Promise<boolean> {
    try {
      if (!this.credentials || !this.credentials.refreshToken) {
        console.warn('Cannot refresh tokens: No refresh token available');
        return false;
      }

      // Check if token is expired or expiring soon (within 5 minutes)
      // Handle expiresAt as either Date or string (from database deserialization)
      const expiresAt = this.credentials.expiresAt
        ? (this.credentials.expiresAt instanceof Date
          ? this.credentials.expiresAt
          : new Date(this.credentials.expiresAt))
        : null;
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      if (expiresAt && expiresAt > fiveMinutesFromNow) {
        return true; // Token still valid
      }

      console.log('Refreshing Google OAuth tokens...');
      
      const { credentials } = await this.auth.refreshAccessToken();
      
      if (credentials.access_token) {
        // Update stored credentials
        this.credentials.accessToken = credentials.access_token;
        this.credentials.expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
        
        console.log('Google OAuth tokens refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh Google OAuth tokens:', error);
      return false;
    }
  }

  /**
   * Get Google Workspace audit logs for shadow AI detection
   */
  async getAuditLogs(options: GoogleAuditLogOptions): Promise<GoogleAuditLogResponse> {
    try {
      await this.ensureAuthenticated();

      const params = {
        userKey: 'all',
        applicationName: options.applicationName || 'admin',
        startTime: options.startTime.toISOString(),
        endTime: options.endTime.toISOString(),
        maxResults: options.maxResults || 1000,
        eventName: options.eventName,
        actorEmail: options.actorEmail,
        pageToken: options.pageToken
      };

      console.log('Fetching Google Workspace audit logs:', {
        applicationName: params.applicationName,
        startTime: params.startTime,
        endTime: params.endTime,
        maxResults: params.maxResults
      });

      const response = await this.adminReports.activities.list(params);
      
      const auditResponse: GoogleAuditLogResponse = {
        items: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
        totalResults: response.data.items?.length || 0,
        etag: response.data.etag || ''
      };

      console.log(`Google audit logs retrieved: ${auditResponse.totalResults} events found`);
      return auditResponse;
    } catch (error) {
      console.error('Failed to fetch Google audit logs:', error);
      throw new Error(`Google audit log retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user activity analysis for automation detection
   */
  async getUserActivity(userId: string, timeRange: DateRange): Promise<GoogleUserActivity[]> {
    try {
      await this.ensureAuthenticated();

      // Get audit logs for specific user
      const auditLogs = await this.getAuditLogs({
        actorEmail: userId,
        startTime: timeRange.startDate,
        endTime: timeRange.endDate,
        maxResults: 500
      });

      // Analyze activity patterns for automation indicators
      const activities: GoogleUserActivity[] = [];
      
      if (auditLogs.items.length > 0) {
        const activity: GoogleUserActivity = {
          userId: userId,
          userEmail: userId,
          activityCount: auditLogs.items.length,
          lastActivity: new Date(auditLogs.items[0]?.id?.time || new Date()),
          suspiciousActivity: [], // TODO: Apply detection algorithms
          riskScore: 0 // TODO: Calculate with detection algorithms
        };
        
        activities.push(activity);
      }

      console.log(`User activity analysis completed for ${userId}: ${activities.length} activity records`);
      return activities;
    } catch (error) {
      console.error(`Failed to get user activity for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get login activity for authentication pattern analysis
   */
  async getLoginActivity(timeRange: DateRange): Promise<GoogleLoginEvent[]> {
    try {
      await this.ensureAuthenticated();

      const auditLogs = await this.getAuditLogs({
        applicationName: 'login',
        startTime: timeRange.startDate,
        endTime: timeRange.endDate,
        maxResults: 1000
      });

      const loginEvents: GoogleLoginEvent[] = auditLogs.items.map((item: any) => ({
        timestamp: new Date(item.id.time),
        userEmail: item.actor.email || 'unknown',
        ipAddress: item.ipAddress || 'unknown',
        userAgent: 'unknown', // Not available in basic audit logs
        loginType: 'PASSWORD', // Default - would need detailed analysis
        success: !item.events.some((e: any) => e.name.includes('FAILED')),
        suspiciousIndicators: [] // TODO: Apply detection algorithms
      }));

      console.log(`Login activity analysis completed: ${loginEvents.length} login events`);
      return loginEvents;
    } catch (error) {
      console.error('Failed to get login activity:', error);
      return [];
    }
  }

  /**
   * Get Google Drive activity for file automation detection
   */
  async getDriveActivity(options: GoogleDriveActivityOptions): Promise<GoogleDriveEvent[]> {
    try {
      await this.ensureAuthenticated();

      // Note: Drive Activity API requires additional scope setup
      // For now, implement basic file listing as placeholder
      const response = await this.drive.files.list({
        q: `modifiedTime >= '${options.timeRange.startDate.toISOString()}'`,
        fields: 'files(id,name,mimeType,modifiedTime,lastModifyingUser)',
        pageSize: options.maxResults || 100
      });

      const driveEvents: GoogleDriveEvent[] = (response.data.files || []).map((file: any) => ({
        timestamp: new Date(file.modifiedTime || Date.now()),
        actor: file.lastModifyingUser?.displayName || 'unknown',
        action: 'file_modified',
        target: {
          id: file.id || '',
          name: file.name || '',
          mimeType: file.mimeType || ''
        },
        details: {
          description: `File ${file.name} was modified`,
          additionalInfo: { mimeType: file.mimeType }
        }
      }));

      console.log(`Drive activity analysis completed: ${driveEvents.length} file events`);
      return driveEvents;
    } catch (error) {
      console.error('Failed to get Drive activity:', error);
      return [];
    }
  }

  /**
   * Get file sharing events for external sharing risk analysis
   */
  async getFileSharing(timeRange: DateRange): Promise<GoogleFileShareEvent[]> {
    try {
      await this.ensureAuthenticated();

      // Implement file sharing analysis (requires Drive API permissions)
      console.log('File sharing analysis - requires enhanced Drive permissions');
      return [];
    } catch (error) {
      console.error('Failed to get file sharing activity:', error);
      return [];
    }
  }

  /**
   * Get permission change events for security monitoring
   */
  async getPermissionChanges(timeRange: DateRange): Promise<GooglePermissionEvent[]> {
    try {
      await this.ensureAuthenticated();

      // Implement permission change monitoring (requires Drive API audit logs)
      console.log('Permission change analysis - requires enhanced Drive permissions');
      return [];
    } catch (error) {
      console.error('Failed to get permission changes:', error);
      return [];
    }
  }

  /**
   * Get Google Apps Script projects for AI integration detection
   * Uses Drive API to find Apps Script files (Apps Script API has no list method)
   */
  async getAppsScriptProjects(): Promise<GoogleAppsScriptProject[]> {
    try {
      await this.ensureAuthenticated();

      console.log('📜 Searching Drive for Apps Script projects...');

      // Find Apps Script projects via Drive API
      const response = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.script'",
        pageSize: 100,
        fields: 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,owners,shared,description)',
        orderBy: 'modifiedTime desc',
        spaces: 'drive'
      });

      if (!response.data.files || response.data.files.length === 0) {
        console.log('  No Apps Script projects found in Drive');
        return [];
      }

      console.log(`  Found ${response.data.files.length} Apps Script files`);

      const projects: GoogleAppsScriptProject[] = [];
      const script = google.script({ version: 'v1', auth: this.auth });

      for (const file of response.data.files) {
        try {
          // Try to get script content for AI detection
          let functions: string[] = [];
          let hasAIIntegration = false;

          try {
            const content = await script.projects.getContent({ scriptId: file.id! });

            // Extract function names from script files
            if (content.data.files) {
              for (const scriptFile of content.data.files) {
                if (scriptFile.functionSet?.values) {
                  functions.push(...scriptFile.functionSet.values.map((f: any) => f.name || 'unknown'));
                }

                // Check for AI platform API calls in source
                if (scriptFile.source) {
                  const source = scriptFile.source.toLowerCase();
                  hasAIIntegration = source.includes('openai.com') ||
                                    source.includes('anthropic.com') ||
                                    source.includes('chatgpt') ||
                                    source.includes('claude');
                }
              }
            }

            console.log(`    ✓ ${file.name}: ${functions.length} functions${hasAIIntegration ? ' (AI DETECTED)' : ''}`);
          } catch (contentError) {
            console.log(`    ⚠ Cannot read ${file.name} content (permission denied)`);
          }

          projects.push({
            scriptId: file.id!,
            title: file.name || 'Untitled Script',
            description: file.description,
            parentId: undefined,
            createTime: file.createdTime ? new Date(file.createdTime) : new Date(),
            updateTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
            owner: file.owners?.[0]?.emailAddress || 'unknown',
            functions: functions.map(name => ({
              name,
              description: '',
              externalApiCalls: [],
              riskIndicators: []
            })),
            triggers: [], // Would need Apps Script API to get triggers
            permissions: [] // Would need Apps Script manifest to get permissions
          });

        } catch (projectError) {
          console.warn(`  Error processing script ${file.id}:`, projectError);
        }
      }

      console.log(`✅ Apps Script discovery: ${projects.length} projects analyzed`);
      return projects;

    } catch (error) {
      console.error('Failed to get Apps Script projects:', error);
      return [];
    }
  }

  /**
   * Get script execution logs for automation monitoring
   */
  async getScriptExecutions(scriptId: string, timeRange: DateRange): Promise<GoogleScriptExecution[]> {
    try {
      await this.ensureAuthenticated();

      // Implement script execution monitoring (requires Apps Script API)
      console.log(`Script execution analysis for ${scriptId} - requires Apps Script API permissions`);
      return [];
    } catch (error) {
      console.error(`Failed to get script executions for ${scriptId}:`, error);
      return [];
    }
  }

  /**
   * Get email automation patterns for shadow AI detection
   */
  async getEmailAutomation(timeRange: DateRange): Promise<GoogleEmailAutomation[]> {
    try {
      await this.ensureAuthenticated();

      // Implement email automation detection (requires Gmail API)
      console.log('Email automation analysis - requires enhanced Gmail permissions');
      return [];
    } catch (error) {
      console.error('Failed to get email automation:', error);
      return [];
    }
  }

  /**
   * Get email filters for automated processing detection
   */
  async getEmailFilters(): Promise<GoogleEmailFilter[]> {
    try {
      await this.ensureAuthenticated();

      // Implement email filter analysis (requires Gmail API)
      console.log('Email filter analysis - requires enhanced Gmail permissions');
      return [];
    } catch (error) {
      console.error('Failed to get email filters:', error);
      return [];
    }
  }

  /**
   * Get service accounts for AI integration detection
   * Uses Admin Reports API to detect service account activity (IAM API not available in Workspace)
   */
  async getServiceAccounts(): Promise<GoogleServiceAccountInfo[]> {
    try {
      await this.ensureAuthenticated();

      console.log('🤖 Searching for service account activity in audit logs...');

      const serviceAccounts: GoogleServiceAccountInfo[] = [];

      try {
        // Query audit logs for service account activity
        const response = await this.adminReports.activities.list({
          userKey: 'all',
          applicationName: 'token',
          startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          maxResults: 1000,
          eventName: 'authorize'
        });

        const serviceAccountEmails = new Set<string>();

        if (response.data.items) {
          for (const activity of response.data.items) {
            const email = activity.actor?.email;
            if (email && (email.includes('.iam.gserviceaccount.com') || email.includes('.apps.googleusercontent.com'))) {
              serviceAccountEmails.add(email);
            }
          }
        }

        console.log(`  Found ${serviceAccountEmails.size} unique service accounts`);

        // Convert to ServiceAccountInfo format
        for (const email of serviceAccountEmails) {
          const name = email.split('@')[0] || 'Unknown';
          const saName = name
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

          serviceAccounts.push({
            uniqueId: Buffer.from(email).toString('base64').substring(0, 20),
            email,
            displayName: saName,
            description: 'Service account detected via audit log activity',
            projectId: email.split('@')[1]?.split('.')[0] || 'unknown',
            createTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Estimate
            disabledTime: undefined,
            keys: [],
            roles: [],
            activityCount: 0,
            riskAssessment: {
              hasMultipleKeys: false,
              hasAdminAccess: false,
              externalIntegration: false,
              recentActivity: false,
              riskScore: 50
            }
          });
        }

        console.log(`✅ Service account discovery: ${serviceAccounts.length} accounts found`);

      } catch (apiError: any) {
        if (apiError.message?.includes('auth') || apiError.message?.includes('permission')) {
          console.log('  ⚠ Service account discovery requires admin permissions - skipping');
        } else {
          throw apiError;
        }
      }

      return serviceAccounts;

    } catch (error) {
      console.error('Failed to get service accounts:', error);
      return [];
    }
  }

  /**
   * Get OAuth applications authorized by user via AUDIT LOGS (non-admin approach)
   * Uses Admin Reports API to detect OAuth authorization events
   */
  async getOAuthApplications(): Promise<Array<{
    clientId: string;
    displayText: string;
    scopes: string[];
    isAIPlatform: boolean;
    platformName?: string;
    authorizedBy: string;
    firstSeen: Date;
    lastSeen: Date;
  }>> {
    try {
      await this.ensureAuthenticated();

      console.log('🔐 Searching for OAuth applications via audit logs...');

      // Use Admin Reports API to find OAuth authorization events
      // This works for non-admin users with admin.reports.audit.readonly scope
      // NOTE: eventName parameter doesn't accept comma-separated values - get all login events
      const loginResponse = await this.adminReports.activities.list({
        userKey: 'all',
        applicationName: 'login',
        startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 180 days (Google's max retention)
        maxResults: 1000
        // Filter for oauth events in code below
      });

      const tokenResponse = await this.adminReports.activities.list({
        userKey: 'all',
        applicationName: 'token',
        startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 180 days (Google's max retention)
        maxResults: 1000
        // Get all token events and filter
      });

      // Combine all events
      const allEvents = [
        ...(loginResponse.data.items || []),
        ...(tokenResponse.data.items || [])
      ];

      if (allEvents.length === 0) {
        console.log('  No audit log events found');
        return [];
      }

      console.log(`  Found ${allEvents.length} total audit events, filtering for OAuth...`);

      // Extract unique OAuth apps from events
      const oauthAppsMap = new Map<string, {
        clientId: string;
        displayText: string;
        scopes: Set<string>;
        firstSeen: Date;
        lastSeen: Date;
        authorizedBy: string;
      }>();

      for (const event of allEvents) {
        if (!event.events) continue;

        // Capture actor email (who authorized the app)
        const actorEmail = event.actor?.email || 'unknown';

        for (const ev of event.events) {
          // Filter for OAuth-related events only
          const eventName = ev.name?.toLowerCase() || '';
          const isOAuthEvent = eventName.includes('oauth') ||
                              eventName.includes('authorize') ||
                              eventName.includes('token');

          if (!isOAuthEvent || !ev.parameters) continue;

          let clientId: string | undefined;
          let appName: string | undefined;
          const scopes: string[] = [];

          for (const param of ev.parameters) {
            if (param.name === 'client_id' || param.name === 'oauth_client_id') {
              clientId = param.value;
            }
            if (param.name === 'app_name' || param.name === 'product_name') {
              appName = param.value;
            }
            if (param.name === 'scope' || param.name === 'oauth_scopes') {
              const scopeValues = param.multiValue || [param.value];
              scopes.push(...scopeValues);
            }
          }

          if (clientId) {
            const eventTime = event.id?.time ? new Date(event.id.time) : new Date();

            if (!oauthAppsMap.has(clientId)) {
              oauthAppsMap.set(clientId, {
                clientId,
                displayText: appName || clientId,
                scopes: new Set(scopes),
                firstSeen: eventTime,
                lastSeen: eventTime,
                authorizedBy: actorEmail
              });
            } else {
              const app = oauthAppsMap.get(clientId)!;
              scopes.forEach(s => app.scopes.add(s));
              const eventTime = event.id?.time ? new Date(event.id.time) : new Date();
              if (eventTime > app.lastSeen) app.lastSeen = eventTime;
              if (eventTime < app.firstSeen) app.firstSeen = eventTime;
              if (appName && !app.displayText) app.displayText = appName;
              // Keep first authorizer (don't override)
            }
          }
        }
      }

      console.log(`  Discovered ${oauthAppsMap.size} unique OAuth applications`);

      // Debug: Show date range of captured events
      if (oauthAppsMap.size > 0) {
        const allDates = Array.from(oauthAppsMap.values()).map(app => app.firstSeen);
        const oldestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const newestDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        const daySpan = Math.floor((newestDate.getTime() - oldestDate.getTime()) / (24 * 60 * 60 * 1000));

        console.log(`  📅 Authorization date range: ${oldestDate.toISOString().split('T')[0]} to ${newestDate.toISOString().split('T')[0]} (${daySpan} days)`);
      }

      // Convert to result format with AI detection
      const apps = Array.from(oauthAppsMap.values()).map(app => {
        const displayText = app.displayText.toLowerCase();
        const clientId = app.clientId.toLowerCase();

        // Detect AI platforms
        let isAIPlatform = false;
        let platformName: string | undefined;

        if (displayText.includes('openai') || displayText.includes('chatgpt') || clientId.includes('openai')) {
          isAIPlatform = true;
          platformName = 'OpenAI / ChatGPT';
          console.log(`    ✓ AI PLATFORM DETECTED: ${app.displayText} (OpenAI/ChatGPT)`);
        } else if (displayText.includes('claude') || displayText.includes('anthropic')) {
          isAIPlatform = true;
          platformName = 'Claude (Anthropic)';
          console.log(`    ✓ AI PLATFORM DETECTED: ${app.displayText} (Claude)`);
        } else if (displayText.includes('gemini')) {
          isAIPlatform = true;
          platformName = 'Gemini (Google)';
          console.log(`    ✓ AI PLATFORM DETECTED: ${app.displayText} (Gemini)`);
        } else {
          console.log(`    - ${app.displayText}`);
        }

        return {
          clientId: app.clientId,
          displayText: app.displayText,
          scopes: Array.from(app.scopes),
          isAIPlatform,
          platformName,
          authorizedBy: app.authorizedBy,
          firstSeen: app.firstSeen,
          lastSeen: app.lastSeen
        };
      });

      console.log(`✅ OAuth app discovery via audit logs: ${apps.length} apps (${apps.filter(a => a.isAIPlatform).length} AI platforms)`);
      return apps;

    } catch (error: any) {
      console.error('Failed to get OAuth applications from audit logs:', error);

      // Check if it's a permission error
      if (error.message?.includes('auth') || error.message?.includes('permission')) {
        console.log('  ⚠ OAuth app discovery requires audit log permissions - skipping');
      }

      return [];
    }
  }

  /**
   * Get service account activity for automation detection
   */
  async getServiceAccountActivity(email: string, timeRange: DateRange): Promise<GoogleWorkspaceEvent[]> {
    try {
      await this.ensureAuthenticated();

      const auditLogs = await this.getAuditLogs({
        actorEmail: email,
        startTime: timeRange.startDate,
        endTime: timeRange.endDate,
        maxResults: 100
      });

      // Convert audit logs to GoogleWorkspaceEvent format
      const events: GoogleWorkspaceEvent[] = auditLogs.items.map((item: any) => ({
        eventId: item.id.uniqueQualifier,
        timestamp: new Date(item.id.time),
        userId: item.actor.email || email,
        userEmail: item.actor.email || email,
        eventType: this.mapEventType(item.events[0]?.name || 'unknown'),
        resourceId: item.id.customerId,
        resourceType: this.mapResourceType(item.events[0]?.name || 'unknown'),
        actionDetails: {
          action: item.events[0]?.name || 'unknown',
          resourceName: email,
          additionalMetadata: item.events[0]?.parameters || {}
        },
        ipAddress: item.ipAddress
      }));

      console.log(`Service account activity analysis completed for ${email}: ${events.length} events`);
      return events;
    } catch (error) {
      console.error(`Failed to get service account activity for ${email}:`, error);
      return [];
    }
  }

  /**
   * Ensure client is authenticated before API calls
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated || !this.credentials) {
      throw new Error('Google API client not authenticated. Call initialize() first.');
    }

    // Refresh tokens if needed
    const refreshed = await this.refreshTokensIfNeeded();
    if (!refreshed) {
      throw new Error('Failed to refresh Google OAuth tokens');
    }
  }

  /**
   * Map Google audit event names to our event types
   */
  private mapEventType(eventName: string): GoogleWorkspaceEvent['eventType'] {
    const eventNameLower = eventName.toLowerCase();
    
    if (eventNameLower.includes('create')) return 'file_create';
    if (eventNameLower.includes('edit') || eventNameLower.includes('update')) return 'file_edit';
    if (eventNameLower.includes('share')) return 'file_share';
    if (eventNameLower.includes('permission')) return 'permission_change';
    if (eventNameLower.includes('email') || eventNameLower.includes('mail')) return 'email_send';
    if (eventNameLower.includes('script')) return 'script_execution';
    
    return 'file_create'; // Default fallback
  }

  /**
   * Map Google audit event names to our resource types
   */
  private mapResourceType(eventName: string): GoogleWorkspaceEvent['resourceType'] {
    const eventNameLower = eventName.toLowerCase();
    
    if (eventNameLower.includes('folder')) return 'folder';
    if (eventNameLower.includes('email') || eventNameLower.includes('mail')) return 'email';
    if (eventNameLower.includes('script')) return 'script';
    if (eventNameLower.includes('permission')) return 'permission';
    
    return 'file'; // Default fallback
  }

  /**
   * Get current authentication status for debugging
   */
  getAuthenticationStatus(): { isAuthenticated: boolean; hasCredentials: boolean; credentialsValid: boolean } {
    return {
      isAuthenticated: this.isAuthenticated,
      hasCredentials: !!this.credentials,
      credentialsValid: !!this.credentials?.accessToken
    };
  }

  /**
   * Comprehensive Google Workspace automation discovery orchestration
   * Combines all detection methods for complete shadow AI visibility
   * BMAD P0 Priority: Revenue-enabling production API integration
   */
  async discoverAutomations(options?: {
    dateRange?: DateRange;
    includeAppsScript?: boolean;
    includeServiceAccounts?: boolean;
    includeEmailAutomation?: boolean;
    includeDriveActivity?: boolean;
  }): Promise<AutomationEvent[]> {
    try {
      console.log('🚀 Starting comprehensive Google Workspace automation discovery...');

      const startTime = Date.now();
      const automations: AutomationEvent[] = [];

      // Default to last 30 days for automation discovery
      const defaultRange: DateRange = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date()
      };

      const timeRange = options?.dateRange || defaultRange;
      const config = {
        includeAppsScript: options?.includeAppsScript !== false,
        includeServiceAccounts: options?.includeServiceAccounts !== false,
        includeEmailAutomation: options?.includeEmailAutomation !== false,
        includeDriveActivity: options?.includeDriveActivity !== false
      };

      console.log('🔍 Discovery configuration:', {
        timeRange: {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString()
        },
        ...config
      });

      // 1. Discover Apps Script automations (highest AI/automation risk)
      if (config.includeAppsScript) {
        try {
          console.log('📜 Discovering Apps Script projects...');
          const appsScriptProjects = await this.getAppsScriptProjects();

          for (const project of appsScriptProjects) {
            const automation: AutomationEvent = {
              id: `apps-script-${project.scriptId}`,
              name: project.title || `Apps Script Project ${project.scriptId.substring(0, 8)}`,
              type: 'workflow',
              platform: 'google',
              status: 'active',
              trigger: project.triggers.length > 0 ? 'event' : 'manual',
              actions: project.functions.map(f => f.name) || ['script_execution'],
              createdAt: project.createTime,
              lastTriggered: project.updateTime,
              lastModified: project.updateTime,
              riskLevel: this.calculateAppsScriptRisk(project),
              metadata: {
                scriptId: project.scriptId,
                description: project.description || `Apps Script: ${project.title}`,
                parentType: project.parentId ? 'BOUND' : 'STANDALONE',
                triggers: project.triggers.map(t => t.eventType || 'UNKNOWN'),
                functions: project.functions.map(f => f.name),
                permissions: project.permissions.map(p => this.mapScopeToPermission(p.scope)),
                aiEndpoints: this.detectAIEndpoints(project.functions.map(f => f.name)),
                riskFactors: this.generateAppsScriptRiskFactors(project)
              }
            };

            automations.push(automation);
          }

          console.log(`📜 Found ${appsScriptProjects.length} Apps Script projects`);
        } catch (error) {
          console.warn('Apps Script discovery failed:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // 2. Discover Service Account automations
      if (config.includeServiceAccounts) {
        try {
          console.log('🤖 Discovering Service Accounts...');
          const serviceAccounts = await this.getServiceAccounts();

          for (const sa of serviceAccounts) {
            const automation: AutomationEvent = {
              id: `service-account-${sa.uniqueId}`,
              name: sa.displayName || sa.email.split('@')[0] || 'Unknown Service Account',
              type: 'integration',
              platform: 'google',
              status: sa.disabledTime ? 'inactive' : 'active',
              trigger: 'api_key',
              actions: ['api_calls', 'data_access'],
              createdAt: sa.createTime,
              lastTriggered: new Date(), // Service accounts don't have last activity in basic info
              riskLevel: this.calculateServiceAccountRisk(sa),
              metadata: {
                email: sa.email,
                description: sa.description || `Service Account: ${sa.displayName}`,
                projectId: sa.projectId,
                keyCount: sa.keys.length,
                roles: sa.roles,
                hasAdminAccess: sa.riskAssessment.hasAdminAccess,
                riskFactors: this.generateServiceAccountRiskFactors(sa)
              }
            };

            automations.push(automation);
          }

          console.log(`🤖 Found ${serviceAccounts.length} Service Accounts`);
        } catch (error) {
          console.warn('Service Account discovery failed:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // 2.5. Discover OAuth Applications (CRITICAL for ChatGPT/OpenAI detection)
      try {
        console.log('🔐 Discovering OAuth applications...');
        const oauthApps = await this.getOAuthApplications();

        for (const app of oauthApps) {
          const automation: AutomationEvent = {
            id: `oauth-app-${app.clientId}`,
            name: app.displayText,
            type: 'integration',
            platform: 'google',
            status: 'active',
            trigger: 'oauth',
            actions: ['api_access', 'data_read'],
            permissions: app.scopes,
            createdAt: app.firstSeen,
            lastTriggered: app.lastSeen,
            riskLevel: app.isAIPlatform ? 'high' : 'medium',
            metadata: {
              clientId: app.clientId,
              scopes: app.scopes,
              scopeCount: app.scopes.length,
              isAIPlatform: app.isAIPlatform,
              platformName: app.platformName,
              authorizedBy: app.authorizedBy,
              firstAuthorization: app.firstSeen?.toISOString() || new Date().toISOString(),
              lastActivity: app.lastSeen?.toISOString() || new Date().toISOString(),
              authorizationAge: app.firstSeen ? Math.floor((Date.now() - app.firstSeen.getTime()) / (24 * 60 * 60 * 1000)) : 0,
              description: app.isAIPlatform
                ? `AI Platform Integration: ${app.platformName}`
                : 'Third-party OAuth application',
              detectionMethod: 'oauth_tokens_api',
              riskFactors: [
                ...(app.isAIPlatform ? [`AI platform integration: ${app.platformName}`] : []),
                `${app.scopes.length} OAuth scopes granted`,
                ...(app.scopes.some(s => s.includes('drive')) ? ['Google Drive access'] : []),
                ...(app.scopes.some(s => s.includes('gmail')) ? ['Gmail access'] : [])
              ]
            }
          };

          automations.push(automation);
        }

        console.log(`🔐 Found ${oauthApps.length} OAuth applications (${oauthApps.filter(a => a.isAIPlatform).length} AI platforms)`);
      } catch (error) {
        console.warn('OAuth app discovery failed:', error instanceof Error ? error.message : 'Unknown error');
      }

      // 3. Discover Email automations (filters, rules, etc.)
      if (config.includeEmailAutomation) {
        try {
          console.log('📧 Discovering Email automations...');
          const emailAutomations = await this.getEmailAutomation(timeRange);

          for (const email of emailAutomations) {
            const automation: AutomationEvent = {
              id: `email-automation-${email.filterId || email.forwardingRule || 'unknown'}`,
              name: email.description || 'Email Automation',
              type: 'workflow',
              platform: 'google',
              status: email.enabled ? 'active' : 'inactive',
              trigger: 'email_received',
              actions: ['email_processing', 'automation_trigger'],
              createdAt: email.createdDate,
              lastTriggered: email.lastActivity,
              riskLevel: email.automationType === 'forwarding' ? 'high' : 'medium',
              metadata: {
                description: `Email automation: ${email.automationType}`,
                automationType: email.automationType,
                externalDestinations: email.externalDestinations,
                riskFactors: email.riskFactors
              }
            };

            automations.push(automation);
          }

          console.log(`📧 Found ${emailAutomations.length} Email automations`);
        } catch (error) {
          console.warn('Email automation discovery failed:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      const executionTimeMs = Date.now() - startTime;

      console.log('✅ Google Workspace automation discovery completed:', {
        totalAutomations: automations.length,
        executionTimeMs,
        breakdown: {
          appsScript: automations.filter(a => a.id.startsWith('apps-script')).length,
          serviceAccounts: automations.filter(a => a.id.startsWith('service-account')).length,
          oauthApps: automations.filter(a => a.id.startsWith('oauth-app')).length,
          aiPlatforms: automations.filter(a => a.metadata?.isAIPlatform === true).length,
          emailAutomations: automations.filter(a => a.id.startsWith('email-automation')).length
        }
      });

      return automations;

    } catch (error) {
      console.error('Google Workspace automation discovery failed:', error);
      throw new Error(`Automation discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate Apps Script project risk level based on permissions and patterns
   */
  private calculateAppsScriptRisk(project: GoogleAppsScriptProject): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Check for AI-related patterns
    const aiPatterns = ['openai', 'chatgpt', 'claude', 'anthropic', 'gemini', 'ai', 'gpt'];
    const hasAIPatterns = project.functions.some(func =>
      aiPatterns.some(pattern => func.name.toLowerCase().includes(pattern))
    );
    if (hasAIPatterns) riskScore += 3;

    // Check for external URL permissions (potential AI API calls)
    if (project.permissions.some(perm => perm.scope.includes('external') || perm.scope.includes('url'))) {
      riskScore += 2;
    }

    // Check for broad data access permissions
    const sensitiveScopes = ['drive', 'sheets', 'docs', 'gmail', 'calendar'];
    const hasSensitiveAccess = project.permissions.some(perm =>
      sensitiveScopes.some(sensitive => perm.scope.includes(sensitive))
    );
    if (hasSensitiveAccess) riskScore += 2;

    // Check for automated triggers
    if (project.triggers.length > 0) riskScore += 1;

    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate Service Account risk level
   */
  private calculateServiceAccountRisk(sa: GoogleServiceAccountInfo): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Multiple keys increase attack surface
    if (sa.keys.length > 2) riskScore += 2;

    // Admin access is high risk
    if (sa.riskAssessment.hasAdminAccess) riskScore += 3;

    // Broad roles indicate high privileges
    const highRiskRoles = ['editor', 'owner', 'admin'];
    if (sa.roles.some(role => highRiskRoles.some(risk => role.includes(risk)))) {
      riskScore += 2;
    }

    // Third-party service account patterns
    const thirdPartyPatterns = ['automation', 'integration', 'bot', 'service'];
    if (thirdPartyPatterns.some(pattern => sa.email.includes(pattern))) {
      riskScore += 1;
    }

    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Map OAuth scope to readable permission
   */
  private mapScopeToPermission(scope: string): string {
    const scopeMap: Record<string, string> = {
      'https://www.googleapis.com/auth/drive': 'DRIVE_FULL',
      'https://www.googleapis.com/auth/drive.readonly': 'DRIVE_READ',
      'https://www.googleapis.com/auth/spreadsheets': 'SHEETS_FULL',
      'https://www.googleapis.com/auth/documents': 'DOCS_FULL',
      'https://www.googleapis.com/auth/gmail': 'GMAIL_FULL',
      'https://www.googleapis.com/auth/script.external_request': 'EXTERNAL_URL'
    };

    return scopeMap[scope] || scope.split('/').pop()?.toUpperCase() || 'UNKNOWN';
  }

  /**
   * Detect AI endpoints in Apps Script functions
   */
  private detectAIEndpoints(functions: string[]): string[] {
    const aiEndpoints: string[] = [];

    // Check function names for AI patterns
    const aiPatterns = [
      { pattern: /openai|chatgpt|gpt/i, endpoint: 'https://api.openai.com/v1/chat/completions' },
      { pattern: /claude|anthropic/i, endpoint: 'https://api.anthropic.com/v1/messages' },
      { pattern: /cohere/i, endpoint: 'https://api.cohere.ai/v1/generate' },
      { pattern: /gemini|bard/i, endpoint: 'https://generativelanguage.googleapis.com/v1/models' }
    ];

    for (const func of functions) {
      for (const { pattern, endpoint } of aiPatterns) {
        if (pattern.test(func)) {
          aiEndpoints.push(endpoint);
          break; // Only add one endpoint per function
        }
      }
    }

    return [...new Set(aiEndpoints)]; // Remove duplicates
  }

  /**
   * Generate Apps Script risk factors
   */
  private generateAppsScriptRiskFactors(project: GoogleAppsScriptProject): string[] {
    const riskFactors: string[] = [];

    // Check for AI patterns
    const hasAI = this.detectAIEndpoints(project.functions.map(f => f.name)).length > 0;
    if (hasAI) {
      riskFactors.push('Contains AI service integration patterns');
      riskFactors.push('Potential external API calls to AI providers');
    }

    // Check for sensitive permissions
    if (project.permissions.some(perm => perm.scope.includes('drive') || perm.scope.includes('sheets'))) {
      riskFactors.push('Has access to documents and spreadsheet data');
    }

    if (project.permissions.some(perm => perm.scope.includes('gmail'))) {
      riskFactors.push('Has email access permissions');
    }

    // Check for automation triggers
    if (project.triggers.length > 0) {
      riskFactors.push(`Automated execution via ${project.triggers.length} trigger(s)`);
      riskFactors.push('Processes data without direct human oversight');
    }

    // Check for external URL access
    if (project.permissions.some(perm => perm.scope.includes('external') || perm.scope.includes('url'))) {
      riskFactors.push('Can make external HTTP requests');
    }

    // Recent activity
    const daysSinceUpdate = Math.floor((Date.now() - project.updateTime.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceUpdate <= 7) {
      riskFactors.push('Recently active or modified');
    }

    return riskFactors;
  }

  /**
   * Generate Service Account risk factors
   */
  private generateServiceAccountRiskFactors(sa: GoogleServiceAccountInfo): string[] {
    const riskFactors: string[] = [];

    if (sa.keys.length > 2) {
      riskFactors.push(`Multiple API keys (${sa.keys.length}) increase attack surface`);
    }

    if (sa.riskAssessment.hasAdminAccess) {
      riskFactors.push('Has administrative access - elevated privileges detected');
    }

    const highRiskRoles = sa.roles.filter(role =>
      ['editor', 'owner', 'admin'].some(risk => role.includes(risk))
    );
    if (highRiskRoles.length > 0) {
      riskFactors.push(`High-privilege roles assigned: ${highRiskRoles.join(', ')}`);
    }

    // Check for third-party automation patterns
    const automationPatterns = ['automation', 'integration', 'bot', 'service', 'sync'];
    if (automationPatterns.some(pattern => sa.email.includes(pattern))) {
      riskFactors.push('Service account name suggests third-party automation use');
    }

    const daysSinceCreation = Math.floor((Date.now() - sa.createTime.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceCreation <= 30) {
      riskFactors.push('Recently created service account');
    }

    return riskFactors;
  }
}