import { GoogleOAuthAIDetectorService } from '../google-oauth-ai-detector.service';
import { AIplatformAuditLog } from '@singura/shared-types';

describe('GoogleOAuthAIDetectorService', () => {
  let detector: GoogleOAuthAIDetectorService;

  beforeEach(() => {
    detector = new GoogleOAuthAIDetectorService();
  });

  describe('detectAIPlatformLogin', () => {
    it('should detect ChatGPT from api.openai.com domain', () => {
      const mockGoogleEvent = {
        kind: 'admin#reports#activity',
        id: {
          time: '2025-01-15T10:30:00Z',
          uniqueQualifier: 'unique-123',
          applicationName: 'login',
          customerId: 'customer-456'
        },
        actor: {
          email: 'john.doe@company.com',
          profileId: 'profile-789',
          callerType: 'USER'
        },
        ipAddress: '192.168.1.100',
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'api.openai.com' },
            { name: 'oauth_client_id', value: 'openai-client-123' },
            { name: 'oauth_scopes', multiValue: ['email', 'profile', 'openid'] }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).not.toBeNull();
      expect(result?.platform).toBe('chatgpt');
      expect(result?.userEmail).toBe('john.doe@company.com');
      expect(result?.activityType).toBe('integration_created');
      expect(result?.metadata.applicationName).toBe('api.openai.com');
    });

    it('should detect Claude from claude.ai domain', () => {
      const mockGoogleEvent = {
        kind: 'admin#reports#activity',
        id: {
          time: '2025-01-15T14:20:00Z',
          uniqueQualifier: 'unique-456',
          applicationName: 'token',
          customerId: 'customer-456'
        },
        actor: {
          email: 'jane.smith@company.com',
          profileId: 'profile-321',
          callerType: 'USER'
        },
        events: [{
          type: 'token',
          name: 'authorize',
          parameters: [
            { name: 'client_id', value: 'anthropic-claude-client' },
            { name: 'app_name', value: 'Claude' },
            { name: 'scope', multiValue: ['email', 'profile'] }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).not.toBeNull();
      expect(result?.platform).toBe('claude');
      expect(result?.userEmail).toBe('jane.smith@company.com');
    });

    it('should detect ChatGPT from client ID pattern', () => {
      const mockGoogleEvent = {
        id: {
          time: '2025-01-15T09:00:00Z',
          uniqueQualifier: 'unique-789',
          applicationName: 'login',
          customerId: 'customer-456'
        },
        actor: {
          email: 'user@company.com',
          profileId: 'profile-111',
          callerType: 'USER'
        },
        events: [{
          type: 'login',
          name: 'oauth2_approve',
          parameters: [
            { name: 'oauth_client_id', value: 'openai-chatgpt-web-app' },
            { name: 'oauth_scopes', multiValue: ['email'] }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result?.platform).toBe('chatgpt');
    });

    it('should return null for non-AI platform OAuth', () => {
      const mockGoogleEvent = {
        id: { time: '2025-01-15T09:00:00Z', applicationName: 'login', customerId: 'c1', uniqueQualifier: 'unique-123' },
        actor: { email: 'user@company.com', profileId: 'p1', callerType: 'USER' },
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'zoom.us' }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).toBeNull();
    });

    it('should detect Perplexity AI', () => {
      const mockGoogleEvent = {
        id: { time: '2025-01-15T09:00:00Z', applicationName: 'login', customerId: 'c1', uniqueQualifier: 'unique-123' },
        actor: { email: 'user@company.com', profileId: 'p1', callerType: 'USER' },
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'www.perplexity.ai' }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result?.platform).toBe('perplexity');
      expect(result?.metadata.applicationName).toContain('perplexity');
    });

    it('should detect GitHub Copilot', () => {
      const mockGoogleEvent = {
        id: { time: '2025-01-15T09:00:00Z', applicationName: 'login', customerId: 'c1', uniqueQualifier: 'unique-123' },
        actor: { email: 'user@company.com', profileId: 'p1', callerType: 'USER' },
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'copilot.microsoft.com' }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result?.platform).toBe('copilot');
    });

    it('should handle missing events gracefully', () => {
      const mockGoogleEvent = {
        id: { time: '2025-01-15T09:00:00Z', applicationName: 'login', customerId: 'c1' },
        actor: { email: 'user@company.com', profileId: 'p1' },
        events: []
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).toBeNull();
    });

    it('should handle null event gracefully', () => {
      const result = detector.detectAIPlatformLogin(null);

      expect(result).toBeNull();
    });
  });

  describe('assessOAuthRiskIndicators', () => {
    it('should flag excessive OAuth scopes', () => {
      const parameters = {
        oauth_scopes: ['email', 'profile', 'drive', 'gmail', 'calendar', 'contacts', 'sheets']
      };

      const indicators = detector.assessOAuthRiskIndicators(parameters, 'chatgpt');

      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.type === 'security_event')).toBe(true);
    });

    it('should flag sensitive data scopes', () => {
      const parameters = {
        oauth_scopes: ['email', 'drive.readonly', 'gmail.readonly']
      };

      const indicators = detector.assessOAuthRiskIndicators(parameters, 'claude');

      expect(indicators.some(i => i.type === 'unauthorized_access')).toBe(true);
      expect(indicators.some(i => i.complianceImpact?.includes('GDPR'))).toBe(true);
    });

    it('should add policy violation for medium-risk platforms without other indicators', () => {
      const parameters = {
        oauth_scopes: ['email', 'profile']
      };

      const indicators = detector.assessOAuthRiskIndicators(parameters, 'chatgpt');

      expect(indicators.some(i => i.type === 'policy_violation')).toBe(true);
    });

    it('should handle empty scopes', () => {
      const parameters = {
        oauth_scopes: []
      };

      const indicators = detector.assessOAuthRiskIndicators(parameters, 'gemini');

      // Gemini has low risk level, so no policy violation
      expect(indicators.length).toBe(0);
    });
  });

  describe('identifyAIPlatform', () => {
    it('should identify platform by domain', () => {
      expect(detector.identifyAIPlatform('api.openai.com', undefined)).toBe('chatgpt');
      expect(detector.identifyAIPlatform('claude.ai', undefined)).toBe('claude');
      expect(detector.identifyAIPlatform('gemini.google.com', undefined)).toBe('gemini');
      expect(detector.identifyAIPlatform('perplexity.ai', undefined)).toBe('perplexity');
      expect(detector.identifyAIPlatform('copilot.microsoft.com', undefined)).toBe('copilot');
    });

    it('should identify platform by client ID', () => {
      expect(detector.identifyAIPlatform(undefined, 'openai-client-123')).toBe('chatgpt');
      expect(detector.identifyAIPlatform(undefined, 'anthropic-claude-web')).toBe('claude');
      expect(detector.identifyAIPlatform(undefined, 'github-copilot-auth')).toBe('copilot');
    });

    it('should perform case-insensitive matching', () => {
      expect(detector.identifyAIPlatform('API.OPENAI.COM', undefined)).toBe('chatgpt');
      expect(detector.identifyAIPlatform(undefined, 'ANTHROPIC-CLIENT')).toBe('claude');
    });

    it('should return null for unknown platforms', () => {
      expect(detector.identifyAIPlatform('example.com', 'unknown-client')).toBeNull();
    });

    it('should return null when both parameters are undefined', () => {
      expect(detector.identifyAIPlatform(undefined, undefined)).toBeNull();
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return list of all supported AI platforms', () => {
      const platforms = detector.getSupportedPlatforms();

      expect(platforms).toBeInstanceOf(Array);
      expect(platforms.length).toBeGreaterThan(0);

      const platformNames = platforms.map(p => p.platform);
      expect(platformNames).toContain('chatgpt');
      expect(platformNames).toContain('claude');
      expect(platformNames).toContain('gemini');
      expect(platformNames).toContain('perplexity');
      expect(platformNames).toContain('copilot');

      platforms.forEach(platform => {
        expect(platform.platform).toBeDefined();
        expect(platform.displayName).toBeDefined();
      });
    });
  });

  describe('mapOAuthEventToActivityType', () => {
    it('should map authorization events to integration_created', () => {
      const event1 = {
        events: [{
          name: 'oauth2_authorize',
          parameters: []
        }]
      };

      const event2 = {
        events: [{
          name: 'oauth2_approve',
          parameters: []
        }]
      };

      expect(detector['mapOAuthEventToActivityType']('oauth2_authorize')).toBe('integration_created');
      expect(detector['mapOAuthEventToActivityType']('oauth2_approve')).toBe('integration_created');
    });

    it('should map login events to login activity', () => {
      expect(detector['mapOAuthEventToActivityType']('login_success')).toBe('login');
    });

    it('should map logout events to logout activity', () => {
      expect(detector['mapOAuthEventToActivityType']('logout')).toBe('logout');
    });

    it('should map revoke events to api_key_deleted', () => {
      expect(detector['mapOAuthEventToActivityType']('token_revoke')).toBe('api_key_deleted');
    });

    it('should default to login for unknown events', () => {
      expect(detector['mapOAuthEventToActivityType']('unknown_event')).toBe('login');
    });
  });

  describe('extractParameters', () => {
    it('should extract multiValue parameters', () => {
      const events = [{
        parameters: [
          { name: 'oauth_scopes', multiValue: ['email', 'profile'] }
        ]
      }];

      const params = detector['extractParameters'](events);

      expect(params.oauth_scopes).toEqual(['email', 'profile']);
    });

    it('should extract value parameters', () => {
      const events = [{
        parameters: [
          { name: 'application_name', value: 'api.openai.com' }
        ]
      }];

      const params = detector['extractParameters'](events);

      expect(params.application_name).toBe('api.openai.com');
    });

    it('should extract intValue parameters', () => {
      const events = [{
        parameters: [
          { name: 'token_lifetime', intValue: '3600' }
        ]
      }];

      const params = detector['extractParameters'](events);

      expect(params.token_lifetime).toBe(3600);
    });

    it('should extract boolValue parameters', () => {
      const events = [{
        parameters: [
          { name: 'is_third_party', boolValue: true }
        ]
      }];

      const params = detector['extractParameters'](events);

      expect(params.is_third_party).toBe(true);
    });

    it('should handle multiple events and parameters', () => {
      const events = [
        {
          parameters: [
            { name: 'param1', value: 'value1' },
            { name: 'param2', multiValue: ['a', 'b'] }
          ]
        },
        {
          parameters: [
            { name: 'param3', intValue: '100' }
          ]
        }
      ];

      const params = detector['extractParameters'](events);

      expect(params.param1).toBe('value1');
      expect(params.param2).toEqual(['a', 'b']);
      expect(params.param3).toBe(100);
    });

    it('should handle events without parameters', () => {
      const events = [{}];

      const params = detector['extractParameters'](events);

      expect(params).toEqual({});
    });
  });

  describe('isOAuthEvent', () => {
    it('should identify OAuth authorization events', () => {
      const event = {
        events: [{
          name: 'oauth2_authorize'
        }]
      };

      expect(detector['isOAuthEvent'](event)).toBe(true);
    });

    it('should identify OAuth approve events', () => {
      const event = {
        events: [{
          name: 'oauth2_approve'
        }]
      };

      expect(detector['isOAuthEvent'](event)).toBe(true);
    });

    it('should identify token authorization events', () => {
      const event = {
        events: [{
          name: 'authorize'
        }]
      };

      expect(detector['isOAuthEvent'](event)).toBe(true);
    });

    it('should identify token revoke events', () => {
      const event = {
        events: [{
          name: 'token_revoke'
        }]
      };

      expect(detector['isOAuthEvent'](event)).toBe(true);
    });

    it('should identify login success events', () => {
      const event = {
        events: [{
          name: 'login_success'
        }]
      };

      expect(detector['isOAuthEvent'](event)).toBe(true);
    });

    it('should not identify non-OAuth events', () => {
      const event = {
        events: [{
          name: 'create_user'
        }]
      };

      expect(detector['isOAuthEvent'](event)).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      const event = {
        events: [{
          name: 'OAUTH2_AUTHORIZE'
        }]
      };

      expect(detector['isOAuthEvent'](event)).toBe(true);
    });
  });

  describe('normalizeToAIPlatformLog', () => {
    it('should create complete AIplatformAuditLog with all fields', () => {
      const mockGoogleEvent = {
        id: {
          time: '2025-01-15T10:30:00Z',
          uniqueQualifier: 'unique-123',
          applicationName: 'login',
          customerId: 'customer-456'
        },
        actor: {
          email: 'john.doe@company.com',
          profileId: 'profile-789',
          callerType: 'USER'
        },
        ipAddress: '192.168.1.100',
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'api.openai.com' },
            { name: 'oauth_client_id', value: 'openai-client-123' },
            { name: 'oauth_scopes', multiValue: ['email', 'profile', 'openid'] },
            { name: 'user_agent', value: 'Mozilla/5.0' }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('unique-123');
      expect(result?.platform).toBe('chatgpt');
      expect(result?.timestamp).toEqual(new Date('2025-01-15T10:30:00Z'));
      expect(result?.userId).toBe('profile-789');
      expect(result?.userEmail).toBe('john.doe@company.com');
      expect(result?.organizationId).toBe('customer-456');
      expect(result?.activityType).toBe('integration_created');
      expect(result?.action).toBe('oauth2_authorize');
      expect(result?.metadata.applicationName).toBe('api.openai.com');
      expect(result?.metadata.clientId).toBe('openai-client-123');
      expect(result?.metadata.scopes).toEqual(['email', 'profile', 'openid']);
      expect(result?.metadata.platformDisplayName).toBe('ChatGPT');
      expect(result?.ipAddress).toBe('192.168.1.100');
      expect(result?.userAgent).toBe('Mozilla/5.0');
      expect(result?.riskIndicators).toBeDefined();
    });
  });
});