import express from 'express';
import { FeedbackRepositoryPostgres } from '../repositories/FeedbackRepository';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  UserFeedback,
  OrganizationDetectionConfig
} from '@saas-xray/shared-types/detection';

const router = express.Router();
const feedbackRepo = new FeedbackRepositoryPostgres();

router.post('/submit', authenticateUser, validateRequest, async (req, res) => {
  try {
    const feedbackData: UserFeedback = {
      ...req.body,
      userId: req.user.id,
      timestamp: new Date()
    };

    const submittedFeedback = await feedbackRepo.submitFeedback(feedbackData);
    res.status(201).json(submittedFeedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.get('/metrics/:organizationId', authenticateUser, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const metrics = await feedbackRepo.getOrganizationFeedbackMetrics(organizationId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve feedback metrics' });
  }
});

router.put('/config', authenticateUser, async (req, res) => {
  try {
    const configData: OrganizationDetectionConfig = req.body;
    const updatedConfig = await feedbackRepo.updateOrganizationDetectionConfig(configData);
    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update detection configuration' });
  }
});

export default router;