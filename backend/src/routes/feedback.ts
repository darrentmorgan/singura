/**
 * Feedback API Routes
 * Endpoints for submitting and retrieving detection feedback
 */

import { Router, Request, Response } from 'express';
import { feedbackStorageService } from '../services/feedback-storage.service';
import { reinforcementLearningService } from '../services/reinforcement-learning.service';
import { FeedbackType } from '@saas-xray/shared-types';
import { requireAuth } from '@clerk/express';

const router = Router();

/**
 * POST /api/feedback
 * Submit feedback for a detection
 */
router.post('/', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { detectionId, feedbackType, comment, metadata } = req.body;
    const userId = req.auth?.userId;
    const organizationId = req.auth?.orgId;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!detectionId || !feedbackType) {
      return res.status(400).json({ error: 'detectionId and feedbackType are required' });
    }

    // Validate feedback type
    const validTypes = Object.values(FeedbackType);
    if (!validTypes.includes(feedbackType)) {
      return res.status(400).json({
        error: 'Invalid feedbackType',
        validTypes
      });
    }

    // Create feedback
    const feedback = await feedbackStorageService.createFeedback({
      detectionId,
      feedbackType,
      userId,
      organizationId,
      comment,
      metadata: metadata || {}
    });

    // Clear RL cache to force recalculation
    reinforcementLearningService.clearCache(organizationId);

    console.log(`✅ Feedback submitted: ${feedbackType} for detection ${detectionId} by user ${userId}`);

    res.status(201).json({
      success: true,
      feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/detection/:detectionId
 * Get all feedback for a specific detection
 */
router.get('/detection/:detectionId', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { detectionId } = req.params;
    const organizationId = req.auth?.orgId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const feedback = await feedbackStorageService.getFeedbackByDetectionId(detectionId);

    // Filter by organization for security
    const orgFeedback = feedback.filter(f => f.organizationId === organizationId);

    res.json({
      success: true,
      feedback: orgFeedback
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/metrics
 * Get RL performance metrics for organization
 */
router.get('/metrics', requireAuth(), async (req: Request, res: Response) => {
  try {
    const organizationId = req.auth?.orgId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get metrics for last 30 days
    const timeWindow = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const metrics = await feedbackStorageService.calculateMetrics(organizationId, timeWindow);

    // Get optimized thresholds
    const thresholds = await reinforcementLearningService.getOptimizedThresholds(organizationId);

    // Check performance degradation
    const degradationCheck = await reinforcementLearningService.checkPerformanceDegradation(organizationId);

    res.json({
      success: true,
      metrics,
      thresholds,
      performanceCheck: degradationCheck
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/organization
 * Get all feedback for organization within time window
 */
router.get('/organization', requireAuth(), async (req: Request, res: Response) => {
  try {
    const organizationId = req.auth?.orgId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Parse query params
    const daysBack = parseInt(req.query.days as string) || 30;
    const timeWindow = {
      start: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const feedback = await feedbackStorageService.getOrganizationFeedback(
      organizationId,
      timeWindow
    );

    res.json({
      success: true,
      feedback,
      count: feedback.length,
      timeWindow
    });
  } catch (error) {
    console.error('Error fetching organization feedback:', error);
    res.status(500).json({
      error: 'Failed to fetch organization feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
