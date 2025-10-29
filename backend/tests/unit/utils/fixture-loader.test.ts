import {
  loadFixture,
  loadFixtures,
  fixtureExists,
  loadAllFixtures,
} from '../../../src/utils/fixture-loader';

describe('fixture-loader utilities', () => {
  describe('loadFixture', () => {
    it('should load a single fixture', () => {
      const fixture = loadFixture('slack', '1.0', 'oauth/token-response.json');

      expect(fixture).toBeDefined();
      expect(fixture.ok).toBe(true);
      expect(fixture.access_token).toBeDefined();
    });

    it('should support generic type parameter', () => {
      interface SlackTokenResponse {
        ok: boolean;
        access_token: string;
        token_type: string;
      }

      const fixture = loadFixture<SlackTokenResponse>('slack', '1.0', 'oauth/token-response.json');

      expect(fixture.ok).toBe(true);
      expect(typeof fixture.access_token).toBe('string');
    });

    it('should throw error for non-existent fixture', () => {
      expect(() => {
        loadFixture('slack', '1.0', 'non-existent.json');
      }).toThrow(/Fixture not found/);
    });
  });

  describe('loadFixtures (batch)', () => {
    it('should load multiple fixtures in batch', () => {
      const fixtures = loadFixtures([
        { platform: 'slack', version: '1.0', scenario: 'oauth/token-response.json' },
        { platform: 'google', version: '1.0', scenario: 'oauth/token-response.json' },
        { platform: 'microsoft', version: '1.0', scenario: 'oauth/token-response.json' },
      ]);

      expect(fixtures).toBeInstanceOf(Array);
      expect(fixtures.length).toBe(3);

      // Validate Slack fixture
      expect(fixtures[0].ok).toBe(true);
      expect(fixtures[0].access_token).toContain('xoxb-');

      // Validate Google fixture
      expect(fixtures[1].access_token).toContain('ya29.');
      expect(fixtures[1].token_type).toBe('Bearer');

      // Validate Microsoft fixture
      expect(fixtures[2].token_type).toBe('Bearer');
      expect(fixtures[2].expires_in).toBe(3599);
    });

    it('should load fixtures from different platforms', () => {
      const fixtures = loadFixtures([
        { platform: 'slack', version: '1.0', scenario: 'oauth/token-response.json' },
        { platform: 'slack', version: '1.0', scenario: 'oauth/token-refresh.json' },
        { platform: 'slack', version: '1.0', scenario: 'oauth/token-revoke.json' },
      ]);

      expect(fixtures).toBeInstanceOf(Array);
      expect(fixtures.length).toBe(3);

      // All should be Slack fixtures
      fixtures.forEach((fixture) => {
        expect(fixture.ok).toBeDefined();
      });
    });

    it('should return empty array for empty request list', () => {
      const fixtures = loadFixtures([]);

      expect(fixtures).toEqual([]);
    });

    it('should throw error if any fixture fails to load', () => {
      expect(() => {
        loadFixtures([
          { platform: 'slack', version: '1.0', scenario: 'oauth/token-response.json' },
          { platform: 'slack', version: '1.0', scenario: 'non-existent.json' }, // This should fail
        ]);
      }).toThrow(/Fixture not found/);
    });

    it('should support generic type parameter', () => {
      interface OAuthTokenResponse {
        access_token: string;
        token_type: string;
      }

      const fixtures = loadFixtures<OAuthTokenResponse>([
        { platform: 'slack', version: '1.0', scenario: 'oauth/token-response.json' },
        { platform: 'google', version: '1.0', scenario: 'oauth/token-response.json' },
      ]);

      fixtures.forEach((fixture) => {
        expect(typeof fixture.access_token).toBe('string');
        expect(typeof fixture.token_type).toBe('string');
      });
    });
  });

  describe('fixtureExists', () => {
    it('should return true for existing fixtures', () => {
      expect(fixtureExists('slack', '1.0', 'oauth/token-response.json')).toBe(true);
      expect(fixtureExists('google', '1.0', 'oauth/token-response.json')).toBe(true);
      expect(fixtureExists('microsoft', '1.0', 'oauth/token-response.json')).toBe(true);
    });

    it('should return false for non-existent fixtures', () => {
      expect(fixtureExists('slack', '1.0', 'non-existent.json')).toBe(false);
      expect(fixtureExists('invalid-platform', '1.0', 'oauth/token-response.json')).toBe(false);
      expect(fixtureExists('slack', '99.0', 'oauth/token-response.json')).toBe(false);
    });

    it('should check nested path fixtures', () => {
      expect(fixtureExists('slack', '1.0', 'audit-logs/bot-detected.json')).toBe(true);
      expect(fixtureExists('google', '1.0', 'audit-logs/apps-script-detected.json')).toBe(true);
      expect(fixtureExists('microsoft', '1.0', 'audit-logs/power-automate-detected.json')).toBe(true);
    });

    it('should check edge case fixtures', () => {
      expect(fixtureExists('slack', '1.0', 'edge-cases/rate-limit-response.json')).toBe(true);
      expect(fixtureExists('google', '1.0', 'edge-cases/rate-limit-response.json')).toBe(true);
      expect(fixtureExists('microsoft', '1.0', 'edge-cases/rate-limit-response.json')).toBe(true);
    });
  });

  describe('loadAllFixtures', () => {
    it('should load all Slack v1.0 fixtures', () => {
      const fixtures = loadAllFixtures('slack', '1.0');

      expect(typeof fixtures).toBe('object');
      expect(fixtures).not.toBeNull();

      // Should have OAuth fixtures
      expect(fixtures['oauth/token-response']).toBeDefined();
      expect(fixtures['oauth/token-refresh']).toBeDefined();
      expect(fixtures['oauth/token-revoke']).toBeDefined();

      // Should have audit log fixtures
      expect(fixtures['audit-logs/bot-detected']).toBeDefined();
      expect(fixtures['audit-logs/user-list']).toBeDefined();
      expect(fixtures['audit-logs/workspace-info']).toBeDefined();

      // Should have edge case fixtures
      expect(fixtures['edge-cases/rate-limit-response']).toBeDefined();
      expect(fixtures['edge-cases/invalid-token-response']).toBeDefined();
      expect(fixtures['edge-cases/scope-insufficient']).toBeDefined();
    });

    it('should load all Google v1.0 fixtures', () => {
      const fixtures = loadAllFixtures('google', '1.0');

      expect(typeof fixtures).toBe('object');
      expect(fixtures).not.toBeNull();

      // Should have OAuth fixtures
      expect(fixtures['oauth/token-response']).toBeDefined();
      expect(fixtures['oauth/token-refresh']).toBeDefined();
      expect(fixtures['oauth/token-revoke']).toBeDefined();

      // Should have audit log fixtures
      expect(fixtures['audit-logs/apps-script-detected']).toBeDefined();
      expect(fixtures['audit-logs/service-account-list']).toBeDefined();
      expect(fixtures['audit-logs/drive-automation']).toBeDefined();

      // Should have edge case fixtures
      expect(fixtures['edge-cases/rate-limit-response']).toBeDefined();
      expect(fixtures['edge-cases/invalid-token-response']).toBeDefined();
      expect(fixtures['edge-cases/scope-insufficient']).toBeDefined();
    });

    it('should load all Microsoft v1.0 fixtures', () => {
      const fixtures = loadAllFixtures('microsoft', '1.0');

      expect(typeof fixtures).toBe('object');
      expect(fixtures).not.toBeNull();

      // Should have OAuth fixtures
      expect(fixtures['oauth/token-response']).toBeDefined();
      expect(fixtures['oauth/token-refresh']).toBeDefined();
      expect(fixtures['oauth/token-revoke']).toBeDefined();

      // Should have audit log fixtures
      expect(fixtures['audit-logs/power-automate-detected']).toBeDefined();
      expect(fixtures['audit-logs/azure-app-list']).toBeDefined();
      expect(fixtures['audit-logs/teams-app-info']).toBeDefined();

      // Should have edge case fixtures
      expect(fixtures['edge-cases/rate-limit-response']).toBeDefined();
      expect(fixtures['edge-cases/invalid-token-response']).toBeDefined();
      expect(fixtures['edge-cases/scope-insufficient']).toBeDefined();
    });

    it('should return empty object for non-existent platform', () => {
      const fixtures = loadAllFixtures('non-existent', '1.0');

      expect(fixtures).toEqual({});
    });

    it('should return empty object for non-existent version', () => {
      const fixtures = loadAllFixtures('slack', '99.0');

      expect(fixtures).toEqual({});
    });

    it('should use scenario path (without .json) as key', () => {
      const fixtures = loadAllFixtures('slack', '1.0');

      // Keys should not include .json extension
      Object.keys(fixtures).forEach((key) => {
        expect(key.endsWith('.json')).toBe(false);
      });

      // Should be able to access by path
      expect(fixtures['oauth/token-response']).toBeDefined();
      expect(fixtures['audit-logs/bot-detected']).toBeDefined();
    });

    it('should load all fixtures without errors', () => {
      const platforms = ['slack', 'google', 'microsoft'];

      platforms.forEach((platform) => {
        expect(() => {
          const fixtures = loadAllFixtures(platform, '1.0');
          expect(Object.keys(fixtures).length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should support OAuth flow testing with fixtures', () => {
      // Load OAuth flow fixtures
      const tokenResponse = loadFixture('slack', '1.0', 'oauth/token-response.json');
      const tokenRefresh = loadFixture('slack', '1.0', 'oauth/token-refresh.json');
      const tokenRevoke = loadFixture('slack', '1.0', 'oauth/token-revoke.json');

      // Simulate OAuth flow
      expect(tokenResponse.ok).toBe(true);
      expect(tokenResponse.access_token).toBeDefined();

      expect(tokenRefresh.ok).toBe(true);
      expect(tokenRefresh.access_token).toBeDefined();

      expect(tokenRevoke.ok).toBe(true);
      expect(tokenRevoke.revoked).toBe(true);
    });

    it('should support audit log testing with fixtures', () => {
      // Load audit log fixtures for all platforms
      const slackAudit = loadFixture('slack', '1.0', 'audit-logs/bot-detected.json');
      const googleAudit = loadFixture('google', '1.0', 'audit-logs/apps-script-detected.json');
      const msAudit = loadFixture('microsoft', '1.0', 'audit-logs/power-automate-detected.json');

      // Validate audit log structures
      expect(slackAudit.ok).toBe(true);
      expect(slackAudit.entries).toBeInstanceOf(Array);

      expect(googleAudit.kind).toContain('admin#reports#activities');
      expect(googleAudit.items).toBeInstanceOf(Array);

      expect(msAudit['@odata.context']).toContain('auditLogs');
      expect(msAudit.value).toBeInstanceOf(Array);
    });

    it('should support error handling testing with edge case fixtures', () => {
      // Load error fixtures for all platforms
      const slackRateLimit = loadFixture('slack', '1.0', 'edge-cases/rate-limit-response.json');
      const googleRateLimit = loadFixture('google', '1.0', 'edge-cases/rate-limit-response.json');
      const msRateLimit = loadFixture('microsoft', '1.0', 'edge-cases/rate-limit-response.json');

      // Validate error structures
      expect(slackRateLimit.ok).toBe(false);
      expect(slackRateLimit.error).toBe('ratelimited');
      expect(slackRateLimit.retry_after).toBeDefined();

      expect(googleRateLimit.error.code).toBe(429);
      expect(googleRateLimit.error.message).toContain('Rate Limit');

      expect(msRateLimit.error.code).toBe('TooManyRequests');
      expect(msRateLimit.error.message).toContain('Rate limit');
    });

    it('should support batch loading for cross-platform testing', () => {
      // Load OAuth fixtures from all platforms
      const fixtures = loadFixtures([
        { platform: 'slack', version: '1.0', scenario: 'oauth/token-response.json' },
        { platform: 'google', version: '1.0', scenario: 'oauth/token-response.json' },
        { platform: 'microsoft', version: '1.0', scenario: 'oauth/token-response.json' },
      ]);

      // Should have all three fixtures
      expect(fixtures.length).toBe(3);

      // Each should have required OAuth fields
      fixtures.forEach((fixture) => {
        expect(fixture.access_token).toBeDefined();
        expect(fixture.token_type).toBeDefined();
      });
    });

    it('should support preloading all fixtures for platform', () => {
      const allSlackFixtures = loadAllFixtures('slack', '1.0');

      // Should have multiple categories
      const hasOAuth = Object.keys(allSlackFixtures).some((key) => key.startsWith('oauth/'));
      const hasAuditLogs = Object.keys(allSlackFixtures).some((key) => key.startsWith('audit-logs/'));
      const hasEdgeCases = Object.keys(allSlackFixtures).some((key) => key.startsWith('edge-cases/'));

      expect(hasOAuth).toBe(true);
      expect(hasAuditLogs).toBe(true);
      expect(hasEdgeCases).toBe(true);
    });
  });

  describe('fixture count validation', () => {
    it('should have at least 10 Slack fixtures', () => {
      const fixtures = loadAllFixtures('slack', '1.0');
      const fixtureCount = Object.keys(fixtures).length;

      expect(fixtureCount).toBeGreaterThanOrEqual(10);
    });

    it('should have at least 10 Google fixtures', () => {
      const fixtures = loadAllFixtures('google', '1.0');
      const fixtureCount = Object.keys(fixtures).length;

      expect(fixtureCount).toBeGreaterThanOrEqual(10);
    });

    it('should have at least 10 Microsoft fixtures', () => {
      const fixtures = loadAllFixtures('microsoft', '1.0');
      const fixtureCount = Object.keys(fixtures).length;

      expect(fixtureCount).toBeGreaterThanOrEqual(10);
    });

    it('should have 30+ total fixtures across all platforms', () => {
      const slackFixtures = loadAllFixtures('slack', '1.0');
      const googleFixtures = loadAllFixtures('google', '1.0');
      const msFixtures = loadAllFixtures('microsoft', '1.0');

      const totalCount =
        Object.keys(slackFixtures).length +
        Object.keys(googleFixtures).length +
        Object.keys(msFixtures).length;

      expect(totalCount).toBeGreaterThanOrEqual(30);
    });
  });
});
