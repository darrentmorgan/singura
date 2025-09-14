import React, { useState } from 'react';
import {
  FeedbackAction,
  FeedbackEntrySchema
} from '@saas-xray/shared-types/feedback';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';

interface ShadowNetworkFeedbackProps {
  detectionId: string;
  detectionDetails: Record<string, unknown>;
  onSubmitFeedback: (feedback: {
    action: FeedbackAction;
    comment?: string;
  }) => Promise<void>;
}

export const ShadowNetworkFeedback: React.FC<ShadowNetworkFeedbackProps> = ({
  detectionId,
  detectionDetails,
  onSubmitFeedback
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<FeedbackAction | null>(null);
  const [comment, setComment] = useState('');

  const handleActionSelect = (action: FeedbackAction) => {
    setSelectedAction(action);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedAction) return;

    try {
      await onSubmitFeedback({
        action: selectedAction,
        comment: comment || undefined
      });

      // Reset state
      setIsDialogOpen(false);
      setSelectedAction(null);
      setComment('');
    } catch (error) {
      // TODO: Implement error handling with toast or notification
      console.error('Feedback submission failed', error);
    }
  };

  return (
    <div className="shadow-network-feedback">
      <div className="feedback-actions flex space-x-2">
        <Button
          variant="success"
          onClick={() => handleActionSelect('APPROVE')}
        >
          Approve Detection
        </Button>
        <Button
          variant="warning"
          onClick={() => handleActionSelect('IGNORE')}
        >
          Ignore
        </Button>
        <Button
          variant="destructive"
          onClick={() => handleActionSelect('FLAG_FALSE_POSITIVE')}
        >
          False Positive
        </Button>
        <Button
          variant="alert"
          onClick={() => handleActionSelect('FLAG_HIGH_RISK')}
        >
          High Risk
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {selectedAction} for Shadow Network Detection
            </DialogTitle>
          </DialogHeader>

          <div className="detection-details mb-4">
            <h3>Detection Details:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(detectionDetails, null, 2)}
            </pre>
          </div>

          <Textarea
            placeholder="Optional: Add comments or context for this feedback"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedAction}
            >
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};