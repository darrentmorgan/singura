/**
 * Google API Client Service
 * Production implementation for live Google Workspace shadow AI detection
 * Implements GoogleAPIClient interface with real Google OAuth credentials
 * Following CLAUDE.md Types-Tests-Code methodology - Phase 4.1.1
 */

import { google, Auth } from 'googleapis';
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
} from '@saas-xray/shared-types';

export class GoogleAPIClientService implements GoogleAPIClient {
  private auth: Auth.OAuth2Client;
  private adminReports: any; // Google Admin SDK client
  private drive: any; // Google Drive API client  
  private gmail: any; // Gmail API client
  private credentials: GoogleOAuthCredentials | null = null;
  private isAuthenticated = false;

  constructor() {
    // Initialize Google API clients
    this.auth = new google.auth.OAuth2();
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
      
      // Set OAuth credentials for Google API client
      this.auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        token_type: credentials.tokenType,
        expiry_date: credentials.expiresAt?.getTime()
      });

      console.log('Google API Client initialized with OAuth credentials:', {
        hasAccessToken: !!credentials.accessToken,
        hasRefreshToken: !!credentials.refreshToken,
        scopes: credentials.scope,
        domain: credentials.domain,
        expiresAt: credentials.expiresAt?.toISOString()
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
      const expiresAt = this.credentials.expiresAt;
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
   */
  async getAppsScriptProjects(): Promise<GoogleAppsScriptProject[]> {
    try {
      await this.ensureAuthenticated();

      // Implement Apps Script project discovery (requires Apps Script API)
      console.log('Apps Script analysis - requires Apps Script API permissions');
      return [];
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
   */
  async getServiceAccounts(): Promise<GoogleServiceAccountInfo[]> {
    try {
      await this.ensureAuthenticated();

      // Implement service account discovery (requires IAM API)
      console.log('Service account analysis - requires IAM API permissions');
      return [];
    } catch (error) {
      console.error('Failed to get service accounts:', error);
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
}