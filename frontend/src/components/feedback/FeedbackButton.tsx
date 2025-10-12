/**
 * FeedbackButton Component
 * Simple thumbs up/down buttons for quick feedback
 */

import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FeedbackSentiment } from '@singura/shared-types';

interface FeedbackButtonProps {
  /** Current feedback sentiment if any */
  currentSentiment?: FeedbackSentiment | null;

  /** Callback when thumbs up is clicked */
  onThumbsUp: () => void;

  /** Callback when thumbs down is clicked */
  onThumbsDown: () => void;

  /** Loading state */
  isLoading?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Show labels */
  showLabels?: boolean;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Additional class names */
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  currentSentiment,
  onThumbsUp,
  onThumbsDown,
  isLoading = false,
  disabled = false,
  showLabels = false,
  size = 'sm',
  className,
}) => {
  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default';
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  const isThumbsUpActive = currentSentiment === 'positive';
  const isThumbsDownActive = currentSentiment === 'negative';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Thumbs Up Button */}
      <Button
        variant={isThumbsUpActive ? 'default' : 'outline'}
        size={buttonSize}
        onClick={(e) => {
          e.stopPropagation();
          onThumbsUp();
        }}
        disabled={disabled || isLoading}
        className={cn(
          'transition-all',
          isThumbsUpActive && 'bg-green-600 hover:bg-green-700 text-white',
          !isThumbsUpActive && 'hover:bg-green-50 hover:text-green-600 hover:border-green-300'
        )}
        title="Mark as correct detection"
      >
        <ThumbsUp className={cn(iconSize, isThumbsUpActive && 'fill-current')} />
        {showLabels && <span className="ml-2">Correct</span>}
      </Button>

      {/* Thumbs Down Button */}
      <Button
        variant={isThumbsDownActive ? 'default' : 'outline'}
        size={buttonSize}
        onClick={(e) => {
          e.stopPropagation();
          onThumbsDown();
        }}
        disabled={disabled || isLoading}
        className={cn(
          'transition-all',
          isThumbsDownActive && 'bg-red-600 hover:bg-red-700 text-white',
          !isThumbsDownActive && 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
        )}
        title="Mark as incorrect detection"
      >
        <ThumbsDown className={cn(iconSize, isThumbsDownActive && 'fill-current')} />
        {showLabels && <span className="ml-2">Incorrect</span>}
      </Button>
    </div>
  );
};

export default FeedbackButton;
