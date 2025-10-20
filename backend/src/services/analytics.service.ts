/**
 * Analytics Service for Executive Dashboard
 * Provides comprehensive analytics data for executive-level visualizations
 */

import { db } from '../database/pool';
import {
  RiskTrendData,
  RiskTrendDataset,
  PlatformDistribution,
  GrowthData,
  TopRisk,
  SummaryStats,
  AnalyticsTimeRange,
  RiskHeatMapData,
  AutomationTypeDistribution
} from '@singura/shared-types';

// Type definitions for query results
interface RiskTrendRow {
  date: Date;
  critical_count: string;
  high_count: string;
  medium_count: string;
  low_count: string;
  avg_risk_score: string;
}

interface PlatformDistributionRow {
  platform: string;
  count: string;
  high_risk_count: string;
}

interface GrowthDataRow {
  date: Date;
  new_automations: string;
  cumulative_automations: string;
}

interface TopRiskRow {
  id: string;
  automation_name: string;
  platform: string;
  automation_type: string;
  risk_level: string;
  risk_score: number;
  detected_at: Date;
  affected_users: string;
  status: string;
}

interface SummaryStatsRow {
  total_automations: string;
  critical_count: string;
  high_count: string;
  medium_count: string;
  low_count: string;
  active_count: string;
  avg_risk_score: string;
  platform_count: string;
  total_affected_users: string;
  total_change: string;
  critical_change: string;
  risk_change: string;
}

interface RiskHeatMapRow {
  platform: string;
  risk_level: string;
  count: string;
}

interface AutomationTypeRow {
  type: string;
  count: string;
  avg_risk_score: string;
}

export class AnalyticsService {

  /**
   * Get risk trend data for time-series chart
   */
  async getRiskTrends(
    organizationId: string,
    timeRange: 'week' | 'month' | 'quarter' = 'week'
  ): Promise<RiskTrendData> {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ),
      risk_counts AS (
        SELECT
          DATE(ra.assessed_at) as date,
          ra.risk_level,
          COUNT(*) as count,
          AVG(ra.risk_score) as avg_score
        FROM risk_assessments ra
        INNER JOIN discovered_automations da ON da.id = ra.automation_id
        WHERE da.organization_id = $1
          AND ra.assessed_at >= CURRENT_DATE - INTERVAL '${days} days'
          AND da.is_active = true
        GROUP BY DATE(ra.assessed_at), ra.risk_level
      )
      SELECT
        ds.date,
        COALESCE(SUM(CASE WHEN rc.risk_level = 'critical' THEN rc.count END), 0) as critical_count,
        COALESCE(SUM(CASE WHEN rc.risk_level = 'high' THEN rc.count END), 0) as high_count,
        COALESCE(SUM(CASE WHEN rc.risk_level = 'medium' THEN rc.count END), 0) as medium_count,
        COALESCE(SUM(CASE WHEN rc.risk_level = 'low' THEN rc.count END), 0) as low_count,
        COALESCE(AVG(rc.avg_score), 0) as avg_risk_score
      FROM date_series ds
      LEFT JOIN risk_counts rc ON ds.date = rc.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `;

    const result = await db.query<RiskTrendRow>(query, [organizationId]);

    const labels = result.rows.map(row => new Date(row.date).toLocaleDateString());

    const datasets: RiskTrendDataset[] = [
      {
        label: 'Critical',
        data: result.rows.map(row => parseInt(row.critical_count)),
        color: '#ef4444'
      },
      {
        label: 'High',
        data: result.rows.map(row => parseInt(row.high_count)),
        color: '#f97316'
      },
      {
        label: 'Medium',
        data: result.rows.map(row => parseInt(row.medium_count)),
        color: '#eab308'
      },
      {
        label: 'Low',
        data: result.rows.map(row => parseInt(row.low_count)),
        color: '#22c55e'
      }
    ];

    return {
      labels,
      datasets,
      averageRiskScore: result.rows.map(row => parseFloat(row.avg_risk_score)),
      timeRange
    };
  }

  /**
   * Get platform distribution for pie chart
   */
  async getPlatformDistribution(organizationId: string): Promise<PlatformDistribution[]> {
    const query = `
      SELECT
        pc.platform_type as platform,
        COUNT(DISTINCT da.id) as count,
        SUM(CASE WHEN ra.risk_level IN ('critical', 'high') THEN 1 ELSE 0 END) as high_risk_count
      FROM discovered_automations da
      INNER JOIN platform_connections pc ON pc.id = da.platform_connection_id
      LEFT JOIN risk_assessments ra ON ra.automation_id = da.id
      WHERE da.organization_id = $1
        AND da.is_active = true
        AND da.first_discovered_at >= NOW() - INTERVAL '30 days'
      GROUP BY pc.platform_type
      ORDER BY count DESC
    `;

    const result = await db.query<PlatformDistributionRow>(query, [organizationId]);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

    return result.rows.map(row => ({
      platform: row.platform,
      count: parseInt(row.count),
      percentage: total > 0 ? (parseInt(row.count) / total) * 100 : 0,
      highRiskCount: parseInt(row.high_risk_count) || 0,
      color: this.getPlatformColor(row.platform)
    }));
  }

  /**
   * Get automation growth data for area chart
   */
  async getAutomationGrowth(
    organizationId: string,
    days: number = 30
  ): Promise<GrowthData> {
    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ),
      daily_counts AS (
        SELECT
          DATE(first_discovered_at) as date,
          COUNT(*) as new_automations
        FROM discovered_automations
        WHERE organization_id = $1
          AND first_discovered_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(first_discovered_at)
      )
      SELECT
        ds.date,
        COALESCE(dc.new_automations, 0) as new_automations,
        SUM(COALESCE(dc.new_automations, 0)) OVER (ORDER BY ds.date) as cumulative_automations
      FROM date_series ds
      LEFT JOIN daily_counts dc ON ds.date = dc.date
      ORDER BY ds.date ASC
    `;

    const result = await db.query<GrowthDataRow>(query, [organizationId]);

    const labels = result.rows.map(row => new Date(row.date).toLocaleDateString());
    const newAutomations = result.rows.map(row => parseInt(row.new_automations));
    const cumulativeAutomations = result.rows.map(row => parseInt(row.cumulative_automations));

    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(cumulativeAutomations);

    return {
      labels,
      newAutomations,
      cumulativeAutomations,
      growthRate
    };
  }

  /**
   * Get top risks for sortable table
   */
  async getTopRisks(
    organizationId: string,
    limit: number = 10
  ): Promise<TopRisk[]> {
    const query = `
      SELECT
        da.id,
        da.name as automation_name,
        pc.platform_type as platform,
        da.automation_type,
        ra.risk_level,
        ra.risk_score,
        da.first_discovered_at as detected_at,
        da.status,
        COALESCE(
          jsonb_array_length(da.platform_metadata->'affected_users'),
          0
        ) as affected_users
      FROM discovered_automations da
      INNER JOIN platform_connections pc ON pc.id = da.platform_connection_id
      INNER JOIN risk_assessments ra ON ra.automation_id = da.id
      WHERE da.organization_id = $1
        AND ra.risk_level IN ('critical', 'high')
        AND da.is_active = true
      ORDER BY
        CASE ra.risk_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
        END,
        ra.risk_score DESC,
        da.first_discovered_at DESC
      LIMIT $2
    `;

    const result = await db.query<TopRiskRow>(query, [organizationId, limit]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.automation_name,
      platform: row.platform,
      type: row.automation_type,
      riskLevel: row.risk_level as 'critical' | 'high',
      riskScore: row.risk_score,
      detectedAt: row.detected_at.toISOString(),
      affectedUsers: parseInt(row.affected_users) || 0,
      status: row.status as any,
      actions: ['view', 'assess', 'remediate'] // Available actions
    }));
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(organizationId: string): Promise<SummaryStats> {
    const query = `
      WITH current_stats AS (
        SELECT
          COUNT(DISTINCT da.id) as total_automations,
          SUM(CASE WHEN ra.risk_level = 'critical' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN ra.risk_level = 'high' THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN ra.risk_level = 'medium' THEN 1 ELSE 0 END) as medium_count,
          SUM(CASE WHEN ra.risk_level = 'low' THEN 1 ELSE 0 END) as low_count,
          SUM(CASE WHEN da.status = 'active' THEN 1 ELSE 0 END) as active_count,
          AVG(ra.risk_score) as avg_risk_score,
          COUNT(DISTINCT pc.platform_type) as platform_count
        FROM discovered_automations da
        LEFT JOIN risk_assessments ra ON ra.automation_id = da.id
        LEFT JOIN platform_connections pc ON pc.id = da.platform_connection_id
        WHERE da.organization_id = $1
          AND da.is_active = true
      ),
      previous_period AS (
        SELECT
          COUNT(DISTINCT da.id) as prev_total,
          SUM(CASE WHEN ra.risk_level = 'critical' THEN 1 ELSE 0 END) as prev_critical,
          AVG(ra.risk_score) as prev_avg_risk
        FROM discovered_automations da
        LEFT JOIN risk_assessments ra ON ra.automation_id = da.id
        WHERE da.organization_id = $1
          AND da.first_discovered_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
      ),
      affected_users AS (
        SELECT
          SUM(
            COALESCE(
              jsonb_array_length(da.platform_metadata->'affected_users'),
              0
            )
          ) as total_affected_users
        FROM discovered_automations da
        WHERE da.organization_id = $1
          AND da.is_active = true
      )
      SELECT
        cs.*,
        au.total_affected_users,
        CASE
          WHEN pp.prev_total > 0 THEN
            ((cs.total_automations - pp.prev_total)::float / pp.prev_total * 100)
          ELSE 0
        END as total_change,
        CASE
          WHEN pp.prev_critical > 0 THEN
            ((cs.critical_count - pp.prev_critical)::float / pp.prev_critical * 100)
          ELSE 0
        END as critical_change,
        CASE
          WHEN pp.prev_avg_risk > 0 THEN
            ((cs.avg_risk_score - pp.prev_avg_risk) / pp.prev_avg_risk * 100)
          ELSE 0
        END as risk_change
      FROM current_stats cs, previous_period pp, affected_users au
    `;

    const result = await db.query<SummaryStatsRow>(query, [organizationId]);
    const row = result.rows[0];

    if (!row) {
      throw new Error('No summary statistics returned from database');
    }

    return {
      totalAutomations: parseInt(row.total_automations) || 0,
      criticalCount: parseInt(row.critical_count) || 0,
      highCount: parseInt(row.high_count) || 0,
      mediumCount: parseInt(row.medium_count) || 0,
      lowCount: parseInt(row.low_count) || 0,
      activeCount: parseInt(row.active_count) || 0,
      averageRiskScore: parseFloat(row.avg_risk_score) || 0,
      platformCount: parseInt(row.platform_count) || 0,
      totalAffectedUsers: parseInt(row.total_affected_users) || 0,
      trendsComparedToLastPeriod: {
        totalAutomationsChange: parseFloat(row.total_change) || 0,
        criticalCountChange: parseFloat(row.critical_change) || 0,
        riskScoreChange: parseFloat(row.risk_change) || 0
      }
    };
  }

  /**
   * Get risk heat map data
   */
  async getRiskHeatMap(organizationId: string): Promise<RiskHeatMapData> {
    const query = `
      SELECT
        pc.platform_type as platform,
        ra.risk_level,
        COUNT(*) as count
      FROM discovered_automations da
      INNER JOIN platform_connections pc ON pc.id = da.platform_connection_id
      INNER JOIN risk_assessments ra ON ra.automation_id = da.id
      WHERE da.organization_id = $1
        AND da.is_active = true
      GROUP BY pc.platform_type, ra.risk_level
      ORDER BY pc.platform_type, ra.risk_level
    `;

    const result = await db.query<RiskHeatMapRow>(query, [organizationId]);

    // Get unique platforms and risk levels
    const platforms = Array.from(new Set(result.rows.map(r => r.platform)));
    const riskLevels: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];

    // Build 2D array
    const data: number[][] = platforms.map(platform =>
      riskLevels.map(level => {
        const row = result.rows.find(r => r.platform === platform && r.risk_level === level);
        return row ? parseInt(row.count) : 0;
      })
    );

    return {
      platforms,
      riskLevels,
      data
    };
  }

  /**
   * Get automation type distribution
   */
  async getAutomationTypeDistribution(organizationId: string): Promise<AutomationTypeDistribution[]> {
    const query = `
      SELECT
        da.automation_type as type,
        COUNT(*) as count,
        AVG(ra.risk_score) as avg_risk_score
      FROM discovered_automations da
      LEFT JOIN risk_assessments ra ON ra.automation_id = da.id
      WHERE da.organization_id = $1
        AND da.is_active = true
      GROUP BY da.automation_type
      ORDER BY count DESC
    `;

    const result = await db.query<AutomationTypeRow>(query, [organizationId]);
    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

    return result.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count),
      percentage: total > 0 ? (parseInt(row.count) / total) * 100 : 0,
      averageRiskScore: parseFloat(row.avg_risk_score) || 0
    }));
  }

  /**
   * Helper method to get platform color
   */
  private getPlatformColor(platform: string): string {
    const colors: Record<string, string> = {
      'slack': '#4A154B',
      'google': '#4285F4',
      'microsoft': '#00A4EF',
      'github': '#181717',
      'jira': '#0052CC',
      'salesforce': '#00A1E0'
    };
    return colors[platform.toLowerCase()] || '#6B7280';
  }

  /**
   * Helper method to calculate growth rate
   */
  private calculateGrowthRate(cumulativeValues: number[]): number {
    if (cumulativeValues.length < 2) return 0;

    const first = cumulativeValues[0];
    const last = cumulativeValues[cumulativeValues.length - 1];

    if (first === undefined || last === undefined) return 0;

    if (first === 0) return last > 0 ? 100 : 0;

    return ((last - first) / first) * 100;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();