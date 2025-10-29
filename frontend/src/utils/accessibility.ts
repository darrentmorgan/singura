/**
 * Accessibility Utility Functions
 * Helper functions for improving WCAG 2.1 Level AA compliance
 */

/**
 * Announces a message to screen readers without visual change
 * Uses aria-live region pattern
 *
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive'
 *
 * @example
 * ```tsx
 * announceToScreenReader('Form submitted successfully');
 * announceToScreenReader('Error: Invalid email', 'assertive');
 * ```
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.classList.add('sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after screen reader has announced (1 second)
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Generates a unique ID for accessibility attributes
 * Fallback for environments without React's useId()
 *
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
let idCounter = 0;
export function generateAccessibilityId(prefix = 'a11y'): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/**
 * Checks if an element is keyboard focusable
 *
 * @param element - The DOM element to check
 * @returns true if element can receive keyboard focus
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled') || element.hasAttribute('aria-disabled')) {
    return false;
  }

  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex !== null && parseInt(tabIndex, 10) < 0) {
    return false;
  }

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Gets all focusable elements within a container
 * Useful for implementing focus traps
 *
 * @param container - The container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = container.querySelectorAll<HTMLElement>(focusableSelectors);
  return Array.from(elements).filter(el => isFocusable(el));
}

/**
 * Traps focus within a container element
 * Prevents Tab key from moving focus outside
 *
 * @param container - The container to trap focus within
 * @returns Cleanup function to remove trap
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab: focus last element when at first
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: focus first element when at last
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element on mount
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Returns appropriate ARIA live region value based on message type
 *
 * @param type - Message type ('info', 'success', 'warning', 'error')
 * @returns ARIA live region value
 */
export function getAriaLive(
  type: 'info' | 'success' | 'warning' | 'error'
): 'polite' | 'assertive' {
  return type === 'error' || type === 'warning' ? 'assertive' : 'polite';
}

/**
 * Checks if color contrast meets WCAG AA standards
 *
 * @param foreground - Foreground color (hex, rgb, or rgba)
 * @param background - Background color (hex, rgb, or rgba)
 * @param largeText - Whether text is large (18px+ or 14px+ bold)
 * @returns true if contrast meets WCAG AA
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    let r: number, g: number, b: number;

    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (!matches) return 0;
      [r, g, b] = matches.map(Number);
    } else {
      return 0;
    }

    // Calculate relative luminance
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  // WCAG AA: 4.5:1 for normal text, 3:1 for large text
  const requiredRatio = largeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}
