/**
 * Google Workspace Connector Unit Tests
 * Tests Google platform connector functionality in isolation
 */

import { GoogleConnector } from '../../src/connectors/google';
import { OAuthCredentials } from '../../src/connectors/types';

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        credentials: { scope: 'https://www.googleapis.com/auth/drive' }
      }))
    },
    oauth2: jest.fn(() => ({
      userinfo: {
        get: jest.fn()
      },
      tokeninfo: jest.fn()
    })),
    admin: jest.fn(() => ({
      domains: {
        list: jest.fn()
      },
      tokens: {
        list: jest.fn()
      },
      activities: {
        list: jest.fn()
      }
    })),
    script: jest.fn(() => ({
      projects: {
        list: jest.fn(),
        get: jest.fn()
      }
    })),
    drive: jest.fn(() => ({
      files: {
        list: jest.fn()
      },
      drives: {
        list: jest.fn()
      },
      about: {
        get: jest.fn()
      }
    }))
  }
}));

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
    credentials: { scope: 'https://www.googleapis.com/auth/drive' }
  }))
}));

// Mock encrypted credential repository
jest.mock('../../src/database/repositories/encrypted-credential', () => ({
  encryptedCredentialRepository: {
    getDecryptedValue: jest.fn(),
  },
}));

describe('GoogleConnector', () => {
  let googleConnector: GoogleConnector;
  let mockOAuth2Client: any;
  let mockOAuth2Api: any;
  let mockAdminSDK: any;
  let mockScriptAPI: any;
  let mockDriveAPI: any;

  const mockCredentials: OAuthCredentials = {
    accessToken: 'ya29.mock-google-access-token',
    refreshToken: '1//mock-google-refresh-token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000),
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/script.projects.readonly'
  };

  const mockGoogleResponses = {
    userInfo: {
      data: {
        id: '123456789012345678901',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en',
        hd: 'example.com'
      }
    },

    domainList: {
      data: {
        domains: [
          {
            domainName: 'example.com',
            isPrimary: true,
            verified: true,
            creationTime: '2020-01-01T00:00:00.000Z'
          }
        ]
      }
    },

    tokenInfo: {
      data: {
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        expires_in: 3599,
        access_type: 'offline',
        audience: 'mock-client-id'
      }
    },

    appsScriptProjects: {
      data: {
        projects: [
          {
            scriptId: 'MockScriptId123',
            title: 'Test Apps Script Project',
            description: 'A test Apps Script project',
            createTime: '2023-01-01T00:00:00.000Z',
            updateTime: '2023-01-02T00:00:00.000Z',
            parentId: 'MockParentId'
          },
          {
            scriptId: 'MockScriptId456',
            title: 'Email Automation Script',
            description: 'Script for automating email tasks',
            createTime: '2023-01-03T00:00:00.000Z',
            updateTime: '2023-01-04T00:00:00.000Z'
          }
        ]
      }
    },

    scriptDetails: {
      data: {
        scriptId: 'MockScriptId123',
        title: 'Test Apps Script Project',
        description: 'A test Apps Script project',
        runtimeVersion: 'V8',
        executionApi: {
          accessLevel: 'ANYONE'
        },
        functionSet: {
          values: [
            { name: 'myFunction' },
            { name: 'onOpen' },
            { name: 'processData' }
          ]
        }
      }
    },

    oauthTokens: {
      data: {
        items: [
          {
            clientId: 'mock-oauth-client-id-1',
            displayText: 'Third Party Integration',
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            userKey: 'test@example.com',
            status: 'approved',
            nativeApp: false,
            anonymous: false
          },
          {
            clientId: 'mock-oauth-client-id-2',
            displayText: 'Analytics Dashboard',
            scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
            userKey: 'test@example.com', 
            status: 'approved',
            nativeApp: true,
            anonymous: false
          }
        ]
      }
    },

    driveFiles: {
      data: {
        files: [
          {
            id: 'MockFileId123',
            name: 'Automation Script.gs',
            mimeType: 'application/vnd.google-apps.script',
            createdTime: '2023-01-01T00:00:00.000Z',
            modifiedTime: '2023-01-02T00:00:00.000Z',
            owners: [{ displayName: 'Test User', emailAddress: 'test@example.com' }],
            shared: true
          }
        ]
      }
    },

    sharedDrives: {
      data: {
        drives: [
          {
            id: 'MockDriveId123',
            name: 'Automation Files',
            createdTime: '2023-01-01T00:00:00.000Z',
            hidden: false,
            restrictions: {},
            capabilities: {
              canCopy: true,
              canEdit: true
            }
          },
          {
            id: 'MockDriveId456',
            name: 'Bot Scripts Drive',
            createdTime: '2023-01-01T00:00:00.000Z',
            hidden: false
          }
        ]
      }
    },

    adminAuditLogs: {
      data: {
        items: [
          {
            id: {
              time: '2023-01-01T12:00:00.000Z',
              uniqueQualifier: 'audit-123'
            },
            actor: {
              email: 'test@example.com',
              callerType: 'USER'
            },
            events: [
              {
                type: 'admin',
                name: 'CREATE_APPLICATION',
                parameters: [
                  { name: 'APPLICATION_NAME', value: 'Test App' }
                ]
              }
            ],
            ipAddress: '192.168.1.100',
            ownerDomain: 'example.com',
            customerId: 'C01234567'
          }
        ]
      }
    }
  };

  beforeEach(() => {
    googleConnector = new GoogleConnector();
    
    const { google } = require('googleapis');
    mockOAuth2Client = google.auth.OAuth2.mock.results[0].value;
    mockOAuth2Api = google.oauth2();
    mockAdminSDK = google.admin();
    mockScriptAPI = google.script();
    mockDriveAPI = google.drive();

    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockAdminSDK.domains.list.mockResolvedValue(mockGoogleResponses.domainList);

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe('123456789012345678901');
      expect(result.platformWorkspaceId).toBe('example.com');
      expect(result.displayName).toContain('Test User');
      expect(result.metadata).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        domain: 'example.com',
        isAdmin: true
      });
    });

    it('should handle authentication without admin permissions', async () => {
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockAdminSDK.domains.list.mockRejectedValue(new Error('Insufficient permissions'));

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.metadata.isAdmin).toBe(false);
      expect(result.platformWorkspaceId).toBe('example.com'); // Falls back to hd from user info
    });

    it('should handle personal Google accounts', async () => {
      const personalUserInfo = {
        data: {
          ...mockGoogleResponses.userInfo.data,
          hd: undefined // No hosted domain for personal accounts
        }
      };
      
      mockOAuth2Api.userinfo.get.mockResolvedValue(personalUserInfo);
      mockAdminSDK.domains.list.mockRejectedValue(new Error('No domain'));

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.platformWorkspaceId).toBe('personal');
      expect(result.metadata.isAdmin).toBe(false);
    });

    it('should handle authentication failure', async () => {
      mockOAuth2Api.userinfo.get.mockRejectedValue(new Error('Invalid credentials'));

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.errorCode).toBe('GOOGLE_AUTH_ERROR');
    });

    it('should handle missing user information', async () => {
      mockOAuth2Api.userinfo.get.mockResolvedValue({ data: null });

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get user information');
    });
  });

  describe('Automation Discovery', () => {
    beforeEach(async () => {
      // Setup authenticated client
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockAdminSDK.domains.list.mockResolvedValue(mockGoogleResponses.domainList);
      
      await googleConnector.authenticate(mockCredentials);
    });

    it('should discover Apps Script projects', async () => {
      mockScriptAPI.projects.list.mockResolvedValue(mockGoogleResponses.appsScriptProjects);
      mockScriptAPI.projects.get.mockResolvedValue(mockGoogleResponses.scriptDetails);

      const automations = await googleConnector.discoverAutomations();

      const scriptAutomations = automations.filter(a => a.type === 'integration');
      expect(scriptAutomations.length).toBeGreaterThan(0);
      
      const firstScript = scriptAutomations[0];
      expect(firstScript).toMatchObject({
        id: 'google-script-MockScriptId123',
        name: 'Test Apps Script Project',
        type: 'integration',
        platform: 'google',
        status: 'active'
      });
      expect(firstScript.metadata.functions).toEqual(['myFunction', 'onOpen', 'processData']);
      expect(firstScript.riskLevel).toBe('high'); // Because executionApi.accessLevel is 'ANYONE'
    });

    it('should discover OAuth applications', async () => {
      mockAdminSDK.tokens.list.mockResolvedValue(mockGoogleResponses.oauthTokens);

      const automations = await googleConnector.discoverAutomations();

      const oauthApps = automations.filter(a => a.id.includes('oauth'));
      expect(oauthApps.length).toBe(2);
      
      const firstApp = oauthApps[0];
      expect(firstApp).toMatchObject({
        id: 'google-oauth-mock-oauth-client-id-1',
        name: 'Third Party Integration',
        type: 'integration',
        platform: 'google',
        status: 'active',
        permissions: ['https://www.googleapis.com/auth/drive.readonly']
      });
    });

    it('should discover Drive-based automations', async () => {
      mockDriveAPI.drives.list.mockResolvedValue(mockGoogleResponses.sharedDrives);
      mockDriveAPI.files.list.mockResolvedValue(mockGoogleResponses.driveFiles);

      const automations = await googleConnector.discoverAutomations();

      const driveAutomations = automations.filter(a => a.id.includes('drive'));
      expect(driveAutomations.length).toBeGreaterThan(0);
      
      // Should find the automation-named shared drive
      const automationDrive = driveAutomations.find(a => a.name === 'Automation Files');
      expect(automationDrive).toBeDefined();
      expect(automationDrive?.type).toBe('integration');
    });

    it('should handle discovery errors gracefully', async () => {
      mockScriptAPI.projects.list.mockRejectedValue(new Error('Apps Script API error'));
      mockAdminSDK.tokens.list.mockRejectedValue(new Error('Admin API error'));
      mockDriveAPI.drives.list.mockResolvedValue({ data: { drives: [] } });

      const automations = await googleConnector.discoverAutomations();

      // Should not throw and return whatever was successful
      expect(Array.isArray(automations)).toBe(true);
    });

    it('should handle empty responses', async () => {
      mockScriptAPI.projects.list.mockResolvedValue({ data: { projects: [] } });
      mockAdminSDK.tokens.list.mockResolvedValue({ data: { items: [] } });
      mockDriveAPI.drives.list.mockResolvedValue({ data: { drives: [] } });
      mockDriveAPI.files.list.mockResolvedValue({ data: { files: [] } });

      const automations = await googleConnector.discoverAutomations();

      expect(automations).toEqual([]);
    });

    it('should assess risk levels correctly', async () => {
      // Mock script with high-risk configuration
      const highRiskScript = {
        data: {
          scriptId: 'HighRiskScript',
          title: 'High Risk Script',
          executionApi: { accessLevel: 'ANYONE' },
          functionSet: { values: Array.from({length: 15}, (_, i) => ({ name: `func${i}` })) }
        }
      };

      mockScriptAPI.projects.list.mockResolvedValue({
        data: { projects: [{ scriptId: 'HighRiskScript', title: 'High Risk Script' }] }
      });
      mockScriptAPI.projects.get.mockResolvedValue(highRiskScript);

      const automations = await googleConnector.discoverAutomations();

      const highRiskAutomation = automations.find(a => a.name === 'High Risk Script');
      expect(highRiskAutomation?.riskLevel).toBe('high');
    });
  });

  describe('Audit Logs', () => {
    beforeEach(async () => {
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockAdminSDK.domains.list.mockResolvedValue(mockGoogleResponses.domainList);
      
      await googleConnector.authenticate(mockCredentials);
    });

    it('should retrieve admin audit logs successfully', async () => {
      const { google } = require('googleapis');
      const mockReportsAPI = {
        activities: {
          list: jest.fn().mockResolvedValue(mockGoogleResponses.adminAuditLogs)
        }
      };
      google.admin.mockImplementation((config: any) => {
        if (config.version === 'reports_v1') {
          return mockReportsAPI;
        }
        return mockAdminSDK;
      });

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const auditLogs = await googleConnector.getAuditLogs(since);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        id: 'audit-123',
        actorId: 'test@example.com',
        actorType: 'user',
        actionType: 'CREATE_APPLICATION',
        resourceType: 'admin',
        ipAddress: '192.168.1.100'
      });
    });

    it('should handle missing admin permissions', async () => {
      const { google } = require('googleapis');
      const mockReportsAPI = {
        activities: {
          list: jest.fn().mockRejectedValue(new Error('Insufficient permissions'))
        }
      };
      google.admin.mockImplementation((config: any) => {
        if (config.version === 'reports_v1') {
          return mockReportsAPI;
        }
        return mockAdminSDK;
      });

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const auditLogs = await googleConnector.getAuditLogs(since);

      expect(auditLogs).toEqual([]);
    });
  });

  describe('Permission Validation', () => {
    beforeEach(async () => {
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockAdminSDK.domains.list.mockResolvedValue(mockGoogleResponses.domainList);
      
      await googleConnector.authenticate(mockCredentials);
    });

    it('should validate permissions successfully', async () => {
      mockOAuth2Api.tokeninfo.mockResolvedValue(mockGoogleResponses.tokenInfo);
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockScriptAPI.projects.list.mockResolvedValue({ data: { projects: [] } });
      mockDriveAPI.about.get.mockResolvedValue({ data: { user: {} } });

      const permissionCheck = await googleConnector.validatePermissions();

      expect(permissionCheck.isValid).toBe(true);
      expect(permissionCheck.permissions).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(permissionCheck.errors).toHaveLength(0);
    });

    it('should detect missing required permissions', async () => {
      const limitedTokenInfo = {
        data: {
          ...mockGoogleResponses.tokenInfo.data,
          scope: 'https://www.googleapis.com/auth/userinfo.email' // Missing profile scope
        }
      };

      mockOAuth2Api.tokeninfo.mockResolvedValue(limitedTokenInfo);
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockScriptAPI.projects.list.mockRejectedValue(new Error('Insufficient OAuth scope'));
      mockDriveAPI.about.get.mockRejectedValue(new Error('Insufficient OAuth scope'));

      const permissionCheck = await googleConnector.validatePermissions();

      expect(permissionCheck.isValid).toBe(false);
      expect(permissionCheck.missingPermissions).toContain('https://www.googleapis.com/auth/userinfo.profile');
      expect(permissionCheck.errors.length).toBeGreaterThan(0);
    });

    it('should handle token validation failure', async () => {
      mockOAuth2Api.tokeninfo.mockRejectedValue(new Error('Invalid token'));

      const permissionCheck = await googleConnector.validatePermissions();

      expect(permissionCheck.isValid).toBe(false);
      expect(permissionCheck.errors).toContain('Invalid token');
    });

    it('should test individual API permissions', async () => {
      mockOAuth2Api.tokeninfo.mockResolvedValue(mockGoogleResponses.tokenInfo);
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      
      // Mock one API succeeding and another failing
      mockScriptAPI.projects.list.mockResolvedValue({ data: { projects: [] } });
      mockDriveAPI.about.get.mockRejectedValue(new Error('Drive access denied'));

      const permissionCheck = await googleConnector.validatePermissions();

      expect(permissionCheck.missingPermissions).toContain('drive.readonly');
      expect(permissionCheck.errors.some(e => e.includes('Drive access denied'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API quota exceeded errors', async () => {
      const quotaError = {
        code: 403,
        message: 'Quota exceeded for quota metric \'Queries\' and limit \'Queries per day\''
      };

      mockOAuth2Api.userinfo.get.mockRejectedValue(quotaError);

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quota exceeded');
    });

    it('should handle network connectivity issues', async () => {
      mockOAuth2Api.userinfo.get.mockRejectedValue(new Error('ENOTFOUND googleapis.com'));

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOTFOUND');
    });

    it('should handle malformed API responses', async () => {
      mockOAuth2Api.userinfo.get.mockResolvedValue({ data: undefined });

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get user information');
    });

    it('should handle OAuth token expiration', async () => {
      const expiredTokenError = {
        code: 401,
        message: 'Invalid Credentials'
      };

      mockOAuth2Api.userinfo.get.mockRejectedValue(expiredTokenError);

      const result = await googleConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('GOOGLE_AUTH_ERROR');
    });
  });

  describe('Static Helper Methods', () => {
    it('should get authenticated client for connection', async () => {
      const mockCredentialRepo = require('../../src/database/repositories/encrypted-credential').encryptedCredentialRepository;
      
      mockCredentialRepo.getDecryptedValue
        .mockResolvedValueOnce('ya29.mock-access-token')
        .mockResolvedValueOnce('1//mock-refresh-token');

      const client = await GoogleConnector.getClientForConnection('test-connection-id');

      expect(client).toBeDefined();
      expect(mockCredentialRepo.getDecryptedValue).toHaveBeenCalledTimes(2);
      expect(mockCredentialRepo.getDecryptedValue).toHaveBeenCalledWith('test-connection-id', 'access_token');
      expect(mockCredentialRepo.getDecryptedValue).toHaveBeenCalledWith('test-connection-id', 'refresh_token');
    });

    it('should throw error when no access token found', async () => {
      const mockCredentialRepo = require('../../src/database/repositories/encrypted-credential').encryptedCredentialRepository;
      
      mockCredentialRepo.getDecryptedValue.mockResolvedValue(null);

      await expect(
        GoogleConnector.getClientForConnection('test-connection-id')
      ).rejects.toThrow('No access token found for Google connection');
    });
  });

  describe('Advanced Discovery Scenarios', () => {
    beforeEach(async () => {
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGoogleResponses.userInfo);
      mockAdminSDK.domains.list.mockResolvedValue(mockGoogleResponses.domainList);
      
      await googleConnector.authenticate(mockCredentials);
    });

    it('should discover complex Apps Script projects with detailed metadata', async () => {
      const complexScript = {
        data: {
          projects: [
            {
              scriptId: 'ComplexScript123',
              title: 'Complex Automation Script',
              description: 'Multi-function automation script',
              createTime: '2023-01-01T00:00:00.000Z',
              updateTime: '2023-01-15T00:00:00.000Z',
              parentId: 'ParentFolder123'
            }
          ]
        }
      };

      const complexScriptDetails = {
        data: {
          scriptId: 'ComplexScript123',
          runtimeVersion: 'V8',
          executionApi: { accessLevel: 'DOMAIN' },
          functionSet: {
            values: [
              { name: 'onFormSubmit' },
              { name: 'sendEmailNotifications' },
              { name: 'updateSpreadsheet' },
              { name: 'processWebhook' }
            ]
          }
        }
      };

      mockScriptAPI.projects.list.mockResolvedValue(complexScript);
      mockScriptAPI.projects.get.mockResolvedValue(complexScriptDetails);

      const automations = await googleConnector.discoverAutomations();
      const scriptAutomation = automations.find(a => a.id === 'google-script-ComplexScript123');

      expect(scriptAutomation).toMatchObject({
        name: 'Complex Automation Script',
        riskLevel: 'medium', // DOMAIN access level
        metadata: {
          scriptId: 'ComplexScript123',
          runtimeVersion: 'V8',
          functionCount: 4,
          functions: ['onFormSubmit', 'sendEmailNotifications', 'updateSpreadsheet', 'processWebhook']
        }
      });
    });

    it('should handle pagination in large API responses', async () => {
      // Mock paginated Apps Script response
      const firstPage = {
        data: {
          projects: Array.from({ length: 50 }, (_, i) => ({
            scriptId: `Script${i}`,
            title: `Script ${i}`,
            createTime: '2023-01-01T00:00:00.000Z'
          })),
          nextPageToken: 'next-page-token'
        }
      };

      const secondPage = {
        data: {
          projects: Array.from({ length: 25 }, (_, i) => ({
            scriptId: `Script${i + 50}`,
            title: `Script ${i + 50}`,
            createTime: '2023-01-01T00:00:00.000Z'
          }))
        }
      };

      mockScriptAPI.projects.list
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      // Mock script details for a few scripts
      mockScriptAPI.projects.get.mockImplementation((params: any) => {
        return Promise.resolve({
          data: {
            scriptId: params.scriptId,
            runtimeVersion: 'V8',
            executionApi: { accessLevel: 'OWNER' }
          }
        });
      });

      const automations = await googleConnector.discoverAutomations();
      const scriptAutomations = automations.filter(a => a.type === 'integration' && a.id.includes('script'));

      // Should handle all scripts from both pages
      expect(scriptAutomations.length).toBeGreaterThanOrEqual(50);
    });

    it('should identify high-risk automation patterns', async () => {
      const highRiskPatterns = [
        {
          scriptId: 'ElevatedScript',
          title: 'Admin Automation Script', 
          executionApi: { accessLevel: 'ANYONE' },
          functionCount: 20
        },
        {
          scriptId: 'DataScript', 
          title: 'Data Export Script',
          executionApi: { accessLevel: 'DOMAIN' },
          functionCount: 5
        }
      ];

      mockScriptAPI.projects.list.mockResolvedValue({
        data: {
          projects: highRiskPatterns.map(p => ({
            scriptId: p.scriptId,
            title: p.title,
            createTime: '2023-01-01T00:00:00.000Z'
          }))
        }
      });

      mockScriptAPI.projects.get.mockImplementation((params: any) => {
        const pattern = highRiskPatterns.find(p => p.scriptId === params.scriptId);
        return Promise.resolve({
          data: {
            scriptId: params.scriptId,
            executionApi: pattern?.executionApi,
            functionSet: { 
              values: Array.from({ length: pattern?.functionCount || 1 }, (_, i) => ({ name: `func${i}` }))
            }
          }
        });
      });

      const automations = await googleConnector.discoverAutomations();

      const elevatedScript = automations.find(a => a.name === 'Admin Automation Script');
      const dataScript = automations.find(a => a.name === 'Data Export Script');

      expect(elevatedScript?.riskLevel).toBe('high'); // ANYONE access + many functions
      expect(dataScript?.riskLevel).toBe('low'); // DOMAIN access + few functions
    });
  });
});