/**
 * Enhanced Discovery Service with Real-time Events
 * Extends the discovery service to emit real-time updates via Socket.io
 */

import { discoveryService, DiscoveryJobConfig, DiscoveryJobResult, DiscoveryStats } from './discovery-service';
import { 
  publishDiscoveryEvent, 
  publishAutomationEvent, 
  publishConnectionEvent 
} from './realtime-service';

/**
 * Enhanced Discovery Service with Real-time Updates
 */
export class RealTimeDiscoveryService {
  private baseService = discoveryService;

  /**
   * Run discovery with real-time progress updates
   */
  async runDiscoveryWithUpdates(config: DiscoveryJobConfig): Promise<DiscoveryJobResult> {
    const startTime = Date.now();
    const jobId = `discovery-${startTime}-${config.organizationId}`;

    try {
      // Emit discovery started event
      await publishDiscoveryEvent('started', {
        organizationId: config.organizationId,
        jobId,
        platform: 'multi-platform',
        connectionId: config.platformConnectionIds?.[0] || 'all'
      });

      // Get platform connections to discover
      const connections = await (this.baseService as any).getPlatformConnections(config);
      
      let completedConnections = 0;
      const results: any[] = [];
      const errors: string[] = [];

      // Process each connection with progress updates
      for (const connection of connections) {
        try {
          // Emit progress update
          await publishDiscoveryEvent('progress', {
            organizationId: config.organizationId,
            connectionId: connection.id,
            jobId,
            progress: Math.round((completedConnections / connections.length) * 100),
            stage: `Discovering ${connection.platform_type} automations`,
            message: `Processing ${connection.display_name || connection.platform_type}`
          });

          // Run discovery for this connection
          const result = await (this.baseService as any).discoverPlatformAutomations(connection, config);
          results.push(result);

          // Emit individual automation discovery events
          for (const automation of result.automations) {
            await publishAutomationEvent('discovered', {
              organizationId: config.organizationId,
              automation: {
                id: automation.id,
                name: automation.name,
                type: automation.type,
                platform: automation.platform,
                riskLevel: automation.riskLevel
              }
            });
          }

          completedConnections++;

          // Emit progress update
          await publishDiscoveryEvent('progress', {
            organizationId: config.organizationId,
            connectionId: connection.id,
            jobId,
            progress: Math.round((completedConnections / connections.length) * 100),
            stage: 'Discovery completed',
            message: `Found ${result.automations.length} automations`
          });

        } catch (error) {
          const errorMessage = `Discovery failed for ${connection.platform_type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          
          // Emit connection error event
          await publishConnectionEvent('error', {
            organizationId: config.organizationId,
            connectionId: connection.id,
            platform: connection.platform_type,
            error: errorMessage
          });

          completedConnections++;
        }
      }

      // Calculate final results
      const totalAutomations = results.reduce((sum, r) => sum + r.automations.length, 0);
      const duration = Date.now() - startTime;

      const finalResult: DiscoveryJobResult = {
        jobId,
        totalPlatforms: connections.length,
        successfulPlatforms: results.length,
        totalAutomations,
        newAutomations: totalAutomations, // Would be calculated by comparing with existing
        updatedAutomations: 0, // Would be calculated during the discovery process
        errors,
        warnings: [],
        duration,
        results
      };

      // Emit completion event
      await publishDiscoveryEvent('completed', {
        organizationId: config.organizationId,
        connectionId: 'all',
        jobId,
        totalAutomations,
        newAutomations: totalAutomations,
        duration
      });

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Discovery failed';
      
      // Emit failure event
      await publishDiscoveryEvent('failed', {
        organizationId: config.organizationId,
        connectionId: 'all',
        jobId,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Discover automations for a single connection with real-time updates
   */
  async discoverConnectionWithUpdates(
    connectionId: string,
    organizationId: string
  ): Promise<any> {
    const jobId = `single-discovery-${Date.now()}-${connectionId}`;

    try {
      // Get connection details
      const { platformConnectionRepository } = await import('../database/repositories/platform-connection');
      const connection = await platformConnectionRepository.findById(connectionId);
      
      if (!connection || connection.organization_id !== organizationId) {
        throw new Error('Connection not found or access denied');
      }

      // Emit discovery started
      await publishDiscoveryEvent('started', {
        organizationId,
        connectionId,
        platform: connection.platform_type,
        jobId
      });

      // Emit initial progress
      await publishDiscoveryEvent('progress', {
        organizationId,
        connectionId,
        jobId,
        progress: 10,
        stage: 'Initializing discovery',
        message: `Starting discovery for ${connection.platform_type}`
      });

      // Run the discovery using the base service
      const config: DiscoveryJobConfig = {
        organizationId,
        platformConnectionIds: [connectionId],
        riskAssessment: true
      };

      const result = await (this.baseService as any).discoverPlatformAutomations(connection, config);

      // Emit automation discovered events
      for (const automation of result.automations) {
        await publishAutomationEvent('discovered', {
          organizationId,
          automation: {
            id: automation.id,
            name: automation.name,
            type: automation.type,
            platform: automation.platform,
            riskLevel: automation.riskLevel
          }
        });
      }

      // Emit completion
      await publishDiscoveryEvent('completed', {
        organizationId,
        connectionId,
        jobId,
        totalAutomations: result.automations.length,
        newAutomations: result.automations.length,
        duration: result.metadata.executionTimeMs
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Discovery failed';
      
      await publishDiscoveryEvent('failed', {
        organizationId,
        connectionId,
        jobId,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Schedule periodic discovery with real-time status updates
   */
  async schedulePeriodicDiscoveryWithUpdates(
    organizationId: string, 
    intervalHours: number = 24
  ): Promise<void> {
    try {
      // Use the job queue to schedule periodic discovery
      const { jobQueue } = await import('../jobs/queue');
      
      await jobQueue.schedulePeriodicDiscovery(organizationId, intervalHours);

      // Emit system notification
      await publishConnectionEvent('status_changed', {
        organizationId,
        connectionId: 'all',
        platform: 'system',
        status: 'periodic_discovery_enabled',
        previousStatus: 'manual_only'
      });

    } catch (error) {
      await publishConnectionEvent('error', {
        organizationId,
        connectionId: 'all', 
        platform: 'system',
        error: `Failed to schedule periodic discovery: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      throw error;
    }
  }

  /**
   * Get discovery statistics with real-time capabilities
   */
  async getDiscoveryStatsWithUpdates(organizationId: string, days: number = 30): Promise<DiscoveryStats> {
    try {
      const stats = await this.baseService.getDiscoveryStats(organizationId, days);
      
      // Could emit stats updated event if needed
      // await publishSystemEvent('stats_updated', { organizationId, stats });
      
      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Test connection with real-time status updates
   */
  async testConnectionWithUpdates(connectionId: string, organizationId: string): Promise<any> {
    try {
      // Get connection and test it
      const { platformConnectionRepository } = await import('../database/repositories/platform-connection');
      const connection = await platformConnectionRepository.findById(connectionId);
      
      if (!connection || connection.organization_id !== organizationId) {
        throw new Error('Connection not found or access denied');
      }

      // Emit testing started
      await publishConnectionEvent('status_changed', {
        organizationId,
        connectionId,
        platform: connection.platform_type,
        status: 'testing',
        previousStatus: connection.status
      });

      // Get the appropriate connector
      const connectors = {
        slack: () => import('../connectors/slack').then(m => m.slackConnector),
        google: () => import('../connectors/google').then(m => m.googleConnector),
        microsoft: () => import('../connectors/microsoft').then(m => m.microsoftConnector)
      };

      const connectorLoader = connectors[connection.platform_type as keyof typeof connectors];
      if (!connectorLoader) {
        throw new Error(`No connector available for platform: ${connection.platform_type}`);
      }

      const connector = await connectorLoader();

      // Get credentials and test
      const credentials = await (this.baseService as any).getOAuthCredentials(connectionId);
      const authResult = await connector.authenticate(credentials);

      if (authResult.success) {
        // Test permission validation
        const permissionCheck = await connector.validatePermissions();
        
        const newStatus = permissionCheck.isValid ? 'active' : 'error';
        
        // Emit status update
        await publishConnectionEvent('status_changed', {
          organizationId,
          connectionId,
          platform: connection.platform_type,
          status: newStatus,
          previousStatus: 'testing'
        });

        return {
          success: true,
          status: newStatus,
          permissions: permissionCheck.permissions,
          missingPermissions: permissionCheck.missingPermissions,
          errors: permissionCheck.errors
        };
      } else {
        // Emit error status
        await publishConnectionEvent('error', {
          organizationId,
          connectionId,
          platform: connection.platform_type,
          error: authResult.error || 'Authentication failed'
        });

        return {
          success: false,
          error: authResult.error,
          errorCode: authResult.errorCode
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      
      await publishConnectionEvent('error', {
        organizationId,
        connectionId,
        platform: 'unknown',
        error: errorMessage
      });

      throw error;
    }
  }
}

// Export singleton instance
export const realTimeDiscoveryService = new RealTimeDiscoveryService();