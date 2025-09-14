import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ShadowNetworkDetection,
  UserFeedback,
  ShadowNetworkDetectionAction
} from '@saas-xray/shared-types/detection';
import { submitFeedback } from '@/services/feedbackService';

interface ShadowNetworkFeedbackProps {
  detection: ShadowNetworkDetection;
  onClose: () => void;
}

export function ShadowNetworkFeedback({ detection, onClose }: ShadowNetworkFeedbackProps) {
  const [comment, setComment] = useState('');
  const [selectedAction, setSelectedAction] = useState<ShadowNetworkDetectionAction | null>(null);

  const handleSubmitFeedback = async (action: ShadowNetworkDetectionAction) => {
    try {
      const feedbackData: UserFeedback = {
        detectionId: detection.id,
        action,
        comment: comment || undefined,
        userId: '', // Injected from auth context
        organizationId: '', // Injected from org context
        timestamp: new Date()
      };

      await submitFeedback(feedbackData);
      onClose();
    } catch (error) {
      // Handle error (e.g., show toast notification)
      console.error('Failed to submit feedback', error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shadow Network Detection Feedback</DialogTitle>
          <DialogDescription>
            Help improve our detection algorithm by providing feedback on this automated detection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Detection Details</h3>
            <p>Platform: {detection.platform}</p>
            <p>Automation Type: {detection.automationType}</p>
            <p>Risk Score: {detection.riskScore}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Your Assessment</h3>
            <div className="flex space-x-2">
              <Button
                variant={selectedAction === 'approve' ? 'default' : 'outline'}
                onClick={() => handleSubmitFeedback('approve')}
              >
                Approve
              </Button>
              <Button
                variant={selectedAction === 'ignore' ? 'default' : 'outline'}
                onClick={() => handleSubmitFeedback('ignore')}
              >
                Ignore
              </Button>
              <Button
                variant={selectedAction === 'flag' ? 'destructive' : 'outline'}
                onClick={() => handleSubmitFeedback('flag')}
              >
                Flag as Suspicious
              </Button>
            </div>
          </div>

          <div>
            <Textarea
              placeholder="Optional: Provide additional context or comments"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}