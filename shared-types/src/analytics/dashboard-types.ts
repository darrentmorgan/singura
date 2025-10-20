/**
 * Executive Dashboard Analytics Types
 * Types for comprehensive dashboard visualizations and analytics
 */

/**
 * Risk trend data for time-series chart
 */
export interface RiskTrendData {
  labels: string[]; // Date labels for x-axis
  datasets: RiskTrendDataset[];
  averageRiskScore: number[];
  timeRange: 'week' | 'month' | 'quarter';
}

export interface RiskTrendDataset {
  label: 'Critical' | 'High' | 'Medium' | 'Low';
  data: number[]; // Count of automations per risk level
  color: string; // Hex color for chart line
}

/**
 * Platform distribution for pie chart
 */
export interface PlatformDistribution {
  platform: 'slack' | 'google' | 'microsoft' | string;
  count: number;
  percentage: number;
  highRiskCount: number;
  color: string; // Hex color for pie segment
}

/**
 * Automation growth data for area chart
 */
export interface GrowthData {
  labels: string[]; // Date labels
  newAutomations: number[]; // Daily new automations
  cumulativeAutomations: number[]; // Running total
  growthRate: number; // Percentage growth rate
}

/**
 * Top risk automation for table display
 */
export interface TopRisk {
  id: string;
  name: string;
  platform: string;
  type: string; // automation_type
  riskLevel: 'critical' | 'high';
  riskScore: number; // 0-100
  detectedAt: string; // ISO date string
  affectedUsers: number;
  status: 'active' | 'inactive' | 'paused' | 'error' | 'unknown';
  actions?: string[]; // Available actions
}

/**
 * Summary statistics for dashboard cards
 */
export interface SummaryStats {
  totalAutomations: number;
  criticalCount: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  activeCount: number;
  averageRiskScore: number;
  platformCount: number;
  totalAffectedUsers: number;
  // Trend indicators (optional)
  trendsComparedToLastPeriod?: {
    totalAutomationsChange: number; // Percentage
    criticalCountChange: number;
    riskScoreChange: number;
  };
}

/**
 * Time range options for analytics queries
 */
export type AnalyticsTimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Analytics API response wrapper
 */
export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    generatedAt: string;
    organizationId: string;
    timeRange?: AnalyticsTimeRange;
    cached?: boolean;
  };
  error?: string;
}

/**
 * Chart export options
 */
export interface ChartExportOptions {
  format: 'png' | 'svg' | 'csv' | 'json';
  filename?: string;
  quality?: number; // For PNG export
}

/**
 * Dashboard filter options
 */
export interface DashboardFilters {
  timeRange?: AnalyticsTimeRange;
  platforms?: string[];
  riskLevels?: ('critical' | 'high' | 'medium' | 'low')[];
  statuses?: ('active' | 'inactive' | 'paused' | 'error' | 'unknown')[];
  searchQuery?: string;
}

/**
 * Real-time update event for dashboard
 */
export interface DashboardUpdateEvent {
  type: 'risk_change' | 'new_automation' | 'status_change' | 'stats_update';
  data: any;
  timestamp: string;
}

/**
 * Heat map data for risk visualization
 */
export interface RiskHeatMapData {
  platforms: string[];
  riskLevels: ('critical' | 'high' | 'medium' | 'low')[];
  data: number[][]; // 2D array of counts [platform][riskLevel]
}

/**
 * Automation type distribution
 */
export interface AutomationTypeDistribution {
  type: string;
  count: number;
  percentage: number;
  averageRiskScore: number;
}