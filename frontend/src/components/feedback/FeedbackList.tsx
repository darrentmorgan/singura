/**
 * FeedbackList Component
 * Display list of feedback with filtering and sorting
 */

import React from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutomationFeedback, FeedbackSentiment } from '@singura/shared-types';

interface FeedbackListProps {
  /** List of feedback items */
  feedback: AutomationFeedback[];

  /** Show automation name */
  showAutomationName?: boolean;

  /** Loading state */
  isLoading?: boolean;

  /** Empty state message */
  emptyMessage?: string;

  /** Additional class names */
  className?: string;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  feedback,
  showAutomationName: _showAutomationName = false,
  isLoading = false,
  emptyMessage = 'No feedback yet',
  className,
}) => {
  const getSentimentIcon = (sentiment: FeedbackSentiment) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-600 fill-current" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-600 fill-current" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-muted/50 rounded-lg p-4 h-24"
          />
        ))}
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {feedback.map((item) => (
        <div
          key={item.id}
          className="p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getSentimentIcon(item.sentiment)}
              <span className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                item.sentiment === 'positive'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : item.sentiment === 'negative'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
              )}>
                {item.feedbackType.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>

          {/* Comment */}
          {item.comment && (
            <p className="text-sm text-foreground mb-2">{item.comment}</p>
          )}

          {/* Suggested Corrections */}
          {item.suggestedCorrections && (
            <div className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1">
              <div className="font-medium text-muted-foreground">Suggested Corrections:</div>
              {item.suggestedCorrections.automationType && (
                <div>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span className="text-foreground">{item.suggestedCorrections.automationType}</span>
                </div>
              )}
              {item.suggestedCorrections.aiProvider && (
                <div>
                  <span className="text-muted-foreground">AI Provider:</span>{' '}
                  <span className="text-foreground">{item.suggestedCorrections.aiProvider}</span>
                </div>
              )}
              {item.suggestedCorrections.riskLevel && (
                <div>
                  <span className="text-muted-foreground">Risk:</span>{' '}
                  <span className="text-foreground capitalize">{item.suggestedCorrections.riskLevel}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-4 mt-3 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{item.userEmail}</span>
            </div>

            {item.status && (
              <div className="flex items-center gap-1">
                <span className={cn(
                  'px-2 py-0.5 rounded-full font-medium',
                  item.status === 'resolved'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : item.status === 'acknowledged'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                )}>
                  {item.status}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeedbackList;
