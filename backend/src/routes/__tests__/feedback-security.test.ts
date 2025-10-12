/**
 * Feedback API Security Tests
 * SING-SEC-001: Authorization bypass vulnerability tests
 *
 * These tests verify that:
 * 1. All routes require authentication
 * 2. Users cannot access feedback from other organizations
 * 3. Users cannot modify feedback from other organizations
 * 4. Error messages don't leak information about other orgs
 */

import request from 'supertest';
import express from 'express';
import feedbackRoutes from '../feedback';
import { requireClerkAuth } from '../../middleware/clerk-auth';

// Mock all dependencies BEFORE importing
jest.mock('../../middleware/clerk-auth');
jest.mock('../../services/automation-feedback.service', () => ({
  automationFeedbackService: {
    getFeedback: jest.fn(),
    updateFeedback: jest.fn(),
    acknowledgeFeedback: jest.fn(),
    resolveFeedback: jest.fn(),
    getFeedbackByAutomation: jest.fn(),
    archiveOldFeedback: jest.fn(),
    getMLTrainingBatch: jest.fn()
  }
}));
jest.mock('../../database/repositories/automation-feedback.repository');
jest.mock('../../database/repositories/discovered-automation');
jest.mock('../../database/pool', () => ({
  db: {
    query: jest.fn()
  }
}));

import { automationFeedbackService } from '../../services/automation-feedback.service';

const app = express();
app.use(express.json());
app.use('/api/feedback', requireClerkAuth, feedbackRoutes);

describe('Feedback API Security - SING-SEC-001', () => {
  const ORG_A_ID = 'org_a_test_123';
  const ORG_B_ID = 'org_b_test_456';
  const USER_A_ID = 'user_a_test';
  const USER_B_ID = 'user_b_test';

  const FEEDBACK_ORG_A = {
    id: 'feedback_a_123',
    automationId: 'auto_a_123',
    organizationId: ORG_A_ID,
    userId: USER_A_ID,
    userEmail: 'user-a@example.com',
    feedbackType: 'correct_detection' as const,
    sentiment: 'positive' as const,
    comment: 'Great detection',
    status: 'pending' as const,
    mlMetadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const FEEDBACK_ORG_B = {
    id: 'feedback_b_456',
    automationId: 'auto_b_456',
    organizationId: ORG_B_ID,
    userId: USER_B_ID,
    userEmail: 'user-b@example.com',
    feedbackType: 'false_positive' as const,
    sentiment: 'negative' as const,
    comment: 'Incorrect detection',
    status: 'pending' as const,
    mlMetadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock requireClerkAuth middleware to inject auth context
    (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
      // Auth will be set by individual tests
      next();
    });
  });

  describe('Authentication Requirements', () => {
    it('should reject requests without authentication', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      });

      const response = await request(app)
        .get('/api/feedback/feedback_a_123')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject requests without organization ID', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: undefined };
        next();
      });

      const response = await request(app)
        .get('/api/feedback/feedback_a_123')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/feedback/:id - Cross-Organization Access Prevention', () => {
    it('should allow users to read their own organization feedback', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: ORG_A_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: true,
        data: FEEDBACK_ORG_A
      });

      const response = await request(app)
        .get('/api/feedback/feedback_a_123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('feedback_a_123');
      expect(automationFeedbackService.getFeedback).toHaveBeenCalledWith(
        'feedback_a_123',
        ORG_A_ID
      );
    });

    it('should deny cross-organization feedback access', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      // Service returns null for cross-org access
      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: false,
        data: null
      });

      const response = await request(app)
        .get('/api/feedback/feedback_a_123')
        .expect(404);

      expect(response.body.error).toBe('Feedback not found');
      expect(automationFeedbackService.getFeedback).toHaveBeenCalledWith(
        'feedback_a_123',
        ORG_B_ID
      );
    });

    it('should not leak information about feedback existence in other orgs', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: false,
        data: null
      });

      const response = await request(app)
        .get('/api/feedback/feedback_a_123')
        .expect(404);

      // Should return same error for non-existent and inaccessible feedback
      expect(response.body.error).toBe('Feedback not found');
      expect(response.body.message).toContain('does not exist or you do not have access');
    });
  });

  describe('PUT /api/feedback/:id - Cross-Organization Modification Prevention', () => {
    it('should allow users to update their own organization feedback', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: ORG_A_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: true,
        data: FEEDBACK_ORG_A
      });

      (automationFeedbackService.updateFeedback as jest.Mock).mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .put('/api/feedback/feedback_a_123')
        .send({ comment: 'Updated comment' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(automationFeedbackService.updateFeedback).toHaveBeenCalledWith(
        'feedback_a_123',
        { comment: 'Updated comment' }
      );
    });

    it('should deny cross-organization feedback modification', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: false,
        data: null
      });

      const response = await request(app)
        .put('/api/feedback/feedback_a_123')
        .send({ comment: 'Malicious update' })
        .expect(404);

      expect(response.body.error).toBe('Feedback not found');
      expect(automationFeedbackService.updateFeedback).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/feedback/:id/acknowledge - Cross-Organization Prevention', () => {
    it('should allow users to acknowledge their own organization feedback', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: ORG_A_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: true,
        data: FEEDBACK_ORG_A
      });

      (automationFeedbackService.acknowledgeFeedback as jest.Mock).mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .put('/api/feedback/feedback_a_123/acknowledge')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(automationFeedbackService.acknowledgeFeedback).toHaveBeenCalledWith('feedback_a_123');
    });

    it('should deny cross-organization feedback acknowledgement', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: false,
        data: null
      });

      const response = await request(app)
        .put('/api/feedback/feedback_a_123/acknowledge')
        .expect(404);

      expect(response.body.error).toBe('Feedback not found');
      expect(automationFeedbackService.acknowledgeFeedback).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/feedback/:id/resolve - Cross-Organization Prevention', () => {
    it('should allow users to resolve their own organization feedback', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: ORG_A_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: true,
        data: FEEDBACK_ORG_A
      });

      (automationFeedbackService.resolveFeedback as jest.Mock).mockResolvedValue({
        success: true
      });

      const resolution = { action: 'fixed', notes: 'Issue resolved' };

      const response = await request(app)
        .put('/api/feedback/feedback_a_123/resolve')
        .send({ resolution })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(automationFeedbackService.resolveFeedback).toHaveBeenCalledWith(
        'feedback_a_123',
        resolution
      );
    });

    it('should deny cross-organization feedback resolution', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: false,
        data: null
      });

      const response = await request(app)
        .put('/api/feedback/feedback_a_123/resolve')
        .send({ resolution: { action: 'malicious' } })
        .expect(404);

      expect(response.body.error).toBe('Feedback not found');
      expect(automationFeedbackService.resolveFeedback).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/feedback/automation/:automationId - Organization Filtering', () => {
    it('should only return feedback for automations in user organization', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: ORG_A_ID };
        next();
      });

      (automationFeedbackService.getFeedbackByAutomation as jest.Mock).mockResolvedValue([
        FEEDBACK_ORG_A
      ]);

      const response = await request(app)
        .get('/api/feedback/automation/auto_a_123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(automationFeedbackService.getFeedbackByAutomation).toHaveBeenCalledWith(
        'auto_a_123',
        ORG_A_ID
      );
    });

    it('should return empty array for automations in other organizations', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      // Service returns empty array due to org filtering
      (automationFeedbackService.getFeedbackByAutomation as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/feedback/automation/auto_a_123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(automationFeedbackService.getFeedbackByAutomation).toHaveBeenCalledWith(
        'auto_a_123',
        ORG_B_ID
      );
    });
  });

  describe('POST /api/feedback/archive-old - Organization Scope', () => {
    it('should only archive feedback in user organization', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: ORG_A_ID };
        next();
      });

      (automationFeedbackService.archiveOldFeedback as jest.Mock).mockResolvedValue({
        success: true,
        count: 5
      });

      const response = await request(app)
        .post('/api/feedback/archive-old')
        .send({ daysOld: 90 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(5);
      expect(automationFeedbackService.archiveOldFeedback).toHaveBeenCalledWith(
        ORG_A_ID,
        90
      );
    });

    it('should not archive feedback from other organizations', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      (automationFeedbackService.archiveOldFeedback as jest.Mock).mockResolvedValue({
        success: true,
        count: 0 // No feedback from other orgs archived
      });

      const response = await request(app)
        .post('/api/feedback/archive-old')
        .send({ daysOld: 90 })
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(automationFeedbackService.archiveOldFeedback).toHaveBeenCalledWith(
        ORG_B_ID,
        90
      );
    });
  });

  describe('GET /api/feedback/ml-training-batch - Organization Scope', () => {
    it('should only fetch training data for user organization', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_A_ID, organizationId: ORG_A_ID };
        next();
      });

      const mockBatch = {
        batchId: 'batch_123',
        organizationId: ORG_A_ID,
        samples: [],
        batchSize: 0,
        createdAt: new Date(),
        mlVersion: '1.0.0'
      };

      (automationFeedbackService.getMLTrainingBatch as jest.Mock).mockResolvedValue(mockBatch);

      const response = await request(app)
        .get('/api/feedback/ml-training-batch')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(automationFeedbackService.getMLTrainingBatch).toHaveBeenCalledWith(
        ORG_A_ID,
        100
      );
    });

    it('should not include training data from other organizations', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      const mockBatch = {
        batchId: 'batch_456',
        organizationId: ORG_B_ID,
        samples: [],
        batchSize: 0,
        createdAt: new Date(),
        mlVersion: '1.0.0'
      };

      (automationFeedbackService.getMLTrainingBatch as jest.Mock).mockResolvedValue(mockBatch);

      await request(app)
        .get('/api/feedback/ml-training-batch')
        .expect(200);

      // Verify service was called with correct org ID
      expect(automationFeedbackService.getMLTrainingBatch).toHaveBeenCalledWith(
        ORG_B_ID,
        100
      );
    });
  });

  describe('Error Message Security', () => {
    it('should not reveal feedback details in error messages', async () => {
      (requireClerkAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.auth = { userId: USER_B_ID, organizationId: ORG_B_ID };
        next();
      });

      (automationFeedbackService.getFeedback as jest.Mock).mockResolvedValue({
        success: false,
        data: null
      });

      const response = await request(app)
        .get('/api/feedback/feedback_a_123')
        .expect(404);

      // Error message should be generic
      expect(response.body.error).toBe('Feedback not found');
      expect(response.body.message).not.toContain(ORG_A_ID);
      expect(response.body.message).not.toContain(USER_A_ID);
      expect(response.body).not.toHaveProperty('organizationId');
    });
  });
});
