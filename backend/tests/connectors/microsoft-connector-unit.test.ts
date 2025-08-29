import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { microsoftConnector } from '../../src/connectors/microsoft';
import { OAuthCredentials } from '../../src/connectors/types';

// Mock external dependencies
jest.mock('@microsoft/microsoft-graph-client');
jest.mock('../../src/database/pool', () => ({
  db: {
    query: jest.fn(),
    end: jest.fn()
  }
}));
jest.mock('../../src/database/repositories/encrypted-credential', () => ({
  encryptedCredentialRepository: {
    getDecryptedValue: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByConnectionId: jest.fn()
  }
}));
jest.mock('../../src/services/oauth-service', () => ({
  oauthService: {
    validateToken: jest.fn(),
    refreshToken: jest.fn()
  }
}));
jest.mock('../../src/security/audit', () => ({
  securityAuditService: {
    logEvent: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

// Mock the Microsoft Graph API
const mockGraphRequest = jest.fn() as jest.MockedFunction<any>;

// Set up Microsoft Graph mock
const MockGraphClient = {
  api: jest.fn(() => ({
    get: mockGraphRequest,
    post: mockGraphRequest,
    select: jest.fn().mockReturnThis(),
    expand: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    top: jest.fn().mockReturnThis()
  }))
};

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: jest.fn(() => MockGraphClient)
  },
  AuthenticationProvider: jest.fn()
}));

describe('Microsoft Connector - Unit Tests', () => {
  let mockCredentials: OAuthCredentials;

  beforeEach(() => {
    mockCredentials = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      tokenType: 'Bearer',
      scope: 'User.Read Application.Read.All'
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      // Mock successful Microsoft Graph user response
      mockGraphRequest.mockResolvedValueOnce({
        id: 'user-12345',
        displayName: 'Test User',
        userPrincipalName: 'test@company.com',
        mail: 'test@company.com',
        jobTitle: 'Developer'
      });

      const result = await microsoftConnector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe('user-12345');
      expect(result.displayName).toContain('Test User');
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock Graph API failure
      mockGraphRequest.mockRejectedValueOnce(
        new Error('Invalid access token')
      );

      const result = await microsoftConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid access token');
    });

    it('should handle network errors during authentication', async () => {
      // Mock network error
      mockGraphRequest.mockRejectedValueOnce(
        new Error('Network connection failed')
      );

      const result = await microsoftConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
    });
  });

  describe('Automation Discovery', () => {
    beforeEach(async () => {
      // Setup authenticated state
      mockGraphRequest.mockResolvedValueOnce({
        id: 'user-12345',
        displayName: 'Test User',
        userPrincipalName: 'test@company.com',
        mail: 'test@company.com',
        jobTitle: 'Developer'
      });
      await microsoftConnector.authenticate(mockCredentials);
    });

    it('should discover Azure App Registrations successfully', async () => {
      const mockAzureApps = [
        {
          id: 'app-12345',
          appId: 'client-12345',
          displayName: 'Custom Integration App',
          createdDateTime: '2023-01-15T10:00:00Z',
          signInAudience: 'AzureADMyOrg',
          publisherDomain: 'company.com',
          homepage: 'https://app.company.com',
          keyCredentials: [],
          passwordCredentials: [{}]
        }
      ];

      mockGraphRequest
        .mockResolvedValueOnce({ value: mockAzureApps }) // /applications
        .mockResolvedValueOnce({ value: [] }) // /me/teamwork/installedApps
        .mockResolvedValueOnce({ value: [] }); // /sites

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toHaveLength(1);
      expect(automations[0]).toMatchObject({
        id: expect.stringContaining('microsoft-app-app-12345'),
        name: 'Custom Integration App',
        type: 'integration',
        platform: 'microsoft',
        status: 'active',
        trigger: 'api_call',
        metadata: expect.objectContaining({
          appId: 'client-12345',
          signInAudience: 'AzureADMyOrg',
          publisherDomain: 'company.com',
          passwordCredentials: 1
        })
      });
    });

    it('should discover Microsoft Teams apps', async () => {
      const mockTeamsApps = [
        {
          id: 'install-123',
          teamsApp: {
            id: 'teams-app-456',
            displayName: 'Custom Teams Bot',
            distributionMethod: 'sideloaded',
            externalId: 'bot-external-id'
          }
        }
      ];

      mockGraphRequest
        .mockResolvedValueOnce({ value: [] }) // /applications
        .mockResolvedValueOnce({ value: mockTeamsApps }) // /me/teamwork/installedApps
        .mockResolvedValueOnce({ value: [] }); // /sites

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toHaveLength(1);
      expect(automations[0]).toMatchObject({
        id: expect.stringContaining('microsoft-teams-app-teams-app-456'),
        name: 'Custom Teams Bot',
        type: 'integration',
        platform: 'microsoft',
        status: 'active',
        trigger: 'message',
        metadata: expect.objectContaining({
          teamsAppId: 'teams-app-456',
          distributionMethod: 'sideloaded',
          externalId: 'bot-external-id'
        })
      });
    });

    it('should discover SharePoint workflows', async () => {
      const mockSites = [
        {
          id: 'site-123',
          displayName: 'HR Site',
          webUrl: 'https://company.sharepoint.com/sites/hr'
        }
      ];

      const mockLists = [
        {
          id: 'list-456',
          displayName: 'Workflow Tasks',
          createdDateTime: '2023-04-05T16:20:00Z',
          template: 'genericList'
        }
      ];

      mockGraphRequest
        .mockResolvedValueOnce({ value: [] }) // /applications
        .mockResolvedValueOnce({ value: [] }) // /me/teamwork/installedApps
        .mockResolvedValueOnce({ value: mockSites }) // /sites
        .mockResolvedValueOnce({ value: mockLists }); // /sites/{id}/lists

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toHaveLength(1);
      expect(automations[0]).toMatchObject({
        id: expect.stringContaining('microsoft-sharepoint-workflow-list-456'),
        name: 'SharePoint: Workflow Tasks',
        type: 'workflow',
        platform: 'microsoft',
        status: 'active',
        trigger: 'item_change',
        metadata: expect.objectContaining({
          listId: 'list-456',
          siteId: 'site-123',
          siteName: 'HR Site',
          listTemplate: 'genericList'
        })
      });
    });

    it('should handle API errors during discovery gracefully', async () => {
      mockGraphRequest.mockRejectedValue(new Error('API quota exceeded'));

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toEqual([]);
    });

    it('should handle empty automation lists', async () => {
      mockGraphRequest
        .mockResolvedValue({ value: [] })
        .mockResolvedValue({ value: [] })
        .mockResolvedValue({ value: [] })
        .mockResolvedValue({ value: [] });

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toEqual([]);
    });
  });

  describe('Audit Log Retrieval', () => {
    beforeEach(async () => {
      mockGraphRequest.mockResolvedValueOnce({
        id: 'user-12345',
        displayName: 'Test User',
        userPrincipalName: 'test@company.com'
      });
      await microsoftConnector.authenticate(mockCredentials);
    });

    it('should retrieve audit logs successfully', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          activityDateTime: '2023-12-01T10:00:00Z',
          activityDisplayName: 'Add application',
          category: 'ApplicationManagement',
          correlationId: 'corr-123',
          result: 'success',
          resultReason: '',
          initiatedBy: {
            user: {
              userPrincipalName: 'admin@company.com',
              displayName: 'Admin User'
            }
          },
          targetResources: [
            {
              id: 'app-456',
              displayName: 'New Integration App',
              type: 'Application'
            }
          ],
          additionalDetails: [
            {
              key: 'AppId',
              value: 'app-456'
            }
          ]
        }
      ];

      mockGraphRequest.mockResolvedValue({ value: mockAuditLogs });

      const since = new Date('2023-12-01T00:00:00Z');
      const logs = await microsoftConnector.getAuditLogs(since);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        id: 'audit-1',
        timestamp: new Date('2023-12-01T10:00:00Z'),
        actorId: 'admin@company.com',
        actorType: 'user',
        actionType: 'Add application',
        resourceType: 'Application',
        resourceId: 'app-456',
        details: expect.objectContaining({
          category: 'ApplicationManagement',
          correlationId: 'corr-123',
          result: 'success'
        })
      });
    });

    it('should filter audit logs by date correctly', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-old',
          createdDateTime: '2023-11-01T10:00:00Z',
          activityDisplayName: 'Old activity',
          initiatedBy: { user: { userPrincipalName: 'user@company.com' } },
          targetResources: [{ displayName: 'Resource' }],
          result: 'success'
        }
      ];

      mockGraphRequest.mockResolvedValue({ value: mockAuditLogs });

      const since = new Date('2023-12-01T00:00:00Z');
      const logs = await microsoftConnector.getAuditLogs(since);

      expect(mockGraphRequest).toHaveBeenCalledWith(
        expect.stringContaining("createdDateTime ge 2023-12-01T00:00:00.000Z")
      );
    });

    it('should handle audit log API errors gracefully', async () => {
      mockGraphRequest.mockRejectedValue(new Error('Insufficient permissions'));

      const since = new Date('2023-12-01T00:00:00Z');
      const logs = await microsoftConnector.getAuditLogs(since);

      expect(logs).toEqual([]);
    });
  });

  describe('Permission Validation', () => {
    beforeEach(async () => {
      await microsoftConnector.authenticate(mockCredentials);
    });

    it('should validate all required permissions are present', async () => {
      // Mock successful permission checks
      mockGraphRequest
        .mockResolvedValueOnce({ value: [{ displayName: 'Test User' }] }) // User.Read.All
        .mockResolvedValueOnce({ value: [{ id: 'app-1' }] }) // Application.Read.All
        .mockResolvedValueOnce({ value: [{ id: 'audit-1' }] }) // AuditLog.Read.All
        .mockResolvedValueOnce({ value: [{ id: 'dir-1' }] }); // Directory.Read.All

      const validation = await microsoftConnector.validatePermissions();

      expect(validation.isValid).toBe(true);
      expect(validation.permissions).toEqual(
        expect.arrayContaining([
          'User.Read.All',
          'Application.Read.All',
          'AuditLog.Read.All',
          'Directory.Read.All'
        ])
      );
      expect(validation.missingPermissions).toEqual([]);
      expect(validation.errors).toEqual([]);
    });

    it('should identify missing permissions correctly', async () => {
      // Mock permission failures
      mockGraphRequest
        .mockResolvedValueOnce({ value: [{ displayName: 'Test User' }] }) // User.Read.All - OK
        .mockRejectedValueOnce(new Error('Forbidden')) // Application.Read.All - Missing
        .mockResolvedValueOnce({ value: [{ id: 'audit-1' }] }) // AuditLog.Read.All - OK
        .mockRejectedValueOnce(new Error('Insufficient privileges')); // Directory.Read.All - Missing

      const validation = await microsoftConnector.validatePermissions();

      expect(validation.isValid).toBe(false);
      expect(validation.permissions).toEqual(['User.Read.All', 'AuditLog.Read.All']);
      expect(validation.missingPermissions).toEqual(['Application.Read.All', 'Directory.Read.All']);
      expect(validation.errors).toHaveLength(2);
    });

    it('should handle network errors during permission validation', async () => {
      mockGraphRequest.mockRejectedValue(new Error('Network timeout'));

      const validation = await microsoftConnector.validatePermissions();

      expect(validation.isValid).toBe(false);
      expect(validation.permissions).toEqual([]);
      expect(validation.missingPermissions).toEqual([
        'User.Read.All',
        'Application.Read.All',
        'AuditLog.Read.All',
        'Directory.Read.All'
      ]);
    });
  });

  describe('Permission Validation', () => {
    beforeEach(async () => {
      mockGraphRequest.mockResolvedValueOnce({
        id: 'user-12345',
        displayName: 'Test User',
        userPrincipalName: 'test@company.com'
      });
      await microsoftConnector.authenticate(mockCredentials);
    });

    it('should validate permissions successfully', async () => {
      // Mock successful responses for permission tests
      mockGraphRequest
        .mockResolvedValueOnce({ // /me call for basic validation
          id: 'user-12345',
          displayName: 'Test User',
          userPrincipalName: 'test@company.com'
        })
        .mockResolvedValueOnce({ // /me call for testPermissions User.Read test
          id: 'user-12345',
          displayName: 'Test User'
        })
        .mockResolvedValueOnce({ // /users call for Directory.Read.All test
          value: [{ id: 'user-789' }]
        })
        .mockResolvedValueOnce({ // /applications call for Application.Read.All test
          value: [{ id: 'app-123' }]
        });

      const validation = await microsoftConnector.validatePermissions();

      expect(validation.isValid).toBe(true);
      expect(validation.permissions).toEqual(['User.Read']);
      expect(validation.missingPermissions).toEqual([]);
      expect(validation.errors).toEqual([]);
    });

    it('should identify missing permissions', async () => {
      // Mock partial failures
      mockGraphRequest
        .mockResolvedValueOnce({ // /me call for basic validation
          id: 'user-12345',
          displayName: 'Test User',
          userPrincipalName: 'test@company.com'
        })
        .mockResolvedValueOnce({ // /me call for User.Read test - success
          id: 'user-12345'
        })
        .mockRejectedValueOnce(new Error('Forbidden')) // /users call - no Directory.Read.All
        .mockRejectedValueOnce(new Error('Insufficient privileges')); // /applications call - no Application.Read.All

      const validation = await microsoftConnector.validatePermissions();

      expect(validation.isValid).toBe(false);
      expect(validation.permissions).toEqual(['User.Read']);
      expect(validation.missingPermissions).toContain('Directory.Read.All');
      expect(validation.missingPermissions).toContain('Application.Read.All');
      expect(validation.errors).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication failures gracefully', async () => {
      // Mock authentication failure
      mockGraphRequest.mockRejectedValue(new Error('Invalid token'));

      const result = await microsoftConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should handle discovery errors gracefully', async () => {
      // Setup authenticated state first
      mockGraphRequest.mockResolvedValueOnce({
        id: 'user-12345',
        displayName: 'Test User',
        userPrincipalName: 'test@company.com'
      });
      await microsoftConnector.authenticate(mockCredentials);

      // Mock discovery failure
      mockGraphRequest.mockRejectedValue(new Error('API quota exceeded'));

      await expect(microsoftConnector.discoverAutomations()).rejects.toThrow('Failed to discover Microsoft 365 automations');
    });

    it('should handle audit log errors gracefully', async () => {
      // Setup authenticated state first
      mockGraphRequest.mockResolvedValueOnce({
        id: 'user-12345',
        displayName: 'Test User',
        userPrincipalName: 'test@company.com'
      });
      await microsoftConnector.authenticate(mockCredentials);

      // Mock audit log failure
      mockGraphRequest.mockRejectedValue(new Error('Insufficient permissions'));

      const logs = await microsoftConnector.getAuditLogs(new Date());
      expect(logs).toEqual([]);
    });
  });
});