/**
 * Hook for generating unique ARIA IDs for dialog components
 * Uses React's useId() hook to ensure uniqueness across component instances
 */

import { useId } from 'react';

interface DialogIds {
  titleId: string;
  descriptionId: string;
}

/**
 * Generates unique IDs for dialog title and description elements
 * to ensure proper ARIA attribute linking.
 *
 * @returns Object containing unique titleId and descriptionId
 *
 * @example
 * ```tsx
 * const { titleId, descriptionId } = useDialogIds();
 *
 * <Dialog>
 *   <DialogContent aria-labelledby={titleId} aria-describedby={descriptionId}>
 *     <DialogTitle id={titleId}>Title</DialogTitle>
 *     <DialogDescription id={descriptionId}>Description</DialogDescription>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export function useDialogIds(): DialogIds {
  const id = useId();

  return {
    titleId: `dialog-title-${id}`,
    descriptionId: `dialog-description-${id}`,
  };
}

/**
 * Alternative hook that accepts a base name for more semantic IDs
 * Useful for debugging and testing
 */
export function useNamedDialogIds(name: string): DialogIds {
  const id = useId();

  return {
    titleId: `${name}-title-${id}`,
    descriptionId: `${name}-description-${id}`,
  };
}
