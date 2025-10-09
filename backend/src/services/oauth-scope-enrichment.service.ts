/**
 * OAuth Scope Enrichment Service
 *
 * Enriches OAuth scopes with metadata from the oauth_scope_library table
 * Provides risk analysis and compliance information for OAuth permissions
 *
 * Architecture:
 * - Uses singleton pattern for consistent state management
 * - Implements in-memory caching for performance
 * - Integrates with oauth_scope_library repository
 */

import { oauthScopeLibraryRepository, OAuthScopeLibrary } from '../database/repositories/oauth-scope-library';

export interface EnrichedScope {
  scopeUrl: string;
  platform: string;
  serviceName: string;
  displayName: string;
  description: string;
  accessLevel: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataTypes: string[];
  alternatives: string | null;
  gdprImpact: string | null;
  hipaaImpact: string | null;
}

export interface PermissionRiskAnalysis {
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  highestRiskScope: EnrichedScope | null;
  scopeBreakdown: Array<{
    scope: EnrichedScope;
    contribution: number;
  }>;
}

class OAuthScopeEnrichmentService {
  private scopeCache: Map<string, OAuthScopeLibrary | null> = new Map();

  /**
   * Enrich a single OAuth scope with metadata
   * Uses caching to improve performance
   */
  async enrichScope(scopeUrl: string, platform: string): Promise<EnrichedScope | null> {
    console.log('🔍 [OAuth Enrichment] enrichScope called:', { scopeUrl, platform });
    const cacheKey = `${platform}:${scopeUrl}`;

    // Check cache first
    if (this.scopeCache.has(cacheKey)) {
      const cached = this.scopeCache.get(cacheKey);
      console.log('✅ [OAuth Enrichment] Cache hit:', { scopeUrl, hasCachedData: !!cached });
      return cached ? this.mapToEnrichedScope(cached) : null;
    }

    // Query database
    console.log('🔍 [OAuth Enrichment] Cache miss, querying database:', { scopeUrl, platform });
    const scopeData = await oauthScopeLibraryRepository.findByScopeUrl(scopeUrl, platform);
    console.log('📊 [OAuth Enrichment] Database query result:', {
      scopeUrl,
      found: !!scopeData,
      displayName: scopeData?.display_name,
      serviceName: scopeData?.service_name
    });

    // Cache result (including null to avoid repeated queries)
    this.scopeCache.set(cacheKey, scopeData);

    return scopeData ? this.mapToEnrichedScope(scopeData) : null;
  }

  /**
   * Enrich multiple OAuth scopes
   * Filters out scopes that don't have metadata
   */
  async enrichScopes(scopeUrls: string[], platform: string): Promise<EnrichedScope[]> {
    console.log('🚀 [OAuth Enrichment] enrichScopes called:', {
      platform,
      scopeCount: scopeUrls.length,
      scopes: scopeUrls
    });

    const enriched: EnrichedScope[] = [];

    for (const scopeUrl of scopeUrls) {
      const enrichedScope = await this.enrichScope(scopeUrl, platform);
      if (enrichedScope) {
        enriched.push(enrichedScope);
      }
    }

    console.log('✅ [OAuth Enrichment] enrichScopes completed:', {
      inputCount: scopeUrls.length,
      enrichedCount: enriched.length,
      enrichedNames: enriched.map(s => s.displayName)
    });

    return enriched;
  }

  /**
   * Calculate overall risk for a set of OAuth scopes
   *
   * Risk Level Calculation:
   * - CRITICAL: Average risk score >= 85
   * - HIGH: Average risk score >= 60
   * - MEDIUM: Average risk score >= 30
   * - LOW: Average risk score < 30
   */
  calculatePermissionRisk(enrichedScopes: EnrichedScope[]): PermissionRiskAnalysis {
    if (enrichedScopes.length === 0) {
      return {
        totalScore: 0,
        riskLevel: 'LOW',
        highestRiskScope: null,
        scopeBreakdown: []
      };
    }

    // Calculate average risk score
    const totalScore = Math.round(
      enrichedScopes.reduce((sum, scope) => sum + scope.riskScore, 0) / enrichedScopes.length
    );

    // Determine risk level based on average score
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (totalScore >= 85) riskLevel = 'CRITICAL';
    else if (totalScore >= 60) riskLevel = 'HIGH';
    else if (totalScore >= 30) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    // Find highest risk scope
    const highestRiskScope = enrichedScopes.reduce((highest, current) =>
      current.riskScore > highest.riskScore ? current : highest
    );

    // Calculate contribution of each scope to total risk
    const totalRiskSum = enrichedScopes.reduce((sum, scope) => sum + scope.riskScore, 0);
    const scopeBreakdown = enrichedScopes
      .map(scope => ({
        scope,
        contribution: Math.round((scope.riskScore / totalRiskSum) * 100)
      }))
      .sort((a, b) => b.contribution - a.contribution);

    return {
      totalScore,
      riskLevel,
      highestRiskScope,
      scopeBreakdown
    };
  }

  /**
   * Get enrichment coverage for a set of scopes
   * Returns percentage of scopes that have metadata
   */
  async getEnrichmentCoverage(scopeUrls: string[], platform: string): Promise<{
    total: number;
    enriched: number;
    missing: string[];
    coverage: number;
  }> {
    const missing: string[] = [];
    let enriched = 0;

    for (const scopeUrl of scopeUrls) {
      const enrichedScope = await this.enrichScope(scopeUrl, platform);
      if (enrichedScope) {
        enriched++;
      } else {
        missing.push(scopeUrl);
      }
    }

    const coverage = scopeUrls.length > 0 ? (enriched / scopeUrls.length) * 100 : 0;

    return {
      total: scopeUrls.length,
      enriched,
      missing,
      coverage
    };
  }

  /**
   * Get scopes by risk level for a platform
   * Useful for security dashboards and reporting
   */
  async getScopesByRiskLevel(
    platform: string,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<EnrichedScope[]> {
    const scopes = await oauthScopeLibraryRepository.findByPlatformAndRisk(platform, riskLevel);
    return scopes.map(scope => this.mapToEnrichedScope(scope));
  }

  /**
   * Search for scopes by service name or description
   */
  async searchScopes(
    platform: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<EnrichedScope[]> {
    const scopes = await oauthScopeLibraryRepository.searchScopes(platform, searchTerm, limit);
    return scopes.map(scope => this.mapToEnrichedScope(scope));
  }

  /**
   * Clear the in-memory cache
   * Should be called when scope library is updated
   */
  clearCache(): void {
    this.scopeCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: string[];
  } {
    return {
      size: this.scopeCache.size,
      entries: Array.from(this.scopeCache.keys())
    };
  }

  /**
   * Map database row to enriched scope interface
   */
  private mapToEnrichedScope(scopeData: OAuthScopeLibrary): EnrichedScope {
    return {
      scopeUrl: scopeData.scope_url,
      platform: scopeData.platform,
      serviceName: scopeData.service_name,
      displayName: scopeData.display_name,
      description: scopeData.description,
      accessLevel: scopeData.access_level,
      riskScore: scopeData.risk_score,
      riskLevel: scopeData.risk_level,
      dataTypes: scopeData.data_types || [],
      alternatives: scopeData.alternatives,
      gdprImpact: scopeData.gdpr_impact,
      hipaaImpact: scopeData.hipaa_impact
    };
  }
}

// Export singleton instance (critical pattern for SaaS X-Ray)
export const oauthScopeEnrichmentService = new OAuthScopeEnrichmentService();
export { OAuthScopeEnrichmentService };
