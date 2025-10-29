import * as fs from 'fs';
import * as path from 'path';
import { FixtureVersionManager } from '../../../src/utils/fixture-version-manager';

describe('FixtureVersionManager', () => {
  let manager: FixtureVersionManager;
  const testFixturesPath = path.join(__dirname, '../../fixtures');

  beforeEach(() => {
    manager = new FixtureVersionManager(testFixturesPath);
  });

  describe('loadFixture', () => {
    it('should load an existing fixture successfully', () => {
      const fixture = manager.loadFixture('slack', '1.0', 'oauth/token-response.json');

      expect(fixture).toBeDefined();
      expect(fixture.ok).toBe(true);
      expect(fixture.access_token).toContain('xoxb-');
      expect(fixture.token_type).toBe('bot');
    });

    it('should load fixture with version prefix "v"', () => {
      const fixture = manager.loadFixture('slack', 'v1.0', 'oauth/token-response.json');

      expect(fixture).toBeDefined();
      expect(fixture.ok).toBe(true);
    });

    it('should load fixture without version prefix', () => {
      const fixture = manager.loadFixture('slack', '1.0', 'oauth/token-response.json');

      expect(fixture).toBeDefined();
      expect(fixture.ok).toBe(true);
    });

    it('should load Google Workspace fixture successfully', () => {
      const fixture = manager.loadFixture('google', '1.0', 'oauth/token-response.json');

      expect(fixture).toBeDefined();
      expect(fixture.access_token).toContain('ya29.');
      expect(fixture.token_type).toBe('Bearer');
      expect(fixture.scope).toContain('googleapis.com');
    });

    it('should load Microsoft 365 fixture successfully', () => {
      const fixture = manager.loadFixture('microsoft', '1.0', 'oauth/token-response.json');

      expect(fixture).toBeDefined();
      expect(fixture.token_type).toBe('Bearer');
      expect(fixture.access_token).toBeDefined();
      expect(fixture.expires_in).toBe(3599);
    });

    it('should load nested path fixtures', () => {
      const fixture = manager.loadFixture('slack', '1.0', 'audit-logs/bot-detected.json');

      expect(fixture).toBeDefined();
      expect(fixture.ok).toBe(true);
      expect(fixture.entries).toBeInstanceOf(Array);
    });

    it('should load edge case fixtures', () => {
      const fixture = manager.loadFixture('slack', '1.0', 'edge-cases/rate-limit-response.json');

      expect(fixture).toBeDefined();
      expect(fixture.ok).toBe(false);
      expect(fixture.error).toBe('ratelimited');
      expect(fixture.retry_after).toBe(30);
    });

    it('should throw error for non-existent fixture', () => {
      expect(() => {
        manager.loadFixture('slack', '1.0', 'non-existent/fixture.json');
      }).toThrow(/Fixture not found/);
    });

    it('should throw error for non-existent platform', () => {
      expect(() => {
        manager.loadFixture('invalid-platform', '1.0', 'oauth/token-response.json');
      }).toThrow(/Fixture not found/);
    });

    it('should throw error for invalid JSON', () => {
      // Create a temporary invalid JSON file for testing
      const invalidPath = path.join(testFixturesPath, 'slack/v1.0/test-invalid.json');
      const dirPath = path.dirname(invalidPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(invalidPath, '{ invalid json }', 'utf-8');

      expect(() => {
        manager.loadFixture('slack', '1.0', 'test-invalid.json');
      }).toThrow(/Failed to parse fixture/);

      // Cleanup
      fs.unlinkSync(invalidPath);
    });
  });

  describe('version fallback', () => {
    let tempFixturesPath: string;
    let fallbackManager: FixtureVersionManager;

    beforeEach(() => {
      // Create temporary fixtures directory for fallback testing
      tempFixturesPath = path.join(__dirname, '../../fixtures-temp');
      fallbackManager = new FixtureVersionManager(tempFixturesPath);

      // Create version hierarchy: v1.0, v1.1, v1.2
      const versions = ['v1.0', 'v1.1', 'v1.2'];
      versions.forEach((version) => {
        const versionPath = path.join(tempFixturesPath, 'test-platform', version, 'oauth');
        fs.mkdirSync(versionPath, { recursive: true });

        fs.writeFileSync(
          path.join(versionPath, 'token.json'),
          JSON.stringify({ version }),
          'utf-8'
        );
      });
    });

    afterEach(() => {
      // Cleanup temporary fixtures
      if (fs.existsSync(tempFixturesPath)) {
        fs.rmSync(tempFixturesPath, { recursive: true, force: true });
      }
    });

    it('should load exact version when available', () => {
      const fixture = fallbackManager.loadFixture('test-platform', '1.1', 'oauth/token.json');

      expect(fixture.version).toBe('v1.1');
    });

    it('should fallback from v1.2 to v1.1', () => {
      // Remove v1.2 fixture to test fallback
      const v12Path = path.join(tempFixturesPath, 'test-platform/v1.2/oauth/token.json');
      fs.unlinkSync(v12Path);

      const fixture = fallbackManager.loadFixture('test-platform', '1.2', 'oauth/token.json');

      expect(fixture.version).toBe('v1.1');
    });

    it('should fallback from v1.1 to v1.0', () => {
      // Remove v1.1 and v1.2 fixtures to test fallback
      fs.unlinkSync(path.join(tempFixturesPath, 'test-platform/v1.2/oauth/token.json'));
      fs.unlinkSync(path.join(tempFixturesPath, 'test-platform/v1.1/oauth/token.json'));

      const fixture = fallbackManager.loadFixture('test-platform', '1.2', 'oauth/token.json');

      expect(fixture.version).toBe('v1.0');
    });

    it('should fallback multiple versions (v1.2 → v1.1 → v1.0)', () => {
      // Remove v1.2 and v1.1 to force fallback to v1.0
      fs.unlinkSync(path.join(tempFixturesPath, 'test-platform/v1.2/oauth/token.json'));
      fs.unlinkSync(path.join(tempFixturesPath, 'test-platform/v1.1/oauth/token.json'));

      const fixture = fallbackManager.loadFixture('test-platform', '1.2', 'oauth/token.json');

      expect(fixture.version).toBe('v1.0');
    });

    it('should throw error when no fallback available', () => {
      // Remove all versions
      fs.rmSync(path.join(tempFixturesPath, 'test-platform'), { recursive: true, force: true });

      expect(() => {
        fallbackManager.loadFixture('test-platform', '1.2', 'oauth/token.json');
      }).toThrow(/Fixture not found/);
    });
  });

  describe('fixtureExists', () => {
    it('should return true for existing fixture', () => {
      const exists = manager.fixtureExists('slack', '1.0', 'oauth/token-response.json');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent fixture', () => {
      const exists = manager.fixtureExists('slack', '1.0', 'non-existent/fixture.json');

      expect(exists).toBe(false);
    });

    it('should return false for non-existent platform', () => {
      const exists = manager.fixtureExists('invalid-platform', '1.0', 'oauth/token-response.json');

      expect(exists).toBe(false);
    });

    it('should handle version prefix correctly', () => {
      const existsWithPrefix = manager.fixtureExists('slack', 'v1.0', 'oauth/token-response.json');
      const existsWithoutPrefix = manager.fixtureExists('slack', '1.0', 'oauth/token-response.json');

      expect(existsWithPrefix).toBe(true);
      expect(existsWithoutPrefix).toBe(true);
    });
  });

  describe('listFixtures', () => {
    it('should list all Slack v1.0 fixtures', () => {
      const fixtures = manager.listFixtures('slack', '1.0');

      expect(fixtures).toBeInstanceOf(Array);
      expect(fixtures.length).toBeGreaterThan(0);
      expect(fixtures).toContain('oauth/token-response.json');
      expect(fixtures).toContain('audit-logs/bot-detected.json');
    });

    it('should list all Google v1.0 fixtures', () => {
      const fixtures = manager.listFixtures('google', '1.0');

      expect(fixtures).toBeInstanceOf(Array);
      expect(fixtures.length).toBeGreaterThan(0);
      expect(fixtures).toContain('oauth/token-response.json');
      expect(fixtures).toContain('audit-logs/apps-script-detected.json');
    });

    it('should list all Microsoft v1.0 fixtures', () => {
      const fixtures = manager.listFixtures('microsoft', '1.0');

      expect(fixtures).toBeInstanceOf(Array);
      expect(fixtures.length).toBeGreaterThan(0);
      expect(fixtures).toContain('oauth/token-response.json');
      expect(fixtures).toContain('audit-logs/power-automate-detected.json');
    });

    it('should return empty array for non-existent platform', () => {
      const fixtures = manager.listFixtures('non-existent', '1.0');

      expect(fixtures).toEqual([]);
    });

    it('should return empty array for non-existent version', () => {
      const fixtures = manager.listFixtures('slack', '99.0');

      expect(fixtures).toEqual([]);
    });

    it('should include nested directory fixtures', () => {
      const fixtures = manager.listFixtures('slack', '1.0');

      const hasOAuthFixtures = fixtures.some((f) => f.startsWith('oauth/'));
      const hasAuditLogFixtures = fixtures.some((f) => f.startsWith('audit-logs/'));
      const hasEdgeCaseFixtures = fixtures.some((f) => f.startsWith('edge-cases/'));

      expect(hasOAuthFixtures).toBe(true);
      expect(hasAuditLogFixtures).toBe(true);
      expect(hasEdgeCaseFixtures).toBe(true);
    });

    it('should only include JSON files', () => {
      const fixtures = manager.listFixtures('slack', '1.0');

      fixtures.forEach((fixture) => {
        expect(fixture.endsWith('.json')).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in version strings', () => {
      const fixture = manager.loadFixture('slack', ' 1.0 ', 'oauth/token-response.json');

      // Should still work (whitespace trimmed internally)
      expect(fixture).toBeDefined();
    });

    it('should handle path separators correctly', () => {
      const fixtureUnix = manager.loadFixture('slack', '1.0', 'oauth/token-response.json');
      const fixtureWindows = manager.loadFixture('slack', '1.0', 'oauth\\token-response.json');

      expect(fixtureUnix).toBeDefined();
      expect(fixtureWindows).toBeDefined();
    });

    it('should load all platform fixtures without errors', () => {
      const platforms = ['slack', 'google', 'microsoft'];

      platforms.forEach((platform) => {
        const fixtures = manager.listFixtures(platform, '1.0');

        expect(fixtures.length).toBeGreaterThan(0);

        fixtures.forEach((fixture) => {
          expect(() => {
            manager.loadFixture(platform, '1.0', fixture);
          }).not.toThrow();
        });
      });
    });

    it('should validate all fixtures are valid JSON', () => {
      const platforms = ['slack', 'google', 'microsoft'];

      platforms.forEach((platform) => {
        const fixtures = manager.listFixtures(platform, '1.0');

        fixtures.forEach((fixture) => {
          const data = manager.loadFixture(platform, '1.0', fixture);

          // Ensure it's a valid object
          expect(typeof data).toBe('object');
          expect(data).not.toBeNull();
        });
      });
    });
  });

  describe('fixture content validation', () => {
    it('should validate Slack OAuth fixtures structure', () => {
      const tokenResponse = manager.loadFixture('slack', '1.0', 'oauth/token-response.json');
      const tokenRefresh = manager.loadFixture('slack', '1.0', 'oauth/token-refresh.json');
      const tokenRevoke = manager.loadFixture('slack', '1.0', 'oauth/token-revoke.json');

      // Token response
      expect(tokenResponse.ok).toBe(true);
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.token_type).toBe('bot');

      // Token refresh
      expect(tokenRefresh.ok).toBe(true);
      expect(tokenRefresh.access_token).toBeDefined();

      // Token revoke
      expect(tokenRevoke.ok).toBe(true);
      expect(tokenRevoke.revoked).toBe(true);
    });

    it('should validate Google OAuth fixtures structure', () => {
      const tokenResponse = manager.loadFixture('google', '1.0', 'oauth/token-response.json');
      const tokenRefresh = manager.loadFixture('google', '1.0', 'oauth/token-refresh.json');

      // Token response
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.token_type).toBe('Bearer');
      expect(tokenResponse.expires_in).toBe(3599);
      expect(tokenResponse.scope).toContain('googleapis.com');

      // Token refresh
      expect(tokenRefresh.access_token).toBeDefined();
      expect(tokenRefresh.token_type).toBe('Bearer');
    });

    it('should validate Microsoft OAuth fixtures structure', () => {
      const tokenResponse = manager.loadFixture('microsoft', '1.0', 'oauth/token-response.json');
      const tokenRefresh = manager.loadFixture('microsoft', '1.0', 'oauth/token-refresh.json');

      // Token response
      expect(tokenResponse.token_type).toBe('Bearer');
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.expires_in).toBe(3599);

      // Token refresh
      expect(tokenRefresh.token_type).toBe('Bearer');
      expect(tokenRefresh.access_token).toBeDefined();
    });

    it('should validate edge case fixtures structure', () => {
      const slackRateLimit = manager.loadFixture('slack', '1.0', 'edge-cases/rate-limit-response.json');
      const googleRateLimit = manager.loadFixture('google', '1.0', 'edge-cases/rate-limit-response.json');
      const msRateLimit = manager.loadFixture('microsoft', '1.0', 'edge-cases/rate-limit-response.json');

      // Slack rate limit
      expect(slackRateLimit.ok).toBe(false);
      expect(slackRateLimit.error).toBe('ratelimited');
      expect(slackRateLimit.retry_after).toBeDefined();

      // Google rate limit
      expect(googleRateLimit.error).toBeDefined();
      expect(googleRateLimit.error.code).toBe(429);

      // Microsoft rate limit
      expect(msRateLimit.error).toBeDefined();
      expect(msRateLimit.error.code).toBe('TooManyRequests');
    });
  });

  describe('type safety', () => {
    it('should support generic type parameter', () => {
      interface SlackTokenResponse {
        ok: boolean;
        access_token: string;
        token_type: string;
      }

      const fixture = manager.loadFixture<SlackTokenResponse>('slack', '1.0', 'oauth/token-response.json');

      expect(fixture.ok).toBe(true);
      expect(typeof fixture.access_token).toBe('string');
      expect(typeof fixture.token_type).toBe('string');
    });

    it('should default to any type when not specified', () => {
      const fixture = manager.loadFixture('slack', '1.0', 'oauth/token-response.json');

      // Should be flexible and allow any property access
      expect(fixture.ok).toBeDefined();
      expect(fixture.access_token).toBeDefined();
    });
  });
});
