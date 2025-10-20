/**
 * AutomationDetailsModal Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { AutomationDetailsModal } from '../AutomationDetailsModal';
import { AutomationDiscovery } from '@/types/api';

// Mock the API
vi.mock('@/services/api', () => ({
  automationsApi: {
    getAutomationDetails: vi.fn().mockResolvedValue({
      success: true,
      automation: null,
    }),
  },
}));

describe('AutomationDetailsModal', () => {
  const mockAutomation: AutomationDiscovery = {
    id: 'test-123',
    name: 'Test Automation',
    type: 'bot',
    platform: 'slack',
    connectionId: 'test-connection-id',
    status: 'active',
    riskLevel: 'medium',
    description: 'Test automation description',
    createdBy: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    riskScore: 65,
    discoveredAt: '2024-01-01T00:00:00Z',
  };

  const mockAutomationWithUndefinedRisk: AutomationDiscovery = {
    id: 'test-456',
    name: 'Automation Without Risk',
    type: 'workflow',
    platform: 'google',
    connectionId: 'test-connection-id-2',
    status: 'active',
    riskLevel: undefined as unknown as 'low' | 'medium' | 'high', // Simulate undefined risk level
    riskScore: 50,
    discoveredAt: '2024-01-01T00:00:00Z',
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

  it('displays automation name', async () => {
    render(
      <AutomationDetailsModal
        automation={mockAutomation}
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Automation')).toBeInTheDocument();
    });
  });

  it('handles undefined risk level in automation data', () => {
    render(
      <AutomationDetailsModal
        automation={mockAutomationWithUndefinedRisk}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Should render without crashing
    expect(screen.getByText('Automation Without Risk')).toBeInTheDocument();
  });
});
