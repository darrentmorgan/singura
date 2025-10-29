import { fixtureVersionManager } from './fixture-version-manager';

/**
 * Utility functions for loading test fixtures.
 */

/**
 * Load a fixture with automatic version management.
 *
 * @param platform - Platform name (slack, google, microsoft)
 * @param version - Semantic version (e.g., "1.0")
 * @param scenario - Scenario path (e.g., "oauth/token-response.json")
 * @returns Parsed fixture data
 *
 * @example
 * ```typescript
 * const slackToken = loadFixture('slack', '1.0', 'oauth/token-response.json');
 * ```
 */
export function loadFixture<T = any>(
  platform: string,
  version: string,
  scenario: string
): T {
  return fixtureVersionManager.loadFixture<T>(platform, version, scenario);
}

/**
 * Load multiple fixtures in batch.
 *
 * @param requests - Array of fixture requests
 * @returns Array of loaded fixtures
 *
 * @example
 * ```typescript
 * const [slackToken, googleToken] = loadFixtures([
 *   { platform: 'slack', version: '1.0', scenario: 'oauth/token-response.json' },
 *   { platform: 'google', version: '1.0', scenario: 'oauth/token-response.json' }
 * ]);
 * ```
 */
export function loadFixtures<T = any>(
  requests: Array<{ platform: string; version: string; scenario: string }>
): T[] {
  return requests.map((req) =>
    fixtureVersionManager.loadFixture<T>(req.platform, req.version, req.scenario)
  );
}

/**
 * Check if a fixture exists before attempting to load.
 *
 * @param platform - Platform name
 * @param version - Semantic version
 * @param scenario - Scenario path
 * @returns True if fixture exists
 */
export function fixtureExists(
  platform: string,
  version: string,
  scenario: string
): boolean {
  return fixtureVersionManager.fixtureExists(platform, version, scenario);
}

/**
 * Load all fixtures for a specific platform and version.
 *
 * @param platform - Platform name
 * @param version - Semantic version
 * @returns Object mapping scenario names to fixture data
 *
 * @example
 * ```typescript
 * const allSlackFixtures = loadAllFixtures('slack', '1.0');
 * // { 'oauth/token-response': {...}, 'audit-logs/bot-detected': {...} }
 * ```
 */
export function loadAllFixtures(platform: string, version: string): Record<string, any> {
  const scenarioPaths = fixtureVersionManager.listFixtures(platform, version);
  const fixtures: Record<string, any> = {};

  for (const scenarioPath of scenarioPaths) {
    // Remove .json extension and use as key
    const key = scenarioPath.replace(/\.json$/, '');
    fixtures[key] = fixtureVersionManager.loadFixture(platform, version, scenarioPath);
  }

  return fixtures;
}
