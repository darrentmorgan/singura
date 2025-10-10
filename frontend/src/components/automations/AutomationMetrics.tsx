/**
 * Automation Metrics Component
 * Displays key metrics and visualizations for discovered automations
 */

import React, { useEffect } from 'react';
import {
  Bot,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Workflow,
  Webhook,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  BarChart3,
  PieChart
} from 'lucide-react';

import {
  useAutomationsStats,
  useAutomationsActions
} from '@/stores/automations';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  variant = 'default',
  description
}) => {
  const variants = {
    default: 'bg-card border',
    success: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
    danger: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
  };

  return (
    <div className={cn("rounded-lg p-6 transition-all duration-200 hover:shadow-md", variants[variant])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground" data-testid="metric-value">{value}</p>
          </div>
        </div>
        
        {change !== undefined && (
          <div className={cn(
            "flex items-center space-x-1 text-sm font-medium",
            change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground"
          )}>
            {change > 0 ? <TrendingUp className="h-4 w-4" /> : change < 0 ? <TrendingDown className="h-4 w-4" /> : null}
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
      
      {description && (
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
};

interface AutomationMetricsProps {
  className?: string;
}

export const AutomationMetrics: React.FC<AutomationMetricsProps> = ({
  className
}) => {
  const stats = useAutomationsStats();

  const { fetchAutomationStats } = useAutomationsActions();

  useEffect(() => {
    fetchAutomationStats();
  }, [fetchAutomationStats]);

  if (!stats) {
    return (
      <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-4", className)}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div>
                <div className="w-20 h-4 bg-muted rounded mb-2"></div>
                <div className="w-16 h-6 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeRate = stats.totalAutomations > 0 ? 
    Math.round((stats.byStatus.active / stats.totalAutomations) * 100) : 0;
  
  const highRiskRate = stats.totalAutomations > 0 ? 
    Math.round(((stats.byRiskLevel.high + stats.byRiskLevel.critical) / stats.totalAutomations) * 100) : 0;

  return (
    <div className={cn("space-y-6", className)} data-testid="stats-cards">
      {/* Primary Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div data-testid="total-automations-card">
          <MetricCard
            title="Total Automations"
            value={stats.totalAutomations}
            icon={<Bot className="h-8 w-8 text-blue-500" />}
            description={`Across ${(Object.keys(stats.byPlatform) as Array<keyof typeof stats.byPlatform>).filter(p => stats.byPlatform[p] > 0).length} platforms`}
          />
        </div>
        
        <div data-testid="high-risk-card">
          <MetricCard
            title="High Risk"
            value={stats.byRiskLevel.high + stats.byRiskLevel.critical}
            icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
            variant={stats.byRiskLevel.high + stats.byRiskLevel.critical > 0 ? 'danger' : 'default'}
            description={`${highRiskRate}% of total automations`}
          />
        </div>
        
        <div data-testid="active-connections-card">
          <MetricCard
            title="Active"
            value={stats.byStatus.active}
            icon={<CheckCircle className="h-8 w-8 text-green-500" />}
            variant="success"
            description={`${activeRate}% operational rate`}
          />
        </div>
        
        <div data-testid="new-discoveries-card">
          <MetricCard
            title="Errors"
            value={stats.byStatus.error}
            icon={<XCircle className="h-8 w-8 text-red-500" />}
            variant={stats.byStatus.error > 0 ? 'warning' : 'default'}
            description="Requiring attention"
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Bots"
          value={stats.byType.bot}
          icon={<Bot className="h-6 w-6 text-purple-500" />}
          description="AI agents and chatbots"
        />
        
        <MetricCard
          title="Workflows"
          value={stats.byType.workflow}
          icon={<Workflow className="h-6 w-6 text-blue-500" />}
          description="Automated processes"
        />
        
        <MetricCard
          title="Integrations"
          value={stats.byType.integration}
          icon={<Zap className="h-6 w-6 text-yellow-500" />}
          description="Connected services"
        />
        
        <MetricCard
          title="Webhooks"
          value={stats.byType.webhook}
          icon={<Webhook className="h-6 w-6 text-green-500" />}
          description="Event triggers"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card border rounded-lg p-6" data-testid="automations-chart">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Automations Trend</h3>
          </div>
          {/* Placeholder chart */}
          <div className="h-48 flex items-center justify-center bg-muted/20 rounded-lg">
            <svg width="200" height="120" data-testid="chart-svg">
              <path d="M20,100 L60,80 L100,60 L140,40 L180,20" stroke="#3b82f6" strokeWidth="2" fill="none"/>
              <circle cx="20" cy="100" r="3" fill="#3b82f6"/>
              <circle cx="60" cy="80" r="3" fill="#3b82f6"/>
              <circle cx="100" cy="60" r="3" fill="#3b82f6"/>
              <circle cx="140" cy="40" r="3" fill="#3b82f6"/>
              <circle cx="180" cy="20" r="3" fill="#3b82f6"/>
            </svg>
          </div>
        </div>
        
        <div className="bg-card border rounded-lg p-6" data-testid="risk-score-chart">
          <div className="flex items-center space-x-2 mb-4">
            <PieChart className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Risk Score Distribution</h3>
          </div>
          {/* Placeholder chart */}
          <div className="h-48 flex items-center justify-center bg-muted/20 rounded-lg">
            <svg width="120" height="120" data-testid="chart-svg">
              <circle cx="60" cy="60" r="50" fill="#22c55e" strokeWidth="2" strokeDasharray="157 314" transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="50" fill="#eab308" strokeWidth="2" strokeDasharray="78 314" strokeDashoffset="-157" transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="50" fill="#ef4444" strokeWidth="2" strokeDasharray="79 314" strokeDashoffset="-235" transform="rotate(-90 60 60)"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Risk Analysis Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Risk Distribution</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Critical</span>
              </div>
              <span className="text-sm font-medium text-foreground">{stats.byRiskLevel.critical}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">High</span>
              </div>
              <span className="text-sm font-medium text-foreground">{stats.byRiskLevel.high}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Medium</span>
              </div>
              <span className="text-sm font-medium text-foreground">{stats.byRiskLevel.medium}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Low</span>
              </div>
              <span className="text-sm font-medium text-foreground">{stats.byRiskLevel.low}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Platform Distribution</h3>
          </div>
          
          <div className="space-y-3">
            {Object.entries(stats.byPlatform)
              .filter(([_, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{platform}</span>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Health Summary</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Active Rate</span>
                <span className="font-medium text-foreground">{activeRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${activeRate}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Risk Level</span>
                <span className="font-medium text-foreground">{100 - highRiskRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    highRiskRate > 50 ? "bg-red-500" : 
                    highRiskRate > 25 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${100 - highRiskRate}%` }}
                ></div>
              </div>
            </div>
            
            {stats.averageRiskScore && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Avg Risk Score</span>
                  <span className="font-medium text-foreground">{stats.averageRiskScore.toFixed(1)}/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      stats.averageRiskScore > 70 ? "bg-red-500" : 
                      stats.averageRiskScore > 40 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${stats.averageRiskScore}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationMetrics;