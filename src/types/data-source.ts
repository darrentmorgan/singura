// @saas-xray/shared-types: Data Source Configuration

export type DataSourceMode = 'demo' | 'live';

export interface DataSourceConfig {
  mode: DataSourceMode;
  lastUpdated: Date;
  allowMockData: boolean;
}

export interface DataSourceToggleProps {
  currentMode: DataSourceMode;
  onToggle: (newMode: DataSourceMode) => void;
}

export const DEFAULT_DATA_SOURCE_CONFIG: DataSourceConfig = {
  mode: 'demo',
  lastUpdated: new Date(),
  allowMockData: true
};

export function isValidDataSourceMode(mode: string): mode is DataSourceMode {
  return ['demo', 'live'].includes(mode);
}

export function validateDataSourceConfig(config: Partial<DataSourceConfig>): DataSourceConfig {
  return {
    mode: config.mode ?? DEFAULT_DATA_SOURCE_CONFIG.mode,
    lastUpdated: config.lastUpdated ?? new Date(),
    allowMockData: config.allowMockData ?? DEFAULT_DATA_SOURCE_CONFIG.allowMockData
  };
}