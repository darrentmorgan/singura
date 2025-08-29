import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { microsoftConnector, MicrosoftCredentials } from '../../src/connectors/microsoft';

// Mock the Microsoft Graph API
const mockGraphRequest = jest.fn();
jest.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenSilent: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      expiresOn: new Date(Date.now() + 3600000)
    }),
    acquireTokenByClientCredential: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      expiresOn: new Date(Date.now() + 3600000)
    })
  }))
}));

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: jest.fn(() => ({
      api: jest.fn(() => ({
        get: mockGraphRequest,
        post: mockGraphRequest,
        select: jest.fn().mockReturnThis(),
        expand: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        top: jest.fn().mockReturnThis()
      }))
    }))
  },
  AuthenticationProvider: jest.fn()
}));

describe('Microsoft Connector', () => {
  let mockCredentials: MicrosoftCredentials;

  beforeEach(() => {
    mockCredentials = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
      redirectUri: 'http://localhost:3001/auth/microsoft/callback'
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const result = await microsoftConnector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.connection).toBeDefined();
      expect(result.connection?.platform).toBe('microsoft');
    });

    it('should handle authentication errors gracefully', async () => {
      const invalidCredentials = {
        ...mockCredentials,
        clientSecret: ''
      };

      const result = await microsoftConnector.authenticate(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should handle network errors during authentication', async () => {
      // Mock network error
      const originalAcquireToken = jest.fn().mockRejectedValue(
        new Error('Network connection failed')
      );
      
      jest.doMock('@azure/msal-node', () => ({
        ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
          acquireTokenByClientCredential: originalAcquireToken
        }))
      }));

      const result = await microsoftConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });

  describe('Automation Discovery', () => {
    beforeEach(async () => {
      // Setup authenticated state
      await microsoftConnector.authenticate(mockCredentials);
    });

    it('should discover Power Platform apps successfully', async () => {
      const mockPowerApps = [
        {
          name: 'HR Onboarding Flow',
          properties: {
            displayName: 'HR Onboarding Flow',
            createdTime: '2023-01-15T10:00:00Z',
            environment: {
              name: 'Default-12345'
            },
            creator: {
              userPrincipalName: 'admin@company.com'
            }
          }
        },
        {
          name: 'Invoice Processing Bot',
          properties: {
            displayName: 'Invoice Processing Bot',
            createdTime: '2023-02-01T14:30:00Z',
            environment: {
              name: 'Production-67890'
            },
            creator: {
              userPrincipalName: 'finance@company.com'
            }
          }
        }
      ];

      mockGraphRequest
        .mockResolvedValueOnce({ value: mockPowerApps }) // Power Automate flows
        .mockResolvedValueOnce({ value: [] }) // Power Apps
        .mockResolvedValueOnce({ value: [] }) // Azure Logic Apps
        .mockResolvedValueOnce({ value: [] }); // Graph API applications

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toHaveLength(2);
      expect(automations[0]).toMatchObject({
        id: expect.any(String),
        name: 'HR Onboarding Flow',
        type: 'power_automate',
        platform: 'microsoft',
        createdAt: new Date('2023-01-15T10:00:00Z'),
        creator: 'admin@company.com',
        environment: 'Default-12345'
      });
      expect(automations[1]).toMatchObject({
        id: expect.any(String),
        name: 'Invoice Processing Bot',
        type: 'power_automate',
        platform: 'microsoft',
        createdAt: new Date('2023-02-01T14:30:00Z'),
        creator: 'finance@company.com',
        environment: 'Production-67890'
      });
    });

    it('should discover Azure Logic Apps', async () => {
      const mockLogicApps = [
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/workflows/data-sync',
          name: 'data-sync',
          type: 'Microsoft.Logic/workflows',
          location: 'East US',
          properties: {
            createdTime: '2023-03-10T09:15:00Z',
            state: 'Enabled',
            definition: {
              $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
            }
          }
        }
      ];

      mockGraphRequest
        .mockResolvedValueOnce({ value: [] }) // Power Automate flows
        .mockResolvedValueOnce({ value: [] }) // Power Apps
        .mockResolvedValueOnce({ value: mockLogicApps }) // Azure Logic Apps
        .mockResolvedValueOnce({ value: [] }); // Graph API applications

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toHaveLength(1);
      expect(automations[0]).toMatchObject({
        id: expect.any(String),
        name: 'data-sync',
        type: 'logic_app',
        platform: 'microsoft',
        createdAt: new Date('2023-03-10T09:15:00Z'),
        location: 'East US',
        state: 'Enabled'
      });
    });

    it('should discover registered Graph API applications', async () => {
      const mockGraphApps = [
        {
          id: 'app-12345',
          appId: 'client-12345',
          displayName: 'Custom Integration App',
          createdDateTime: '2023-04-05T16:20:00Z',
          requiredResourceAccess: [
            {
              resourceAppId: '00000003-0000-0000-c000-000000000000', // Microsoft Graph
              resourceAccess: [
                {
                  id: '1bfefb4e-e0b5-418b-a88f-73c46d2cc8e9',
                  type: 'Role'
                }
              ]
            }
          ]
        }
      ];

      mockGraphRequest
        .mockResolvedValueOnce({ value: [] }) // Power Automate flows
        .mockResolvedValueOnce({ value: [] }) // Power Apps
        .mockResolvedValueOnce({ value: [] }) // Azure Logic Apps
        .mockResolvedValueOnce({ value: mockGraphApps }); // Graph API applications

      const automations = await microsoftConnector.discoverAutomations();

      expect(automations).toHaveLength(1);
      expect(automations[0]).toMatchObject({
        id: expect.any(String),
        name: 'Custom Integration App',
        type: 'graph_application',
        platform: 'microsoft',
        createdAt: new Date('2023-04-05T16:20:00Z'),
        appId: 'client-12345',
        permissions: expect.arrayContaining([
          expect.stringContaining('Microsoft Graph')
        ])
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
      await microsoftConnector.authenticate(mockCredentials);
    });

    it('should retrieve audit logs successfully', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          createdDateTime: '2023-12-01T10:00:00Z',
          activityDisplayName: 'Power Automate flow created',
          initiatedBy: {
            user: {
              userPrincipalName: 'admin@company.com',
              displayName: 'Admin User'
            }
          },
          targetResources: [
            {
              displayName: 'New Automation Flow',
              type: 'Flow'
            }
          ],
          result: 'success',
          additionalDetails: [
            {
              key: 'FlowId',
              value: 'flow-12345'
            }
          ]
        },
        {
          id: 'audit-2',
          createdDateTime: '2023-12-01T11:30:00Z',
          activityDisplayName: 'Application permission granted',
          initiatedBy: {
            user: {
              userPrincipalName: 'security@company.com',
              displayName: 'Security Admin'
            }
          },
          targetResources: [
            {
              displayName: 'Integration App',
              type: 'Application'
            }
          ],
          result: 'success'
        }
      ];

      mockGraphRequest.mockResolvedValue({ value: mockAuditLogs });

      const since = new Date('2023-12-01T00:00:00Z');
      const logs = await microsoftConnector.getAuditLogs(since);

      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        id: 'audit-1',
        timestamp: new Date('2023-12-01T10:00:00Z'),
        action: 'Power Automate flow created',
        actor: 'admin@company.com',
        target: 'New Automation Flow',
        result: 'success',
        details: expect.objectContaining({
          FlowId: 'flow-12345'
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

  describe('Risk Assessment', () => {
    beforeEach(async () => {
      await microsoftConnector.authenticate(mockCredentials);
    });

    it('should calculate high risk for automation with sensitive permissions', async () => {
      const automation = {
        id: 'high-risk-app',
        name: 'Data Export Application',
        type: 'graph_application' as const,
        platform: 'microsoft' as const,
        createdAt: new Date('2023-01-01'),
        appId: 'app-12345',
        permissions: [
          'User.ReadWrite.All',
          'Files.ReadWrite.All',
          'Mail.ReadWrite',
          'Directory.ReadWrite.All'
        ],
        lastActivity: new Date('2023-12-01')
      };

      const risk = await microsoftConnector.assessRisk(automation);

      expect(risk.level).toBe('high');
      expect(risk.score).toBeGreaterThan(7);
      expect(risk.factors).toEqual(
        expect.arrayContaining([
          'High-privilege permissions detected',
          'Write access to user data',
          'Directory modification capabilities',
          'File system access'
        ])
      );
      expect(risk.recommendations).toEqual(
        expect.arrayContaining([
          'Review application permissions and reduce to minimum required',
          'Enable additional monitoring for this high-privilege application',
          'Consider implementing conditional access policies'
        ])
      );
    });

    it('should calculate medium risk for Power Automate flows', async () => {
      const automation = {
        id: 'medium-risk-flow',
        name: 'Email Notification Flow',
        type: 'power_automate' as const,
        platform: 'microsoft' as const,
        createdAt: new Date('2023-06-01'),
        creator: 'user@company.com',
        environment: 'Default-12345',
        permissions: ['Mail.Send', 'User.Read'],
        lastActivity: new Date('2023-12-01')
      };

      const risk = await microsoftConnector.assessRisk(automation);

      expect(risk.level).toBe('medium');
      expect(risk.score).toBeGreaterThan(3);
      expect(risk.score).toBeLessThan(7);
      expect(risk.factors).toEqual(
        expect.arrayContaining([
          'Email sending capabilities',
          'User data access'
        ])
      );
    });

    it('should calculate low risk for read-only automations', async () => {
      const automation = {
        id: 'low-risk-app',
        name: 'Dashboard Viewer',
        type: 'graph_application' as const,
        platform: 'microsoft' as const,
        createdAt: new Date('2023-01-01'),
        appId: 'app-67890',
        permissions: ['User.Read', 'Calendars.Read'],
        lastActivity: new Date('2023-12-01')
      };

      const risk = await microsoftConnector.assessRisk(automation);

      expect(risk.level).toBe('low');
      expect(risk.score).toBeLessThan(4);
      expect(risk.factors).toEqual([]);
      expect(risk.recommendations).toEqual(
        expect.arrayContaining([
          'Continue monitoring for permission changes',
          'Regular access reviews recommended'
        ])
      );
    });

    it('should increase risk for stale automations', async () => {
      const staleAutomation = {
        id: 'stale-app',
        name: 'Old Integration',
        type: 'graph_application' as const,
        platform: 'microsoft' as const,
        createdAt: new Date('2022-01-01'),
        appId: 'app-old',
        permissions: ['User.Read'],
        lastActivity: new Date('2023-01-01') // 11+ months ago
      };

      const risk = await microsoftConnector.assessRisk(staleAutomation);

      expect(risk.factors).toEqual(
        expect.arrayContaining(['Stale automation (no recent activity)'])
      );
      expect(risk.recommendations).toEqual(
        expect.arrayContaining(['Consider deactivating unused automation'])
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle token refresh failures gracefully', async () => {
      // Mock token refresh failure
      jest.doMock('@azure/msal-node', () => ({
        ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
          acquireTokenSilent: jest.fn().mockRejectedValue(new Error('Token expired')),
          acquireTokenByClientCredential: jest.fn().mockRejectedValue(new Error('Refresh failed'))
        }))
      }));

      await microsoftConnector.authenticate(mockCredentials);

      const automations = await microsoftConnector.discoverAutomations();
      expect(automations).toEqual([]);
    });

    it('should handle malformed API responses', async () => {
      await microsoftConnector.authenticate(mockCredentials);

      // Mock malformed response
      mockGraphRequest.mockResolvedValue({ invalid: 'response' });

      const automations = await microsoftConnector.discoverAutomations();
      expect(automations).toEqual([]);
    });

    it('should handle rate limiting appropriately', async () => {
      await microsoftConnector.authenticate(mockCredentials);

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).code = 429;
      mockGraphRequest.mockRejectedValue(rateLimitError);

      const automations = await microsoftConnector.discoverAutomations();
      expect(automations).toEqual([]);
    });
  });
});