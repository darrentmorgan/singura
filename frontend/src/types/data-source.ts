/**
 * Data Source Types
 * Types for data source configuration
 */

export type DataSourceType = 'mock' | 'real';

export interface DataSourceConfig {
  type: DataSourceType;
  enabled: boolean;
  description: string;
}

export interface DataSourceStatus {
  current: DataSourceType;
  available: DataSourceType[];
  canToggle: boolean;
}