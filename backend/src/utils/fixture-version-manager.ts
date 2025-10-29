import * as fs from 'fs';
import * as path from 'path';

/**
 * Manages versioned test fixtures with fallback support.
 *
 * Implements version fallback logic: v1.1 → v1.0 → error
 * Supports multiple platforms (Slack, Google, Microsoft)
 */
export class FixtureVersionManager {
  private readonly fixturesBasePath: string;

  constructor(fixturesBasePath?: string) {
    this.fixturesBasePath = fixturesBasePath || path.join(__dirname, '../../tests/fixtures');
  }

  /**
   * Load a fixture file for a specific platform, version, and scenario.
   *
   * @param platform - Platform name (slack, google, microsoft)
   * @param version - Semantic version (e.g., "1.0", "1.1")
   * @param scenario - Scenario path (e.g., "oauth/token-response.json")
   * @returns Parsed JSON fixture data
   *
   * @example
   * ```typescript
   * const fixture = manager.loadFixture('slack', '1.0', 'oauth/token-response.json');
   * ```
   */
  loadFixture<T = any>(platform: string, version: string, scenario: string): T {
    const normalizedVersion = this.normalizeVersion(version.trim());
    const normalizedScenario = this.normalizeScenario(scenario);
    const fixturePath = this.buildFixturePath(platform, normalizedVersion, normalizedScenario);

    // Try exact version first
    if (fs.existsSync(fixturePath)) {
      try {
        const fileContent = fs.readFileSync(fixturePath, 'utf-8');
        return JSON.parse(fileContent) as T;
      } catch (error) {
        throw new Error(
          `Failed to parse fixture at ${fixturePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Try fallback versions
    let fallbackVersion = this.getFallbackVersion(normalizedVersion);
    while (fallbackVersion) {
      const fallbackPath = this.buildFixturePath(platform, fallbackVersion, normalizedScenario);
      if (fs.existsSync(fallbackPath)) {
        try {
          const fileContent = fs.readFileSync(fallbackPath, 'utf-8');
          return JSON.parse(fileContent) as T;
        } catch (error) {
          throw new Error(
            `Failed to parse fallback fixture at ${fallbackPath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      fallbackVersion = this.getFallbackVersion(fallbackVersion);
    }

    throw new Error(
      `Fixture not found: platform=${platform}, version=${normalizedVersion}, scenario=${normalizedScenario}`
    );
  }

  /**
   * Check if a fixture file exists for the given parameters.
   *
   * @param platform - Platform name
   * @param version - Semantic version
   * @param scenario - Scenario path
   * @returns True if fixture exists
   */
  fixtureExists(platform: string, version: string, scenario: string): boolean {
    const normalizedVersion = this.normalizeVersion(version);
    const fixturePath = this.buildFixturePath(platform, normalizedVersion, scenario);
    return fs.existsSync(fixturePath);
  }

  /**
   * List all available fixtures for a platform and version.
   *
   * @param platform - Platform name
   * @param version - Semantic version
   * @returns Array of scenario paths
   */
  listFixtures(platform: string, version: string): string[] {
    const normalizedVersion = this.normalizeVersion(version);
    const platformPath = path.join(this.fixturesBasePath, platform, `v${normalizedVersion}`);

    if (!fs.existsSync(platformPath)) {
      return [];
    }

    const fixtures: string[] = [];
    this.scanDirectory(platformPath, platformPath, fixtures);
    return fixtures;
  }

  /**
   * Recursively scan directory for JSON fixtures.
   *
   * @param currentPath - Current directory being scanned
   * @param basePath - Base path to calculate relative paths
   * @param fixtures - Array to collect fixture paths
   */
  private scanDirectory(currentPath: string, basePath: string, fixtures: string[]): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        this.scanDirectory(fullPath, basePath, fixtures);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const relativePath = path.relative(basePath, fullPath);
        fixtures.push(relativePath);
      }
    }
  }

  /**
   * Get the fallback version for a given version (e.g., "1.1" → "1.0").
   *
   * @param version - Current version
   * @returns Fallback version or null if no fallback available
   */
  private getFallbackVersion(version: string): string | null {
    const parts = version.split('.');
    if (parts.length < 2) {
      return null;
    }

    const majorStr = parts[0];
    const minorStr = parts[1];

    if (!majorStr || !minorStr) {
      return null;
    }

    const major = parseInt(majorStr, 10);
    const minor = parseInt(minorStr, 10);

    if (isNaN(major) || isNaN(minor)) {
      return null;
    }

    // Decrement minor version
    if (minor > 0) {
      return `${major}.${minor - 1}`;
    }

    // If minor is 0 and major > 1, fall back to previous major version
    if (major > 1) {
      return `${major - 1}.0`;
    }

    // No fallback available
    return null;
  }

  /**
   * Parse major version from semantic version string.
   *
   * @param version - Semantic version (e.g., "1.1")
   * @returns Major version number
   */
  private getMajorVersion(version: string): number {
    const parts = version.split('.');
    const majorStr = parts[0];
    if (!majorStr) {
      throw new Error(`Invalid version format: ${version}`);
    }
    const major = parseInt(majorStr, 10);
    if (isNaN(major)) {
      throw new Error(`Invalid version format: ${version}`);
    }
    return major;
  }

  /**
   * Normalize version string (remove 'v' prefix if present).
   *
   * @param version - Version string (e.g., "v1.0" or "1.0")
   * @returns Normalized version without prefix
   */
  private normalizeVersion(version: string): string {
    return version.startsWith('v') ? version.substring(1) : version;
  }

  /**
   * Normalize scenario path (convert backslashes to forward slashes).
   *
   * @param scenario - Scenario path (may contain backslashes on Windows)
   * @returns Normalized scenario path with forward slashes
   */
  private normalizeScenario(scenario: string): string {
    return scenario.replace(/\\/g, '/');
  }

  /**
   * Build the full file path for a fixture.
   *
   * @param platform - Platform name
   * @param version - Semantic version
   * @param scenario - Scenario path
   * @returns Absolute file path
   */
  private buildFixturePath(platform: string, version: string, scenario: string): string {
    return path.join(this.fixturesBasePath, platform, `v${version}`, scenario);
  }
}

/**
 * Singleton instance for global fixture management.
 */
export const fixtureVersionManager = new FixtureVersionManager();
