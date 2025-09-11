import { DetectionAlgorithm } from './detection-patterns';
import { PlatformType } from '../platforms/google';

/**
 * Admin Dashboard Live Scan Event
 * Represents a real-time scan event for admin monitoring
 */
export interface AdminScanEvent {
  timestamp: Date;
  platform: PlatformType;
  connectionId: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  message: string;
  eventType: 'log_fetch' | 'detection_scan' | 'risk_assessment';
}

/**
 * Detailed Detection Result for Admin Dashboard
 * Provides comprehensive information about a single detection
 */
export interface AdminDetectionResult {
  id: string;
  timestamp: Date;
  algorithm: DetectionAlgorithm;
  platform: PlatformType;
  confidence: number;
  rawData: Record<string, unknown>;
  detectedEntity: {
    type: 'bot' | 'automation' | 'script' | 'integration';
    endpoint?: string;
    userAgent?: string;
    dataAccess?: string[];
  };
  riskScore: number;
}

/**
 * Algorithm Performance Metrics
 * Tracks performance and accuracy of detection algorithms
 */
export interface AlgorithmPerformanceMetrics {
  algorithmName: DetectionAlgorithm;
  totalScans: number;
  detectionsFound: number;
  accuracyRate: number;
  averageProcessingTime: number;
  confidenceDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  lastUpdated: Date;
}

/**
 * System Health Status
 * Provides an overview of the system's current operational status
 */
export interface AdminSystemHealth {
  oauthConnections: {
    [platform in PlatformType]: {
      status: 'active' | 'expired' | 'error';
      lastSuccessfulSync: Date | null;
      errorMessage?: string;
    }
  };
  apiQuotaUsage: {
    [platform in PlatformType]: {
      used: number;
      total: number;
      percentageUsed: number;
    }
  };
  systemLoadMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    activeDetectionJobs: number;
  };
}

/**
 * Admin Dashboard Data Request
 * Defines parameters for fetching admin dashboard data
 */
export interface AdminDashboardDataRequest {
  timeRange?: {
    start: Date;
    end: Date;
  };
  platforms?: PlatformType[];
  detailLevel?: 'summary' | 'detailed' | 'raw';
}

/**
 * Admin Dashboard Data Response
 * Comprehensive data structure for admin dashboard
 */
export interface AdminDashboardDataResponse {
  scanEvents: AdminScanEvent[];
  detectionResults: AdminDetectionResult[];
  performanceMetrics: AlgorithmPerformanceMetrics[];
  systemHealth: AdminSystemHealth;
}