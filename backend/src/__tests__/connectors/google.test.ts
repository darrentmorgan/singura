/**
 * Unit Tests for Google Connector
 * Tests discovery algorithms and AI platform detection
 * Coverage Target: 90%+
 */

import { GoogleConnector } from '../../connectors/google';
import { google } from 'googleapis';
import { OAuthCredentials } from '../../connectors/types';

// Mock googleapis
jest.mock('googleapis');

describe('GoogleConnector', () => {
  let connector: GoogleConnector;
  let mockAuth: any;
  let mockOAuth2: any;
  let mockDrive: any;
  let mockScript: any;
  let mockAdmin: any;

  const mockCredentials: OAuthCredentials = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000),
    scope: 'https://www.googleapis.com/auth/admin.reports.audit.readonly https://www.googleapis.com/auth/drive.readonly'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth = {
      setCredentials: jest.fn(),
      credentials: {}
    };

    mockOAuth2 = {
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: 'test-user-123',
            email: 'test@baliluxurystays.com',
            name: 'Test User',
            verified_email: true,
            hd: 'baliluxurystays.com'
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
        list: jest.fn()
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
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      // Ensure fresh mock response
      mockOAuth2.userinfo.get.mockResolvedValueOnce({
        data: {
          id: 'test-user-123',
          email: 'test@baliluxurystays.com',
          name: 'Test User',
          verified_email: true,
          hd: 'baliluxurystays.com'
        }
      });

      const result = await connector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe('test-user-123');
      expect(result.platformWorkspaceId).toBe('baliluxurystays.com');
      expect(result.displayName).toBe('Test User (test@baliluxurystays.com)');
    });

    it('should handle authentication failure', async () => {
      mockOAuth2.userinfo.get.mockRejectedValueOnce(new Error('Auth failed'));

      const result = await connector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth failed');
      expect(result.errorCode).toBe('GOOGLE_AUTH_ERROR');
    });
  });

  describe('detectAccountType', () => {
    beforeEach(async () => {
      await connector.authenticate(mockCredentials);
    });

    it('should detect Workspace account with admin access', async () => {
      mockAdmin.users.list.mockResolvedValueOnce({ data: {} });

      const accountType = await (connector as any).detectAccountType();

      expect(accountType.type).toBe('workspace');
      expect(accountType.domain).toBe('baliluxurystays.com');
      expect(accountType.hasAdminAccess).toBe(true);
    });

    it('should detect Workspace account without admin access', async () => {
      mockAdmin.users.list.mockRejectedValueOnce(new Error('Permission denied'));

      const accountType = await (connector as any).detectAccountType();

      expect(accountType.type).toBe('workspace');
      expect(accountType.hasAdminAccess).toBe(false);
    });

    it('should detect personal Gmail account', async () => {
      // Create new connector for clean state
      connector = new GoogleConnector();

      // Mock personal Gmail userinfo (no 'hd' field)
      mockOAuth2.userinfo.get.mockResolvedValue({
        data: {
          id: 'personal-123',
          email: 'user@gmail.com',
          name: 'Personal User',
          verified_email: true
          // No 'hd' field for personal accounts
        }
      });

      await connector.authenticate(mockCredentials);

      const accountType = await (connector as any).detectAccountType();

      expect(accountType.type).toBe('personal');
      expect(accountType.domain).toBeNull();
      expect(accountType.hasAdminAccess).toBe(false);
    });
  });

  describe('detectAIPlatformInScript', () => {
    it('should detect OpenAI API usage with high confidence', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'Code.gs',
              source: `
                function callOpenAI() {
                  const url = 'https://api.openai.com/v1/chat/completions';
                  const apiKey = 'sk-...';
                }
              `
            }
          ]
        }
      };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(true);
      expect(result.platforms).toContain('openai');
      expect(result.confidence).toBe(95);
    });

    it('should detect GPT-4 usage', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'Code.gs',
              source: 'const model = "gpt-4-turbo";'
            }
          ]
        }
      };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(true);
      expect(result.platforms).toContain('openai');
    });

    it('should detect Claude/Anthropic API usage', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'Code.gs',
              source: `
                const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
                const apiKey = 'sk-ant-...';
              `
            }
          ]
        }
      };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(true);
      expect(result.platforms).toContain('claude');
      expect(result.confidence).toBe(95);
    });

    it('should detect Gemini API usage', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'Code.gs',
              source: 'const api = "https://generativelanguage.googleapis.com/v1/models/gemini-pro";'
            }
          ]
        }
      };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(true);
      expect(result.platforms).toContain('gemini');
      expect(result.confidence).toBe(90);
    });

    it('should detect Perplexity API usage', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'Code.gs',
              source: 'const perplexityKey = "pplx-...";'
            }
          ]
        }
      };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(true);
      expect(result.platforms).toContain('perplexity');
    });

    it('should detect multiple AI platforms in same script', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'Code.gs',
              source: `
                const openaiKey = 'sk-...';
                const claudeKey = 'sk-ant-...';
                fetch('https://api.openai.com/v1/chat/completions');
                fetch('https://api.anthropic.com/v1/messages');
              `
            }
          ]
        }
      };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(true);
      expect(result.platforms).toContain('openai');
      expect(result.platforms).toContain('claude');
      expect(result.platforms.length).toBe(2);
    });

    it('should return no detection for non-AI scripts', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'Code.gs',
              source: 'function normalFunction() { return "hello"; }'
            }
          ]
        }
      };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(false);
      expect(result.platforms).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should handle empty or missing script content', () => {
      const scriptContent = { data: { files: [] } };

      const result = (connector as any).detectAIPlatformInScript(scriptContent);

      expect(result.detected).toBe(false);
      expect(result.platforms).toEqual([]);
    });
  });

  describe('detectAIPlatformFromOAuth', () => {
    it('should detect ChatGPT from displayText', () => {
      const token = {
        clientId: '123.apps.googleusercontent.com',
        displayText: 'ChatGPT',
        scopes: ['email', 'profile']
      };

      const result = (connector as any).detectAIPlatformFromOAuth(token);

      expect(result.detected).toBe(true);
      expect(result.platform).toBe('openai');
      expect(result.platformName).toBe('OpenAI / ChatGPT');
      expect(result.confidence).toBe(95);
    });

    it('should detect OpenAI from clientId', () => {
      const token = {
        clientId: 'openai.apps.googleusercontent.com',
        displayText: 'OpenAI Platform',
        scopes: []
      };

      const result = (connector as any).detectAIPlatformFromOAuth(token);

      expect(result.detected).toBe(true);
      expect(result.platform).toBe('openai');
    });

    it('should detect Claude from displayText', () => {
      const token = {
        clientId: '456.apps.googleusercontent.com',
        displayText: 'Claude AI Assistant',
        scopes: []
      };

      const result = (connector as any).detectAIPlatformFromOAuth(token);

      expect(result.detected).toBe(true);
      expect(result.platform).toBe('claude');
      expect(result.platformName).toBe('Claude (Anthropic)');
    });

    it('should detect Anthropic from clientId', () => {
      const token = {
        clientId: 'anthropic.apps.googleusercontent.com',
        displayText: 'Anthropic App',
        scopes: []
      };

      const result = (connector as any).detectAIPlatformFromOAuth(token);

      expect(result.detected).toBe(true);
      expect(result.platform).toBe('claude');
    });

    it('should detect Gemini from displayText', () => {
      const token = {
        clientId: '789.apps.googleusercontent.com',
        displayText: 'Gemini Pro',
        scopes: []
      };

      const result = (connector as any).detectAIPlatformFromOAuth(token);

      expect(result.detected).toBe(true);
      expect(result.platform).toBe('gemini');
      expect(result.platformName).toBe('Gemini (Google)');
    });

    it('should detect Perplexity from displayText', () => {
      const token = {
        clientId: '000.apps.googleusercontent.com',
        displayText: 'Perplexity AI',
        scopes: []
      };

      const result = (connector as any).detectAIPlatformFromOAuth(token);

      expect(result.detected).toBe(true);
      expect(result.platform).toBe('perplexity');
      expect(result.platformName).toBe('Perplexity AI');
    });

    it('should return no detection for non-AI OAuth apps', () => {
      const token = {
        clientId: 'regular-app.apps.googleusercontent.com',
        displayText: 'Regular Business App',
        scopes: []
      };

      const result = (connector as any).detectAIPlatformFromOAuth(token);

      expect(result.detected).toBe(false);
      expect(result.platform).toBeNull();
      expect(result.platformName).toBeNull();
    });
  });

  describe('assessOAuthAppRisk', () => {
    it('should assign high risk to AI platforms with sensitive scopes', () => {
      const token = {
        scopes: [
          'email',
          'profile',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/gmail.readonly'
        ],
        clientId: 'test.apps.googleusercontent.com',
        displayText: 'Test App'
      };

      const aiDetection = {
        detected: true,
        platform: 'openai'
      };

      const result = (connector as any).assessOAuthAppRisk(token, aiDetection);

      expect(result.level).toBe('high');
      expect(result.riskFactors).toContain('AI platform integration: openai');
      expect(result.score).toBeGreaterThanOrEqual(30);
    });

    it('should increase risk for Gmail access', () => {
      const token = {
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        clientId: 'test.apps.googleusercontent.com',
        displayText: 'Test App'
      };

      const aiDetection = { detected: false, platform: null };

      const result = (connector as any).assessOAuthAppRisk(token, aiDetection);

      expect(result.riskFactors.some(f => f.includes('Gmail'))).toBe(true);
    });

    it('should increase risk for Drive access', () => {
      const token = {
        scopes: ['https://www.googleapis.com/auth/drive'],
        clientId: 'test.apps.googleusercontent.com',
        displayText: 'Test App'
      };

      const aiDetection = { detected: false, platform: null };

      const result = (connector as any).assessOAuthAppRisk(token, aiDetection);

      expect(result.riskFactors.some(f => f.includes('Drive'))).toBe(true);
    });

    it('should increase risk for admin privileges', () => {
      const token = {
        scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
        clientId: 'test.apps.googleusercontent.com',
        displayText: 'Admin App'
      };

      const aiDetection = { detected: false, platform: null };

      const result = (connector as any).assessOAuthAppRisk(token, aiDetection);

      expect(result.level).toBe('high');
      expect(result.riskFactors.some(f => f.includes('Admin'))).toBe(true);
    });

    it('should flag excessive permissions', () => {
      const token = {
        scopes: Array(15).fill('https://www.googleapis.com/auth/some.scope'),
        clientId: 'test.apps.googleusercontent.com',
        displayText: 'Test App'
      };

      const aiDetection = { detected: false, platform: null };

      const result = (connector as any).assessOAuthAppRisk(token, aiDetection);

      expect(result.riskFactors.some(f => f.includes('Excessive permissions'))).toBe(true);
    });

    it('should assign low risk to apps with minimal scopes', () => {
      const token = {
        scopes: ['email', 'profile'],
        clientId: 'test.apps.googleusercontent.com',
        displayText: 'Simple App'
      };

      const aiDetection = { detected: false, platform: null };

      const result = (connector as any).assessOAuthAppRisk(token, aiDetection);

      expect(result.level).toBe('low');
    });
  });

  describe('assessServiceAccountRiskFromActivity', () => {
    it('should assign high risk for high activity count with sensitive scopes', () => {
      const sa = {
        email: 'test-sa@project.iam.gserviceaccount.com',
        activityCount: 150,
        scopes: ['https://www.googleapis.com/auth/admin.directory.user', 'drive.readonly'],
        daysSinceLastSeen: 0.5
      };

      const result = (connector as any).assessServiceAccountRiskFromActivity(sa);

      expect(result.level).toBe('high');
      expect(result.riskFactors.some(f => f.includes('High activity'))).toBe(true);
    });

    it('should increase risk for sensitive scopes', () => {
      const sa = {
        email: 'test-sa@project.iam.gserviceaccount.com',
        activityCount: 60, // Higher activity to reach risk threshold
        scopes: [
          'https://www.googleapis.com/auth/admin.directory.user',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/sheets',
          'https://www.googleapis.com/auth/docs',
          'https://www.googleapis.com/auth/calendar'
        ],
        daysSinceLastSeen: 0.5 // Recent activity
      };

      const result = (connector as any).assessServiceAccountRiskFromActivity(sa);

      expect(result.level).toBe('high');
      expect(result.riskFactors.some(f => f.includes('sensitive') || f.includes('Sensitive'))).toBe(true);
    });

    it('should flag recent activity', () => {
      const sa = {
        email: 'test-sa@project.iam.gserviceaccount.com',
        activityCount: 20,
        scopes: ['drive.readonly'],
        daysSinceLastSeen: 0.5 // Less than 1 day
      };

      const result = (connector as any).assessServiceAccountRiskFromActivity(sa);

      expect(result.riskFactors.some(f => f.includes('Active within last 24 hours'))).toBe(true);
    });

    it('should detect third-party automation platforms', () => {
      const sa = {
        email: 'zapier-integration@project.iam.gserviceaccount.com',
        activityCount: 80, // Higher activity count
        scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/gmail'],
        daysSinceLastSeen: 0.5 // Recent activity
      };

      const result = (connector as any).assessServiceAccountRiskFromActivity(sa);

      expect(result.level).toBe('high');
      expect(result.riskFactors.some(f => f.includes('Third-party'))).toBe(true);
    });

    it('should assign low risk to inactive service accounts with basic scopes', () => {
      const sa = {
        email: 'test-sa@project.iam.gserviceaccount.com',
        activityCount: 5,
        scopes: ['email'],
        daysSinceLastSeen: 20
      };

      const result = (connector as any).assessServiceAccountRiskFromActivity(sa);

      expect(result.level).toBe('low');
    });
  });

  describe('discoverAutomations', () => {
    beforeEach(async () => {
      await connector.authenticate(mockCredentials);
    });

    it('should orchestrate all discovery methods for Workspace account', async () => {
      // Mock account type detection
      mockAdmin.users.list.mockResolvedValueOnce({ data: {} });

      // Mock Apps Script discovery
      mockDrive.files.list.mockResolvedValueOnce({
        data: {
          files: [
            {
              id: 'script-1',
              name: 'Test Script',
              mimeType: 'application/vnd.google-apps.script',
              createdTime: '2024-01-01T00:00:00Z',
              modifiedTime: '2025-01-01T00:00:00Z'
            }
          ]
        }
      });

      mockScript.projects.getContent.mockResolvedValueOnce({
        data: { files: [] }
      });

      // Mock OAuth app discovery
      mockAdmin.tokens.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              clientId: 'chatgpt.apps.googleusercontent.com',
              displayText: 'ChatGPT',
              scopes: ['email']
            }
          ]
        }
      });

      // Mock service account discovery
      mockAdmin.activities.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
              actor: { email: 'sa@project.iam.gserviceaccount.com' },
              events: [{ name: 'authorize' }]
            }
          ]
        }
      }).mockResolvedValueOnce({
        data: { items: [] }
      });

      // Mock Drive automation discovery
      mockDrive.files.list.mockResolvedValueOnce({
        data: { files: [] }
      });

      const automations = await connector.discoverAutomations();

      expect(automations).toBeInstanceOf(Array);
      expect(automations.length).toBeGreaterThan(0);
    });

    it('should skip service account discovery for personal Gmail accounts', async () => {
      // Mock personal account
      mockOAuth2.userinfo.get.mockResolvedValueOnce({
        data: {
          id: 'personal-123',
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

      // OAuth app discovery also uses activities.list, so reset after that
      mockAdmin.activities.list.mockClear();

      const automations = await connector.discoverAutomations();

      // Service accounts should not be in results for personal accounts
      const serviceAccountAutomations = automations.filter((a: any) => a.id.startsWith('google-sa'));
      expect(serviceAccountAutomations).toHaveLength(0);
    });

    it('should handle discovery errors gracefully', async () => {
      mockAdmin.users.list.mockResolvedValueOnce({ data: {} });
      mockDrive.files.list.mockRejectedValueOnce(new Error('Drive API error'));
      mockAdmin.tokens.list.mockRejectedValueOnce(new Error('Token API error'));
      mockAdmin.activities.list.mockRejectedValueOnce(new Error('Activity API error'));

      const automations = await connector.discoverAutomations();

      // Should return empty array instead of throwing
      expect(automations).toEqual([]);
    });
  });

  describe('extractScriptPermissions', () => {
    it('should extract OAuth scopes from manifest', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'appsscript.json',
              type: 'JSON',
              source: JSON.stringify({
                oauthScopes: [
                  'https://www.googleapis.com/auth/drive',
                  'https://www.googleapis.com/auth/spreadsheets'
                ]
              })
            }
          ]
        }
      };

      const permissions = (connector as any).extractScriptPermissions(scriptContent);

      expect(permissions).toContain('https://www.googleapis.com/auth/drive');
      expect(permissions).toContain('https://www.googleapis.com/auth/spreadsheets');
    });

    it('should extract URL whitelist from manifest', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'appsscript.json',
              type: 'JSON',
              source: JSON.stringify({
                urlFetchWhitelist: [
                  'https://api.openai.com/',
                  'https://api.anthropic.com/'
                ]
              })
            }
          ]
        }
      };

      const permissions = (connector as any).extractScriptPermissions(scriptContent);

      expect(permissions).toContain('external_url:https://api.openai.com/');
      expect(permissions).toContain('external_url:https://api.anthropic.com/');
    });

    it('should handle missing manifest gracefully', () => {
      const scriptContent = {
        data: {
          files: [
            { name: 'Code.gs', source: 'function test() {}' }
          ]
        }
      };

      const permissions = (connector as any).extractScriptPermissions(scriptContent);

      expect(permissions).toEqual([]);
    });

    it('should handle invalid JSON in manifest', () => {
      const scriptContent = {
        data: {
          files: [
            {
              name: 'appsscript.json',
              type: 'JSON',
              source: 'invalid json {'
            }
          ]
        }
      };

      const permissions = (connector as any).extractScriptPermissions(scriptContent);

      expect(permissions).toEqual([]);
    });
  });
});
