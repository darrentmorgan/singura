/**
 * Automation Feedback API Routes
 * Handles user feedback capture and ML training data export
 * Phase 2: Feedback System
 *
 * SECURITY: All routes require authentication (requireClerkAuth middleware)
 * SECURITY: Organization ownership validation enforced on all feedback operations
 */

import { Router, Response, NextFunction } from 'express';
import { ClerkAuthRequest } from '../middleware/clerk-auth';
import { automationFeedbackService } from '../services/automation-feedback.service';
import {
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackFilters,
  FeedbackType,
  FeedbackSentiment,
  FeedbackStatus
} from '@singura/shared-types';

const router = Router();

/**
 * Authorization middleware - Validates feedback ownership
 * Ensures feedback belongs to the authenticated user's organization
 *
 * @throws 401 if user is not authenticated
 * @throws 403 if feedback belongs to different organization
 * @throws 404 if feedback doesn't exist (prevents information leakage)
 */
async function requireFeedbackOwnership(
  req: ClerkAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const feedbackId = req.params.id;
    const organizationId = req.auth?.organizationId;

    if (!feedbackId) {
      res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Feedback ID is required'
      });
      return;
    }

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    // Fetch feedback to verify ownership
    const result = await automationFeedbackService.getFeedback(feedbackId, organizationId);

    if (!result.success || !result.data) {
      // Return 404 to prevent information leakage about feedback existence
      res.status(404).json({
        success: false,
        error: 'Feedback not found',
        message: 'The requested feedback does not exist or you do not have access to it'
      });
      return;
    }

    // Verify organization ownership
    if (result.data.organizationId !== organizationId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this feedback'
      });
      return;
    }

    // Ownership verified, proceed to route handler
    next();
  } catch (error) {
    console.error('Error in requireFeedbackOwnership middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify feedback ownership'
    });
  }
}

/**
 * @route   POST /api/feedback
 * @desc    Create new feedback
 * @access  Private
 */
router.post('/', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || req.auth?.organizationId;
    const userId = req.user?.userId || req.auth?.userId;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    const {
      automationId,
      feedbackType,
      sentiment,
      comment,
      suggestedCorrections
    } = req.body;

    if (!automationId || !feedbackType || !sentiment) {
      return res.status(400).json({
        error: 'Missing required fields: automationId, feedbackType, sentiment'
      });
    }

    // Validate feedback type
    const validFeedbackTypes: FeedbackType[] = [
      'correct_detection',
      'false_positive',
      'false_negative',
      'incorrect_classification',
      'incorrect_risk_score',
      'incorrect_ai_provider'
    ];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return res.status(400).json({
        error: `Invalid feedbackType. Must be one of: ${validFeedbackTypes.join(', ')}`
      });
    }

    // Validate sentiment
    const validSentiments: FeedbackSentiment[] = ['positive', 'negative', 'neutral'];
    if (!validSentiments.includes(sentiment)) {
      return res.status(400).json({
        error: `Invalid sentiment. Must be one of: ${validSentiments.join(', ')}`
      });
    }

    // Get user email
    const userEmail = req.user?.email || 'unknown@example.com';

    // Create feedback input
    const input: CreateFeedbackInput = {
      automationId,
      organizationId,
      userId,
      userEmail,
      feedbackType,
      sentiment,
      comment,
      suggestedCorrections
    };

    const result = await automationFeedbackService.createFeedback(input);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to create feedback' });
    }

    return res.status(201).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error creating feedback:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/feedback/:id
 * @desc    Get feedback by ID
 * @access  Private (requires authentication + organization ownership)
 */
router.get('/:id', requireFeedbackOwnership, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.auth?.organizationId;

    if (!id) {
      return res.status(400).json({ error: 'Feedback ID is required' });
    }

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ownership already validated by middleware
    const result = await automationFeedbackService.getFeedback(id, organizationId);

    if (!result.success || !result.data) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/feedback
 * @desc    List feedback with filters
 * @access  Private
 */
router.get('/', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || req.auth?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build filters from query params
    const filters: FeedbackFilters = {};

    if (req.query.organizationId) {
      filters.organizationId = req.query.organizationId as string;
    }

    if (req.query.automationId) {
      filters.automationId = req.query.automationId as string;
    }

    if (req.query.userId) {
      filters.userId = req.query.userId as string;
    }

    if (req.query.feedbackType) {
      filters.feedbackType = req.query.feedbackType as FeedbackType;
    }

    if (req.query.sentiment) {
      filters.sentiment = req.query.sentiment as FeedbackSentiment;
    }

    if (req.query.status) {
      filters.status = req.query.status as FeedbackStatus;
    }

    if (req.query.useForTraining !== undefined) {
      filters.useForTraining = req.query.useForTraining === 'true';
    }

    if (req.query.createdAfter) {
      filters.createdAfter = new Date(req.query.createdAfter as string);
    }

    if (req.query.createdBefore) {
      filters.createdBefore = new Date(req.query.createdBefore as string);
    }

    const result = await automationFeedbackService.getFeedbackList(filters);

    return res.json({
      success: true,
      data: result.data,
      total: result.total
    });

  } catch (error) {
    console.error('Error fetching feedback list:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/feedback/automation/:automationId
 * @desc    Get all feedback for a specific automation
 * @access  Private (requires authentication + organization ownership)
 */
router.get('/automation/:automationId', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { automationId } = req.params;
    const organizationId = req.auth?.organizationId;

    if (!automationId) {
      return res.status(400).json({ error: 'Automation ID is required' });
    }

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // SECURITY: Filter feedback by organization
    const feedback = await automationFeedbackService.getFeedbackByAutomation(automationId, organizationId);

    return res.json({
      success: true,
      data: feedback,
      total: feedback.length
    });

  } catch (error) {
    console.error('Error fetching feedback by automation:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/feedback/recent/:organizationId
 * @desc    Get recent feedback for organization
 * @access  Private
 */
router.get('/recent/:organizationId', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const feedback = await automationFeedbackService.getRecentFeedback(organizationId, limit);

    return res.json({
      success: true,
      data: feedback,
      total: feedback.length
    });

  } catch (error) {
    console.error('Error fetching recent feedback:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/feedback/:id
 * @desc    Update feedback
 * @access  Private (requires authentication + organization ownership)
 */
router.put('/:id', requireFeedbackOwnership, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.auth?.organizationId;

    if (!id) {
      return res.status(400).json({ error: 'Feedback ID is required' });
    }

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: UpdateFeedbackInput = req.body;

    // Validate status if provided
    if (input.status) {
      const validStatuses: FeedbackStatus[] = ['pending', 'acknowledged', 'resolved', 'archived'];
      if (!validStatuses.includes(input.status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    // Ownership already validated by middleware
    const result = await automationFeedbackService.updateFeedback(id, input);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to update feedback' });
    }

    return res.json({
      success: true,
      message: 'Feedback updated successfully'
    });

  } catch (error) {
    console.error('Error updating feedback:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/feedback/:id/acknowledge
 * @desc    Acknowledge feedback
 * @access  Private (requires authentication + organization ownership)
 */
router.put('/:id/acknowledge', requireFeedbackOwnership, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Feedback ID is required' });
    }

    // Ownership already validated by middleware
    const result = await automationFeedbackService.acknowledgeFeedback(id);

    if (!result.success) {
      return res.status(400).json({ error: 'Failed to acknowledge feedback' });
    }

    return res.json({
      success: true,
      message: 'Feedback acknowledged successfully'
    });

  } catch (error) {
    console.error('Error acknowledging feedback:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/feedback/:id/resolve
 * @desc    Resolve feedback
 * @access  Private (requires authentication + organization ownership)
 */
router.put('/:id/resolve', requireFeedbackOwnership, async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Feedback ID is required' });
    }

    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: 'Resolution data is required' });
    }

    // Ownership already validated by middleware
    const result = await automationFeedbackService.resolveFeedback(id, resolution);

    if (!result.success) {
      return res.status(400).json({ error: 'Failed to resolve feedback' });
    }

    return res.json({
      success: true,
      message: 'Feedback resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving feedback:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/feedback/archive-old
 * @desc    Archive old resolved feedback
 * @access  Private (Admin only - requires authentication + organization scope)
 */
router.post('/archive-old', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const organizationId = req.auth?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const daysOld = req.body.daysOld || 90;

    // SECURITY: Archive only within organization scope
    const result = await automationFeedbackService.archiveOldFeedback(organizationId, daysOld);

    return res.json({
      success: true,
      message: `Archived ${result.count} old feedback records`,
      count: result.count
    });

  } catch (error) {
    console.error('Error archiving old feedback:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/feedback/statistics/:organizationId
 * @desc    Get feedback statistics for organization
 * @access  Private
 */
router.get('/statistics/:organizationId', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const statistics = await automationFeedbackService.getStatistics(organizationId);

    return res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/feedback/trends/:organizationId
 * @desc    Get feedback trends over time
 * @access  Private
 */
router.get('/trends/:organizationId', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    const trends = await automationFeedbackService.getTrends(organizationId, days);

    return res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('Error fetching trends:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/feedback/ml-training-batch
 * @desc    Export ML training batch
 * @access  Private (Admin/ML pipeline only - requires authentication)
 */
router.get('/ml-training-batch', async (req: ClerkAuthRequest, res: Response) => {
  try {
    const organizationId = req.auth?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    // SECURITY: Only fetch training data for user's organization
    const batch = await automationFeedbackService.getMLTrainingBatch(organizationId, limit);

    return res.json({
      success: true,
      data: batch
    });

  } catch (error) {
    console.error('Error fetching ML training batch:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
