/**
 * Detection Feedback Component
 * Thumbs up/down UI for providing feedback on detections
 */

import React, { useState } from 'react';
import { FeedbackType } from '@saas-xray/shared-types';

interface DetectionFeedbackProps {
  detectionId: string;
  onFeedbackSubmitted?: (feedbackType: FeedbackType) => void;
  initialFeedback?: FeedbackType | null;
}

export const DetectionFeedback: React.FC<DetectionFeedbackProps> = ({
  detectionId,
  onFeedbackSubmitted,
  initialFeedback = null
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(initialFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = async (feedbackType: FeedbackType) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detectionId,
          feedbackType,
          metadata: {
            source: 'detection_card',
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSelectedFeedback(feedbackType);
      onFeedbackSubmitted?.(feedbackType);

      console.log(`✅ Feedback submitted: ${feedbackType} for detection ${detectionId}`);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbsUp = () => {
    if (selectedFeedback === FeedbackType.TRUE_POSITIVE) {
      return; // Already selected
    }
    submitFeedback(FeedbackType.TRUE_POSITIVE);
  };

  const handleThumbsDown = () => {
    if (selectedFeedback === FeedbackType.FALSE_POSITIVE) {
      return; // Already selected
    }
    submitFeedback(FeedbackType.FALSE_POSITIVE);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Is this detection accurate?
      </span>

      <div className="flex gap-2">
        {/* Thumbs Up */}
        <button
          onClick={handleThumbsUp}
          disabled={isSubmitting}
          className={`
            p-2 rounded-lg transition-all duration-200
            ${selectedFeedback === FeedbackType.TRUE_POSITIVE
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/50'
            }
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
          `}
          title="Accurate detection (thumbs up)"
          aria-label="Mark detection as accurate"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
        </button>

        {/* Thumbs Down */}
        <button
          onClick={handleThumbsDown}
          disabled={isSubmitting}
          className={`
            p-2 rounded-lg transition-all duration-200
            ${selectedFeedback === FeedbackType.FALSE_POSITIVE
              ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/50'
            }
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
          `}
          title="Inaccurate detection (thumbs down)"
          aria-label="Mark detection as inaccurate"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
          </svg>
        </button>
      </div>

      {error && (
        <span className="text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      )}

      {selectedFeedback && !error && (
        <span className="text-sm text-green-600 dark:text-green-400">
          ✓ Thank you for your feedback!
        </span>
      )}
    </div>
  );
};
