/**
 * Analytics API Routes
 * Endpoints for executive dashboard analytics data
 */

import express, { Request, Response, NextFunction } from 'express';
import { requireClerkAuth, ClerkAuthRequest } from '../middleware/clerk-auth';
import { analyticsService } from '../services/analytics.service';
import { AnalyticsResponse, AnalyticsTimeRange } from '@singura/shared-types';
import { logger } from '../utils/logger';

const router = express.Router();

// All routes require authentication
router.use(requireClerkAuth);

/**
 * GET /api/analytics/risk-trends
 * Get risk trend data for time-series visualization
 */
router.get('/risk-trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as ClerkAuthRequest).auth!;
    const timeRange = (req.query.timeRange as 'week' | 'month' | 'quarter') || 'week';

    logger.info('Fetching risk trends', { organizationId, timeRange });

    const data = await analyticsService.getRiskTrends(organizationId, timeRange);

    const response: AnalyticsResponse<typeof data> = {
      success: true,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        organizationId,
        timeRange: timeRange as AnalyticsTimeRange
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching risk trends:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/platform-distribution
 * Get platform distribution for pie chart
 */
router.get('/platform-distribution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as ClerkAuthRequest).auth!;

    logger.info('Fetching platform distribution', { organizationId });

    const data = await analyticsService.getPlatformDistribution(organizationId);

    const response: AnalyticsResponse<typeof data> = {
      success: true,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        organizationId
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching platform distribution:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/automation-growth
 * Get automation growth data for area chart
 */
router.get('/automation-growth', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as ClerkAuthRequest).auth!;
    const days = parseInt(req.query.days as string) || 30;

    logger.info('Fetching automation growth', { organizationId, days });

    const data = await analyticsService.getAutomationGrowth(organizationId, days);

    const response: AnalyticsResponse<typeof data> = {
      success: true,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        organizationId
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching automation growth:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/top-risks
 * Get top risk automations for table display
 */
router.get('/top-risks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as ClerkAuthRequest).auth!;
    const limit = parseInt(req.query.limit as string) || 10;

    logger.info('Fetching top risks', { organizationId, limit });

    const data = await analyticsService.getTopRisks(organizationId, limit);

    const response: AnalyticsResponse<typeof data> = {
      success: true,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        organizationId
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching top risks:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/summary
 * Get summary statistics for dashboard cards
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as ClerkAuthRequest).auth!;

    logger.info('Fetching summary statistics', { organizationId });

    const data = await analyticsService.getSummaryStats(organizationId);

    const response: AnalyticsResponse<typeof data> = {
      success: true,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        organizationId
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching summary statistics:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/risk-heatmap
 * Get risk heat map data
 */
router.get('/risk-heatmap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as ClerkAuthRequest).auth!;

    logger.info('Fetching risk heatmap', { organizationId });

    const data = await analyticsService.getRiskHeatMap(organizationId);

    const response: AnalyticsResponse<typeof data> = {
      success: true,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        organizationId
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching risk heatmap:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/automation-types
 * Get automation type distribution
 */
router.get('/automation-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as ClerkAuthRequest).auth!;

    logger.info('Fetching automation type distribution', { organizationId });

    const data = await analyticsService.getAutomationTypeDistribution(organizationId);

    const response: AnalyticsResponse<typeof data> = {
      success: true,
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        organizationId
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching automation types:', error);
    next(error);
  }
});

export default router;