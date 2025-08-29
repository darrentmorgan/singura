/**
 * Mock data generators and fixtures for testing
 * Provides realistic test data for comprehensive testing
 */

import crypto from 'crypto';
import { PlatformType, ConnectionStatus, CredentialType } from '../../src/types/database';

export class MockDataGenerator {
  /**
   * Generate mock organization data
   */
  static createMockOrganization(overrides: Partial<any> = {}) {
    const baseId = crypto.randomUUID();
    const timestamp = new Date();

    return {
      id: baseId,
      name: `Test Organization ${Math.floor(Math.random() * 1000)}`,
      domain: `test-${baseId.slice(0, 8)}.example.com`,
      slug: `test-org-${baseId.slice(0, 8)}`,
      settings: { test: true, mockData: true },
      is_active: true,
      plan_tier: 'enterprise',
      max_connections: 100,
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides
    };
  }

  /**
   * Generate mock platform connection data
   */
  static createMockPlatformConnection(organizationId: string, overrides: Partial<any> = {}) {
    const connectionId = crypto.randomUUID();
    const timestamp = new Date();
    
    const platforms: PlatformType[] = ['slack', 'google', 'microsoft'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    return {
      id: connectionId,
      organization_id: organizationId,
      platform_type: platform,
      platform_user_id: `${platform}-user-${Math.floor(Math.random() * 10000)}`,
      platform_workspace_id: platform === 'slack' ? `T${Math.floor(Math.random() * 1000000000)}` : null,
      display_name: `Test ${platform.charAt(0).toUpperCase() + platform.slice(1)} Connection`,
      status: 'active' as ConnectionStatus,
      permissions_granted: this.getMockPermissions(platform),
      last_sync_at: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      last_error: null,
      expires_at: new Date(Date.now() + 3600000), // 1 hour from now
      metadata: this.getMockMetadata(platform),
      webhook_url: `https://hooks.saas-xray.com/webhook/${connectionId}`,
      webhook_secret_id: null,
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
    overrides: Partial<any> = {}
  ) {
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
    overrides: Partial<any> = {}
  ) {
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
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const category = this.getCategoryForEvent(eventType);

    return {
      id: auditId,
      organization_id: organizationId,
      platform_connection_id: platformConnectionId || null,
      event_type: eventType,
      event_category: category,
      actor_id: `user-${Math.floor(Math.random() * 1000)}`,
      actor_type: 'user',
      resource_type: 'platform_connection',
      resource_id: platformConnectionId || crypto.randomUUID(),
      event_data: {
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
  static createMockOAuthState(userId: string, platform: PlatformType) {
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
   * Generate mock platform-specific permissions
   */
  private static getMockPermissions(platform: PlatformType): string[] {
    const permissionMap = {
      slack: ['channels:read', 'users:read', 'chat:write', 'files:read'],
      google: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/gmail.readonly'],
      microsoft: ['https://graph.microsoft.com/User.Read', 'https://graph.microsoft.com/Files.Read'],
      hubspot: ['contacts', 'companies', 'deals'],
      salesforce: ['api', 'full', 'refresh_token'],
      notion: ['read_content', 'read_user_info'],
      asana: ['default'],
      jira: ['read:jira-work', 'read:jira-user']
    };

    return permissionMap[platform] || ['read'];
  }

  /**
   * Generate mock platform-specific metadata
   */
  private static getMockMetadata(platform: PlatformType): Record<string, any> {
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
      hubspot: {
        portal_id: Math.floor(Math.random() * 10000000),
        hub_domain: 'test-hub'
      },
      salesforce: {
        instance_url: 'https://test.my.salesforce.com',
        organization_id: crypto.randomUUID().replace(/-/g, '').slice(0, 15)
      },
      notion: {
        workspace_name: 'Test Workspace',
        workspace_icon: '🚀'
      },
      asana: {
        workspace_gid: Math.floor(Math.random() * 1000000000).toString(),
        workspace_name: 'Test Workspace'
      },
      jira: {
        cloud_id: crypto.randomUUID(),
        site_url: 'https://test.atlassian.net'
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
    return agents[Math.floor(Math.random() * agents.length)];
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