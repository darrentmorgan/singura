/**
 * Executive Dashboard Component
 * Comprehensive dashboard with analytics visualizations for board-level reporting
 */

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  RiskTrendData,
  PlatformDistribution,
  GrowthData,
  TopRisk,
  SummaryStats,
  AnalyticsResponse
} from '@singura/shared-types';
import { useAuth } from '@clerk/clerk-react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Activity,
  Users,
  Download,
  RefreshCw,
  Calendar,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Loading skeleton component
const DashboardSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-gray-200 rounded-lg h-80"></div>
      <div className="bg-gray-200 rounded-lg h-80"></div>
    </div>
    <div className="bg-gray-200 rounded-lg h-96"></div>
  </div>
);

// Statistics card component
interface StatCardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  color?: 'blue' | 'red' | 'green' | 'yellow';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200'
  };

  const trendColorClasses = trend && trend > 0 ? 'text-red-500' : 'text-green-500';

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trendColorClasses}`}>
              {trend > 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className="opacity-75">{icon}</div>
      </div>
    </div>
  );
};

// Top risks table component
interface TopRisksTableProps {
  risks: TopRisk[];
  onRiskClick?: (risk: TopRisk) => void;
}

const TopRisksTable: React.FC<TopRisksTableProps> = ({ risks, onRiskClick }) => {
  const getRiskLevelColor = (level: string) => {
    return level === 'critical' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Automation
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Platform
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Affected Users
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {risks.map((risk) => (
            <tr
              key={risk.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onRiskClick?.(risk)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{risk.name}</div>
                <div className="text-sm text-gray-500">{risk.type}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">{risk.platform}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(risk.riskLevel)}`}>
                  {risk.riskLevel.toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${risk.riskScore}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{risk.riskScore}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {risk.affectedUsers}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  risk.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {risk.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main Executive Dashboard Component
export const ExecutiveDashboard: React.FC = () => {
  const { getToken } = useAuth();
  const [riskTrends, setRiskTrends] = useState<RiskTrendData | null>(null);
  const [platformDist, setPlatformDist] = useState<PlatformDistribution[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [topRisks, setTopRisks] = useState<TopRisk[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = await getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [trendsRes, platformRes, growthRes, risksRes, statsRes] = await Promise.all([
        fetch(`/api/analytics/risk-trends?timeRange=${timeRange}`, { headers }),
        fetch('/api/analytics/platform-distribution', { headers }),
        fetch('/api/analytics/automation-growth?days=30', { headers }),
        fetch('/api/analytics/top-risks?limit=10', { headers }),
        fetch('/api/analytics/summary', { headers })
      ]);

      if (!trendsRes.ok || !platformRes.ok || !growthRes.ok || !risksRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [trends, platforms, growth, risks, stats] = await Promise.all([
        trendsRes.json() as Promise<AnalyticsResponse<RiskTrendData>>,
        platformRes.json() as Promise<AnalyticsResponse<PlatformDistribution[]>>,
        growthRes.json() as Promise<AnalyticsResponse<GrowthData>>,
        risksRes.json() as Promise<AnalyticsResponse<TopRisk[]>>,
        statsRes.json() as Promise<AnalyticsResponse<SummaryStats>>
      ]);

      setRiskTrends(trends.data);
      setPlatformDist(platforms.data);
      setGrowthData(growth.data);
      setTopRisks(risks.data);
      setSummaryStats(stats.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchAnalyticsData(true);
  };

  const handleExportData = () => {
    // Export data as CSV
    const csvData = topRisks.map(risk => ({
      Name: risk.name,
      Platform: risk.platform,
      Type: risk.type,
      'Risk Level': risk.riskLevel,
      'Risk Score': risk.riskScore,
      'Affected Users': risk.affectedUsers,
      Status: risk.status
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `singura-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => fetchAnalyticsData()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare chart data
  const chartData = riskTrends?.labels.map((label, index) => ({
    date: label,
    critical: riskTrends.datasets[0].data[index],
    high: riskTrends.datasets[1].data[index],
    medium: riskTrends.datasets[2].data[index],
    low: riskTrends.datasets[3].data[index],
    avgScore: riskTrends.averageRiskScore[index]
  })) || [];

  const growthChartData = growthData?.labels.map((label, index) => ({
    date: label,
    new: growthData.newAutomations[index],
    cumulative: growthData.cumulativeAutomations[index]
  })) || [];

  return (
    <div className="executive-dashboard space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time security analytics and risk monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="quarter">Past Quarter</option>
          </select>
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Automations"
          value={summaryStats?.totalAutomations || 0}
          trend={summaryStats?.trendsComparedToLastPeriod?.totalAutomationsChange}
          icon={<Activity className="w-8 h-8" />}
          color="blue"
        />
        <StatCard
          title="Critical Risks"
          value={summaryStats?.criticalCount || 0}
          trend={summaryStats?.trendsComparedToLastPeriod?.criticalCountChange}
          icon={<AlertTriangle className="w-8 h-8" />}
          color="red"
        />
        <StatCard
          title="Active Automations"
          value={summaryStats?.activeCount || 0}
          icon={<Shield className="w-8 h-8" />}
          color="green"
        />
        <StatCard
          title="Affected Users"
          value={summaryStats?.totalAffectedUsers || 0}
          icon={<Users className="w-8 h-8" />}
          color="yellow"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Trend Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="critical"
                stroke="#ef4444"
                strokeWidth={2}
                name="Critical"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="high"
                stroke="#f97316"
                strokeWidth={2}
                name="High"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="medium"
                stroke="#eab308"
                strokeWidth={2}
                name="Medium"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="low"
                stroke="#22c55e"
                strokeWidth={2}
                name="Low"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Platform Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={platformDist}
                dataKey="count"
                nameKey="platform"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.platform} (${entry.percentage.toFixed(1)}%)`}
              >
                {platformDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center mt-4 gap-4">
            {platformDist.map((platform) => (
              <div key={platform.platform} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: platform.color }}
                />
                <span className="text-sm text-gray-600">
                  {platform.platform}: {platform.count} ({platform.highRiskCount} high risk)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Automation Growth</h3>
          {growthData && (
            <div className="flex items-center text-sm">
              <span className="text-gray-600 mr-2">Growth Rate:</span>
              <span className={`font-semibold ${growthData.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthData.growthRate > 0 ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                {Math.abs(growthData.growthRate).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={growthChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              name="Total Automations"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="new"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
              name="New Automations"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Risks Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Risk Automations</h3>
          <span className="text-sm text-gray-600">
            Showing {topRisks.length} highest risk items
          </span>
        </div>
        <TopRisksTable
          risks={topRisks}
          onRiskClick={(risk) => {
            // Navigate to automation details
            window.location.href = `/automations/${risk.id}`;
          }}
        />
      </div>

      {/* Average Risk Score */}
      {summaryStats && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Score Overview</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {summaryStats.averageRiskScore.toFixed(1)}
              </p>
              <p className="text-gray-600">Average Risk Score</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{summaryStats.criticalCount}</p>
                <p className="text-sm text-gray-600">Critical</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{summaryStats.highCount}</p>
                <p className="text-sm text-gray-600">High</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{summaryStats.mediumCount}</p>
                <p className="text-sm text-gray-600">Medium</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{summaryStats.lowCount}</p>
                <p className="text-sm text-gray-600">Low</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};