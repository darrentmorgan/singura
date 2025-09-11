import { DetectionAlgorithm, PlatformType } from './detection-patterns';

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

/**
 * Discovery event logging for real-time admin monitoring
 */
export interface DiscoveryEventLog {
  logId: string;
  discoveryId: string;
  connectionId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  stage: 'starting' | 'api_call' | 'algorithm_execution' | 'detection_found' | 'completed' | 'error';
  algorithm?: 'VelocityDetector' | 'AIProviderDetector' | 'BatchOperationDetector' | 'OffHoursDetector' | 'CrossPlatformCorrelator';
  timestamp: Date;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  
  executionDetails?: {
    processingTimeMs?: number;
    eventsAnalyzed?: number;
    confidence?: number;
    riskScore?: number;
    algorithmParameters?: Record<string, unknown>;
  };
  
  detectionResult?: {
    automationType?: string;
    automationName?: string;
    aiProvider?: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'google' | 'unknown';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    complianceViolations?: string[];
  };
  
  rawData?: {
    apiResponse?: Record<string, unknown>;
    auditLogCount?: number;
    correlatedEvents?: number;
    errorDetails?: string;
  };
}

/**
 * Admin terminal configuration for live/mock mode
 */
export interface AdminTerminalConfig {
  mode: 'mock' | 'live' | 'hybrid';
  showDiscoveryEvents: boolean;
  showAlgorithmExecution: boolean;
  showRawApiData: boolean;
  autoScroll: boolean;
  maxLogEntries: number;
  refreshInterval: number; // seconds
  logLevel: 'debug' | 'info' | 'warning' | 'error';
}

/**
 * Live discovery session for admin monitoring
 */
export interface LiveDiscoverySession {
  sessionId: string;
  connectionId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  
  progress: {
    currentStage: string;
    progressPercent: number;
    estimatedTimeRemaining?: number;
  };
  
  execution: {
    apiCallsExecuted: number;
    eventsProcessed: number;
    algorithmsExecuted: string[];
    detectionsFound: number;
    errorsEncountered: string[];
  };
  
  results: {
    automationsDetected: number;
    riskScore: number;
    complianceViolations: string[];
    executionTimeMs: number;
    averageConfidence: number;
  };
}

/**
 * Persistent discovery event history for static admin logging
 */
export interface DiscoveryEventHistory {
  eventId: string;
  discoveryId: string;
  connectionId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  triggeredAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  
  summary: DiscoveryEventSummary;
  detailedResults: AutomationDetectionDetail[];
  rawData: DiscoveryRawData;
  performance: DiscoveryPerformanceMetrics;
}

/**
 * Discovery event summary for quick overview
 */
export interface DiscoveryEventSummary {
  automationsFound: number;
  overallRiskScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  aiIntegrationsDetected: number;
  complianceViolations: string[];
  processingTimeMs: number;
  algorithmsExecuted: string[];
}

/**
 * Detailed automation detection analysis
 */
export interface AutomationDetectionDetail {
  automationId: string;
  name: string;
  type: 'bot' | 'workflow' | 'integration' | 'webhook' | 'script';
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  confidence: number; // 0-100
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  aiIntegration?: {
    provider: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'google' | 'unknown';
    apiEndpoints: string[];
    dataTypesProcessed: string[];
    estimatedDataVolume: 'low' | 'medium' | 'high' | 'massive';
    lastActivity: Date;
  };
  
  complianceAnalysis: {
    violations: ComplianceViolationDetail[];
    regulationsAffected: ('GDPR' | 'SOX' | 'HIPAA' | 'PCI' | 'CCPA')[];
    businessImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
    recommendedActions: string[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'immediate';
  };
  
  technicalDetails: {
    detectionMethod: string;
    algorithmsUsed: string[];
    evidenceFactors: string[];
    correlatedEvents: number;
    detectionTimestamp: Date;
    confidence_breakdown: {
      behavioral_patterns: number;
      api_signatures: number;
      timing_analysis: number;
      data_flow_analysis: number;
    };
  };
  
  automationMetadata: {
    description: string;
    triggers: string[];
    actions: string[];
    permissions: string[];
    createdDate?: Date;
    lastModified?: Date;
    lastTriggered?: Date;
    executionFrequency?: string;
  };
}

/**
 * Compliance violation detail
 */
export interface ComplianceViolationDetail {
  violationType: string;
  regulation: 'GDPR' | 'SOX' | 'HIPAA' | 'PCI' | 'CCPA';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataTypesAffected: string[];
  potentialFineRange?: {
    min: number;
    max: number;
    currency: string;
  };
  remediationSteps: string[];
}

/**
 * Raw discovery data for technical analysis
 */
export interface DiscoveryRawData {
  apiCalls: {
    endpoint: string;
    method: string;
    responseStatus: number;
    responseTimeMs: number;
    dataRetrieved: number;
  }[];
  
  auditLogEntries: {
    platform: string;
    entryCount: number;
    timeRange: {
      start: Date;
      end: Date;
    };
    eventTypes: string[];
    usersInvolved: string[];
  };
  
  algorithmExecution: {
    algorithm: string;
    processingTimeMs: number;
    eventsAnalyzed: number;
    detectionCount: number;
    errorCount: number;
    parameters: Record<string, unknown>;
  }[];
  
  correlationData: {
    crossPlatformEvents: number;
    temporalCorrelations: number;
    userCorrelations: number;
    dataFlowCorrelations: number;
  };
}

/**
 * Discovery performance metrics for optimization
 */
export interface DiscoveryPerformanceMetrics {
  totalProcessingTime: number;
  apiCallLatency: number;
  algorithmExecutionTime: number;
  dataProcessingTime: number;
  memoryUsage: number;
  
  efficiency: {
    eventsPerSecond: number;
    detectionsPerMinute: number;
    apiCallsPerSecond: number;
    accuracyRate: number;
  };
  
  resourceUtilization: {
    cpuUsage: number;
    memoryPeak: number;
    networkBandwidth: number;
    apiQuotaUsed: number;
  };
}