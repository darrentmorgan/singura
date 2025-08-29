/**
 * Job Queue System - Background Jobs with Bull and Redis
 * Manages background tasks for automation discovery, risk assessment, and data processing
 */

import Bull from 'bull';
import Redis from 'ioredis';
import { discoveryService } from '../services/discovery-service';
import { riskService } from '../services/risk-service';
import { DiscoveryJobConfig, DiscoveryJobResult } from '../services/discovery-service';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
};

// Create Redis connection
export const redis = new Redis(redisConfig);

// Job queue configurations
const queueConfig = {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs
    attempts: 3,          // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,        // Start with 2 second delay
    },
  },
  settings: {
    stalledInterval: 30000,    // Check for stalled jobs every 30 seconds
    maxStalledCount: 1,        // Maximum number of times a job can be stalled
    retryProcessDelay: 5000,   // Delay before retrying a failed job processor
  },
};

// Job Queues
export const discoveryQueue = new Bull('automation-discovery', queueConfig);
export const riskAssessmentQueue = new Bull('risk-assessment', queueConfig);
export const notificationQueue = new Bull('notifications', queueConfig);

// Job Data Types
export interface DiscoveryJobData extends DiscoveryJobConfig {
  jobId: string;
  scheduledBy?: string;
  priority?: number;
}

export interface RiskAssessmentJobData {
  jobId: string;
  organizationId: string;
  automationIds?: string[];
  discoveryRunId?: string;
  scheduledBy?: string;
}

export interface NotificationJobData {
  jobId: string;
  type: 'discovery_complete' | 'high_risk_detected' | 'compliance_violation' | 'connection_failed';
  organizationId: string;
  data: any;
  channels: ('email' | 'slack' | 'webhook')[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Job Queue Manager - Orchestrates all background jobs
 */
export class JobQueueManager {
  private static instance: JobQueueManager;
  
  public static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager();
    }
    return JobQueueManager.instance;
  }

  private constructor() {
    this.setupJobProcessors();
    this.setupEventHandlers();
  }

  /**
   * Setup job processors for each queue
   */
  private setupJobProcessors() {
    // Discovery job processor
    discoveryQueue.process('run-discovery', 2, async (job) => {
      const { jobId, ...config } = job.data as DiscoveryJobData;
      
      console.log(`Starting discovery job ${jobId} for organization ${config.organizationId}`);
      
      try {
        // Update job progress
        await job.progress(10);

        // Run discovery
        const result = await discoveryService.runDiscovery(config);
        
        await job.progress(80);

        // Schedule risk assessment if enabled
        if (config.riskAssessment) {
          await this.scheduleRiskAssessment({
            jobId: `risk-${jobId}`,
            organizationId: config.organizationId,
            discoveryRunId: result.jobId,
            scheduledBy: 'discovery-job'
          });
        }

        await job.progress(90);

        // Schedule notification
        if (result.errors.length > 0 || result.totalAutomations > 0) {
          await this.scheduleNotification({
            jobId: `notify-${jobId}`,
            type: 'discovery_complete',
            organizationId: config.organizationId,
            data: {
              totalAutomations: result.totalAutomations,
              newAutomations: result.newAutomations,
              errors: result.errors,
              duration: result.duration
            },
            channels: ['email'], // Would be configurable per organization
            priority: result.errors.length > 0 ? 'high' : 'medium'
          });
        }

        await job.progress(100);

        console.log(`Discovery job ${jobId} completed successfully`);
        return result;

      } catch (error) {
        console.error(`Discovery job ${jobId} failed:`, error);
        
        // Schedule failure notification
        await this.scheduleNotification({
          jobId: `error-${jobId}`,
          type: 'connection_failed',
          organizationId: config.organizationId,
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            jobId
          },
          channels: ['email'],
          priority: 'critical'
        });

        throw error;
      }
    });

    // Risk assessment job processor
    riskAssessmentQueue.process('assess-risk', 3, async (job) => {
      const { jobId, organizationId, automationIds, discoveryRunId } = job.data as RiskAssessmentJobData;
      
      console.log(`Starting risk assessment job ${jobId} for organization ${organizationId}`);
      
      try {
        await job.progress(10);

        // Get automations to assess
        let automations: any[] = [];
        if (automationIds) {
          // Assess specific automations
          // This would fetch from database
          console.log(`Assessing ${automationIds.length} specific automations`);
        } else {
          // Assess all recent automations for organization
          console.log('Assessing all recent automations');
        }

        await job.progress(30);

        let assessedCount = 0;
        const highRiskAutomations: any[] = [];

        for (const automation of automations) {
          try {
            const riskResult = await riskService.assessAutomationRisk(automation);
            await riskService.storeRiskAssessment(automation.id, organizationId, riskResult);
            
            if (riskResult.overallRisk === 'high' || riskResult.overallRisk === 'critical') {
              highRiskAutomations.push({
                automation,
                risk: riskResult
              });
            }

            assessedCount++;
            await job.progress(30 + (assessedCount / automations.length) * 60);

          } catch (error) {
            console.error(`Failed to assess risk for automation ${automation.id}:`, error);
          }
        }

        // Schedule high-risk notifications
        if (highRiskAutomations.length > 0) {
          await this.scheduleNotification({
            jobId: `high-risk-${jobId}`,
            type: 'high_risk_detected',
            organizationId,
            data: {
              count: highRiskAutomations.length,
              automations: highRiskAutomations.slice(0, 10) // Limit to top 10
            },
            channels: ['email', 'slack'],
            priority: 'high'
          });
        }

        await job.progress(100);

        const result = {
          assessedCount,
          highRiskCount: highRiskAutomations.length,
          jobId
        };

        console.log(`Risk assessment job ${jobId} completed: ${assessedCount} assessed, ${highRiskAutomations.length} high-risk`);
        return result;

      } catch (error) {
        console.error(`Risk assessment job ${jobId} failed:`, error);
        throw error;
      }
    });

    // Notification job processor
    notificationQueue.process('send-notification', 5, async (job) => {
      const { jobId, type, organizationId, data, channels } = job.data as NotificationJobData;
      
      console.log(`Processing notification job ${jobId}: ${type} for organization ${organizationId}`);
      
      try {
        await job.progress(20);

        // Send notifications based on channels
        const results: any[] = [];

        for (const channel of channels) {
          try {
            let result;
            switch (channel) {
              case 'email':
                result = await this.sendEmailNotification(type, organizationId, data);
                break;
              case 'slack':
                result = await this.sendSlackNotification(type, organizationId, data);
                break;
              case 'webhook':
                result = await this.sendWebhookNotification(type, organizationId, data);
                break;
            }
            results.push({ channel, success: true, result });
          } catch (error) {
            console.error(`Failed to send ${channel} notification:`, error);
            results.push({ channel, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }

          await job.progress(20 + (results.length / channels.length) * 80);
        }

        console.log(`Notification job ${jobId} completed: sent to ${results.filter(r => r.success).length}/${channels.length} channels`);
        return { results };

      } catch (error) {
        console.error(`Notification job ${jobId} failed:`, error);
        throw error;
      }
    });
  }

  /**
   * Setup event handlers for job lifecycle events
   */
  private setupEventHandlers() {
    // Discovery queue events
    discoveryQueue.on('completed', (job) => {
      console.log(`Discovery job ${job.id} completed successfully`);
    });

    discoveryQueue.on('failed', (job, err) => {
      console.error(`Discovery job ${job.id} failed:`, err.message);
    });

    discoveryQueue.on('stalled', (job) => {
      console.warn(`Discovery job ${job.id} has stalled`);
    });

    // Risk assessment queue events  
    riskAssessmentQueue.on('completed', (job) => {
      console.log(`Risk assessment job ${job.id} completed successfully`);
    });

    riskAssessmentQueue.on('failed', (job, err) => {
      console.error(`Risk assessment job ${job.id} failed:`, err.message);
    });

    // Notification queue events
    notificationQueue.on('completed', (job) => {
      console.log(`Notification job ${job.id} completed successfully`);
    });

    notificationQueue.on('failed', (job, err) => {
      console.error(`Notification job ${job.id} failed:`, err.message);
    });

    // Global error handling
    process.on('SIGTERM', () => {
      console.log('Gracefully shutting down job queues...');
      Promise.all([
        discoveryQueue.close(),
        riskAssessmentQueue.close(),
        notificationQueue.close()
      ]).then(() => {
        console.log('All job queues closed');
        process.exit(0);
      });
    });
  }

  /**
   * Schedule a discovery job
   */
  async scheduleDiscovery(config: DiscoveryJobData, delay?: number): Promise<Bull.Job<DiscoveryJobData>> {
    const jobOptions: Bull.JobOptions = {
      priority: config.priority || 0,
      delay: delay || 0,
      attempts: 3,
    };

    return discoveryQueue.add('run-discovery', config, jobOptions);
  }

  /**
   * Schedule a risk assessment job
   */
  async scheduleRiskAssessment(data: RiskAssessmentJobData, delay?: number): Promise<Bull.Job<RiskAssessmentJobData>> {
    const jobOptions: Bull.JobOptions = {
      delay: delay || 0,
      attempts: 2,
    };

    return riskAssessmentQueue.add('assess-risk', data, jobOptions);
  }

  /**
   * Schedule a notification job
   */
  async scheduleNotification(data: NotificationJobData, delay?: number): Promise<Bull.Job<NotificationJobData>> {
    const priority = this.getNotificationPriority(data.priority || 'medium');
    
    const jobOptions: Bull.JobOptions = {
      priority,
      delay: delay || 0,
      attempts: 2,
    };

    return notificationQueue.add('send-notification', data, jobOptions);
  }

  /**
   * Schedule periodic discovery for an organization
   */
  async schedulePeriodicDiscovery(organizationId: string, intervalHours: number = 24): Promise<void> {
    const jobId = `periodic-${organizationId}`;
    
    // Remove existing periodic job if it exists
    await discoveryQueue.removeRepeatable('run-discovery', {
      every: intervalHours * 60 * 60 * 1000,
      jobId
    });

    // Add new periodic job
    await discoveryQueue.add('run-discovery', {
      jobId,
      organizationId,
      riskAssessment: true,
      scheduledBy: 'periodic-scheduler'
    }, {
      repeat: {
        every: intervalHours * 60 * 60 * 1000
      },
      jobId
    });

    console.log(`Scheduled periodic discovery for organization ${organizationId} every ${intervalHours} hours`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [discoveryStats, riskStats, notificationStats] = await Promise.all([
      this.getQueueStatistics(discoveryQueue),
      this.getQueueStatistics(riskAssessmentQueue),  
      this.getQueueStatistics(notificationQueue)
    ]);

    return {
      discovery: discoveryStats,
      riskAssessment: riskStats,
      notifications: notificationStats
    };
  }

  /**
   * Get statistics for a specific queue
   */
  private async getQueueStatistics(queue: Bull.Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmailNotification(type: string, organizationId: string, data: any): Promise<any> {
    // This would integrate with email service (SendGrid, SES, etc.)
    console.log(`Sending email notification: ${type} for organization ${organizationId}`);
    return { sent: true, type: 'email' };
  }

  /**
   * Send Slack notification (placeholder)
   */
  private async sendSlackNotification(type: string, organizationId: string, data: any): Promise<any> {
    // This would integrate with Slack API
    console.log(`Sending Slack notification: ${type} for organization ${organizationId}`);
    return { sent: true, type: 'slack' };
  }

  /**
   * Send webhook notification (placeholder)
   */
  private async sendWebhookNotification(type: string, organizationId: string, data: any): Promise<any> {
    // This would send HTTP webhook
    console.log(`Sending webhook notification: ${type} for organization ${organizationId}`);
    return { sent: true, type: 'webhook' };
  }

  /**
   * Convert priority string to Bull priority number
   */
  private getNotificationPriority(priority: string): number {
    const priorityMap: Record<string, number> = {
      'critical': 10,
      'high': 5,
      'medium': 0,
      'low': -5
    };
    return priorityMap[priority] || 0;
  }
}

// Export singleton instance
export const jobQueue = JobQueueManager.getInstance();

// Health check function
export async function healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', details: any }> {
  try {
    await redis.ping();
    const stats = await jobQueue.getQueueStats();
    
    return {
      status: 'healthy',
      details: {
        redis: 'connected',
        queues: stats
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}