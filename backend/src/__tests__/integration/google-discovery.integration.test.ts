/**
 * Integration Tests for Google Workspace Discovery
 * Tests end-to-end discovery workflows with realistic mocks
 * Coverage Target: 80%+
 */

import { GoogleConnector } from '../../connectors/google';
import { GoogleAPIClientService } from '../../services/google-api-client-service';
import { hybridStorage } from '../../services/hybrid-storage';
import { oauthCredentialStorage } from '../../services/oauth-credential-storage-service';
import { google } from 'googleapis';
import { OAuthCredentials } from '../../connectors/types';
import { GoogleOAuthCredentials } from '@saas-xray/shared-types';

// Mock googleapis
jest.mock('googleapis');

// Mock storage services
jest.mock('../../services/hybrid-storage');
jest.mock('../../services/oauth-credential-storage-service');

describe('Google Workspace Discovery Integration', () => {
  let connector: GoogleConnector;
  let apiClient: GoogleAPIClientService;
  let mockAuth: any;
  let mockOAuth2: any;
  let mockDrive: any;
  let mockScript: any;
  let mockAdmin: any;

  const testOrgId = 'test-org-123';
  const testUserId = 'test-user-456';
  const testConnectionId = 'google-conn-789';

  const mockCredentials: OAuthCredentials = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000),
    scope: 'https://www.googleapis.com/auth/admin.reports.audit.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/admin.directory.user.security'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Google API clients
    mockAuth = {
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
      credentials: { scope: mockCredentials.scope }
    };

    mockOAuth2 = {
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: testUserId,
            email: 'admin@baliluxurystays.com',
            name: 'Admin User',
            verified_email: true,
            hd: 'baliluxurystays.com',
            picture: 'https://example.com/photo.jpg'
          }
        })
      }
    };

    mockDrive = {
      files: {
        list: jest.fn()
      }
    };

    mockScript = {
      projects: {
        getContent: jest.fn()
      }
    };

    mockAdmin = {
      users: {
        list: jest.fn().mockResolvedValue({ data: {} }) // Admin access by default
      },
      activities: {
        list: jest.fn()
      },
      tokens: {
        list: jest.fn()
      }
    };

    (google.auth.OAuth2 as any) = jest.fn(() => mockAuth);
    (google.oauth2 as any) = jest.fn(() => mockOAuth2);
    (google.drive as any) = jest.fn(() => mockDrive);
    (google.script as any) = jest.fn(() => mockScript);
    (google.admin as any) = jest.fn(() => mockAdmin);

    connector = new GoogleConnector();
    apiClient = new GoogleAPIClientService();

    // Mock hybrid storage
    (hybridStorage.storeConnection as jest.Mock).mockResolvedValue({
      id: testConnectionId,
      organizationId: testOrgId,
      userId: testUserId,
      platform: 'google',
      status: 'active'
    });

    (hybridStorage.getConnections as jest.Mock).mockResolvedValue([{
      id: testConnectionId,
      organizationId: testOrgId,
      userId: testUserId,
      platform: 'google',
      status: 'active'
    }]);
  });

  describe('End-to-End OAuth Connection Creation', () => {
    it('should create Google OAuth connection with full authentication flow', async () => {
      const result = await connector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe(testUserId);
      expect(result.platformWorkspaceId).toBe('baliluxurystays.com');
      expect(result.displayName).toBe('Admin User (admin@baliluxurystays.com)');
      expect(result.metadata).toMatchObject({
        email: 'admin@baliluxurystays.com',
        domain: 'baliluxurystays.com',
        verified_email: true
      });
    });

    it('should initialize API client with OAuth credentials', async () => {
      const googleCreds: GoogleOAuthCredentials = {
        accessToken: mockCredentials.accessToken,
        refreshToken: mockCredentials.refreshToken,
        tokenType: 'Bearer',
        scope: mockCredentials.scope.split(' '),
        expiresAt: mockCredentials.expiresAt,
        domain: 'baliluxurystays.com'
      };

      const initialized = await apiClient.initialize(googleCreds);

      expect(initialized).toBe(true);
      expect(mockAuth.setCredentials).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        refresh_token: mockCredentials.refreshToken,
        token_type: 'Bearer',
        expiry_date: mockCredentials.expiresAt.getTime()
      });
    });
  });

  describe('Apps Script Discovery with AI Detection', () => {
    beforeEach(async () => {
      await connector.authenticate(mockCredentials);
    });

    it('should discover Apps Script projects from Drive API', async () => {
      mockDrive.files.list.mockResolvedValueOnce({
        data: {
          files: [
            {
              id: 'script-1',
              name: 'Email Automation',
              mimeType: 'application/vnd.google-apps.script',
              createdTime: '2024-06-01T00:00:00Z',
              modifiedTime: '2025-01-10T00:00:00Z',
              owners: [{ emailAddress: 'admin@baliluxurystays.com' }],
              shared: false,
              description: 'Automated email processing'
            },
            {
              id: 'script-2',
              name: 'ChatGPT Data Processor',
              mimeType: 'application/vnd.google-apps.script',
              createdTime: '2024-08-15T00:00:00Z',
              modifiedTime: '2025-01-12T00:00:00Z',
              owners: [{ emailAddress: 'admin@baliluxurystays.com' }],
              shared: true,
              description: 'Send data to ChatGPT for analysis'
            }
          ]
        }
      });

      // Mock script content for first script (no AI)
      mockScript.projects.getContent
        .mockResolvedValueOnce({
          data: {
            files: [
              {
                name: 'Code.gs',
                source: 'function sendEmail() { GmailApp.sendEmail("test@example.com", "Subject", "Body"); }',
                functionSet: {
                  values: [{ name: 'sendEmail' }]
                }
              }
            ]
          }
        })
        // Mock script content for second script (ChatGPT integration)
        .mockResolvedValueOnce({
          data: {
            files: [
              {
                name: 'Code.gs',
                source: `
                  function analyzeWithChatGPT(data) {
                    const url = 'https://api.openai.com/v1/chat/completions';
                    const options = {
                      method: 'post',
                      headers: {
                        'Authorization': 'Bearer sk-...',
                        'Content-Type': 'application/json'
                      },
                      payload: JSON.stringify({
                        model: 'gpt-4',
                        messages: [{ role: 'user', content: data }]
                      })
                    };
                    return UrlFetchApp.fetch(url, options);
                  }
                `,
                functionSet: {
                  values: [{ name: 'analyzeWithChatGPT' }]
                }
              },
              {
                name: 'appsscript.json',
                type: 'JSON',
                source: JSON.stringify({
                  oauthScopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/script.external_request'
                  ],
                  urlFetchWhitelist: ['https://api.openai.com/']
                })
              }
            ]
          }
        });

      // Mock Drive automation discovery (empty)
      mockDrive.files.list.mockResolvedValueOnce({ data: { files: [] } });

      const automations = await (connector as any).discoverAppsScriptProjects();

      expect(automations).toHaveLength(2);

      // First script: No AI
      expect(automations[0].id).toBe('google-script-script-1');
      expect(automations[0].name).toBe('Email Automation');
      expect(automations[0].riskLevel).toBe('medium');
      expect(automations[0].metadata?.hasAIPlatformIntegration).toBe(false);

      // Second script: ChatGPT integration detected
      expect(automations[1].id).toBe('google-script-script-2');
      expect(automations[1].name).toBe('ChatGPT Data Processor');
      expect(automations[1].riskLevel).toBe('high');
      expect(automations[1].metadata?.hasAIPlatformIntegration).toBe(true);
      expect(automations[1].metadata?.aiPlatforms).toContain('openai');
      expect(automations[1].metadata?.aiPlatformConfidence).toBe(95);
      expect(automations[1].permissions).toContain('external_url:https://api.openai.com/');
    });

    it('should handle permission errors gracefully when reading script content', async () => {
      mockDrive.files.list.mockResolvedValueOnce({
        data: {
          files: [
            {
              id: 'restricted-script',
              name: 'Restricted Script',
              mimeType: 'application/vnd.google-apps.script',
              createdTime: '2024-01-01T00:00:00Z',
              modifiedTime: '2025-01-01T00:00:00Z'
            }
          ]
        }
      });

      mockScript.projects.getContent.mockRejectedValueOnce(
        new Error('The caller does not have permission')
      );

      mockDrive.files.list.mockResolvedValueOnce({ data: { files: [] } });

      const automations = await (connector as any).discoverAppsScriptProjects();

      expect(automations).toHaveLength(1);
      expect(automations[0].permissions).toEqual([]);
      expect(automations[0].metadata?.hasAIPlatformIntegration).toBe(false);
    });
  });

  describe('OAuth Application Discovery from Audit Logs', () => {
    beforeEach(async () => {
      await connector.authenticate(mockCredentials);
    });

    it('should discover OAuth apps including ChatGPT from audit logs', async () => {
      mockAdmin.activities.list
        // Login events
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user1@baliluxurystays.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: 'chatgpt.apps.googleusercontent.com' },
                      { name: 'app_name', value: 'ChatGPT' },
                      { name: 'scope', multiValue: ['email', 'profile', 'https://www.googleapis.com/auth/drive.readonly'] }
                    ]
                  }
                ]
              },
              {
                id: { time: '2025-01-16T14:30:00Z', uniqueQualifier: 'event-2' },
                actor: { email: 'user2@baliluxurystays.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: '456.apps.googleusercontent.com' },
                      { name: 'app_name', value: 'Claude AI' },
                      { name: 'scope', multiValue: ['email', 'https://www.googleapis.com/auth/gmail.readonly'] }
                    ]
                  }
                ]
              }
            ]
          }
        })
        // Token events
        .mockResolvedValueOnce({
          data: { items: [] }
        });

      const automations = await (connector as any).discoverOAuthApplications();

      expect(automations).toHaveLength(2);

      // ChatGPT detection
      const chatgptApp = automations.find((a: any) => a.metadata?.aiPlatformType === 'openai');
      expect(chatgptApp).toBeDefined();
      expect(chatgptApp.name).toBe('ChatGPT');
      expect(chatgptApp.riskLevel).toBe('high');
      expect(chatgptApp.metadata?.isAIPlatform).toBe(true);
      expect(chatgptApp.metadata?.aiPlatformName).toBe('OpenAI / ChatGPT');
      expect(chatgptApp.permissions).toContain('https://www.googleapis.com/auth/drive.readonly');

      // Claude detection
      const claudeApp = automations.find((a: any) => a.metadata?.aiPlatformType === 'claude');
      expect(claudeApp).toBeDefined();
      expect(claudeApp.name).toBe('Claude AI');
      expect(claudeApp.metadata?.isAIPlatform).toBe(true);
      expect(claudeApp.metadata?.aiPlatformName).toBe('Claude (Anthropic)');
    });

    it('should aggregate scopes from multiple authorization events for same app', async () => {
      mockAdmin.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user1@baliluxurystays.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: '123.apps.googleusercontent.com' },
                      { name: 'app_name', value: 'Test App' },
                      { name: 'scope', multiValue: ['email'] }
                    ]
                  }
                ]
              },
              {
                id: { time: '2025-01-16T10:00:00Z', uniqueQualifier: 'event-2' },
                actor: { email: 'user2@baliluxurystays.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: '123.apps.googleusercontent.com' },
                      { name: 'scope', multiValue: ['profile', 'drive'] }
                    ]
                  }
                ]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const automations = await (connector as any).discoverOAuthApplications();

      expect(automations).toHaveLength(1);
      expect(automations[0].permissions).toContain('email');
      expect(automations[0].permissions).toContain('profile');
      expect(automations[0].permissions).toContain('drive');
    });
  });

  describe('Service Account Discovery from Audit Logs', () => {
    beforeEach(async () => {
      await connector.authenticate(mockCredentials);
    });

    it('should discover service accounts from audit log activity', async () => {
      mockAdmin.activities.list
        // Token activity
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'automation-sa@project-123.iam.gserviceaccount.com' },
                events: [
                  {
                    name: 'authorize',
                    parameters: [
                      { name: 'scope', multiValue: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'] },
                      { name: 'client_id', value: 'automation-client-123' }
                    ]
                  }
                ]
              },
              {
                id: { time: '2025-01-16T11:00:00Z', uniqueQualifier: 'event-2' },
                actor: { email: 'zapier-integration@project-456.iam.gserviceaccount.com' },
                events: [
                  {
                    name: 'authorize',
                    parameters: [
                      { name: 'scope', multiValue: ['https://www.googleapis.com/auth/gmail.readonly'] }
                    ]
                  }
                ]
              }
            ]
          }
        })
        // Login activity
        .mockResolvedValueOnce({
          data: { items: [] }
        });

      const automations = await (connector as any).discoverServiceAccounts();

      expect(automations).toHaveLength(2);

      // First service account
      const automationSA = automations.find((a: any) => a.metadata?.email.includes('automation-sa'));
      expect(automationSA).toBeDefined();
      expect(automationSA.type).toBe('integration');
      expect(automationSA.trigger).toBe('api_key');
      expect(automationSA.permissions).toContain('https://www.googleapis.com/auth/drive');
      expect(automationSA.permissions).toContain('https://www.googleapis.com/auth/spreadsheets');

      // Zapier service account (third-party detection)
      const zapierSA = automations.find((a: any) => a.metadata?.email.includes('zapier'));
      expect(zapierSA).toBeDefined();
      expect(zapierSA.riskLevel).toBe('high'); // Third-party automation
      expect(zapierSA.metadata?.riskFactors).toContain('Third-party automation platform detected');
    });

    it('should filter out regular user emails (not service accounts)', async () => {
      mockAdmin.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'regular-user@baliluxurystays.com' }, // Regular user, not SA
                events: [{ name: 'authorize' }]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const automations = await (connector as any).discoverServiceAccounts();

      expect(automations).toHaveLength(0);
    });
  });

  describe('Full Discovery Orchestration', () => {
    beforeEach(async () => {
      await connector.authenticate(mockCredentials);
    });

    it('should orchestrate all discovery methods for comprehensive results', async () => {
      // Mock Apps Script discovery
      mockDrive.files.list
        .mockResolvedValueOnce({
          data: {
            files: [
              {
                id: 'script-1',
                name: 'OpenAI Integration Script',
                mimeType: 'application/vnd.google-apps.script',
                createdTime: '2024-01-01T00:00:00Z',
                modifiedTime: '2025-01-01T00:00:00Z'
              }
            ]
          }
        });

      mockScript.projects.getContent.mockResolvedValueOnce({
        data: {
          files: [
            {
              name: 'Code.gs',
              source: 'const OPENAI_API = "https://api.openai.com/v1/chat/completions";'
            }
          ]
        }
      });

      // Mock OAuth app discovery
      mockAdmin.tokens.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              clientId: 'chatgpt.apps.googleusercontent.com',
              displayText: 'ChatGPT',
              scopes: ['email', 'profile']
            }
          ]
        }
      });

      // Mock service account discovery
      mockAdmin.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'automation@project.iam.gserviceaccount.com' },
                events: [{ name: 'authorize' }]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      // Mock Drive automation discovery
      mockDrive.files.list.mockResolvedValueOnce({ data: { files: [] } });

      const automations = await connector.discoverAutomations();

      // Should have discovered from all sources
      expect(automations.length).toBeGreaterThan(0);

      const appsScriptAutomations = automations.filter(a => a.id.startsWith('google-script'));
      const oauthAutomations = automations.filter(a => a.id.startsWith('google-oauth'));
      const serviceAccountAutomations = automations.filter(a => a.id.startsWith('google-sa'));

      expect(appsScriptAutomations.length).toBeGreaterThan(0);
      expect(oauthAutomations.length).toBeGreaterThan(0);
      expect(serviceAccountAutomations.length).toBeGreaterThan(0);
    });

    it('should skip service account discovery for personal Gmail accounts', async () => {
      // Mock personal Gmail account
      mockOAuth2.userinfo.get.mockResolvedValueOnce({
        data: {
          id: 'personal-user-123',
          email: 'user@gmail.com',
          name: 'Personal User',
          verified_email: true
          // No 'hd' field
        }
      });

      await connector.authenticate(mockCredentials);

      // Mock Apps Script and OAuth discovery
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });
      mockAdmin.tokens.list.mockResolvedValue({ data: { items: [] } });

      const automations = await connector.discoverAutomations();

      // Should NOT have called service account discovery
      expect(mockAdmin.activities.list).not.toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      await connector.authenticate(mockCredentials);
    });

    it('should handle Drive API permission errors', async () => {
      mockDrive.files.list.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const automations = await (connector as any).discoverAppsScriptProjects();

      expect(automations).toEqual([]);
    });

    it('should handle admin API permission errors', async () => {
      mockAdmin.activities.list.mockRejectedValueOnce(
        new Error('Unauthorized')
      );

      const automations = await (connector as any).discoverServiceAccounts();

      expect(automations).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockDrive.files.list.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      mockAdmin.tokens.list.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      mockAdmin.activities.list.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const automations = await connector.discoverAutomations();

      // Should not throw, return empty array
      expect(automations).toEqual([]);
    });

    it('should handle invalid OAuth credentials', async () => {
      mockOAuth2.userinfo.get.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const result = await connector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.errorCode).toBe('GOOGLE_AUTH_ERROR');
    });
  });

  describe('Database Persistence', () => {
    it('should store connection metadata in hybrid storage', async () => {
      const connectionData = {
        organization_id: testOrgId,
        platform_type: 'google',
        platform_user_id: testUserId,
        display_name: 'Admin User (admin@baliluxurystays.com)',
        permissions_granted: ['email', 'profile'],
        metadata: {
          email: 'admin@baliluxurystays.com',
          domain: 'baliluxurystays.com'
        },
        status: 'active'
      };

      await hybridStorage.storeConnection(connectionData);

      expect(hybridStorage.storeConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          platform_type: 'google',
          status: 'active'
        })
      );
    });

    it('should store OAuth credentials separately from connection metadata', async () => {
      const oauthCreds: GoogleOAuthCredentials = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenType: 'Bearer',
        expiresAt: new Date(),
        scope: ['email'],
        domain: 'baliluxurystays.com'
      };

      await oauthCredentialStorage.storeCredentials(testConnectionId, oauthCreds);

      expect(oauthCredentialStorage.storeCredentials).toHaveBeenCalledWith(
        testConnectionId,
        expect.objectContaining({
          accessToken: 'test-token',
          refreshToken: 'test-refresh'
        })
      );
    });
  });
});
