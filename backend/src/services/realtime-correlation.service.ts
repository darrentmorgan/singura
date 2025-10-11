/**
 * Real-Time Correlation Service
 * Socket.io integration for live correlation updates and executive dashboard streaming
 *
 * Business Impact:
 * - Enables real-time correlation monitoring for professional tier ($999/month) differentiation
 * - Provides live executive dashboard updates for C-level engagement
 * - Creates competitive advantage through immediate correlation detection and alerts
 * - Supports enterprise SLA requirements for sub-2-second correlation notifications
 *
 * Features:
 * - Real-time correlation analysis progress streaming
 * - Live automation chain detection alerts
 * - Executive dashboard integration with live risk metrics
 * - High-priority security alert broadcasting
 * - Performance monitoring and operational metrics streaming
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { EventEmitter } from 'events';

import {
  CorrelationAnalysisResult,
  AutomationWorkflowChain,
  ExecutiveRiskReport,
  MultiPlatformRiskAssessment
} from '@singura/shared-types';

import { CorrelationOrchestratorService, CorrelationEvents } from './correlation-orchestrator.service';

/**
 * Real-time correlation event types for Socket.io broadcasting
 */
interface RealTimeCorrelationEvents {
  // Analysis Progress Events
  'correlation:started': { organizationId: string; platformCount: number; eventCount: number; timestamp: Date };
  'correlation:progress': { organizationId: string; progress: number; stage: string; chainsDetected: number; timestamp: Date };
  'correlation:completed': { organizationId: string; result: CorrelationAnalysisResult; processingTime: number; timestamp: Date };
  'correlation:error': { organizationId: string; error: string; timestamp: Date };

  // Chain Detection Events
  'chain:detected': { organizationId: string; chain: AutomationWorkflowChain; riskLevel: string; timestamp: Date };
  'chain:high_risk_alert': { organizationId: string; chain: AutomationWorkflowChain; alertLevel: 'high' | 'critical'; timestamp: Date };

  // Risk Assessment Events
  'risk:assessment_update': { organizationId: string; assessment: MultiPlatformRiskAssessment; timestamp: Date };
  'risk:threshold_exceeded': { organizationId: string; currentRisk: number; threshold: number; timestamp: Date };

  // Executive Dashboard Events
  'executive:report_ready': { organizationId: string; report: ExecutiveRiskReport; timestamp: Date };
  'executive:metrics_update': { organizationId: string; metrics: ExecutiveMetrics; timestamp: Date };

  // System Performance Events
  'system:performance_update': { latency: number; accuracy: number; throughput: number; timestamp: Date };
  'system:health_check': { status: 'healthy' | 'degraded' | 'critical'; services: ServiceHealthStatus[]; timestamp: Date };
}

/**
 * Executive metrics for C-level dashboard streaming
 */
interface ExecutiveMetrics {
  totalAutomationChains: number;
  crossPlatformWorkflows: number;
  overallRiskScore: number;
  complianceViolations: number;
  aiIntegrationsDetected: number;
  riskTrend: 'increasing' | 'stable' | 'decreasing';
  lastAnalysisTime: Date;
}

/**
 * Service health status for operational monitoring
 */
interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'critical';
  latency?: number;
  errorRate?: number;
  lastCheck: Date;
}

/**
 * Client subscription management for targeted updates
 */
interface SubscriptionPreferences {
  organizationId: string;
  subscriptions: {
    analysisProgress: boolean;
    chainDetection: boolean;
    riskAlerts: boolean;
    executiveUpdates: boolean;
    performanceMetrics: boolean;
  };
  riskLevelFilter: ('low' | 'medium' | 'high' | 'critical')[];
  alertThresholds: {
    riskScore: number; // Alert if risk score exceeds this
    complianceViolations: number; // Alert if violations exceed this
  };
}

/**
 * Real-Time Correlation Service
 *
 * Responsibilities:
 * 1. Stream correlation analysis progress to connected executive dashboards
 * 2. Broadcast high-priority automation chain alerts in real-time
 * 3. Provide live risk metric updates for operational monitoring
 * 4. Manage client subscriptions and targeted notification delivery
 * 5. Monitor system performance and broadcast health metrics
 */
export class RealTimeCorrelationService extends EventEmitter {
  private io: SocketIOServer;
  private correlationOrchestrator: CorrelationOrchestratorService;
  private clientSubscriptions: Map<string, SubscriptionPreferences> = new Map();
  private connectedClients: Map<string, Socket> = new Map();
  private performanceMetrics: Map<string, number> = new Map();

  constructor(
    httpServer: HTTPServer,
    correlationOrchestrator: CorrelationOrchestratorService
  ) {
    super();

    this.correlationOrchestrator = correlationOrchestrator;

    // Initialize Socket.io server with enterprise-grade configuration
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:4203',
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.initializeSocketHandlers();
    this.initializeCorrelationEventListeners();
    this.startPerformanceMonitoring();

    console.log('🔄 Real-time correlation service initialized');
  }

  /**
   * Initialize Socket.io connection handlers for client management
   */
  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`📡 Client connected: ${socket.id}`);

      // Handle client authentication and subscription setup
      socket.on('authenticate', (data: { organizationId: string; userRole: string; token?: string }) => {
        try {
          // TODO: Implement proper JWT token validation
          const { organizationId, userRole } = data;

          // Set default subscription preferences based on user role
          const defaultSubscriptions = this.getDefaultSubscriptionsByRole(userRole);
          this.clientSubscriptions.set(socket.id, {
            organizationId,
            subscriptions: defaultSubscriptions,
            riskLevelFilter: ['medium', 'high', 'critical'],
            alertThresholds: {
              riskScore: 75, // Alert for 75+ risk score
              complianceViolations: 1 // Alert for any compliance violations
            }
          });

          this.connectedClients.set(socket.id, socket);

          // Join organization-specific room for targeted updates
          socket.join(`org:${organizationId}`);

          // Send initial status
          socket.emit('authenticated', {
            success: true,
            organizationId,
            subscriptions: defaultSubscriptions
          });

          console.log(`✅ Client authenticated: ${socket.id} (org: ${organizationId}, role: ${userRole})`);

        } catch (error) {
          console.error('Authentication failed:', error);
          socket.emit('authentication_error', { error: 'Authentication failed' });
        }
      });

      // Handle subscription preference updates
      socket.on('update_subscriptions', (preferences: Partial<SubscriptionPreferences>) => {
        const currentPrefs = this.clientSubscriptions.get(socket.id);
        if (currentPrefs) {
          const updatedPrefs = { ...currentPrefs, ...preferences };
          this.clientSubscriptions.set(socket.id, updatedPrefs);

          socket.emit('subscriptions_updated', { success: true, preferences: updatedPrefs });
          console.log(`🔄 Updated subscriptions for client ${socket.id}`);
        }
      });

      // Handle manual correlation analysis requests
      socket.on('request_analysis', async (data: { organizationId: string; timeRange?: any }) => {
        try {
          const clientPrefs = this.clientSubscriptions.get(socket.id);
          if (!clientPrefs || clientPrefs.organizationId !== data.organizationId) {
            socket.emit('analysis_error', { error: 'Unauthorized organization access' });
            return;
          }

          // Trigger correlation analysis
          await this.correlationOrchestrator.executeCorrelationAnalysis(
            data.organizationId,
            data.timeRange
          );

        } catch (error) {
          console.error('Manual analysis request failed:', error);
          socket.emit('analysis_error', {
            error: error instanceof Error ? error.message : 'Analysis failed'
          });
        }
      });

      // Handle real-time monitoring control
      socket.on('control_real_time', (data: { action: 'start' | 'stop'; organizationId: string }) => {
        try {
          const clientPrefs = this.clientSubscriptions.get(socket.id);
          if (!clientPrefs || clientPrefs.organizationId !== data.organizationId) {
            socket.emit('control_error', { error: 'Unauthorized organization access' });
            return;
          }

          if (data.action === 'start') {
            this.correlationOrchestrator.startRealTimeMonitoring();
          } else {
            this.correlationOrchestrator.stopRealTimeMonitoring();
          }

          socket.emit('real_time_control_success', { action: data.action });

        } catch (error) {
          console.error('Real-time control failed:', error);
          socket.emit('control_error', {
            error: error instanceof Error ? error.message : 'Control action failed'
          });
        }
      });

      // Handle client disconnection
      socket.on('disconnect', (reason) => {
        console.log(`📡 Client disconnected: ${socket.id} (reason: ${reason})`);
        this.clientSubscriptions.delete(socket.id);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Initialize correlation orchestrator event listeners for real-time broadcasting
   */
  private initializeCorrelationEventListeners(): void {
    // Analysis progress events
    this.correlationOrchestrator.on('correlationStarted', (data) => {
      this.broadcastToSubscribedClients('correlation:started', {
        ...data,
        timestamp: new Date()
      }, 'analysisProgress');
    });

    this.correlationOrchestrator.on('correlationProgress', (data) => {
      this.broadcastToSubscribedClients('correlation:progress', {
        organizationId: 'current', // TODO: Get from context
        ...data,
        timestamp: new Date()
      }, 'analysisProgress');
    });

    this.correlationOrchestrator.on('correlationCompleted', (data) => {
      this.broadcastToSubscribedClients('correlation:completed', {
        organizationId: 'current', // TODO: Get from context
        ...data,
        timestamp: new Date()
      }, 'analysisProgress');

      // Update executive metrics
      this.updateExecutiveMetrics(data.result);
    });

    this.correlationOrchestrator.on('correlationError', (data) => {
      this.broadcastToSubscribedClients('correlation:error', {
        ...data,
        timestamp: new Date()
      }, 'analysisProgress');
    });

    // Chain detection events
    this.correlationOrchestrator.on('chainDetected', (data) => {
      this.broadcastToSubscribedClients('chain:detected', {
        organizationId: 'current', // TODO: Get from context
        ...data,
        timestamp: new Date()
      }, 'chainDetection');

      // Check for high-risk alerts
      if (['high', 'critical'].includes(data.riskLevel)) {
        this.broadcastHighRiskAlert(data.chain, data.riskLevel as 'high' | 'critical');
      }
    });

    // Risk assessment events
    this.correlationOrchestrator.on('riskAssessmentUpdate', (data) => {
      this.broadcastToSubscribedClients('risk:assessment_update', {
        organizationId: 'current', // TODO: Get from context
        ...data,
        timestamp: new Date()
      }, 'riskAlerts');

      // Check risk thresholds
      this.checkRiskThresholds(data.assessment);
    });
  }

  /**
   * Broadcast high-risk automation chain alerts to priority subscribers
   */
  private broadcastHighRiskAlert(chain: AutomationWorkflowChain, alertLevel: 'high' | 'critical'): void {
    const alertData = {
      organizationId: 'current', // TODO: Get from context
      chain,
      alertLevel,
      timestamp: new Date()
    };

    // Send to all clients subscribed to risk alerts
    this.connectedClients.forEach((socket, socketId) => {
      const prefs = this.clientSubscriptions.get(socketId);
      if (prefs?.subscriptions.riskAlerts && prefs.riskLevelFilter.includes(alertLevel)) {
        socket.emit('chain:high_risk_alert', alertData);
      }
    });

    console.log(`🚨 High-risk alert broadcasted: ${alertLevel} risk chain detected`);
  }

  /**
   * Check risk thresholds and send alerts when exceeded
   */
  private checkRiskThresholds(assessment: MultiPlatformRiskAssessment): void {
    const currentRiskScore = assessment.overallAssessment.compositeRiskScore;

    this.connectedClients.forEach((socket, socketId) => {
      const prefs = this.clientSubscriptions.get(socketId);
      if (prefs?.subscriptions.riskAlerts && currentRiskScore > prefs.alertThresholds.riskScore) {
        socket.emit('risk:threshold_exceeded', {
          organizationId: prefs.organizationId,
          currentRisk: currentRiskScore,
          threshold: prefs.alertThresholds.riskScore,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Update and broadcast executive metrics for C-level dashboards
   */
  private updateExecutiveMetrics(analysisResult: CorrelationAnalysisResult): void {
    const metrics: ExecutiveMetrics = {
      totalAutomationChains: analysisResult.summary.totalAutomationChains,
      crossPlatformWorkflows: analysisResult.summary.crossPlatformWorkflows,
      overallRiskScore: analysisResult.summary.overallRiskScore,
      complianceViolations: analysisResult.summary.complianceViolations,
      aiIntegrationsDetected: analysisResult.summary.aiIntegrationsDetected,
      riskTrend: this.calculateRiskTrend(analysisResult.summary.overallRiskScore),
      lastAnalysisTime: analysisResult.analysisDate
    };

    this.broadcastToSubscribedClients('executive:metrics_update', {
      organizationId: analysisResult.organizationId,
      metrics,
      timestamp: new Date()
    }, 'executiveUpdates');
  }

  /**
   * Broadcast messages to clients with specific subscription preferences
   */
  private broadcastToSubscribedClients<T extends keyof RealTimeCorrelationEvents>(
    event: T,
    data: RealTimeCorrelationEvents[T],
    subscriptionType: keyof SubscriptionPreferences['subscriptions']
  ): void {
    this.connectedClients.forEach((socket, socketId) => {
      const prefs = this.clientSubscriptions.get(socketId);
      if (prefs?.subscriptions[subscriptionType]) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * Start performance monitoring and health check broadcasting
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      const performanceData = this.correlationOrchestrator.getCorrelationStatus();
      const performanceMetrics = performanceData.performanceMetrics;

      if (performanceMetrics) {
        this.broadcastToSubscribedClients('system:performance_update', {
          latency: performanceMetrics.correlationLatency,
          accuracy: performanceMetrics.accuracyScore,
          throughput: performanceMetrics.eventsProcessed,
          timestamp: new Date()
        }, 'performanceMetrics');
      }

      // Health check
      const healthStatus = this.performSystemHealthCheck();
      this.broadcastToSubscribedClients('system:health_check', {
        ...healthStatus,
        timestamp: new Date()
      }, 'performanceMetrics');

    }, 30000); // Every 30 seconds
  }

  /**
   * Perform system health check for operational monitoring
   */
  private performSystemHealthCheck(): { status: 'healthy' | 'degraded' | 'critical'; services: ServiceHealthStatus[] } {
    const services: ServiceHealthStatus[] = [
      {
        service: 'correlation-engine',
        status: 'healthy', // TODO: Implement actual health checks
        latency: 150,
        errorRate: 0.01,
        lastCheck: new Date()
      },
      {
        service: 'platform-connectors',
        status: 'healthy',
        lastCheck: new Date()
      },
      {
        service: 'risk-assessment',
        status: 'healthy',
        lastCheck: new Date()
      }
    ];

    const overallStatus = services.some(s => s.status === 'critical') ? 'critical' :
                         services.some(s => s.status === 'degraded') ? 'degraded' : 'healthy';

    return { status: overallStatus, services };
  }

  /**
   * Get default subscription preferences based on user role
   */
  private getDefaultSubscriptionsByRole(userRole: string): SubscriptionPreferences['subscriptions'] {
    switch (userRole.toLowerCase()) {
      case 'ciso':
      case 'executive':
        return {
          analysisProgress: false,
          chainDetection: true,
          riskAlerts: true,
          executiveUpdates: true,
          performanceMetrics: false
        };
      case 'security_analyst':
      case 'analyst':
        return {
          analysisProgress: true,
          chainDetection: true,
          riskAlerts: true,
          executiveUpdates: false,
          performanceMetrics: true
        };
      case 'admin':
        return {
          analysisProgress: true,
          chainDetection: true,
          riskAlerts: true,
          executiveUpdates: true,
          performanceMetrics: true
        };
      default:
        return {
          analysisProgress: true,
          chainDetection: true,
          riskAlerts: false,
          executiveUpdates: false,
          performanceMetrics: false
        };
    }
  }

  /**
   * Calculate risk trend based on historical data
   */
  private calculateRiskTrend(currentRiskScore: number): 'increasing' | 'stable' | 'decreasing' {
    // TODO: Implement actual trend calculation based on historical data
    // For now, return stable as placeholder
    return 'stable';
  }

  /**
   * Get real-time service statistics for monitoring
   */
  getServiceStatistics(): {
    connectedClients: number;
    activeSubscriptions: number;
    totalEventsSent: number;
    averageLatency: number;
  } {
    return {
      connectedClients: this.connectedClients.size,
      activeSubscriptions: this.clientSubscriptions.size,
      totalEventsSent: this.performanceMetrics.get('totalEventsSent') || 0,
      averageLatency: this.performanceMetrics.get('averageLatency') || 0
    };
  }

  /**
   * Broadcast custom message to specific organization
   */
  broadcastToOrganization(organizationId: string, event: string, data: any): void {
    this.io.to(`org:${organizationId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Graceful shutdown for service cleanup
   */
  shutdown(): void {
    console.log('🔄 Shutting down real-time correlation service...');
    this.io.close();
    this.removeAllListeners();
    console.log('✅ Real-time correlation service shutdown complete');
  }
}