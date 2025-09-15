import {
  DataSourceMode,
  DataSourceConfig,
  DEFAULT_DATA_SOURCE_CONFIG,
  validateDataSourceConfig
} from '../types/data-source';
import { 
  AutomationEvent,
  MockDataToggleResponse,
  MockDataToggleRequest
} from '@saas-xray/shared-types';

import { mockAutomationEvents } from '../mocks/automation-events';
import { getDiscoveredAutomations } from './discovery-service';

export class DataProvider {
  private static instance: DataProvider;
  private config: DataSourceConfig;

  private constructor() {
    this.config = this.loadDataSourceConfig();
  }

  public static getInstance(): DataProvider {
    if (!DataProvider.instance) {
      DataProvider.instance = new DataProvider();
    }
    return DataProvider.instance;
  }

  private loadDataSourceConfig(): DataSourceConfig {
    try {
      const storedConfig = localStorage.getItem('dataSourceConfig');
      return storedConfig
        ? validateDataSourceConfig(JSON.parse(storedConfig))
        : DEFAULT_DATA_SOURCE_CONFIG;
    } catch {
      return DEFAULT_DATA_SOURCE_CONFIG;
    }
  }

  private saveDataSourceConfig(config: DataSourceConfig): void {
    localStorage.setItem('dataSourceConfig', JSON.stringify(config));
  }

  public getCurrentMode(): DataSourceMode {
    // Ensure production always uses live mode
    if (process.env.NODE_ENV === 'production') {
      return 'live';
    }
    return this.config.mode;
  }

  public async toggleDataSource(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Data source toggle is disabled in production');
      return;
    }

    const newMode: DataSourceMode = this.config.mode === 'demo' ? 'live' : 'demo';
    
    // Update backend toggle state if in development
    if (import.meta.env.MODE === 'development') {
      try {
        await this.updateBackendToggleState(newMode === 'demo');
      } catch (error) {
        console.warn('Failed to sync with backend toggle state:', error);
      }
    }
    
    this.config = {
      ...this.config,
      mode: newMode,
      lastUpdated: new Date()
    };
    this.saveDataSourceConfig(this.config);
  }

  public async syncWithBackend(): Promise<void> {
    if (import.meta.env.MODE !== 'development') {
      return;
    }

    try {
      const response = await fetch('/api/dev/mock-data-toggle');
      if (response.ok) {
        const data: MockDataToggleResponse = await response.json();
        if (data.success) {
          const backendMode: DataSourceMode = data.state.enabled ? 'demo' : 'live';
          if (backendMode !== this.config.mode) {
            this.config = {
              ...this.config,
              mode: backendMode,
              lastUpdated: new Date()
            };
            this.saveDataSourceConfig(this.config);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to sync with backend toggle state:', error);
    }
  }

  private async updateBackendToggleState(enabled: boolean): Promise<void> {
    const request: MockDataToggleRequest = {
      enabled,
      requestedBy: 'frontend-toggle',
      reason: 'User initiated data source toggle'
    };

    const response = await fetch('/api/dev/mock-data-toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Backend toggle update failed: ${response.statusText}`);
    }
  }

  public async getAutomationEvents(): Promise<AutomationEvent[]> {
    const mode = this.getCurrentMode();

    if (mode === 'demo') {
      return mockAutomationEvents;
    }

    try {
      return await getDiscoveredAutomations();
    } catch (error) {
      console.error('Failed to fetch live automation events', error);
      return mockAutomationEvents; // Fallback to mock data if live fetch fails
    }
  }
}