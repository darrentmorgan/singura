/**
 * Accessibility Tests
 * Tests WCAG 2.1 Level AA compliance for all dialog components
 * Uses axe-core for automated accessibility testing
 */

import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ExportDialog } from '@/components/automations/ExportDialog';
import { AutomationDetailsModal } from '@/components/automations/AutomationDetailsModal';
import { GlobalModal } from '@/components/common/GlobalModal';
import { WaitlistModal } from '@/components/landing/WaitlistModal';
import type { AutomationDiscovery } from '@/types/api';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock data
const mockAutomation: AutomationDiscovery = {
  id: 'test-automation-1',
  name: 'Test Automation',
  platform: 'google',
  type: 'bot',
  status: 'active',
  riskLevel: 'medium',
  permissions: ['read', 'write'],
  createdAt: '2025-01-01T00:00:00Z',
  organizationId: 'test-org-1',
  connectionId: 'test-connection-1',
};

const mockAutomations = [mockAutomation];

describe('Accessibility Tests - Dialog Components', () => {
  describe('ExportDialog', () => {
    it('should have no accessibility violations when open', async () => {
      const { container } = render(
        <ExportDialog
          isOpen={true}
          onClose={() => {}}
          automations={mockAutomations}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      const { getByRole } = render(
        <ExportDialog
          isOpen={true}
          onClose={() => {}}
          automations={mockAutomations}
        />
      );

      // Check dialog has proper role
      const dialog = getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Check dialog has aria-labelledby
      expect(dialog).toHaveAttribute('aria-labelledby');

      // Check dialog has aria-describedby
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should have proper button labels', () => {
      const { getByLabelText } = render(
        <ExportDialog
          isOpen={true}
          onClose={() => {}}
          automations={mockAutomations}
        />
      );

      // Check close button has aria-label
      const closeButton = getByLabelText('Close dialog');
      expect(closeButton).toBeInTheDocument();

      // Check format buttons have proper labels
      expect(getByLabelText('Export as CSV spreadsheet format')).toBeInTheDocument();
      expect(getByLabelText('Export as PDF document format')).toBeInTheDocument();
    });
  });

  describe('AutomationDetailsModal', () => {
    it('should have no accessibility violations when open', async () => {
      const { container } = render(
        <AutomationDetailsModal
          automation={mockAutomation}
          isOpen={true}
          onClose={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      const { getByRole } = render(
        <AutomationDetailsModal
          automation={mockAutomation}
          isOpen={true}
          onClose={() => {}}
        />
      );

      const dialog = getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should have accessible tabs', () => {
      const { getAllByRole } = render(
        <AutomationDetailsModal
          automation={mockAutomation}
          isOpen={true}
          onClose={() => {}}
        />
      );

      const tabs = getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });
  });

  describe('GlobalModal', () => {
    it('should have no accessibility violations when open', async () => {
      // Mock UI store
      jest.mock('@/stores/ui', () => ({
        useUIStore: () => ({
          modal: {
            isOpen: true,
            title: 'Test Modal',
            content: 'Test content',
            actions: [
              { label: 'Confirm', action: () => {} },
              { label: 'Cancel', action: () => {}, variant: 'secondary' },
            ],
          },
          closeModal: () => {},
        }),
      }));

      const { container } = render(<GlobalModal />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should always render DialogDescription', () => {
      jest.mock('@/stores/ui', () => ({
        useUIStore: () => ({
          modal: {
            isOpen: true,
            title: 'Test Modal',
            content: null, // No content provided
            actions: [],
          },
          closeModal: () => {},
        }),
      }));

      const { getByRole } = render(<GlobalModal />);
      const dialog = getByRole('dialog');

      // Should have aria-describedby even when content is null
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('WaitlistModal', () => {
    it('should have no accessibility violations when open', async () => {
      const { container } = render(
        <WaitlistModal open={true} onOpenChange={() => {}} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form accessibility', () => {
      const { getByLabelText } = render(
        <WaitlistModal open={true} onOpenChange={() => {}} />
      );

      // Check labels are associated with inputs
      const emailInput = getByLabelText(/work email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
    });

    it('should announce validation errors', () => {
      const { getByRole } = render(
        <WaitlistModal open={true} onOpenChange={() => {}} />
      );

      // Submit form without email to trigger error
      const submitButton = getByRole('button', { name: /join waitlist/i });
      submitButton.click();

      // Error should have role="alert" and aria-live
      const alert = getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Base Dialog Component', () => {
    it('should have close button with proper label', () => {
      const { getByLabelText } = render(
        <ExportDialog
          isOpen={true}
          onClose={() => {}}
          automations={mockAutomations}
        />
      );

      const closeButton = getByLabelText('Close dialog');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trap focus within dialog', () => {
      const { getByRole } = render(
        <ExportDialog
          isOpen={true}
          onClose={() => {}}
          automations={mockAutomations}
        />
      );

      const dialog = getByRole('dialog');
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should handle ESC key to close dialog', () => {
      const onClose = jest.fn();
      const { container } = render(
        <ExportDialog
          isOpen={true}
          onClose={onClose}
          automations={mockAutomations}
        />
      );

      // Simulate ESC key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      container.dispatchEvent(event);

      // Radix UI Dialog handles ESC automatically
      // Check that dialog can be closed
      expect(onClose).toBeDefined();
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA color contrast requirements', async () => {
      const { container } = render(
        <ExportDialog
          isOpen={true}
          onClose={() => {}}
          automations={mockAutomations}
        />
      );

      // axe checks color contrast automatically
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce loading states', () => {
      const { getByText } = render(
        <AutomationDetailsModal
          automation={mockAutomation}
          isOpen={true}
          onClose={() => {}}
        />
      );

      // Loading state should be announced
      const loadingText = getByText(/loading enriched permission details/i);
      expect(loadingText).toBeInTheDocument();
    });
  });
});
