/**
 * DataSourceToggle Component Tests
 * Tests for the data source toggle functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataSourceToggle } from '../DataSourceToggle';
import { DataProvider } from '@/services/data-provider';

// Mock the DataProvider
vi.mock('@/services/data-provider');
const mockDataProvider = vi.mocked(DataProvider);

// Mock environment
const originalEnv = import.meta.env;

describe('DataSourceToggle', () => {
  let mockProviderInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock DataProvider instance
    mockProviderInstance = {
      getCurrentMode: vi.fn(),
      toggleDataSource: vi.fn(),
      syncWithBackend: vi.fn().mockResolvedValue(undefined)
    };
    
    mockDataProvider.getInstance = vi.fn().mockReturnValue(mockProviderInstance);
    
    // Mock development environment
    vi.stubGlobal('import.meta', {
      ...originalEnv,
      env: { ...originalEnv.env, MODE: 'development' }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Environment Handling', () => {
    it('should render in development environment', () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      
      render(<DataSourceToggle />);
      
      expect(screen.getByRole('switch')).toBeInTheDocument();
      expect(screen.getByText('Demo')).toBeInTheDocument();
    });

    it('should not render in production environment', () => {
      vi.stubGlobal('import.meta', {
        ...originalEnv,
        env: { ...originalEnv.env, MODE: 'production' }
      });
      
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      
      const { container } = render(<DataSourceToggle />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Mode Display', () => {
    it('should display demo mode correctly', () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      
      render(<DataSourceToggle />);
      
      expect(screen.getByText('Demo')).toBeInTheDocument();
      expect(screen.getByText('Using mock automation data for demos')).toBeInTheDocument();
      expect(screen.getByText('Demo data only')).toBeInTheDocument();
      
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
    });

    it('should display live mode correctly', () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('live');
      
      render(<DataSourceToggle />);
      
      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText('Using real OAuth discovery results')).toBeInTheDocument();
      expect(screen.queryByText('Demo data only')).not.toBeInTheDocument();
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle from demo to live mode', async () => {
      mockProviderInstance.getCurrentMode
        .mockReturnValueOnce('demo')  // Initial render
        .mockReturnValueOnce('live'); // After toggle
      
      mockProviderInstance.toggleDataSource.mockResolvedValue(undefined);
      
      render(<DataSourceToggle />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
      
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockProviderInstance.toggleDataSource).toHaveBeenCalledOnce();
      });
    });

    it('should toggle from live to demo mode', async () => {
      mockProviderInstance.getCurrentMode
        .mockReturnValueOnce('live')  // Initial render
        .mockReturnValueOnce('demo'); // After toggle
      
      mockProviderInstance.toggleDataSource.mockResolvedValue(undefined);
      
      render(<DataSourceToggle />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();
      
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockProviderInstance.toggleDataSource).toHaveBeenCalledOnce();
      });
    });

    it('should handle toggle errors gracefully', async () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      mockProviderInstance.toggleDataSource.mockRejectedValue(new Error('Toggle failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<DataSourceToggle />);
      
      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle data source:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Backend Synchronization', () => {
    it('should sync with backend on mount', async () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      
      render(<DataSourceToggle />);
      
      await waitFor(() => {
        expect(mockProviderInstance.syncWithBackend).toHaveBeenCalledOnce();
      });
    });

    it('should handle backend sync errors gracefully', async () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      mockProviderInstance.syncWithBackend.mockRejectedValue(new Error('Sync failed'));
      
      render(<DataSourceToggle />);
      
      // Should not throw error
      await waitFor(() => {
        expect(mockProviderInstance.syncWithBackend).toHaveBeenCalledOnce();
      });
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode', () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      
      render(<DataSourceToggle compact={true} />);
      
      expect(screen.getByText('Demo')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
      
      // Should not show detailed description in compact mode
      expect(screen.queryByText('Using mock automation data for demos')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels', () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('demo');
      
      render(<DataSourceToggle />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Switch to live mode');
    });

    it('should update aria label based on current mode', () => {
      mockProviderInstance.getCurrentMode.mockReturnValue('live');
      
      render(<DataSourceToggle />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Switch to demo mode');
    });
  });
});