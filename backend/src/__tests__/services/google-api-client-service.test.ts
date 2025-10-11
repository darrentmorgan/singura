/**
 * Unit Tests for Google API Client Service
 * Tests real Google API implementation with mocked googleapis library
 * Coverage Target: 90%+
 */

import { GoogleAPIClientService } from '../../services/google-api-client-service';
import { google } from 'googleapis';
import { GoogleOAuthCredentials } from '@singura/shared-types';

// Mock the googleapis library
jest.mock('googleapis');

describe('GoogleAPIClientService', () => {
  let service: GoogleAPIClientService;
  let mockAuth: any;
  let mockAdminReports: any;
  let mockDrive: any;
  let mockScript: any;
  let mockOAuth2: any;

  const mockCredentials: GoogleOAuthCredentials = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    scope: [
      'https://www.googleapis.com/auth/admin.reports.audit.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
    domain: 'testworkspace.com'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock clients
    mockAuth = {
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn()
    };

    mockOAuth2 = {
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: 'test-user-id',
            email: 'test@testworkspace.com',
            verified_email: true,
            name: 'Test User',
            hd: 'testworkspace.com'
          }
        })
      }
    };

    mockAdminReports = {
      activities: {
        list: jest.fn()
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

    // Mock google.auth.OAuth2 constructor
    (google.auth.OAuth2 as any) = jest.fn(() => mockAuth);
    (google.oauth2 as any) = jest.fn(() => mockOAuth2);
    (google.admin as any) = jest.fn(() => mockAdminReports);
    (google.drive as any) = jest.fn(() => mockDrive);
    (google.script as any) = jest.fn(() => mockScript);

    service = new GoogleAPIClientService();
  });

  describe('initialize', () => {
    it('should initialize with OAuth credentials and validate', async () => {
      const result = await service.initialize(mockCredentials);

      expect(result).toBe(true);
      expect(mockAuth.setCredentials).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        refresh_token: mockCredentials.refreshToken,
        token_type: mockCredentials.tokenType,
        expiry_date: mockCredentials.expiresAt.getTime()
      });
      expect(mockOAuth2.userinfo.get).toHaveBeenCalled();
    });

    it('should handle expiresAt as string (from database)', async () => {
      const credentialsWithStringDate = {
        ...mockCredentials,
        expiresAt: '2025-12-31T23:59:59.000Z' as any
      };

      // Need to ensure validation passes
      mockOAuth2.userinfo.get.mockResolvedValueOnce({
        data: {
          id: 'test-user-id',
          email: 'test@testworkspace.com',
          verified_email: true
        }
      });

      const result = await service.initialize(credentialsWithStringDate);

      expect(result).toBe(true);
      expect(mockAuth.setCredentials).toHaveBeenCalled();
    });

    it('should return false if validation fails', async () => {
      mockOAuth2.userinfo.get.mockRejectedValueOnce(new Error('Invalid credentials'));

      const result = await service.initialize(mockCredentials);

      expect(result).toBe(false);
    });
  });

  describe('validateCredentials', () => {
    it('should validate OAuth credentials successfully', async () => {
      await service.initialize(mockCredentials);

      const result = await service.validateCredentials();

      expect(result).toBe(true);
      expect(mockOAuth2.userinfo.get).toHaveBeenCalled();
    });

    it('should return false if credentials are not initialized', async () => {
      const result = await service.validateCredentials();

      expect(result).toBe(false);
    });

    it('should handle API errors during validation', async () => {
      await service.initialize(mockCredentials);
      mockOAuth2.userinfo.get.mockRejectedValueOnce(new Error('API error'));

      const result = await service.validateCredentials();

      expect(result).toBe(false);
    });
  });

  describe('getAppsScriptProjects', () => {
    beforeEach(async () => {
      await service.initialize(mockCredentials);
    });

    it('should discover Apps Script projects via Drive API', async () => {
      const mockDriveResponse = {
        data: {
          files: [
            {
              id: 'script-123',
              name: 'My Automation Script',
              mimeType: 'application/vnd.google-apps.script',
              createdTime: '2024-01-01T00:00:00Z',
              modifiedTime: '2025-01-01T00:00:00Z',
              owners: [{ emailAddress: 'owner@testworkspace.com' }],
              shared: false,
              description: 'Test automation script'
            }
          ]
        }
      };

      mockDrive.files.list.mockResolvedValueOnce(mockDriveResponse);

      // Mock script content retrieval
      mockScript.projects.getContent.mockResolvedValueOnce({
        data: {
          files: [
            {
              name: 'Code.gs',
              source: 'function test() { return "hello"; }',
              functionSet: {
                values: [{ name: 'test' }]
              }
            }
          ]
        }
      });

      const projects = await service.getAppsScriptProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].scriptId).toBe('script-123');
      expect(projects[0].title).toBe('My Automation Script');
      expect(projects[0].functions).toHaveLength(1);
      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "mimeType='application/vnd.google-apps.script'",
        pageSize: 100,
        fields: 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,owners,shared,description)',
        orderBy: 'modifiedTime desc',
        spaces: 'drive'
      });
    });

    it('should detect AI platform usage in script source (OpenAI)', async () => {
      mockDrive.files.list.mockResolvedValueOnce({
        data: {
          files: [
            {
              id: 'script-ai-123',
              name: 'OpenAI Integration',
              mimeType: 'application/vnd.google-apps.script',
              createdTime: '2024-01-01T00:00:00Z',
              modifiedTime: '2025-01-01T00:00:00Z'
            }
          ]
        }
      });

      // Script with OpenAI API calls
      mockScript.projects.getContent.mockResolvedValueOnce({
        data: {
          files: [
            {
              name: 'Code.gs',
              source: `
                function callOpenAI() {
                  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'post',
                    headers: { 'Authorization': 'Bearer sk-...' }
                  });
                }
              `,
              functionSet: {
                values: [{ name: 'callOpenAI' }]
              }
            }
          ]
        }
      });

      const projects = await service.getAppsScriptProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].scriptId).toBe('script-ai-123');
    });

    it('should detect AI platform usage in script source (Claude)', async () => {
      mockDrive.files.list.mockResolvedValueOnce({
        data: {
          files: [
            {
              id: 'script-claude-123',
              name: 'Claude Integration',
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
              source: 'const CLAUDE_API = "https://api.anthropic.com/v1/messages"; const API_KEY = "sk-ant-...";',
              functionSet: {
                values: [{ name: 'callClaude' }]
              }
            }
          ]
        }
      });

      const projects = await service.getAppsScriptProjects();

      expect(projects).toHaveLength(1);
    });

    it('should handle permission errors when reading script content', async () => {
      mockDrive.files.list.mockResolvedValueOnce({
        data: {
          files: [
            {
              id: 'script-no-access',
              name: 'Restricted Script',
              mimeType: 'application/vnd.google-apps.script',
              createdTime: '2024-01-01T00:00:00Z',
              modifiedTime: '2025-01-01T00:00:00Z'
            }
          ]
        }
      });

      mockScript.projects.getContent.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const projects = await service.getAppsScriptProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].functions).toEqual([]);
    });

    it('should return empty array if no Apps Script projects found', async () => {
      mockDrive.files.list.mockResolvedValueOnce({
        data: { files: [] }
      });

      const projects = await service.getAppsScriptProjects();

      expect(projects).toEqual([]);
    });

    it('should handle Drive API errors gracefully', async () => {
      mockDrive.files.list.mockRejectedValueOnce(new Error('Drive API error'));

      const projects = await service.getAppsScriptProjects();

      expect(projects).toEqual([]);
    });
  });

  describe('getOAuthApplications', () => {
    beforeEach(async () => {
      await service.initialize(mockCredentials);
    });

    it('should discover OAuth apps from audit logs', async () => {
      const mockLoginResponse = {
        data: {
          items: [
            {
              id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
              actor: { email: 'user@testworkspace.com' },
              events: [
                {
                  name: 'oauth2_authorize',
                  parameters: [
                    { name: 'client_id', value: '123.apps.googleusercontent.com' },
                    { name: 'app_name', value: 'Test App' },
                    { name: 'scope', multiValue: ['email', 'profile'] }
                  ]
                }
              ]
            }
          ]
        }
      };

      const mockTokenResponse = { data: { items: [] } };

      mockAdminReports.activities.list
        .mockResolvedValueOnce(mockLoginResponse)
        .mockResolvedValueOnce(mockTokenResponse);

      const apps = await service.getOAuthApplications();

      expect(apps).toHaveLength(1);
      expect(apps[0].clientId).toBe('123.apps.googleusercontent.com');
      expect(apps[0].displayText).toBe('Test App');
      expect(apps[0].scopes).toEqual(['email', 'profile']);
      expect(apps[0].isAIPlatform).toBe(false);
    });

    it('should detect ChatGPT from OAuth app name', async () => {
      mockAdminReports.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user@testworkspace.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: 'openai-web.apps.googleusercontent.com' },
                      { name: 'app_name', value: 'ChatGPT' },
                      { name: 'scope', multiValue: ['email', 'profile'] }
                    ]
                  }
                ]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const apps = await service.getOAuthApplications();

      expect(apps).toHaveLength(1);
      expect(apps[0].isAIPlatform).toBe(true);
      expect(apps[0].platformName).toBe('OpenAI / ChatGPT');
      expect(apps[0].displayText).toBe('ChatGPT');
    });

    it('should detect OpenAI from client ID', async () => {
      mockAdminReports.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user@testworkspace.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: 'openai.apps.googleusercontent.com' },
                      { name: 'app_name', value: 'OpenAI Platform' }
                    ]
                  }
                ]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const apps = await service.getOAuthApplications();

      expect(apps[0].isAIPlatform).toBe(true);
      expect(apps[0].platformName).toBe('OpenAI / ChatGPT');
    });

    it('should detect Claude from app name', async () => {
      mockAdminReports.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user@testworkspace.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: '456.apps.googleusercontent.com' },
                      { name: 'app_name', value: 'Claude AI Assistant' }
                    ]
                  }
                ]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const apps = await service.getOAuthApplications();

      expect(apps[0].isAIPlatform).toBe(true);
      expect(apps[0].platformName).toBe('Claude (Anthropic)');
    });

    it('should detect Gemini from app name', async () => {
      mockAdminReports.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user@testworkspace.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: '789.apps.googleusercontent.com' },
                      { name: 'app_name', value: 'Gemini Pro' }
                    ]
                  }
                ]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const apps = await service.getOAuthApplications();

      expect(apps[0].isAIPlatform).toBe(true);
      expect(apps[0].platformName).toBe('Gemini (Google)');
    });

    it('should aggregate scopes from multiple events for same app', async () => {
      mockAdminReports.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user@testworkspace.com' },
                events: [
                  {
                    name: 'oauth2_authorize',
                    parameters: [
                      { name: 'client_id', value: '123.apps.googleusercontent.com' },
                      { name: 'scope', multiValue: ['email'] }
                    ]
                  }
                ]
              },
              {
                id: { time: '2025-01-15T11:00:00Z', uniqueQualifier: 'event-2' },
                actor: { email: 'user2@testworkspace.com' },
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

      const apps = await service.getOAuthApplications();

      expect(apps).toHaveLength(1);
      expect(apps[0].scopes).toContain('email');
      expect(apps[0].scopes).toContain('profile');
      expect(apps[0].scopes).toContain('drive');
    });

    it('should handle permission errors gracefully', async () => {
      mockAdminReports.activities.list.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const apps = await service.getOAuthApplications();

      expect(apps).toEqual([]);
    });

    it('should return empty array if no OAuth events found', async () => {
      mockAdminReports.activities.list
        .mockResolvedValueOnce({ data: { items: [] } })
        .mockResolvedValueOnce({ data: { items: [] } });

      const apps = await service.getOAuthApplications();

      expect(apps).toEqual([]);
    });

    it('should filter non-OAuth events correctly', async () => {
      mockAdminReports.activities.list
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
                actor: { email: 'user@testworkspace.com' },
                events: [
                  {
                    name: 'login_success', // Not an OAuth event
                    parameters: []
                  }
                ]
              }
            ]
          }
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const apps = await service.getOAuthApplications();

      expect(apps).toEqual([]);
    });
  });

  describe('getServiceAccounts', () => {
    beforeEach(async () => {
      await service.initialize(mockCredentials);
    });

    it('should discover service accounts from audit logs', async () => {
      mockAdminReports.activities.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
              actor: { email: 'test-sa@project-123.iam.gserviceaccount.com' },
              events: [
                {
                  name: 'authorize',
                  parameters: [
                    { name: 'scope', multiValue: ['drive.readonly'] }
                  ]
                }
              ]
            }
          ]
        }
      });

      const accounts = await service.getServiceAccounts();

      expect(accounts).toHaveLength(1);
      expect(accounts[0].email).toBe('test-sa@project-123.iam.gserviceaccount.com');
      expect(accounts[0].projectId).toBe('project-123');
    });

    it('should handle permission errors for non-admin users', async () => {
      mockAdminReports.activities.list.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const accounts = await service.getServiceAccounts();

      expect(accounts).toEqual([]);
    });

    it('should filter out non-service-account emails', async () => {
      mockAdminReports.activities.list.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: { time: '2025-01-15T10:00:00Z', uniqueQualifier: 'event-1' },
              actor: { email: 'regular-user@testworkspace.com' }, // Not a service account
              events: [{ name: 'authorize' }]
            }
          ]
        }
      });

      const accounts = await service.getServiceAccounts();

      expect(accounts).toEqual([]);
    });
  });

  describe('ensureAuthenticated', () => {
    it('should throw error if not authenticated', async () => {
      await expect(
        (service as any).ensureAuthenticated()
      ).rejects.toThrow('Google API client not authenticated');
    });

    it('should refresh tokens if needed', async () => {
      const expiredCredentials: GoogleOAuthCredentials = {
        ...mockCredentials,
        expiresAt: new Date(Date.now() - 1000) // Expired
      };

      await service.initialize(expiredCredentials);

      mockAuth.refreshAccessToken.mockResolvedValueOnce({
        credentials: {
          access_token: 'new-access-token',
          expiry_date: Date.now() + 3600000
        }
      });

      await (service as any).ensureAuthenticated();

      expect(mockAuth.refreshAccessToken).toHaveBeenCalled();
    });
  });

  describe('getAuthenticationStatus', () => {
    it('should return authentication status', () => {
      const status = service.getAuthenticationStatus();

      expect(status).toEqual({
        isAuthenticated: false,
        hasCredentials: false,
        credentialsValid: false
      });
    });

    it('should return correct status after initialization', async () => {
      await service.initialize(mockCredentials);

      const status = service.getAuthenticationStatus();

      expect(status.isAuthenticated).toBe(true);
      expect(status.hasCredentials).toBe(true);
      expect(status.credentialsValid).toBe(true);
    });
  });
});
