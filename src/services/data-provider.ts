import {
  DataSourceMode,
  DataSourceConfig,
  DEFAULT_DATA_SOURCE_CONFIG,
  validateDataSourceConfig
} from '../types/data-source';
import { AutomationEvent } from '@saas-xray/shared-types';

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

  public toggleDataSource(): void {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Data source toggle is disabled in production');
      return;
    }

    const newMode: DataSourceMode = this.config.mode === 'demo' ? 'live' : 'demo';
    this.config = {
      ...this.config,
      mode: newMode,
      lastUpdated: new Date()
    };
    this.saveDataSourceConfig(this.config);
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