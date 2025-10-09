/**
 * AutomationDetailsModal Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AutomationDetailsModal } from '../AutomationDetailsModal';
import { AutomationDiscovery } from '@/types/api';

// Mock the API
jest.mock('@/services/api', () => ({
  automationsApi: {
    getAutomationDetails: jest.fn(),
  },
}));

describe('AutomationDetailsModal', () => {
  const mockAutomation: AutomationDiscovery = {
    id: 'test-123',
    name: 'Test Automation',
    type: 'bot',
    platform: 'slack',
    status: 'active',
    riskLevel: 'medium',
    description: 'Test automation description',
    createdBy: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockAutomationWithUndefinedRisk: AutomationDiscovery = {
    id: 'test-456',
    name: 'Automation Without Risk',
    type: 'workflow',
    platform: 'google',
    status: 'active',
    riskLevel: undefined as any, // Simulate undefined risk level
  };

  it('renders without crashing when risk level is defined', () => {
    render(
      <AutomationDetailsModal
        automation={mockAutomation}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Test Automation')).toBeInTheDocument();
  });

  it('handles undefined risk level gracefully', () => {
    render(
      <AutomationDetailsModal
        automation={mockAutomationWithUndefinedRisk}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Automation Without Risk')).toBeInTheDocument();
    // Should not crash and should show default/unknown state
  });

  it('displays risk level badge correctly', async () => {
    const { automationsApi } = require('@/services/api');
    automationsApi.getAutomationDetails.mockResolvedValue({
      success: true,
      automation: {
        ...mockAutomation,
        permissions: {
          riskAnalysis: {
            riskLevel: 'high',
            overallRisk: 85,
          },
        },
      },
    });

    render(
      <AutomationDetailsModal
        automation={mockAutomation}
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      // Should show risk level without crashing
      const riskElements = screen.queryAllByText(/high|unknown/i);
      expect(riskElements.length).toBeGreaterThan(0);
    });
  });

  it('handles undefined permission risk level gracefully', async () => {
    const { automationsApi } = require('@/services/api');
    automationsApi.getAutomationDetails.mockResolvedValue({
      success: true,
      automation: {
        ...mockAutomation,
        permissions: {
          riskAnalysis: {
            riskLevel: undefined, // Undefined risk level
            overallRisk: 50,
          },
        },
      },
    });

    render(
      <AutomationDetailsModal
        automation={mockAutomation}
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      // Should show "Unknown" when risk level is undefined
      expect(screen.getByText(/unknown/i)).toBeInTheDocument();
    });
  });
});
