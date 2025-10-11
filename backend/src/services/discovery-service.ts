/**
 * Discovery Service - Automation Discovery Engine
 * Coordinates platform connectors to discover automations across SaaS platforms
 */

import { PlatformConnector, AutomationEvent, DiscoveryResult, OAuthCredentials } from '../connectors/types';
import { slackConnector } from '../connectors/slack';
import { googleConnector } from '../connectors/google';
import { microsoftConnector } from '../connectors/microsoft';
import { platformConnectionRepository } from '../database/repositories/platform-connection';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';
import { DiscoveryRun, DiscoveredAutomation, PlatformType, DiscoveryStatus, PlatformConnection } from '../types/database';
import { db } from '../database/pool';
import { ConnectionRecord } from '@singura/shared-types';

export interface DiscoveryJobConfig {
  organizationId: string;
  platformConnectionIds?: string[]; // If not provided, discovers all active connections
  includeInactive?: boolean; // Whether to include inactive automations
  updateExisting?: boolean; // Whether to update existing automations or only add new ones
  riskAssessment?: boolean; // Whether to run risk assessment after discovery
}

export interface DiscoveryJobResult {
  jobId: string;
  totalPlatforms: number;
  successfulPlatforms: number;
  totalAutomations: number;
  newAutomations: number;
  updatedAutomations: number;
  errors: string[];
  warnings: string[];
  duration: number;
  results: DiscoveryResult[];
}

export interface DiscoveryStats {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  total_automations_found: number;
  avg_duration_ms: number;
  last_discovery_at: Date | null;
}

interface OAuthCredentialsResult {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
}

/**
 * Discovery Service - Orchestrates automation discovery across platforms
 */
export class DiscoveryService {
  private connectors: Map<PlatformType, PlatformConnector>;

  constructor() {
    this.connectors = new Map<PlatformType, PlatformConnector>([
      ['slack', slackConnector],
      ['google', googleConnector]  // ✅ ENABLED: Real Google Workspace discovery
      // ['microsoft', microsoftConnector]  // Comment out until implemented
    ]);
  }

  /**
   * Run discovery across all or specified platform connections
   */
  async runDiscovery(config: DiscoveryJobConfig): Promise<DiscoveryJobResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const results: DiscoveryResult[] = [];

    try {
      // Get platform connections to discover
      const connections = await this.getPlatformConnections(config);
      
      if (connections.length === 0) {
        throw new Error('No platform connections found for discovery');
      }

      console.log(`Starting discovery for ${connections.length} platform connections`);

      // Run discovery for each connection
      const discoveryPromises = connections.map(async (connection) => {
        try {
          const result = await this.discoverPlatformAutomations(connection, config);
          results.push(result);
          return result;
        } catch (error) {
          const errorMessage = `Discovery failed for ${connection.platform_type} (${connection.id}): ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(errorMessage, error);
          return null;
        }
      });

      // Wait for all discoveries to complete
      const discoveryResults = await Promise.allSettled(discoveryPromises);

      // Calculate totals
      const successfulResults = results.filter(r => r.errors.length === 0);
      const totalAutomations = results.reduce((sum, r) => sum + r.automations.length, 0);
      
      // Count new vs updated automations
      let newAutomations = 0;
      let updatedAutomations = 0;
      
      for (const result of results) {
        // This would be calculated during the actual discovery process
        // For now, assume all are new (this would be refined in the actual implementation)
        newAutomations += result.automations.length;
      }

      const duration = Date.now() - startTime;

      return {
        jobId: `discovery-${Date.now()}`, // Would use proper job ID in real implementation
        totalPlatforms: connections.length,
        successfulPlatforms: successfulResults.length,
        totalAutomations,
        newAutomations,
        updatedAutomations,
        errors,
        warnings,
        duration,
        results
      };

    } catch (error) {
      const errorMessage = `Discovery job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);
      console.error(errorMessage, error);

      return {
        jobId: `discovery-failed-${Date.now()}`,
        totalPlatforms: 0,
        successfulPlatforms: 0,
        totalAutomations: 0,
        newAutomations: 0,
        updatedAutomations: 0,
        errors,
        warnings,
        duration: Date.now() - startTime,
        results: []
      };
    }
  }

  /**
   * Discover automations for a single platform connection
   */
  async discoverPlatformAutomations(
    connection: PlatformConnection,
    config: DiscoveryJobConfig
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get the appropriate connector
      const connector = this.connectors.get(connection.platform_type as PlatformType);
      if (!connector) {
        throw new Error(`No connector available for platform: ${connection.platform_type}`);
      }

      // Create discovery run record
      const discoveryRun = await this.createDiscoveryRun(connection.id, connection.organization_id);

      // Get OAuth credentials
      const credentials = await this.getOAuthCredentials(connection.id);

      // Authenticate with the platform
      const oauthCreds: OAuthCredentials = {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken || undefined,
        tokenType: credentials.tokenType
      };
      const authResult = await connector.authenticate(oauthCreds);
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      // Discover automations
      console.log(`Discovering automations for ${connection.platform_type}...`);
      const automations = await connector.discoverAutomations();
      
      // Get audit logs (if available)
      const auditLogs = await connector.getAuditLogs(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days
      
      // Validate permissions
      const permissionCheck = await connector.validatePermissions();

      // Store discovered automations
      const storedAutomations = await this.storeDiscoveredAutomations(
        automations,
        discoveryRun.id,
        connection.id,
        connection.organization_id
      );

      // Update discovery run with results
      await this.updateDiscoveryRun(discoveryRun.id, {
        status: 'completed' as DiscoveryStatus,
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        automations_found: automations.length,
        errors_count: errors.length,
        warnings_count: warnings.length
      });

      // Calculate risk score (simplified for now)
      const riskScore = this.calculatePlatformRiskScore(automations, permissionCheck);

      const executionTime = Date.now() - startTime;

      return {
        platform: connection.platform_type,
        connectionId: connection.id,
        automations: automations, // Return original AutomationEvent[] from connector, not database records
        auditLogs,
        permissionCheck,
        discoveredAt: new Date(),
        errors,
        warnings,
        metadata: {
          executionTimeMs: executionTime,
          automationsFound: storedAutomations.length,
          auditLogsFound: auditLogs.length,
          riskScore,
          complianceStatus: permissionCheck.isValid ? 'compliant' : 'non_compliant'
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        platform: connection.platform_type,
        connectionId: connection.id,
        automations: [],
        auditLogs: [],
        permissionCheck: {
          isValid: false,
          permissions: [],
          missingPermissions: [],
          errors: [errorMessage],
          lastChecked: new Date()
        },
        discoveredAt: new Date(),
        errors,
        warnings,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          automationsFound: 0,
          auditLogsFound: 0,
          riskScore: 0,
          complianceStatus: 'unknown'
        }
      };
    }
  }

  /**
   * Get platform connections for discovery
   */
  private async getPlatformConnections(config: DiscoveryJobConfig): Promise<PlatformConnection[]> {
    if (config.platformConnectionIds) {
      // Get specific connections
      const connections = [];
      for (const id of config.platformConnectionIds) {
        const connection = await platformConnectionRepository.findById(id);
        if (connection && connection.organization_id === config.organizationId) {
          connections.push(connection);
        }
      }
      return connections;
    } else {
      // Get all active connections for the organization
      const result = await platformConnectionRepository.findMany({
        organization_id: config.organizationId,
        status: 'active'
      });
      return result.data;
    }
  }

  /**
   * Get OAuth credentials for a platform connection
   */
  private async getOAuthCredentials(connectionId: string): Promise<OAuthCredentialsResult> {
    const accessToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'access_token'
    );

    const refreshToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'refresh_token'
    );

    if (!accessToken) {
      throw new Error('No access token found for platform connection');
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer'
    };
  }

  /**
   * Create a discovery run record
   */
  private async createDiscoveryRun(
    platformConnectionId: string,
    organizationId: string
  ): Promise<DiscoveryRun> {
    const query = `
      INSERT INTO discovery_runs (organization_id, platform_connection_id, status, started_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;

    const result = await db.query<DiscoveryRun>(query, [
      organizationId,
      platformConnectionId,
      'in_progress'
    ]);

    const discoveryRun = result.rows[0];
    if (!discoveryRun) {
      throw new Error('Failed to create discovery run');
    }
    return discoveryRun;
  }

  /**
   * Update discovery run with results
   */
  private async updateDiscoveryRun(
    discoveryRunId: string,
    updates: Partial<DiscoveryRun>
  ): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE discovery_runs 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
    `;

    const values: (string | number | boolean | Date | null | undefined)[] = [
      discoveryRunId, 
      ...Object.values(updates).map(value => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        if (value instanceof Date) return value;
        // For complex objects, serialize to JSON string
        return JSON.stringify(value);
      })
    ];
    await db.query(query, values);
  }

  /**
   * Store discovered automations in the database
   * Maps AutomationEvent objects from platform connectors to DiscoveredAutomation database records
   */
  private async storeDiscoveredAutomations(
    automations: AutomationEvent[],
    discoveryRunId: string,
    platformConnectionId: string,
    organizationId: string
  ): Promise<DiscoveredAutomation[]> {
    const storedAutomations: DiscoveredAutomation[] = [];

    for (const automation of automations) {
      try {
        const query = `
          INSERT INTO discovered_automations (
            organization_id,
            platform_connection_id,
            discovery_run_id,
            external_id,
            name,
            description,
            automation_type,
            status,
            trigger_type,
            actions,
            permissions_required,
            data_access_patterns,
            owner_info,
            last_modified_at,
            last_triggered_at,
            execution_frequency,
            platform_metadata,
            first_discovered_at,
            last_seen_at,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (platform_connection_id, external_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            last_seen_at = NOW(),
            platform_metadata = EXCLUDED.platform_metadata,
            updated_at = NOW()
          RETURNING *
        `;

        const values: (string | number | boolean | Date | null)[] = [
          organizationId,
          platformConnectionId,
          discoveryRunId,
          automation.id,
          automation.name,
          automation.description || null,
          this.mapAutomationType(automation.type),
          this.mapAutomationStatus(automation.status),
          automation.trigger,
          JSON.stringify(automation.actions),
          JSON.stringify(automation.permissions || []),
          JSON.stringify([]), // data_access_patterns - would be derived from automation analysis
          JSON.stringify(automation.owner || {}),
          automation.lastModified || null,
          automation.lastTriggered || null,
          null, // execution_frequency - would be derived from activity analysis
          JSON.stringify(automation.metadata),
          automation.createdAt,
          new Date(),
          true
        ];

        const result = await db.query<DiscoveredAutomation>(query, values);
        const storedAutomation = result.rows[0];
        if (storedAutomation) {
          storedAutomations.push(storedAutomation);
        }

      } catch (error) {
        console.error(`Failed to store automation ${automation.id}:`, error);
        // Continue with other automations
      }
    }

    return storedAutomations;
  }

  /**
   * Map connector automation type to database enum
   */
  private mapAutomationType(type: string): string {
    const typeMap: Record<string, string> = {
      'workflow': 'workflow',
      'bot': 'bot',
      'integration': 'integration',
      'webhook': 'webhook',
      'scheduled_task': 'scheduled_task',
      'trigger': 'trigger'
    };
    return typeMap[type] || 'integration';
  }

  /**
   * Map connector automation status to database enum
   */
  private mapAutomationStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'active',
      'inactive': 'inactive',
      'paused': 'paused',
      'error': 'error'
    };
    return statusMap[status] || 'unknown';
  }

  /**
   * Calculate a simple risk score for a platform
   */
  private calculatePlatformRiskScore(automations: AutomationEvent[], permissionCheck: { missingPermissions: string[]; errors: string[] }): number {
    let riskScore = 0;
    
    // Base risk from number of automations
    riskScore += Math.min(automations.length * 2, 30);
    
    // Risk from missing permissions
    riskScore += permissionCheck.missingPermissions.length * 5;
    
    // Risk from automation types
    const highRiskTypes = ['bot', 'webhook', 'integration'];
    const highRiskAutomations = automations.filter(a => highRiskTypes.includes(a.type));
    riskScore += highRiskAutomations.length * 3;
    
    // Risk from errors
    riskScore += permissionCheck.errors.length * 10;
    
    return Math.min(riskScore, 100);
  }

  /**
   * Schedule periodic discovery for all active connections
   */
  async schedulePeriodicDiscovery(organizationId: string, intervalHours: number = 24): Promise<void> {
    // This would integrate with a job queue system like Bull
    // For now, this is a placeholder
    console.log(`Scheduling periodic discovery for organization ${organizationId} every ${intervalHours} hours`);
  }

  /**
   * Get discovery statistics for an organization
   */
  async getDiscoveryStats(organizationId: string, days: number = 30): Promise<DiscoveryStats> {
    const query = `
      SELECT 
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
        SUM(automations_found) as total_automations_found,
        AVG(duration_ms) as avg_duration_ms,
        MAX(started_at) as last_discovery_at
      FROM discovery_runs 
      WHERE organization_id = $1 
        AND started_at > NOW() - INTERVAL '${days} days'
    `;

    const result = await db.query<DiscoveryStats>(query, [organizationId]);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to get discovery stats');
    }
    return row;
  }
}

// Export singleton instance
export const discoveryService = new DiscoveryService();