/**
 * Feedback Metrics Dashboard
 * Display RL performance metrics and accuracy trends
 */

import React, { useEffect, useState } from 'react';
import { ReinforcementMetrics } from '@saas-xray/shared-types';

export const FeedbackMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ReinforcementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/feedback/metrics');

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-red-600 dark:text-red-400">{error || 'No metrics available'}</p>
      </div>
    );
  }

  const accuracyPercentage = (metrics.precision * 100).toFixed(1);
  const recallPercentage = (metrics.recall * 100).toFixed(1);
  const f1Percentage = (metrics.f1Score * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Detection Performance
        </h2>
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
          Last 30 Days
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Precision */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
          <div className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">
            Precision
          </div>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">
            {accuracyPercentage}%
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {metrics.truePositives} / {metrics.truePositives + metrics.falsePositives} correct
          </div>
        </div>

        {/* Recall */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
          <div className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
            Recall
          </div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {recallPercentage}%
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {metrics.truePositives} / {metrics.truePositives + metrics.falseNegatives} detected
          </div>
        </div>

        {/* F1 Score */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
          <div className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">
            F1 Score
          </div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {f1Percentage}%
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Harmonic mean
          </div>
        </div>

        {/* Total Feedback */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-600/20 rounded-lg p-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
            Total Feedback
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalFeedback}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Reward: {metrics.rewardSignal > 0 ? '+' : ''}{metrics.rewardSignal}
          </div>
        </div>
      </div>

      {/* Feedback Breakdown */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Feedback Breakdown
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ✅ True Positives (Correct Detections)
            </span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {metrics.truePositives}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ❌ False Positives (Incorrect Alerts)
            </span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {metrics.falsePositives}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ⚠️ False Negatives (Missed Threats)
            </span>
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {metrics.falseNegatives}
            </span>
          </div>
        </div>
      </div>

      {/* Improvement Status */}
      {metrics.rewardSignal > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                Model Improving
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Detection thresholds are being optimized based on your feedback. Positive reward signal indicates improving accuracy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
