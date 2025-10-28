/**
 * Dashboard Page
 * Main dashboard with overview metrics, platform connections, and recent activity
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Activity,
  AlertTriangle,
  Bot,
  Link2,
  ChevronRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import AutomationMetrics from '@/components/automations/AutomationMetrics';
import AutomationsList from '@/components/automations/AutomationsList';
import { useConnections, useConnectionsActions } from '@/stores/connections';
import { useAutomations, useAutomationsActions } from '@/stores/automations';
import { useAuthUser } from '@/stores/auth';
import { useUIActions } from '@/stores/ui';
import { cn } from '@/lib/utils';
import { PDFGenerator } from '@/components/reports/PDFGenerator';

// Platform icons
const platformIcons = {
  slack: '💬',
  google: '🌐',
  microsoft: '💼',
  hubspot: '🎯',
  salesforce: '☁️',
  notion: '📝',
  asana: '✅',
  jira: '🔧',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthUser();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Store state
  const connections = useConnections();
  const automations = useAutomations();

  // Actions
  const { fetchConnections, fetchConnectionStats } = useConnectionsActions();
  const { fetchAutomations, fetchAutomationStats } = useAutomationsActions();
  const { showError } = useUIActions();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchConnections(),
          fetchConnectionStats(),
          fetchAutomations(),
          fetchAutomationStats()
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, action functions are stable

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleConnectPlatform = () => {
    navigate('/connections');
  };

  const handleViewAutomations = () => {
    navigate('/automations');
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex-1 space-y-8 p-6" data-testid="dashboard-content">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground" data-testid="welcome-message">
          {getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your automation landscape today.
        </p>
      </div>

      {/* Automation Metrics */}
      <AutomationMetrics />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Connections */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Platform Connections</h2>
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={handleConnectPlatform} className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Connect Platform
              </Button>
            </div>
          </div>

          {connections.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Link2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">No platforms connected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your first platform to start discovering automations
                </p>
              </div>
              <Button onClick={handleConnectPlatform} className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Platform
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.slice(0, 5).map((connection) => (
                <div 
                  key={connection.id}
                  className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  onClick={() => navigate(`/connections/${connection.id}`)}
                >
                  <div className="text-2xl">
                    {platformIcons[connection.platform_type] || '🔗'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {connection.display_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {connection.platform_type} • {connection.status}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      connection.status === 'active' ? "bg-green-500" :
                      connection.status === 'error' ? "bg-red-500" : "bg-yellow-500"
                    )} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              
              {connections.length > 5 && (
                <Link
                  to="/connections"
                  className="block text-center py-3 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  View all {connections.length} connections
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card border rounded-lg p-6" data-testid="recent-activity">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {/* Mock activity items */}
            <div className="flex items-start space-x-3" data-testid="activity-item">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Link2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground" data-testid="activity-description">
                  <span className="font-medium">Slack</span> connection established
                </p>
                <p className="text-xs text-muted-foreground" data-testid="activity-timestamp">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">3 new automations</span> discovered in Microsoft Teams
                </p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Security alert:</span> High-risk bot detected in Slack
                </p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Discovery scan</span> completed for Google Workspace
                </p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Automations */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Recent Automations</h2>
          <Button variant="outline" size="sm" onClick={handleViewAutomations}>
            View All
          </Button>
        </div>
        
        <AutomationsList
          maxItems={5}
          showHeader={false}
          showPlatformFilter={false}
          viewMode="list"
          className="space-y-0"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card border rounded-lg p-6" data-testid="quick-actions">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Button 
            variant="outline" 
            className="justify-start h-auto p-4 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            onClick={handleConnectPlatform}
            data-testid="quick-action-connect"
          >
            <div className="flex items-center space-x-3">
              <Plus className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="font-medium">Connect Platform</p>
                <p className="text-xs text-muted-foreground">Add a new integration</p>
              </div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="justify-start h-auto p-4 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            onClick={() => showError('Bulk discovery coming soon')}
          >
            <div className="flex items-center space-x-3">
              <Bot className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="font-medium">Run Discovery</p>
                <p className="text-xs text-muted-foreground">Scan for automations</p>
              </div>
            </div>
          </Button>

          <PDFGenerator
            automations={automations}
            reportType="security_summary"
            organizationName={'Your Organization'}
            className="justify-start h-auto p-4 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;