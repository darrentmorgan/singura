/**
 * FeedbackForm Component
 * Detailed feedback form with comment and suggested corrections
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FeedbackType,
  FeedbackSentiment,
  SuggestedCorrections
} from '@singura/shared-types';

interface FeedbackFormProps {
  /** Current sentiment (positive/negative) */
  sentiment: FeedbackSentiment;

  /** Initial feedback type */
  initialFeedbackType?: FeedbackType;

  /** Initial comment */
  initialComment?: string;

  /** Initial suggested corrections */
  initialCorrections?: SuggestedCorrections;

  /** Callback when form is submitted */
  onSubmit: (data: {
    feedbackType: FeedbackType;
    comment?: string;
    suggestedCorrections?: SuggestedCorrections;
  }) => void;

  /** Callback when form is cancelled */
  onCancel: () => void;

  /** Loading state */
  isLoading?: boolean;

  /** Additional class names */
  className?: string;
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; description: string }[] = [
  {
    value: 'correct_detection',
    label: 'Correct Detection',
    description: 'This detection is accurate'
  },
  {
    value: 'false_positive',
    label: 'False Positive',
    description: 'This is not actually an automation'
  },
  {
    value: 'false_negative',
    label: 'Missed Detection',
    description: 'An automation was not detected'
  },
  {
    value: 'incorrect_classification',
    label: 'Wrong Type',
    description: 'Automation type is incorrect'
  },
  {
    value: 'incorrect_risk_score',
    label: 'Wrong Risk Level',
    description: 'Risk score does not match reality'
  },
  {
    value: 'incorrect_ai_provider',
    label: 'Wrong AI Provider',
    description: 'AI provider is misidentified'
  },
];

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  sentiment,
  initialFeedbackType,
  initialComment = '',
  initialCorrections,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(
    initialFeedbackType || (sentiment === 'positive' ? 'correct_detection' : 'false_positive')
  );
  const [comment, setComment] = useState(initialComment);
  const [showCorrections, setShowCorrections] = useState(!!initialCorrections);

  // Suggested corrections state
  const [automationType, setAutomationType] = useState(initialCorrections?.automationType || '');
  const [aiProvider, setAiProvider] = useState(initialCorrections?.aiProvider || '');
  const [riskLevel, setRiskLevel] = useState<typeof RISK_LEVELS[number] | ''>(
    initialCorrections?.riskLevel || ''
  );
  const [riskScore, setRiskScore] = useState(initialCorrections?.riskScore?.toString() || '');
  const [correctionNotes, setCorrectionNotes] = useState(initialCorrections?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const suggestedCorrections: SuggestedCorrections | undefined = showCorrections
      ? {
          ...(automationType && { automationType }),
          ...(aiProvider && { aiProvider }),
          ...(riskLevel && { riskLevel }),
          ...(riskScore && { riskScore: parseInt(riskScore, 10) }),
          ...(correctionNotes && { notes: correctionNotes }),
        }
      : undefined;

    onSubmit({
      feedbackType,
      comment: comment.trim() || undefined,
      suggestedCorrections: Object.keys(suggestedCorrections || {}).length > 0
        ? suggestedCorrections
        : undefined,
    });
  };

  // Filter feedback types based on sentiment
  const relevantFeedbackTypes = sentiment === 'positive'
    ? FEEDBACK_TYPES.filter(t => t.value === 'correct_detection')
    : FEEDBACK_TYPES.filter(t => t.value !== 'correct_detection');

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Feedback Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="feedbackType">Feedback Type</Label>
        <div className="grid grid-cols-1 gap-2">
          {relevantFeedbackTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFeedbackType(type.value)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                feedbackType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {feedbackType === type.value ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{type.label}</div>
                <div className="text-sm text-muted-foreground">{type.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="comment">Additional Comments (Optional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Provide more context about this feedback..."
          rows={3}
          disabled={isLoading}
          className="resize-none"
        />
      </div>

      {/* Suggested Corrections Toggle */}
      {sentiment === 'negative' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCorrections(!showCorrections)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
          >
            <AlertCircle className="h-4 w-4" />
            {showCorrections ? 'Hide' : 'Add'} Suggested Corrections
          </button>

          {showCorrections && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Help improve detection accuracy by providing the correct information:
              </p>

              {/* Automation Type */}
              <div className="space-y-1">
                <Label htmlFor="automationType" className="text-xs">
                  Correct Automation Type
                </Label>
                <Input
                  id="automationType"
                  value={automationType}
                  onChange={(e) => setAutomationType(e.target.value)}
                  placeholder="e.g., workflow, bot, integration"
                  disabled={isLoading}
                />
              </div>

              {/* AI Provider */}
              <div className="space-y-1">
                <Label htmlFor="aiProvider" className="text-xs">
                  Correct AI Provider
                </Label>
                <Input
                  id="aiProvider"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  placeholder="e.g., OpenAI, Claude, Gemini"
                  disabled={isLoading}
                />
              </div>

              {/* Risk Level */}
              <div className="space-y-1">
                <Label htmlFor="riskLevel" className="text-xs">
                  Correct Risk Level
                </Label>
                <select
                  id="riskLevel"
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as typeof RISK_LEVELS[number])}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select risk level...</option>
                  {RISK_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Risk Score */}
              <div className="space-y-1">
                <Label htmlFor="riskScore" className="text-xs">
                  Correct Risk Score (0-100)
                </Label>
                <Input
                  id="riskScore"
                  type="number"
                  min="0"
                  max="100"
                  value={riskScore}
                  onChange={(e) => setRiskScore(e.target.value)}
                  placeholder="0-100"
                  disabled={isLoading}
                />
              </div>

              {/* Additional Notes */}
              <div className="space-y-1">
                <Label htmlFor="correctionNotes" className="text-xs">
                  Additional Notes
                </Label>
                <Textarea
                  id="correctionNotes"
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Any additional context..."
                  rows={2}
                  disabled={isLoading}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Feedback
        </Button>
      </div>
    </form>
  );
};

export default FeedbackForm;
