/**
 * Feedback API Client
 * Handles all feedback-related API operations for Phase 2 ML Training
 */

import {
  AutomationFeedback,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackFilters,
  FeedbackStatistics,
  FeedbackTrend,
  MLTrainingBatch,
  FeedbackResolution
} from '@singura/shared-types';
import { apiService } from './api';
import { ApiResponse } from '@/types/api';

const FEEDBACK_BASE_URL = '/feedback';

/**
 * Feedback API service methods
 */
export const feedbackApi = {
  /**
   * Create new feedback for an automation detection
   */
  createFeedback: async (input: CreateFeedbackInput): Promise<ApiResponse<AutomationFeedback>> => {
    const response = await apiService['request']<ApiResponse<AutomationFeedback>>(
      'POST',
      FEEDBACK_BASE_URL,
      input
    );
    return response;
  },

  /**
   * Get feedback by ID
   */
  getFeedback: async (id: string): Promise<ApiResponse<AutomationFeedback>> => {
    const response = await apiService['request']<ApiResponse<AutomationFeedback>>(
      'GET',
      `${FEEDBACK_BASE_URL}/${id}`
    );
    return response;
  },

  /**
   * Get list of feedback with filters
   */
  getFeedbackList: async (filters?: FeedbackFilters): Promise<ApiResponse<AutomationFeedback[]>> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, String(value));
          }
        }
      });
    }

    const url = params.toString()
      ? `${FEEDBACK_BASE_URL}?${params.toString()}`
      : FEEDBACK_BASE_URL;

    const response = await apiService['request']<ApiResponse<AutomationFeedback[]>>(
      'GET',
      url
    );
    return response;
  },

  /**
   * Get all feedback for a specific automation
   */
  getFeedbackByAutomation: async (automationId: string): Promise<ApiResponse<AutomationFeedback[]>> => {
    const response = await apiService['request']<ApiResponse<AutomationFeedback[]>>(
      'GET',
      `${FEEDBACK_BASE_URL}/automation/${automationId}`
    );
    return response;
  },

  /**
   * Get recent feedback for an organization
   */
  getRecentFeedback: async (organizationId: string, limit = 10): Promise<ApiResponse<AutomationFeedback[]>> => {
    const response = await apiService['request']<ApiResponse<AutomationFeedback[]>>(
      'GET',
      `${FEEDBACK_BASE_URL}/recent/${organizationId}?limit=${limit}`
    );
    return response;
  },

  /**
   * Update existing feedback
   */
  updateFeedback: async (id: string, input: UpdateFeedbackInput): Promise<ApiResponse<AutomationFeedback>> => {
    const response = await apiService['request']<ApiResponse<AutomationFeedback>>(
      'PUT',
      `${FEEDBACK_BASE_URL}/${id}`,
      input
    );
    return response;
  },

  /**
   * Acknowledge feedback (mark as reviewed)
   */
  acknowledgeFeedback: async (id: string): Promise<ApiResponse<AutomationFeedback>> => {
    const response = await apiService['request']<ApiResponse<AutomationFeedback>>(
      'PUT',
      `${FEEDBACK_BASE_URL}/${id}/acknowledge`
    );
    return response;
  },

  /**
   * Resolve feedback with resolution details
   */
  resolveFeedback: async (id: string, resolution: FeedbackResolution): Promise<ApiResponse<AutomationFeedback>> => {
    const response = await apiService['request']<ApiResponse<AutomationFeedback>>(
      'PUT',
      `${FEEDBACK_BASE_URL}/${id}/resolve`,
      { resolution }
    );
    return response;
  },

  /**
   * Get feedback statistics for an organization
   */
  getStatistics: async (organizationId: string): Promise<ApiResponse<FeedbackStatistics>> => {
    const response = await apiService['request']<ApiResponse<FeedbackStatistics>>(
      'GET',
      `${FEEDBACK_BASE_URL}/statistics/${organizationId}`
    );
    return response;
  },

  /**
   * Get feedback trends over time
   */
  getTrends: async (organizationId: string, days = 30): Promise<ApiResponse<FeedbackTrend[]>> => {
    const response = await apiService['request']<ApiResponse<FeedbackTrend[]>>(
      'GET',
      `${FEEDBACK_BASE_URL}/trends/${organizationId}?days=${days}`
    );
    return response;
  },

  /**
   * Export ML training batch
   */
  exportMLTrainingBatch: async (organizationId?: string, limit?: number): Promise<ApiResponse<MLTrainingBatch>> => {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (limit) params.append('limit', limit.toString());

    const url = params.toString()
      ? `${FEEDBACK_BASE_URL}/ml/export?${params.toString()}`
      : `${FEEDBACK_BASE_URL}/ml/export`;

    const response = await apiService['request']<ApiResponse<MLTrainingBatch>>(
      'GET',
      url
    );
    return response;
  },
};

export default feedbackApi;
