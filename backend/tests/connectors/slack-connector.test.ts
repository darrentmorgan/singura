/**
 * Slack Connector Unit Tests
 * Tests Slack platform connector functionality in isolation
 */

import { SlackConnector } from '../../src/connectors/slack';
import { OAuthCredentials, AutomationEvent, PermissionCheck } from '../../src/connectors/types';

// Create the shared mock instance that can be accessed from tests
const mockSlackClientInstance = {
  auth: {
    test: jest.fn(),
  },
  users: {
    info: jest.fn(),
    list: jest.fn(),
  },
  conversations: {
    list: jest.fn(),
  },
  apps: {
    list: jest.fn(),
  },
  admin: {
    apps: {
      approved: {
        list: jest.fn(),
      },
    },
    audit: {
      logs: {
        list: jest.fn(),
      },
    },
  },
  team: {
    info: jest.fn(),
  },
  workflows: {
    stepCompleted: jest.fn(),
  },
};

// Mock the Slack Web API
jest.mock('@slack/web-api', () => {
  const MockWebClient = jest.fn().mockImplementation(() => mockSlackClientInstance);
  
  return {
    WebClient: MockWebClient,
  };
});

// Mock encrypted credential repository
jest.mock('../../src/database/repositories/encrypted-credential', () => ({
  encryptedCredentialRepository: {
    getDecryptedValue: jest.fn(),
  },
}));

describe('SlackConnector', () => {
  let slackConnector: SlackConnector;
  let mockSlackClient: any;

  const mockCredentials: OAuthCredentials = {
    accessToken: 'xoxb-mock-access-token',
    refreshToken: 'xoxr-mock-refresh-token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    scope: 'channels:read,users:read,chat:write'
  };

  const mockSlackResponses = {
    authTest: {
      ok: true,
      url: 'https://testteam.slack.com/',
      team: 'Test Team',
      user: 'testuser',
      team_id: 'T123456789',
      user_id: 'U123456789',
      bot_id: 'B123456789'
    },
    
    userInfo: {
      ok: true,
      user: {
        id: 'U123456789',
        name: 'testuser',
        real_name: 'Test User',
        profile: {
          email: 'test@testteam.slack.com',
          display_name: 'Test User'
        }
      }
    },

    teamInfo: {
      ok: true,
      team: {
        id: 'T123456789',
        name: 'Test Team',
        domain: 'testteam',
        email_domain: 'testteam.com'
      }
    },

    workflowsList: {
      ok: true,
      workflows: [
        {
          id: 'Wf123456789',
          name: 'Test Workflow',
          description: 'A test workflow',
          is_published: true,
          created_by: 'U123456789',
          date_updated: 1640995200,
          steps: [
            {
              type: 'message',
              name: 'Send notification',
            }
          ]
        }
      ]
    },

    appsList: {
      ok: true,
      apps: [
        {
          id: 'A123456789',
          name: 'Test App',
          description: 'A test application',
          installed_team_id: 'T123456789',
          scopes: ['channels:read', 'chat:write'],
          is_workflow_app: false
        },
        {
          id: 'A987654321',
          name: 'Workflow Builder',
          description: 'Slack Workflow Builder',
          installed_team_id: 'T123456789',
          scopes: ['workflow.steps:execute'],
          is_workflow_app: true
        }
      ]
    },

    auditLogs: {
      ok: true,
      entries: [
        {
          id: 'audit-123',
          date_create: 1640995200,
          action: 'app_installed',
          actor: {
            type: 'user',
            user: {
              id: 'U123456789',
              name: 'testuser',
              email: 'test@testteam.slack.com'
            }
          },
          entity: {
            type: 'app',
            app: {
              id: 'A123456789',
              name: 'Test App',
              scopes: ['channels:read']
            }
          },
          context: {
            location: {
              type: 'workspace',
              id: 'T123456789',
              name: 'Test Team'
            },
            ip_address: '192.168.1.100'
          }
        }
      ]
    }
  };

  beforeEach(() => {
    slackConnector = new SlackConnector();
    // Get the mock client instance from the WebClient constructor
    const { WebClient } = require('@slack/web-api');
    mockSlackClient = mockSlackClientInstance;
    
    // Clear mock calls but keep implementations
    Object.values(mockSlackClientInstance.auth).forEach((fn: any) => fn.mockClear?.());
    Object.values(mockSlackClientInstance.users).forEach((fn: any) => fn.mockClear?.());
    Object.values(mockSlackClientInstance.conversations).forEach((fn: any) => fn.mockClear?.());
    Object.values(mockSlackClientInstance.apps).forEach((fn: any) => fn.mockClear?.());
    Object.values(mockSlackClientInstance.team).forEach((fn: any) => fn.mockClear?.());
    if (mockSlackClientInstance.workflows) {
      Object.values(mockSlackClientInstance.workflows).forEach((fn: any) => fn.mockClear?.());
    }
    if (mockSlackClientInstance.admin?.audit?.logs) {
      Object.values(mockSlackClientInstance.admin.audit.logs).forEach((fn: any) => fn.mockClear?.());
    }
  });

  describe('Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      // Mock successful auth test
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.info.mockResolvedValue(mockSlackResponses.userInfo);
      mockSlackClient.team.info.mockResolvedValue(mockSlackResponses.teamInfo);

      const result = await slackConnector.authenticate(mockCredentials);
      
      // Debug log to see what went wrong
      if (!result.success) {
        console.log('Auth failed with:', result.error, result.errorCode);
      }

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe('U123456789');
      expect(result.platformWorkspaceId).toBe('T123456789');
      expect(result.displayName).toContain('Test User');
      expect(result.permissions).toEqual(['channels:read', 'users:read', 'chat:write']);
      expect(result.metadata).toMatchObject({
        teamName: 'Test Team',
        teamDomain: 'testteam',
        userEmail: 'test@testteam.slack.com'
      });
    });

    it('should handle authentication failure', async () => {
      mockSlackClient.auth.test.mockRejectedValue(new Error('Invalid token'));

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.errorCode).toBe('SLACK_AUTH_ERROR');
    });

    it('should handle invalid token response', async () => {
      mockSlackClient.auth.test.mockResolvedValue({
        ok: false,
        error: 'invalid_auth'
      });

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack authentication failed');
    });

    it('should handle missing user information', async () => {
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.info.mockRejectedValue(new Error('User not found'));

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('Automation Discovery', () => {
    beforeEach(async () => {
      // Setup authenticated client
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.info.mockResolvedValue(mockSlackResponses.userInfo);
      mockSlackClient.team.info.mockResolvedValue(mockSlackResponses.teamInfo);
      
      await slackConnector.authenticate(mockCredentials);
    });

    it('should discover Slack workflows', async () => {
      // Mock workflows API response
      mockSlackClient.workflows = {
        stepCompleted: jest.fn(),
      };

      // Since Slack doesn't have a direct workflows API, we mock the discovery
      // In the actual implementation, this would use undocumented APIs or webhooks
      const mockAutomations: AutomationEvent[] = [
        {
          id: 'slack-workflow-Wf123456789',
          name: 'Test Workflow',
          type: 'workflow',
          platform: 'slack',
          status: 'active',
          trigger: 'message',
          actions: ['send_message', 'add_reaction'],
          metadata: {
            workflowId: 'Wf123456789',
            isPublished: true,
            createdBy: 'U123456789',
            stepCount: 2
          },
          createdAt: new Date(1640995200000),
          lastTriggered: null,
          description: 'A test workflow'
        }
      ];

      // Mock the discovery methods
      jest.spyOn(slackConnector as any, 'discoverWorkflows')
        .mockResolvedValue(mockAutomations);
      jest.spyOn(slackConnector as any, 'discoverApps')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverBots')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverWebhooks')
        .mockResolvedValue([]);

      const automations = await slackConnector.discoverAutomations();

      expect(automations).toHaveLength(1);
      expect(automations[0]).toMatchObject({
        id: 'slack-workflow-Wf123456789',
        name: 'Test Workflow',
        type: 'workflow',
        platform: 'slack',
        status: 'active'
      });
    });

    it('should discover Slack apps and integrations', async () => {
      mockSlackClient.apps.list.mockResolvedValue(mockSlackResponses.appsList);

      // Mock the discovery methods
      jest.spyOn(slackConnector as any, 'discoverWorkflows')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverApps')
        .mockImplementation(async () => {
          const response = await mockSlackClient.apps.list();
          return response.apps.map((app: any) => ({
            id: `slack-app-${app.id}`,
            name: app.name,
            type: app.is_workflow_app ? 'workflow' : 'integration',
            platform: 'slack',
            status: 'active',
            trigger: 'api_call',
            actions: ['api_access'],
            metadata: {
              appId: app.id,
              scopes: app.scopes,
              isWorkflowApp: app.is_workflow_app
            },
            createdAt: new Date(),
            lastTriggered: null,
            description: app.description,
            permissions: app.scopes
          }));
        });
      jest.spyOn(slackConnector as any, 'discoverBots')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverWebhooks')
        .mockResolvedValue([]);

      const automations = await slackConnector.discoverAutomations();

      expect(automations).toHaveLength(2);
      expect(automations[0].type).toBe('integration');
      expect(automations[1].type).toBe('workflow'); // Workflow Builder app
    });

    it('should discover bots and automated users', async () => {
      const mockBotUsers = {
        ok: true,
        members: [
          {
            id: 'B123456789',
            name: 'testbot',
            profile: {
              display_name: 'Test Bot',
              bot_id: 'B123456789'
            },
            is_bot: true,
            deleted: false
          }
        ]
      };

      mockSlackClient.users.list.mockResolvedValue(mockBotUsers);

      // Mock the discovery methods
      jest.spyOn(slackConnector as any, 'discoverWorkflows')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverApps')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverBots')
        .mockImplementation(async () => {
          const response = await mockSlackClient.users.list();
          return response.members
            .filter((user: any) => user.is_bot && !user.deleted)
            .map((bot: any) => ({
              id: `slack-bot-${bot.id}`,
              name: bot.profile?.display_name || bot.name,
              type: 'bot',
              platform: 'slack',
              status: 'active',
              trigger: 'message',
              actions: ['respond', 'process'],
              metadata: {
                botId: bot.id,
                isBot: true
              },
              createdAt: new Date(),
              lastTriggered: null
            }));
        });
      jest.spyOn(slackConnector as any, 'discoverWebhooks')
        .mockResolvedValue([]);

      const automations = await slackConnector.discoverAutomations();

      expect(automations).toHaveLength(1);
      expect(automations[0]).toMatchObject({
        id: 'slack-bot-B123456789',
        name: 'Test Bot',
        type: 'bot',
        platform: 'slack'
      });
    });

    it('should handle discovery errors gracefully', async () => {
      mockSlackClient.apps.list.mockRejectedValue(new Error('API error'));

      // Mock some methods to succeed and others to fail
      jest.spyOn(slackConnector as any, 'discoverWorkflows')
        .mockRejectedValue(new Error('Workflows API failed'));
      jest.spyOn(slackConnector as any, 'discoverApps')
        .mockRejectedValue(new Error('Apps API failed'));
      jest.spyOn(slackConnector as any, 'discoverBots')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverWebhooks')
        .mockResolvedValue([]);

      // Should not throw, but continue with partial results
      const automations = await slackConnector.discoverAutomations();

      expect(automations).toBeDefined();
      expect(Array.isArray(automations)).toBe(true);
    });
  });

  describe('Audit Logs', () => {
    beforeEach(async () => {
      // Setup authenticated client
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.info.mockResolvedValue(mockSlackResponses.userInfo);
      mockSlackClient.team.info.mockResolvedValue(mockSlackResponses.teamInfo);
      
      await slackConnector.authenticate(mockCredentials);
    });

    it('should retrieve audit logs successfully', async () => {
      mockSlackClient.admin.audit.logs.list.mockResolvedValue(mockSlackResponses.auditLogs);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const auditLogs = await slackConnector.getAuditLogs(since);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        id: 'audit-123',
        actorId: 'U123456789',
        actorType: 'user',
        actionType: 'app_installed',
        resourceType: 'app',
        resourceId: 'A123456789',
        ipAddress: '192.168.1.100'
      });
    });

    it('should handle missing admin permissions for audit logs', async () => {
      mockSlackClient.admin.audit.logs.list.mockRejectedValue({
        code: 'SLACK_API_ERROR',
        data: { error: 'missing_scope', needed: 'admin' }
      });

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const auditLogs = await slackConnector.getAuditLogs(since);

      // Should return empty array when audit logs aren't available
      expect(auditLogs).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockSlackClient.admin.audit.logs.list.mockRejectedValue(new Error('Network error'));

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const auditLogs = await slackConnector.getAuditLogs(since);

      expect(auditLogs).toEqual([]);
    });
  });

  describe('Permission Validation', () => {
    beforeEach(async () => {
      // Setup authenticated client
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.info.mockResolvedValue(mockSlackResponses.userInfo);
      mockSlackClient.team.info.mockResolvedValue(mockSlackResponses.teamInfo);
      
      await slackConnector.authenticate(mockCredentials);
    });

    it('should validate permissions successfully', async () => {
      // Mock API calls for permission testing
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.list.mockResolvedValue({ ok: true, members: [] });
      mockSlackClient.conversations.list.mockResolvedValue({ ok: true, channels: [] });

      const permissionCheck = await slackConnector.validatePermissions();

      expect(permissionCheck.isValid).toBe(true);
      expect(permissionCheck.permissions).toContain('channels:read');
      expect(permissionCheck.permissions).toContain('users:read');
      expect(permissionCheck.missingPermissions).toHaveLength(0);
      expect(permissionCheck.errors).toHaveLength(0);
    });

    it('should detect missing permissions', async () => {
      // Mock auth test with limited scope
      mockSlackClient.auth.test.mockResolvedValue({
        ...mockSlackResponses.authTest,
        scopes: ['chat:write'] // Missing channels:read and users:read
      });

      // Mock API calls that should fail due to missing permissions
      mockSlackClient.users.list.mockRejectedValue({
        code: 'SLACK_API_ERROR',
        data: { error: 'missing_scope', needed: 'users:read' }
      });
      mockSlackClient.conversations.list.mockRejectedValue({
        code: 'SLACK_API_ERROR', 
        data: { error: 'missing_scope', needed: 'channels:read' }
      });

      const permissionCheck = await slackConnector.validatePermissions();

      expect(permissionCheck.isValid).toBe(false);
      expect(permissionCheck.missingPermissions).toContain('users:read');
      expect(permissionCheck.missingPermissions).toContain('channels:read');
      expect(permissionCheck.errors.length).toBeGreaterThan(0);
    });

    it('should handle API errors during validation', async () => {
      mockSlackClient.auth.test.mockRejectedValue(new Error('Auth test failed'));

      const permissionCheck = await slackConnector.validatePermissions();

      expect(permissionCheck.isValid).toBe(false);
      expect(permissionCheck.errors).toContain('Auth test failed');
    });

    it('should check admin permissions separately', async () => {
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.list.mockResolvedValue({ ok: true, members: [] });
      mockSlackClient.conversations.list.mockResolvedValue({ ok: true, channels: [] });
      
      // Mock admin API call
      mockSlackClient.admin.audit.logs.list.mockResolvedValue(mockSlackResponses.auditLogs);

      const permissionCheck = await slackConnector.validatePermissions();

      expect(permissionCheck.metadata).toHaveProperty('hasAdminAccess', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting', async () => {
      const rateLimitError = {
        code: 'SLACK_API_ERROR',
        data: { 
          error: 'rate_limited',
          retryAfter: 60
        }
      };

      mockSlackClient.auth.test.mockRejectedValue(rateLimitError);

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SLACK_AUTH_ERROR');
      expect(result.error).toContain('rate_limited');
    });

    it('should handle network timeouts', async () => {
      mockSlackClient.auth.test.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ETIMEDOUT');
    });

    it('should handle malformed API responses', async () => {
      mockSlackClient.auth.test.mockResolvedValue(null);

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid response from Slack API');
    });
  });

  describe('Static Helper Methods', () => {
    it('should get authenticated client for connection', async () => {
      const mockCredentialRepo = require('../../src/database/repositories/encrypted-credential').encryptedCredentialRepository;
      
      mockCredentialRepo.getDecryptedValue
        .mockResolvedValueOnce('xoxb-test-token') // access_token
        .mockResolvedValueOnce('xoxr-test-refresh'); // refresh_token

      const client = await SlackConnector.getClientForConnection('test-connection-id');

      expect(client).toBeDefined();
      expect(mockCredentialRepo.getDecryptedValue).toHaveBeenCalledTimes(2);
    });

    it('should throw error when no access token found', async () => {
      const mockCredentialRepo = require('../../src/database/repositories/encrypted-credential').encryptedCredentialRepository;
      
      mockCredentialRepo.getDecryptedValue.mockResolvedValue(null);

      await expect(
        SlackConnector.getClientForConnection('test-connection-id')
      ).rejects.toThrow('No access token found for Slack connection');
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle empty automation responses', async () => {
      // Setup authenticated client
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.info.mockResolvedValue(mockSlackResponses.userInfo);
      mockSlackClient.team.info.mockResolvedValue(mockSlackResponses.teamInfo);
      
      await slackConnector.authenticate(mockCredentials);

      // Mock empty responses
      jest.spyOn(slackConnector as any, 'discoverWorkflows')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverApps')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverBots')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverWebhooks')
        .mockResolvedValue([]);

      const automations = await slackConnector.discoverAutomations();

      expect(automations).toEqual([]);
    });

    it('should handle large numbers of automations', async () => {
      // Setup authenticated client
      mockSlackClient.auth.test.mockResolvedValue(mockSlackResponses.authTest);
      mockSlackClient.users.info.mockResolvedValue(mockSlackResponses.userInfo);
      mockSlackClient.team.info.mockResolvedValue(mockSlackResponses.teamInfo);
      
      await slackConnector.authenticate(mockCredentials);

      // Mock large response
      const manyAutomations = Array.from({ length: 100 }, (_, i) => ({
        id: `slack-app-${i}`,
        name: `Test App ${i}`,
        type: 'integration' as const,
        platform: 'slack' as const,
        status: 'active' as const,
        trigger: 'api_call',
        actions: ['api_access'],
        metadata: { appId: `A${i}` },
        createdAt: new Date(),
        lastTriggered: null
      }));

      jest.spyOn(slackConnector as any, 'discoverWorkflows')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverApps')
        .mockResolvedValue(manyAutomations);
      jest.spyOn(slackConnector as any, 'discoverBots')
        .mockResolvedValue([]);
      jest.spyOn(slackConnector as any, 'discoverWebhooks')
        .mockResolvedValue([]);

      const automations = await slackConnector.discoverAutomations();

      expect(automations).toHaveLength(100);
    });
  });
});