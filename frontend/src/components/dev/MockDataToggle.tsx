/**
 * Mock Data Toggle Component
 * Development-only UI component for toggling mock data at runtime
 * COMPLETELY HIDDEN IN PRODUCTION
 */

import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { 
  MockDataToggleState, 
  MockDataToggleResponse,
  MockDataToggleRequest 
} from '@singura/shared-types';

interface MockDataToggleProps {
  className?: string;
}

// SECURITY: Component only renders in development
const isDevelopment = import.meta.env.MODE === 'development';

export const MockDataToggle: React.FC<MockDataToggleProps> = ({ className }) => {
  const [toggleState, setToggleState] = useState<MockDataToggleState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load initial toggle state (only in development, but hook must be called unconditionally)
  useEffect(() => {
    if (isDevelopment) {
      loadToggleState();
    }
  }, []);

  // SECURITY: Don't render anything in production
  if (!isDevelopment) {
    return null;
  }

  const loadToggleState = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dev/mock-data-toggle');
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Development toggle not available (production mode)');
        }
        throw new Error(`Failed to load toggle state: ${response.statusText}`);
      }

      const data: MockDataToggleResponse = await response.json();
      
      if (data.success) {
        setToggleState(data.state);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to load toggle state');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Mock data toggle load error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateToggleState = async (enabled: boolean): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const requestBody: MockDataToggleRequest = {
        enabled,
        requestedBy: 'frontend-user',
        reason: enabled ? 'Enable mock data for development' : 'Switch to real data for testing'
      };

      const response = await fetch('/api/dev/mock-data-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to update toggle state: ${response.statusText}`);
      }

      const data: MockDataToggleResponse = await response.json();
      
      if (data.success) {
        setToggleState(data.state);
        setLastUpdated(new Date());
        
        // Trigger page reload to apply new data provider
        window.location.reload();
      } else {
        throw new Error('Failed to update toggle state');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Mock data toggle update error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (): string => {
    if (!toggleState) return 'text-gray-500';
    return toggleState.enabled ? 'text-blue-600' : 'text-green-600';
  };

  const getStatusText = (): string => {
    if (!toggleState) return 'Loading...';
    return toggleState.enabled ? 'Mock Data Active' : 'Real Data Active';
  };

  return (
    <div className={`bg-card border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-foreground">Data Source</h3>
          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
            DEV ONLY
          </span>
        </div>
        
        <Button
          onClick={loadToggleState}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="border-gray-300 hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            {toggleState?.enabled ? (
              <Database className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>

        {toggleState && (
          <Switch
            checked={toggleState.enabled}
            onCheckedChange={updateToggleState}
            disabled={isLoading}
            className="data-[state=checked]:bg-blue-600"
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Status Details */}
      {toggleState && (
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-gray-100">
          <div className="flex justify-between">
            <span>Environment:</span>
            <span className="font-medium">{toggleState.environment}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Modified:</span>
            <span className="font-medium">
              {toggleState.lastModified ? new Date(toggleState.lastModified).toLocaleTimeString() : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Modified By:</span>
            <span className="font-medium">{toggleState.modifiedBy || 'Unknown'}</span>
          </div>
          {lastUpdated && (
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span className="font-medium">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="text-xs text-muted-foreground">
        <p>
          Toggle between mock data (comprehensive demo scenarios) and real data 
          (live integrations). Changes take effect immediately.
        </p>
      </div>
    </div>
  );
};

export default MockDataToggle;