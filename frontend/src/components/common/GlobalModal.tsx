/**
 * Global Modal Component
 * Renders modals based on UI store state
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/button';

export const GlobalModal: React.FC = () => {
  const modal = useUIStore(state => state.modal);
  const closeModal = useUIStore(state => state.closeModal);

  return (
    <Dialog open={modal.isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modal.title || 'Confirm'}</DialogTitle>
          {modal.content && (
            <DialogDescription>
              {modal.content}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter>
          {modal.actions?.map((action, index) => (
            <Button
              key={index}
              variant={action.variant === 'destructive' ? 'destructive' : action.variant === 'secondary' ? 'outline' : 'default'}
              onClick={() => {
                action.action?.();
                closeModal();
              }}
            >
              {action.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalModal;
