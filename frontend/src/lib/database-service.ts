/**
 * Database Service - Unified Supabase Interface
 * Maintains @saas-xray/shared-types compatibility
 * Provides identical API to backend database service
 */

import { supabase, healthCheck } from './supabase';
import {
  organizationRepository,
  platformConnectionRepository,
  encryptedCredentialRepository,
  discoveredAutomationRepository
} from './repositories';

export class DatabaseService {
  // Repository instances
  public readonly organizations = organizationRepository;
  public readonly platformConnections = platformConnectionRepository;
  public readonly encryptedCredentials = encryptedCredentialRepository;
  public readonly discoveredAutomations = discoveredAutomationRepository;

  /**
   * Check database connectivity
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    return healthCheck();
  }

  /**
   * Test all repositories
   */
  async testConnectivity(): Promise<{
    overall: boolean;
    repositories: Record<string, boolean>;
    errors: string[];
  }> {
    const results = {
      overall: true,
      repositories: {} as Record<string, boolean>,
      errors: [] as string[]
    };

    // Test organization repository
    try {
      await this.organizations.count();
      results.repositories.organizations = true;
    } catch (error) {
      results.repositories.organizations = false;
      results.overall = false;
      results.errors.push(`Organizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test platform connections repository
    try {
      await this.platformConnections.count();
      results.repositories.platformConnections = true;
    } catch (error) {
      results.repositories.platformConnections = false;
      results.overall = false;
      results.errors.push(`Platform Connections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test encrypted credentials repository
    try {
      await this.encryptedCredentials.count();
      results.repositories.encryptedCredentials = true;
    } catch (error) {
      results.repositories.encryptedCredentials = false;
      results.overall = false;
      results.errors.push(`Encrypted Credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test discovered automations repository
    try {
      await this.discoveredAutomations.count();
      results.repositories.discoveredAutomations = true;
    } catch (error) {
      results.repositories.discoveredAutomations = false;
      results.overall = false;
      results.errors.push(`Discovered Automations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    organizations: number;
    connections: number;
    credentials: number;
    automations: number;
    lastUpdated: Date;
  }> {
    const [orgCount, connCount, credCount, autoCount] = await Promise.all([
      this.organizations.count(),
      this.platformConnections.count(),
      this.encryptedCredentials.count(),
      this.discoveredAutomations.count()
    ]);

    return {
      organizations: orgCount,
      connections: connCount,
      credentials: credCount,
      automations: autoCount,
      lastUpdated: new Date()
    };
  }

  /**
   * Execute raw SQL using Supabase RPC
   */
  async executeRPC<T>(functionName: string, params?: Record<string, unknown>): Promise<T[]> {
    const { data, error } = await supabase.rpc(functionName, params);
    
    if (error) {
      throw new Error(`RPC function ${functionName} failed: ${error.message}`);
    }
    
    return data as T[];
  }

  /**
   * Subscribe to real-time changes for a table
   */
  subscribeToTable<T>(
    tableName: string,
    filter?: string,
    callback?: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: T; old: T }) => void
  ) {
    let subscription = supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: filter
        },
        (payload: any) => {
          if (callback) {
            callback({
              eventType: payload.eventType,
              new: payload.new as T,
              old: payload.old as T
            });
          }
        }
      );

    if (filter) {
      subscription = subscription.filter('postgres_changes', filter);
    }

    return subscription.subscribe();
  }

  /**
   * Clean up expired data across all repositories
   */
  async cleanupExpiredData(): Promise<{
    credentials: number;
    connections: number;
    total: number;
  }> {
    const [credentialsCleanup] = await Promise.all([
      this.encryptedCredentials.cleanupExpired()
    ]);

    // Mark expired connections
    const expiredConnections = await this.platformConnections.getExpiringConnections(0);
    let connectionsMarked = 0;
    
    for (const connection of expiredConnections) {
      const marked = await this.platformConnections.markAsExpired(connection.id);
      if (marked) connectionsMarked++;
    }

    return {
      credentials: credentialsCleanup,
      connections: connectionsMarked,
      total: credentialsCleanup + connectionsMarked
    };
  }

  /**
   * Get organization dashboard data
   */
  async getOrganizationDashboard(organizationId: string): Promise<{
    organization: any;
    statistics: any;
    recentActivity: any[];
    riskSummary: any;
    connections: any[];
  }> {
    const [
      organization,
      statistics,
      connections
    ] = await Promise.all([
      this.organizations.findById(organizationId),
      this.organizations.getStatistics(organizationId),
      this.platformConnections.findByOrganizationId(organizationId)
    ]);

    const automationSummary = await this.discoveredAutomations.getDashboardSummary(organizationId);

    return {
      organization,
      statistics: {
        ...statistics,
        ...automationSummary
      },
      recentActivity: [], // TODO: Implement activity feed
      riskSummary: {
        high_risk: automationSummary.high_risk_count,
        critical_risk: automationSummary.critical_risk_count,
        total: automationSummary.total_automations
      },
      connections
    };
  }

  /**
   * Validate data integrity across repositories
   */
  async validateDataIntegrity(organizationId: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for orphaned records
    const connections = await this.platformConnections.findByOrganizationId(organizationId);
    
    for (const connection of connections) {
      const credentials = await this.encryptedCredentials.findByConnection(connection.id);
      
      if (credentials.length === 0 && connection.status === 'active') {
        issues.push(`Active connection ${connection.display_name} has no credentials`);
        recommendations.push(`Review and refresh OAuth tokens for ${connection.display_name}`);
      }
    }

    // Check for stale automations
    const staleAutomations = await this.discoveredAutomations.getStaleAutomations(organizationId, 7);
    if (staleAutomations.length > 0) {
      issues.push(`${staleAutomations.length} automations haven't been seen in 7+ days`);
      recommendations.push('Run discovery to refresh automation data');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// Singleton instance
export const databaseService = new DatabaseService();

// Export for use in components and hooks
export default databaseService;