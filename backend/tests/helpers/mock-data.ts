/**
 * Mock data generators and fixtures for testing
 * Provides realistic test data for comprehensive testing
 */

import crypto from 'crypto';
import {
  Platform,
  ConnectionStatus,
  OrganizationRecord,
  ConnectionRecord,
  AuditLogRecord,
  UUID,
  TokenInfo,
  OAuthConfiguration,
  PlatformConnection
} from '@singura/shared-types';

type CredentialType = 'access_token' | 'refresh_token' | 'api_key' | 'webhook_secret';

export class MockDataGenerator {
  /**
   * Generate mock organization data
   */
  static createMockOrganization(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
    const baseId = crypto.randomUUID();
    const timestamp = new Date();

    return {
      id: baseId as UUID,
      name: `Test Organization ${Math.floor(Math.random() * 1000)}`,
      domain: `test-${baseId.slice(0, 8)}.example.com`,
      slug: `test-org-${baseId.slice(0, 8)}`,
      plan_tier: 'enterprise',
      max_connections: 100,
      settings: { test: true, mockData: true },
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides
    };
  }

  /**
   * Generate mock platform connection data
   */
  static createMockPlatformConnection(
    organizationId: string, 
    overrides: Partial<ConnectionRecord> = {}
  ): ConnectionRecord {
    const connectionId = crypto.randomUUID();
    const timestamp = new Date();
    
    const platforms: Platform[] = ['slack', 'google', 'microsoft'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)] || 'slack';

    return {
      id: connectionId as UUID,
      organization_id: organizationId,
      platform_type: platform,
      platform_user_id: `${platform}-user-${Math.floor(Math.random() * 10000)}`,
      platform_workspace_id: this.getPlatformWorkspaceId(platform),
      display_name: `Test ${platform.charAt(0).toUpperCase() + platform.slice(1)} Connection`,
      status: 'connected',
      permissions_granted: { scopes: this.getMockPermissions(platform) },
      last_sync_at: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      last_error: undefined,
      expires_at: new Date(Date.now() + 3600000), // 1 hour from now
      metadata: this.getMockMetadata(platform),
      webhook_url: `https://hooks.saas-xray.com/webhook/${connectionId}`,
      webhook_secret_id: undefined,
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides
    };
  }

  /**
   * Generate mock encrypted credential data
   */
  static createMockEncryptedCredential(
    platformConnectionId: string, 
    credentialType: CredentialType,
    overrides: Partial<Record<string, unknown>> = {}
  ): Record<string, unknown> {
    const credentialId = crypto.randomUUID();
    const timestamp = new Date();

    return {
      id: credentialId,
      platform_connection_id: platformConnectionId,
      credential_type: credentialType,
      encrypted_value: `encrypted_${credentialType}_${crypto.randomBytes(16).toString('hex')}`,
      encryption_key_id: 'test-key-id',
      expires_at: credentialType === 'refresh_token' 
        ? new Date(Date.now() + 7 * 24 * 3600000) // 7 days
        : new Date(Date.now() + 3600000), // 1 hour
      metadata: { 
        test: true, 
        mockData: true,
        scope: this.getCredentialScope(credentialType)
      },
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides
    };
  }

  /**
   * Generate mock audit log entry
   */
  static createMockAuditLog(
    organizationId: string,
    platformConnectionId?: string,
    overrides: Partial<AuditLogRecord> = {}
  ): AuditLogRecord {
    const auditId = crypto.randomUUID();
    const eventTypes = [
      'platform_connection_created',
      'platform_connection_updated',
      'oauth_token_refreshed',
      'authentication_success',
      'authentication_failure',
      'security_violation'
    ];
    
    const eventCategories = ['auth', 'connection', 'sync', 'error', 'admin'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)] || 'platform_connection_created';
    const category = this.getCategoryForEvent(eventType);

    return {
      id: auditId as UUID,
      organization_id: organizationId,
      user_id: `user-${Math.floor(Math.random() * 1000)}`,
      action: eventType,
      resource_type: 'platform_connection',
      resource_id: platformConnectionId || crypto.randomUUID(),
      details: {
        test: true,
        mockData: true,
        timestamp: new Date().toISOString(),
        details: `Mock ${eventType} event`
      },
      ip_address: this.generateMockIP(),
      user_agent: this.generateMockUserAgent(),
      created_at: new Date(),
      ...overrides
    };
  }

  /**
   * Generate mock OAuth state
   */
  static createMockOAuthState(userId: string, platform: Platform): Record<string, unknown> {
    return {
      state: crypto.randomBytes(32).toString('hex'),
      userId,
      platform,
      timestamp: Date.now(),
      codeVerifier: crypto.randomBytes(32).toString('base64url'),
      codeChallenge: crypto.createHash('sha256')
        .update(crypto.randomBytes(32))
        .digest('base64url'),
      nonce: crypto.randomBytes(16).toString('hex')
    };
  }

  /**
   * Generate mock JWT payload
   */
  static createMockJWTPayload(userId: string, organizationId: string, permissions: string[] = []) {
    const now = Math.floor(Date.now() / 1000);
    
    return {
      sub: userId,
      iss: 'saas-xray-platform',
      aud: 'saas-xray-clients',
      iat: now,
      exp: now + 900, // 15 minutes
      nbf: now,
      jti: crypto.randomBytes(16).toString('hex'),
      type: 'access' as const,
      organizationId,
      permissions,
      sessionId: `sess_${crypto.randomBytes(16).toString('hex')}_${Date.now()}`
    };
  }

  /**
   * Get platform-specific workspace ID
   */
  private static getPlatformWorkspaceId(platform: Platform): string | undefined {
    switch (platform) {
      case 'slack':
        return `T${Math.floor(Math.random() * 1000000000)}`;
      case 'google':
        return 'example.com'; // Google Workspace domain
      case 'microsoft':
        return crypto.randomUUID(); // Microsoft tenant ID
      default:
        return undefined;
    }
  }

  /**
   * Generate mock platform-specific permissions
   */
  private static getMockPermissions(platform: Platform): string[] {
    const permissionMap = {
      slack: ['channels:read', 'users:read', 'chat:write', 'files:read'],
      google: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/gmail.readonly'],
      microsoft: ['https://graph.microsoft.com/User.Read', 'https://graph.microsoft.com/Files.Read'],
      github: ['repo', 'user'],
      atlassian: ['read:jira-work', 'read:jira-user'],
      notion: ['read_content', 'read_user_info']
    };

    return permissionMap[platform] || ['read'];
  }

  /**
   * Generate mock platform-specific metadata
   */
  private static getMockMetadata(platform: Platform): Record<string, unknown> {
    const metadataMap = {
      slack: {
        team_name: 'Test Team',
        team_domain: 'test-team',
        bot_user_id: `B${Math.floor(Math.random() * 1000000000)}`,
        app_id: `A${Math.floor(Math.random() * 1000000000)}`
      },
      google: {
        workspace_domain: 'test.example.com',
        admin_email: 'admin@test.example.com'
      },
      microsoft: {
        tenant_id: crypto.randomUUID(),
        tenant_name: 'Test Tenant'
      },
      github: {
        organization: 'test-org',
        username: 'test-user'
      },
      atlassian: {
        cloud_id: crypto.randomUUID(),
        site_url: 'https://test.atlassian.net'
      },
      notion: {
        workspace_name: 'Test Workspace',
        workspace_icon: '🚀'
      }
    };

    return {
      ...metadataMap[platform],
      test: true,
      mockData: true,
      connected_at: new Date().toISOString()
    };
  }

  /**
   * Get credential scope based on type
   */
  private static getCredentialScope(credentialType: CredentialType): string[] {
    const scopeMap = {
      access_token: ['read', 'write'],
      refresh_token: ['offline_access'],
      api_key: ['api_access'],
      webhook_secret: ['webhook']
    };

    return scopeMap[credentialType] || [];
  }

  /**
   * Get category for audit event type
   */
  private static getCategoryForEvent(eventType: string): string {
    if (eventType.includes('auth')) return 'auth';
    if (eventType.includes('connection')) return 'connection';
    if (eventType.includes('sync')) return 'sync';
    if (eventType.includes('security') || eventType.includes('violation')) return 'error';
    return 'admin';
  }

  /**
   * Generate mock IP address
   */
  private static generateMockIP(): string {
    return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  /**
   * Generate mock user agent
   */
  private static generateMockUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return agents[Math.floor(Math.random() * agents.length)] || agents[0];
  }

  /**
   * Generate batch of related test data
   */
  static createTestDataSet(orgCount: number = 1, connectionsPerOrg: number = 2) {
    const organizations = [];
    const connections = [];
    const credentials = [];
    const auditLogs = [];

    for (let i = 0; i < orgCount; i++) {
      const org = this.createMockOrganization();
      organizations.push(org);

      for (let j = 0; j < connectionsPerOrg; j++) {
        const connection = this.createMockPlatformConnection(org.id);
        connections.push(connection);

        // Create credentials for each connection
        const credTypes: CredentialType[] = ['access_token', 'refresh_token'];
        for (const credType of credTypes) {
          credentials.push(this.createMockEncryptedCredential(connection.id, credType));
        }

        // Create audit logs for connection
        auditLogs.push(this.createMockAuditLog(org.id, connection.id));
      }
    }

    return {
      organizations,
      connections,
      credentials,
      auditLogs
    };
  }

  /**
   * Generate mock Google OAuth credentials
   */
  static createMockGoogleOAuthCredentials(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      accessToken: `ya29.a0ARrdaM8x_mock_google_access_token_${crypto.randomBytes(16).toString('hex')}`,
      refreshToken: `1//04mock_google_refresh_token_${crypto.randomBytes(12).toString('hex')}`,
      tokenType: 'Bearer',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/script.projects.readonly'
      ],
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      idToken: `eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhZjc1YTQwOWU5MGY3MjE4OGYyZjU2YTA3NmZlNjZhMjMwOGJkMDAiLCJ0eXAiOiJKV1QifQ.mock_id_token_${crypto.randomBytes(8).toString('hex')}`,
      userId: `${Math.floor(Math.random() * 900000000) + 100000000}`, // 9-digit number
      email: `test.user${Math.floor(Math.random() * 1000)}@example.com`,
      domain: 'example.com',
      organizationId: `org-${crypto.randomBytes(8).toString('hex')}`,
      ...overrides
    };
  }

  /**
   * Generate mock Google Workspace user info
   */
  static createMockGoogleWorkspaceUserInfo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const userId = `${Math.floor(Math.random() * 900000000) + 100000000}`;
    const userNumber = Math.floor(Math.random() * 1000);
    
    return {
      id: userId,
      email: `test.user${userNumber}@example.com`,
      name: `Test User ${userNumber}`,
      domain: 'example.com',
      isAdmin: Math.random() > 0.7, // 30% chance of admin
      orgUnit: Math.random() > 0.5 ? '/Engineering' : '/Sales',
      lastLoginTime: new Date(Date.now() - Math.random() * 7 * 24 * 3600000), // Random time in last week
      ...overrides
    };
  }

  /**
   * Generate mock Google Apps Script project
   */
  static createMockGoogleAppsScriptProject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const scriptId = `AKfycbx_mock_script_${crypto.randomBytes(8).toString('hex')}`;
    const projectTypes = ['Expense Reports', 'Email Automation', 'Data Sync', 'Form Processing', 'Calendar Integration'];
    const projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
    
    return {
      scriptId,
      title: `${projectType} Automation`,
      description: `Automated ${projectType.toLowerCase()} processing script`,
      owner: `test.user${Math.floor(Math.random() * 100)}@example.com`,
      createdTime: new Date(Date.now() - Math.random() * 365 * 24 * 3600000), // Random time in last year
      lastModifiedTime: new Date(Date.now() - Math.random() * 30 * 24 * 3600000), // Random time in last month
      permissions: [
        {
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          description: 'Access to Google Sheets',
          riskLevel: 'medium',
          dataAccess: ['sheets', 'drive']
        },
        {
          scope: 'https://www.googleapis.com/auth/gmail.send',
          description: 'Send emails',
          riskLevel: 'high',
          dataAccess: ['gmail', 'contacts']
        }
      ],
      triggers: [
        {
          triggerId: `trigger_${crypto.randomBytes(6).toString('hex')}`,
          eventType: Math.random() > 0.5 ? 'ON_FORM_SUBMIT' : 'TIME_DRIVEN',
          functionName: 'processAutomation',
          enabled: Math.random() > 0.2, // 80% chance enabled
          lastRunTime: new Date(Date.now() - Math.random() * 7 * 24 * 3600000),
          frequency: Math.random() > 0.5 ? 'daily' : 'on_demand'
        }
      ],
      riskScore: Math.floor(Math.random() * 100),
      riskFactors: ['external_sharing', 'admin_permissions'].filter(() => Math.random() > 0.6),
      ...overrides
    };
  }

  /**
   * Generate mock Google Workspace discovery result
   */
  static createMockGoogleWorkspaceDiscoveryResult(
    scriptCount: number = 3,
    serviceAccountCount: number = 2
  ): Record<string, unknown> {
    const appsScriptProjects = Array.from({ length: scriptCount }, () => 
      this.createMockGoogleAppsScriptProject()
    );
    
    const serviceAccounts = Array.from({ length: serviceAccountCount }, (_, i) => ({
      uniqueId: `${Math.floor(Math.random() * 900000000) + 100000000}`,
      email: `automation-${i}@example-project.iam.gserviceaccount.com`,
      displayName: `Automation Service Account ${i + 1}`,
      description: `Service account for automated processes`,
      projectId: `example-project-${crypto.randomBytes(4).toString('hex')}`,
      createdTime: new Date(Date.now() - Math.random() * 365 * 24 * 3600000),
      keys: [
        {
          keyId: `key_${crypto.randomBytes(8).toString('hex')}`,
          keyType: 'USER_MANAGED',
          createdTime: new Date(Date.now() - Math.random() * 90 * 24 * 3600000),
          keyAlgorithm: 'RSA_2048'
        }
      ],
      permissions: ['https://www.googleapis.com/auth/admin.directory.user'],
      riskLevel: Math.random() > 0.5 ? 'high' : 'medium'
    }));

    const totalAutomations = scriptCount + serviceAccountCount;
    const riskDistribution = {
      low: Math.floor(totalAutomations * 0.2),
      medium: Math.floor(totalAutomations * 0.5),
      high: Math.floor(totalAutomations * 0.25),
      critical: Math.floor(totalAutomations * 0.05)
    };

    return {
      appsScriptProjects,
      driveAutomations: [], // Can be extended later
      serviceAccounts,
      totalAutomations,
      riskDistribution,
      discoveryMetadata: {
        scanStartTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        scanEndTime: new Date(),
        scopesUsed: [
          'https://www.googleapis.com/auth/script.projects.readonly',
          'https://www.googleapis.com/auth/admin.directory.user.readonly'
        ],
        apiCallsCount: Math.floor(Math.random() * 50) + 10, // 10-60 API calls
        errorsEncountered: []
      }
    };
  }

  /**
   * Generate mock Google OAuth raw response
   */
  static createMockGoogleOAuthRawResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      access_token: `ya29.a0ARrdaM8x_mock_google_access_token_${crypto.randomBytes(16).toString('hex')}`,
      refresh_token: `1//04mock_google_refresh_token_${crypto.randomBytes(12).toString('hex')}`,
      token_type: 'Bearer',
      expires_in: 3599,
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      id_token: `eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhZjc1YTQwOWU5MGY3MjE4OGYyZjU2YTA3NmZlNjZhMjMwOGJkMDAiLCJ0eXAiOiJKV1QifQ.mock_id_token_${crypto.randomBytes(8).toString('hex')}`,
      granted_scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      ...overrides
    };
  }

  /**
   * Generate mock Google workspace organization
   */
  static createMockGoogleWorkspaceOrganization(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      customerId: `C${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      domain: 'example.com',
      organizationName: 'Example Corporation',
      adminEmail: 'admin@example.com',
      userCount: Math.floor(Math.random() * 500) + 50, // 50-550 users
      serviceAccountsCount: Math.floor(Math.random() * 20) + 5, // 5-25 service accounts
      appsScriptProjectsCount: Math.floor(Math.random() * 15) + 3, // 3-18 scripts
      securitySettings: {
        twoFactorRequired: Math.random() > 0.3, // 70% chance enabled
        externalSharingEnabled: Math.random() > 0.6, // 40% chance enabled
        appsScriptEnabled: Math.random() > 0.1, // 90% chance enabled
        marketplaceInstallsAllowed: Math.random() > 0.5 // 50% chance allowed
      },
      ...overrides
    };
  }

  /**
   * Generate comprehensive Google OAuth test scenarios
   */
  static createGoogleOAuthTestScenarios() {
    return {
      validCredentials: this.createMockGoogleOAuthCredentials(),
      expiredCredentials: this.createMockGoogleOAuthCredentials({
        expiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
      }),
      personalAccount: this.createMockGoogleOAuthCredentials({
        domain: undefined, // Personal accounts don't have workspace domain
        email: 'personal.user@gmail.com'
      }),
      workspaceAdmin: this.createMockGoogleWorkspaceUserInfo({
        isAdmin: true,
        orgUnit: '/',
        email: 'admin@example.com'
      }),
      workspaceUser: this.createMockGoogleWorkspaceUserInfo({
        isAdmin: false,
        orgUnit: '/Engineering',
        email: 'developer@example.com'
      }),
      highRiskScript: this.createMockGoogleAppsScriptProject({
        riskScore: 95,
        riskFactors: ['external_sharing', 'admin_permissions', 'frequent_execution', 'sensitive_data_access'],
        permissions: [
          {
            scope: 'https://www.googleapis.com/auth/admin.directory.user',
            description: 'Manage users in domain',
            riskLevel: 'critical',
            dataAccess: ['users', 'admin', 'directory']
          }
        ]
      }),
      oauthErrors: {
        accessDenied: {
          error: 'access_denied',
          error_description: 'The user denied the request',
          error_uri: 'https://developers.google.com/identity/protocols/oauth2/web-server#errorhandling'
        },
        invalidGrant: {
          error: 'invalid_grant',
          error_description: 'Bad Request'
        },
        invalidClient: {
          error: 'invalid_client',
          error_description: 'The OAuth client was not found.'
        }
      },
      discoveryResults: {
        smallOrganization: this.createMockGoogleWorkspaceDiscoveryResult(2, 1),
        mediumOrganization: this.createMockGoogleWorkspaceDiscoveryResult(8, 4),
        largeOrganization: this.createMockGoogleWorkspaceDiscoveryResult(25, 12)
      }
    };
  }

  /**
   * Generate security test scenarios
   */
  static createSecurityTestScenarios() {
    return {
      sqlInjectionAttempts: [
        "'; DROP TABLE organizations; --",
        "' OR '1'='1",
        "1; DELETE FROM platform_connections; --",
        "' UNION SELECT * FROM encrypted_credentials --"
      ],
      xssAttempts: [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">'
      ],
      invalidTokens: [
        'invalid.jwt.token',
        '',
        'Bearer invalid-token',
        crypto.randomBytes(32).toString('hex')
      ],
      maliciousInputs: [
        '../../../etc/passwd',
        '${7*7}',
        '{{7*7}}',
        '\x00\x01\x02\x03'
      ]
    };
  }
}