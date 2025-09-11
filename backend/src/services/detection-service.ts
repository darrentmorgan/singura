import { 
  AdminScanEvent, 
  AdminDetectionResult, 
  AlgorithmPerformanceMetrics, 
  AdminSystemHealth,
  AdminDashboardDataRequest,
  AdminDashboardDataResponse,
  PlatformType,
  DetectionAlgorithm
} from '@saas-xray/shared-types';

export class DetectionService {
  private scanEvents: AdminScanEvent[] = [];
  private detectionResults: AdminDetectionResult[] = [];
  private performanceMetrics: AlgorithmPerformanceMetrics[] = [];

  /**
   * Record a new scan event for admin monitoring
   */
  recordScanEvent(event: AdminScanEvent): void {
    this.scanEvents.push(event);
    // Limit to last 100 events
    if (this.scanEvents.length > 100) {
      this.scanEvents.shift();
    }
  }

  /**
   * Record a new detection result
   */
  recordDetectionResult(result: AdminDetectionResult): void {
    this.detectionResults.push(result);
    // Update performance metrics
    this.updatePerformanceMetrics(result);
    // Limit to last 500 results
    if (this.detectionResults.length > 500) {
      this.detectionResults.shift();
    }
  }

  /**
   * Update algorithm performance metrics
   */
  private updatePerformanceMetrics(result: AdminDetectionResult): void {
    const existingMetrics = this.performanceMetrics.find(
      metrics => metrics.algorithmName === result.algorithm
    );

    if (existingMetrics) {
      existingMetrics.totalScans++;
      existingMetrics.detectionsFound += result.confidence > 0.5 ? 1 : 0;
      existingMetrics.accuracyRate = 
        existingMetrics.detectionsFound / existingMetrics.totalScans;
      existingMetrics.lastUpdated = new Date();
    } else {
      this.performanceMetrics.push({
        algorithmName: result.algorithm,
        totalScans: 1,
        detectionsFound: result.confidence > 0.5 ? 1 : 0,
        accuracyRate: result.confidence > 0.5 ? 1 : 0,
        averageProcessingTime: 0, // This would be tracked more comprehensively in a real system
        confidenceDistribution: {
          low: result.confidence < 0.3 ? 1 : 0,
          medium: result.confidence >= 0.3 && result.confidence < 0.7 ? 1 : 0,
          high: result.confidence >= 0.7 ? 1 : 0
        },
        lastUpdated: new Date()
      });
    }
  }

  /**
   * Get system health status (mock implementation)
   */
  getSystemHealth(): AdminSystemHealth {
    const platforms: PlatformType[] = ['google', 'slack', 'microsoft'];
    
    return {
      oauthConnections: platforms.reduce((acc, platform) => ({
        ...acc,
        [platform]: {
          status: 'active', // In a real system, this would be dynamically determined
          lastSuccessfulSync: new Date(),
        }
      }), {} as AdminSystemHealth['oauthConnections']),
      apiQuotaUsage: platforms.reduce((acc, platform) => ({
        ...acc,
        [platform]: {
          used: Math.floor(Math.random() * 1000),
          total: 5000,
          percentageUsed: Math.floor(Math.random() * 20)
        }
      }), {} as AdminSystemHealth['apiQuotaUsage']),
      systemLoadMetrics: {
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100),
        activeDetectionJobs: Math.floor(Math.random() * 10)
      }
    };
  }

  /**
   * Fetch admin dashboard data based on request parameters
   */
  getAdminDashboardData(
    request: AdminDashboardDataRequest
  ): AdminDashboardDataResponse {
    // Filter events and results based on request parameters
    const filteredScanEvents = this.scanEvents.filter(event => 
      (!request.timeRange || 
        (event.timestamp >= request.timeRange.start && 
         event.timestamp <= request.timeRange.end)) &&
      (!request.platforms || request.platforms.includes(event.platform))
    );

    const filteredDetectionResults = this.detectionResults.filter(result => 
      (!request.timeRange || 
        (result.timestamp >= request.timeRange.start && 
         result.timestamp <= request.timeRange.end)) &&
      (!request.platforms || request.platforms.includes(result.platform))
    );

    return {
      scanEvents: filteredScanEvents,
      detectionResults: filteredDetectionResults,
      performanceMetrics: this.performanceMetrics,
      systemHealth: this.getSystemHealth()
    };
  }
}

// Singleton instance for global access
export const detectionService = new DetectionService();