/**
 * AutomationFeedback Component
 * Main feedback component for automation cards
 * Combines FeedbackButton and FeedbackForm with state management
 */

import React, { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { MessageSquare, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackButton } from './FeedbackButton';
import { FeedbackForm } from './FeedbackForm';
import { feedbackApi } from '@/services/feedback-api';
import {
  AutomationFeedback as AutomationFeedbackType,
  FeedbackSentiment,
  FeedbackType,
  SuggestedCorrections,
  CreateFeedbackInput
} from '@singura/shared-types';

interface AutomationFeedbackProps {
  /** Automation ID */
  automationId: string;

  /** Existing feedback if any */
  existingFeedback?: AutomationFeedbackType | null;

  /** Callback when feedback is submitted */
  onFeedbackSubmitted?: (feedback: AutomationFeedbackType) => void;

  /** Callback to open full modal/details view on feedback tab */
  onOpenFeedbackView?: () => void;

  /** Compact mode (inline) */
  compact?: boolean;

  /** Initially expanded state */
  initiallyExpanded?: boolean;

  /** Additional class names */
  className?: string;
}

export const AutomationFeedback: React.FC<AutomationFeedbackProps> = ({
  automationId,
  existingFeedback,
  onFeedbackSubmitted,
  onOpenFeedbackView,
  compact = false,
  initiallyExpanded = false,
  className,
}) => {
  const { user } = useUser();
  const { organization } = useOrganization();

  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<AutomationFeedbackType | null>(
    existingFeedback || null
  );
  const [pendingSentiment, setPendingSentiment] = useState<FeedbackSentiment | null>(null);

  // Fetch existing feedback on mount if not provided
  useEffect(() => {
    if (!existingFeedback && automationId && organization?.id) {
      fetchExistingFeedback();
    }
  }, [automationId, organization?.id]);

  const fetchExistingFeedback = async () => {
    try {
      const response = await feedbackApi.getFeedbackByAutomation(automationId);
      if (response.success && response.data && Array.isArray(response.data)) {
        // Get user's feedback if exists
        const userFeedback = response.data.find(
          (f) => f.userId === user?.id
        );
        if (userFeedback) {
          setCurrentFeedback(userFeedback);
        }
      }
    } catch (error) {
      console.error('Failed to fetch existing feedback:', error);
    }
  };

  const handleThumbsUp = () => {
    if (compact && onOpenFeedbackView) {
      // In compact mode, open the full modal on feedback tab with form expanded
      onOpenFeedbackView(true);
    } else if (currentFeedback?.sentiment === 'positive') {
      // Already thumbs up, do nothing or allow edit
      setIsExpanded(!isExpanded);
    } else {
      setPendingSentiment('positive');
      setIsExpanded(true);
    }
  };

  const handleThumbsDown = () => {
    if (compact && onOpenFeedbackView) {
      // In compact mode, open the full modal on feedback tab with form expanded
      onOpenFeedbackView(true);
    } else if (currentFeedback?.sentiment === 'negative') {
      // Already thumbs down, do nothing or allow edit
      setIsExpanded(!isExpanded);
    } else {
      setPendingSentiment('negative');
      setIsExpanded(true);
    }
  };

  const handleSubmitFeedback = async (data: {
    feedbackType: FeedbackType;
    comment?: string;
    suggestedCorrections?: SuggestedCorrections;
  }) => {
    if (!user || !organization) {
      toast.error('You must be logged in to submit feedback');
      return;
    }

    setIsLoading(true);

    try {
      const sentiment = pendingSentiment || currentFeedback?.sentiment || 'neutral';

      const input: CreateFeedbackInput = {
        automationId,
        organizationId: organization.id,
        userId: user.id,
        userEmail: user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || 'unknown',
        feedbackType: data.feedbackType,
        sentiment,
        comment: data.comment,
        suggestedCorrections: data.suggestedCorrections,
      };

      const response = await feedbackApi.createFeedback(input);

      if (response.success && response.data) {
        setCurrentFeedback(response.data);
        setIsExpanded(false);
        setPendingSentiment(null);
        onFeedbackSubmitted?.(response.data);

        toast.success('Feedback submitted successfully!');
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      toast.error(error?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setPendingSentiment(null);
  };

  const currentSentiment = currentFeedback?.sentiment || null;
  const feedbackCount = currentFeedback ? 1 : 0;

  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-2', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <FeedbackButton
          currentSentiment={currentSentiment}
          onThumbsUp={handleThumbsUp}
          onThumbsDown={handleThumbsDown}
          isLoading={isLoading}
          size="sm"
        />

        {feedbackCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenFeedbackView) {
                onOpenFeedbackView(false); // Pass false to keep form collapsed
              } else {
                setIsExpanded(!isExpanded);
              }
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            <span>{feedbackCount}</span>
          </button>
        )}

        {/* Expanded form overlay/modal would go here */}
        {isExpanded && (
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
          >
            <div
              className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Provide Feedback
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FeedbackForm
                sentiment={pendingSentiment || currentFeedback?.sentiment || 'neutral'}
                initialFeedbackType={currentFeedback?.feedbackType}
                initialComment={currentFeedback?.comment}
                initialCorrections={currentFeedback?.suggestedCorrections}
                onSubmit={handleSubmitFeedback}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full view mode
  return (
    <div className={cn('space-y-4', className)}>
      {/* Feedback Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-foreground">Detection Feedback</h4>
          {feedbackCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({feedbackCount} feedback)
            </span>
          )}
        </div>

        <FeedbackButton
          currentSentiment={currentSentiment}
          onThumbsUp={handleThumbsUp}
          onThumbsDown={handleThumbsDown}
          isLoading={isLoading}
          size="md"
          showLabels
        />
      </div>

      {/* Current Feedback Display */}
      {currentFeedback && !isExpanded && (
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  currentFeedback.sentiment === 'positive'
                    ? 'bg-green-100 text-green-700'
                    : currentFeedback.sentiment === 'negative'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                )}>
                  {currentFeedback.feedbackType.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(currentFeedback.createdAt).toLocaleDateString()}
                </span>
              </div>
              {currentFeedback.comment && (
                <p className="text-sm text-foreground">{currentFeedback.comment}</p>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-sm text-primary hover:text-primary/80"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Expandable Form */}
      {isExpanded && (
        <div className="border rounded-lg p-4 bg-card">
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronUp className="h-4 w-4" />
            Hide Feedback Form
          </button>

          <FeedbackForm
            sentiment={pendingSentiment || currentFeedback?.sentiment || 'neutral'}
            initialFeedbackType={currentFeedback?.feedbackType}
            initialComment={currentFeedback?.comment}
            initialCorrections={currentFeedback?.suggestedCorrections}
            onSubmit={handleSubmitFeedback}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Expand Toggle */}
      {!isExpanded && !currentFeedback && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
        >
          <ChevronDown className="h-4 w-4" />
          Add Detailed Feedback
        </button>
      )}
    </div>
  );
};

export default AutomationFeedback;
