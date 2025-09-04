/**
 * Strongly typed job queue data types
 * Replaces all 'any' types in background job processing
 */

/**
 * Base job data interface
 */
export interface BaseJobData {
  jobId: string;
  organizationId: string;
  scheduledBy?: string;
  priority?: number;
}

/**
 * Discovery job data types
 */
export interface DiscoveryJobData extends BaseJobData {
  connectionIds?: string[];
  platforms?: string[];
  forceFullScan?: boolean;
  includeInactive?: boolean;
}

/**
 * Risk assessment job data
 */
export interface RiskAssessmentJobData extends BaseJobData {
  automationIds?: string[];
  discoveryRunId?: string;
}

/**
 * Notification job data
 */
export interface NotificationJobData extends Omit<BaseJobData, 'priority'> {
  type: 'discovery_complete' | 'high_risk_detected' | 'compliance_violation' | 'connection_failed';
  data: NotificationData;
  channels: ('email' | 'slack' | 'webhook')[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Notification data types for different notification types
 */
export type NotificationData = 
  | DiscoveryCompleteData
  | HighRiskDetectedData
  | ComplianceViolationData
  | ConnectionFailedData;

export interface DiscoveryCompleteData {
  type: 'discovery_complete';
  discoveryRunId: string;
  totalAutomations: number;
  newAutomations: number;
  platformsScanned: string[];
  duration: number;
  timestamp: Date;
}

export interface HighRiskDetectedData {
  type: 'high_risk_detected';
  count: number;
  automations: HighRiskAutomation[];
  threshold: number;
}

export interface ComplianceViolationData {
  type: 'compliance_violation';
  violationType: string;
  automationId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
}

export interface ConnectionFailedData {
  type: 'connection_failed';
  connectionId: string;
  platform: string;
  errorMessage: string;
  retryCount: number;
  nextRetryAt?: Date;
}

/**
 * High risk automation summary for notifications
 */
export interface HighRiskAutomation {
  id: string;
  name: string;
  platform: string;
  riskScore: number;
  riskLevel: 'high' | 'critical';
  primaryRiskFactors: string[];
}

/**
 * Automation discovery result
 */
export interface AutomationDiscoveryResult {
  id: string;
  name: string;
  type: string;
  platform: string;
  status: string;
  permissions: string[];
  riskIndicators: string[];
  isNew: boolean;
  lastSeen: Date;
}

/**
 * Discovery job result
 */
export interface DiscoveryJobResult {
  jobId: string;
  organizationId: string;
  totalAutomations: number;
  newAutomations: number;
  updatedAutomations: number;
  platformResults: PlatformDiscoveryResult[];
  duration: number;
  errors: JobError[];
}

/**
 * Platform-specific discovery result
 */
export interface PlatformDiscoveryResult {
  platform: string;
  connectionId: string;
  totalAutomations: number;
  newAutomations: number;
  updatedAutomations: number;
  errors: string[];
  scanDuration: number;
}

/**
 * Risk assessment job result
 */
export interface RiskAssessmentJobResult {
  jobId: string;
  organizationId: string;
  assessedCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  riskDistribution: Record<string, number>;
  averageRiskScore: number;
  duration: number;
  errors: JobError[];
}

/**
 * Notification job result
 */
export interface NotificationJobResult {
  jobId: string;
  organizationId: string;
  type: string;
  results: NotificationChannelResult[];
  totalChannels: number;
  successfulChannels: number;
  failedChannels: number;
}

/**
 * Notification channel result
 */
export interface NotificationChannelResult {
  channel: 'email' | 'slack' | 'webhook';
  success: boolean;
  result?: NotificationChannelSuccess;
  error?: string;
  timestamp: Date;
}

/**
 * Successful notification channel result
 */
export interface NotificationChannelSuccess {
  messageId?: string;
  deliveredAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Job error information
 */
export interface JobError {
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Queue health check details
 */
export interface QueueHealthDetails {
  redis: 'connected' | 'disconnected';
  queues: QueueStats[];
  totalActiveJobs: number;
  totalWaitingJobs: number;
  totalCompletedJobs: number;
  totalFailedJobs: number;
}

/**
 * Individual queue statistics
 */
export interface QueueStats {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Scheduled job configuration
 */
export interface ScheduledJobConfig {
  type: 'discovery' | 'risk_assessment' | 'cleanup' | 'report_generation';
  schedule: string; // Cron expression
  organizationId?: string;
  enabled: boolean;
  config: Record<string, unknown>;
  nextRun?: Date;
  lastRun?: Date;
}

/**
 * Job progress update
 */
export interface JobProgressUpdate {
  jobId: string;
  progress: number; // 0-100
  message?: string;
  currentStep?: string;
  totalSteps?: number;
  estimatedTimeRemaining?: number;
  timestamp: Date;
}

/**
 * Bulk job operation result
 */
export interface BulkJobResult {
  scheduled: number;
  failed: number;
  errors: JobError[];
}

/**
 * Job retry configuration
 */
export interface JobRetryConfig {
  attempts: number;
  backoff: 'fixed' | 'exponential';
  delay: number;
  multiplier?: number;
  maxDelay?: number;
}

/**
 * Job queue configuration
 */
export interface JobQueueConfig {
  concurrency: number;
  removeOnComplete: number;
  removeOnFail: number;
  defaultJobOptions: {
    attempts: number;
    backoff: JobRetryConfig;
    delay?: number;
    priority?: number;
  };
}