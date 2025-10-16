/**
 * API Metrics Service
 * Tracks API call counts and quota usage for OAuth providers
 * Uses Redis for distributed counters with fallback to in-memory
 */

import Redis from 'ioredis';
import { Platform } from '@singura/shared-types';

export interface APIMetrics {
  callCount: number;
  quotaUsed: number;
  quotaRemaining: number;
  quotaLimit: number;
  resetTime: Date;
  lastCallTime?: Date;
}

export class APIMetricsService {
  private redis: Redis | null = null;
  private inMemoryCounters = new Map<string, number>();
  private readonly KEY_PREFIX = 'api_metrics';

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        lazyConnect: true
      });

      this.redis.on('error', (err) => {
        console.error('Redis error (metrics):', err);
        this.redis = null; // Fallback to in-memory
      });

      this.redis.connect().catch(err => {
        console.warn('Redis unavailable for metrics, using in-memory:', err);
        this.redis = null;
      });
    } catch (error) {
      console.warn('Redis init failed for metrics:', error);
      this.redis = null;
    }
  }

  async trackAPICall(
    connectionId: string,
    platform: Platform,
    endpoint: string,
    units: number = 1
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const key = `${this.KEY_PREFIX}:${platform}:${connectionId}:${date}`;

    try {
      if (this.redis) {
        await this.redis.incrby(key, units);
        await this.redis.expire(key, 86400); // 24hr TTL
      } else {
        // Fallback to in-memory
        const current = this.inMemoryCounters.get(key) || 0;
        this.inMemoryCounters.set(key, current + units);
      }

      console.log(`Tracked API call: ${platform}/${endpoint} (${units} units)`);
    } catch (error) {
      console.error('Failed to track API call:', error);
    }
  }

  async getMetrics(connectionId: string, platform: Platform): Promise<APIMetrics> {
    const date = new Date().toISOString().split('T')[0];
    const key = `${this.KEY_PREFIX}:${platform}:${connectionId}:${date}`;

    let callCount = 0;
    try {
      if (this.redis) {
        const count = await this.redis.get(key);
        callCount = parseInt(count || '0', 10);
      } else {
        callCount = this.inMemoryCounters.get(key) || 0;
      }
    } catch (error) {
      console.error('Failed to get metrics:', error);
    }

    // Platform-specific quotas
    const quotaLimit = this.getQuotaLimit(platform);
    const quotaUsed = callCount;
    const quotaRemaining = Math.max(0, quotaLimit - quotaUsed);

    // Reset at midnight UTC
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      callCount,
      quotaUsed,
      quotaRemaining,
      quotaLimit,
      resetTime: tomorrow,
      lastCallTime: callCount > 0 ? new Date() : undefined
    };
  }

  async getQuotaStatus(connectionId: string, platform: Platform): Promise<any> {
    const metrics = await this.getMetrics(connectionId, platform);
    const percentUsed = metrics.quotaLimit > 0 ?
      Math.round((metrics.quotaUsed / metrics.quotaLimit) * 100) : 0;

    return {
      platform,
      quotaLimit: metrics.quotaLimit,
      quotaUsed: metrics.quotaUsed,
      quotaRemaining: metrics.quotaRemaining,
      percentUsed,
      resetTime: metrics.resetTime
    };
  }

  private getQuotaLimit(platform: Platform): number {
    switch (platform) {
      case 'slack': return 10000;
      case 'google': return 10000;
      case 'microsoft': return 15000;
      default: return 10000;
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

export const apiMetricsService = new APIMetricsService();
