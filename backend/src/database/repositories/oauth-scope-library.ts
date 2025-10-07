/**
 * OAuth Scope Library repository for managing OAuth scope metadata
 * Read-only repository for scope enrichment data
 */

import { BaseRepository } from './base';
import { db } from '../pool';

export interface OAuthScopeLibrary {
  id: string;
  scope_url: string;
  platform: string;
  service_name: string;
  access_level: string;
  display_name: string;
  description: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data_types: string[];
  common_use_cases: string | null;
  abuse_scenarios: string | null;
  alternatives: string | null;
  gdpr_impact: string | null;
  hipaa_impact: string | null;
  regulatory_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// No CreateInput/UpdateInput needed - this is read-only reference data
type CreateOAuthScopeLibraryInput = Record<string, never>;
type UpdateOAuthScopeLibraryInput = Record<string, never>;

export class OAuthScopeLibraryRepository extends BaseRepository<
  OAuthScopeLibrary,
  CreateOAuthScopeLibraryInput,
  UpdateOAuthScopeLibraryInput
> {
  constructor() {
    super('oauth_scope_library');
  }

  /**
   * Find scope metadata by scope URL and platform
   */
  async findByScopeUrl(scopeUrl: string, platform: string): Promise<OAuthScopeLibrary | null> {
    const query = `
      SELECT * FROM oauth_scope_library
      WHERE scope_url = $1 AND platform = $2
      LIMIT 1
    `;
    const result = await db.query<OAuthScopeLibrary>(query, [scopeUrl, platform]);
    return result.rows[0] || null;
  }

  /**
   * Find all scopes for a specific platform
   */
  async findByPlatform(platform: string): Promise<OAuthScopeLibrary[]> {
    const query = `
      SELECT * FROM oauth_scope_library
      WHERE platform = $1
      ORDER BY risk_score DESC, service_name ASC
    `;
    const result = await db.query<OAuthScopeLibrary>(query, [platform]);
    return result.rows;
  }

  /**
   * Find scopes by risk level
   */
  async findByRiskLevel(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<OAuthScopeLibrary[]> {
    const query = `
      SELECT * FROM oauth_scope_library
      WHERE risk_level = $1
      ORDER BY risk_score DESC, platform ASC, service_name ASC
    `;
    const result = await db.query<OAuthScopeLibrary>(query, [riskLevel]);
    return result.rows;
  }

  /**
   * Find scopes by platform and risk level
   */
  async findByPlatformAndRisk(
    platform: string,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<OAuthScopeLibrary[]> {
    const query = `
      SELECT * FROM oauth_scope_library
      WHERE platform = $1 AND risk_level = $2
      ORDER BY risk_score DESC, service_name ASC
    `;
    const result = await db.query<OAuthScopeLibrary>(query, [platform, riskLevel]);
    return result.rows;
  }

  /**
   * Search scopes by service name or description
   */
  async searchScopes(
    platform: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<OAuthScopeLibrary[]> {
    const query = `
      SELECT * FROM oauth_scope_library
      WHERE platform = $1
        AND (
          service_name ILIKE $2
          OR display_name ILIKE $2
          OR description ILIKE $2
        )
      ORDER BY risk_score DESC
      LIMIT $3
    `;
    const result = await db.query<OAuthScopeLibrary>(
      query,
      [platform, `%${searchTerm}%`, limit]
    );
    return result.rows;
  }

  /**
   * Get scope statistics by platform
   */
  async getScopeStatsByPlatform(platform: string): Promise<{
    total: number;
    by_risk_level: Record<string, number>;
    by_service: Record<string, number>;
    average_risk_score: number;
  }> {
    const query = `
      SELECT
        risk_level,
        service_name,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk
      FROM oauth_scope_library
      WHERE platform = $1
      GROUP BY risk_level, service_name
      ORDER BY risk_level, service_name
    `;

    const result = await db.query<{
      risk_level: string;
      service_name: string;
      count: string;
      avg_risk: string;
    }>(query, [platform]);

    const by_risk_level: Record<string, number> = {};
    const by_service: Record<string, number> = {};
    let total = 0;
    let totalRiskScore = 0;

    result.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      total += count;
      totalRiskScore += parseFloat(row.avg_risk) * count;

      by_risk_level[row.risk_level] = (by_risk_level[row.risk_level] || 0) + count;
      by_service[row.service_name] = (by_service[row.service_name] || 0) + count;
    });

    const average_risk_score = total > 0 ? totalRiskScore / total : 0;

    return {
      total,
      by_risk_level,
      by_service,
      average_risk_score
    };
  }
}

export const oauthScopeLibraryRepository = new OAuthScopeLibraryRepository();
