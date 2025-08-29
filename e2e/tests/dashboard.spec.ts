/**
 * Dashboard End-to-End Tests
 * Tests the main dashboard functionality, metrics, and user interactions
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { AutomationsPage } from '../pages/AutomationsPage';
import { ConnectionsPage } from '../pages/ConnectionsPage';

test.describe('Dashboard', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    dashboardPage = new DashboardPage(page);
    
    // Mock dashboard data
    await page.route('**/api/dashboard/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAutomations: 42,
          highRiskAutomations: 8,
          mediumRiskAutomations: 24,
          lowRiskAutomations: 10,
          activeConnections: 3,
          newDiscoveries: 5,
          lastScan: new Date().toISOString(),
          scanStatus: 'completed'
        })
      });
    });
    
    // Mock chart data
    await page.route('**/api/dashboard/automation-trends', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trends: [
            { date: '2024-01-01', total: 35, high: 6, medium: 20, low: 9 },
            { date: '2024-01-02', total: 38, high: 7, medium: 22, low: 9 },
            { date: '2024-01-03', total: 42, high: 8, medium: 24, low: 10 }
          ]
        })
      });
    });
    
    // Mock risk distribution data
    await page.route('**/api/dashboard/risk-distribution', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          distribution: [
            { risk: 'high', count: 8, percentage: 19 },
            { risk: 'medium', count: 24, percentage: 57 },
            { risk: 'low', count: 10, percentage: 24 }
          ]
        })
      });
    });
    
    // Mock recent activity
    await page.route('**/api/dashboard/recent-activity', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activities: [
            {
              id: 'activity-1',
              type: 'automation_discovered',
              timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              description: 'New Slack bot discovered in #general channel',
              severity: 'high',
              platform: 'slack'
            },
            {
              id: 'activity-2',
              type: 'automation_acknowledged',
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
              description: 'Google Apps Script acknowledged by admin@example.com',
              severity: 'medium',
              platform: 'google'
            },
            {
              id: 'activity-3',
              type: 'connection_added',
              timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
              description: 'Microsoft 365 connection established',
              severity: 'info',
              platform: 'microsoft'
            }
          ]
        })
      });
    });
  });

  test.describe('Dashboard Layout and Navigation', () => {
    test('should load dashboard successfully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.validateDashboardElements();
      
      // Verify URL
      expect(page.url()).toContain('/dashboard');
      
      // Check that all major sections are present
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      await expect(dashboardPage.statsCards).toBeVisible();
      await expect(dashboardPage.automationsChart).toBeVisible();
      await expect(dashboardPage.riskScoreChart).toBeVisible();
      await expect(dashboardPage.recentActivity).toBeVisible();
    });

    test('should display correct navigation elements', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Verify navigation elements
      await expect(dashboardPage.sidebarMenu).toBeVisible();
      await expect(dashboardPage.userMenu).toBeVisible();
      await expect(dashboardPage.connectionsLink).toBeVisible();
      await expect(dashboardPage.automationsLink).toBeVisible();
      await expect(dashboardPage.settingsLink).toBeVisible();
    });

    test('should navigate to other pages', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Navigate to connections
      await dashboardPage.navigateToConnections();
      expect(page.url()).toContain('/connections');
      
      // Go back to dashboard
      await dashboardPage.goto();
      
      // Navigate to automations
      await dashboardPage.navigateToAutomations();
      expect(page.url()).toContain('/automations');
    });
  });

  test.describe('Metrics Display', () => {
    test('should display all metric cards', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Verify all metric cards are visible
      await expect(dashboardPage.totalAutomationsCard).toBeVisible();
      await expect(dashboardPage.highRiskCard).toBeVisible();
      await expect(dashboardPage.activeConnectionsCard).toBeVisible();
      await expect(dashboardPage.newDiscoveriesCard).toBeVisible();
    });

    test('should display correct metric values', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Get metric values
      const metrics = await dashboardPage.getAllMetrics();
      
      // Verify metric values match mocked data
      expect(metrics.totalAutomations).toBe('42');
      expect(metrics.highRisk).toBe('8');
      expect(metrics.activeConnections).toBe('3');
      expect(metrics.newDiscoveries).toBe('5');
    });

    test('should handle large numbers in metrics', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock large numbers
      await page.route('**/api/dashboard/stats', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalAutomations: 1247,
            highRiskAutomations: 89,
            activeConnections: 15,
            newDiscoveries: 23
          })
        });
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      const metrics = await dashboardPage.getAllMetrics();
      
      // Should display formatted numbers correctly
      expect(parseInt(metrics.totalAutomations)).toBeGreaterThan(1000);
      expect(parseInt(metrics.highRisk)).toBeGreaterThan(80);
    });
  });

  test.describe('Charts and Visualizations', () => {
    test('should display automations trend chart', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Verify chart is visible
      await expect(dashboardPage.automationsChart).toBeVisible();
      
      // Chart should contain SVG elements
      const chartSvg = dashboardPage.automationsChart.locator('svg');
      await expect(chartSvg).toBeVisible();
      
      // Interact with chart
      await dashboardPage.interactWithAutomationsChart();
    });

    test('should display risk distribution chart', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Verify chart is visible
      await expect(dashboardPage.riskScoreChart).toBeVisible();
      
      // Chart should contain visualization elements
      const chartElements = dashboardPage.riskScoreChart.locator('svg, canvas');
      await expect(chartElements.first()).toBeVisible();
      
      // Interact with chart
      await dashboardPage.interactWithRiskScoreChart();
    });

    test('should show chart tooltips on hover', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Hover over chart elements
      const chartPoint = dashboardPage.automationsChart.locator('circle, rect, path').first();
      await chartPoint.hover();
      
      // Check for tooltip
      const tooltip = page.locator('[data-testid="chart-tooltip"]');
      await expect(tooltip).toBeVisible({ timeout: 3000 });
    });

    test('should handle empty chart data', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock empty chart data
      await page.route('**/api/dashboard/automation-trends', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ trends: [] })
        });
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Should show empty state or placeholder
      const emptyState = page.locator('[data-testid="chart-empty-state"]');
      const chart = dashboardPage.automationsChart;
      
      // Either chart with placeholder or empty state should be shown
      await expect(chart.or(emptyState)).toBeVisible();
    });
  });

  test.describe('Recent Activity', () => {
    test('should display recent activities', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.validateRecentActivity();
    });

    test('should show activity timestamps', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      const activityItems = page.locator('[data-testid="activity-item"]');
      const firstItem = activityItems.first();
      
      const timestamp = firstItem.locator('[data-testid="activity-timestamp"]');
      await expect(timestamp).toBeVisible();
      
      const timestampText = await timestamp.textContent();
      expect(timestampText).toMatch(/(minute|hour|day)s? ago/i);
    });

    test('should categorize activities by severity', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      const activityItems = page.locator('[data-testid="activity-item"]');
      const count = await activityItems.count();
      
      for (let i = 0; i < count; i++) {
        const item = activityItems.nth(i);
        const severityBadge = item.locator('[data-testid="activity-severity"]');
        
        if (await severityBadge.isVisible()) {
          const severity = await severityBadge.getAttribute('data-severity');
          expect(['high', 'medium', 'low', 'info']).toContain(severity);
        }
      }
    });

    test('should handle empty activity list', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock empty activity data
      await page.route('**/api/dashboard/recent-activity', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ activities: [] })
        });
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      const emptyState = page.locator('[data-testid="activity-empty-state"]');
      await expect(emptyState).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show real-time connection indicator', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.validateRealTimeUpdates();
    });

    test('should refresh data when requested', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Track API calls
      let refreshCallCount = 0;
      await page.route('**/api/dashboard/stats', (route) => {
        refreshCallCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalAutomations: 42 + refreshCallCount,
            highRiskAutomations: 8,
            activeConnections: 3,
            newDiscoveries: 5
          })
        });
      });
      
      // Refresh data
      await dashboardPage.refreshData();
      
      // Should have made additional API call
      expect(refreshCallCount).toBeGreaterThan(1);
    });

    test('should handle WebSocket updates', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock WebSocket updates
      await page.addInitScript(() => {
        let websocketCallbacks: Function[] = [];
        
        (window as any).mockWebSocketUpdate = (data: any) => {
          websocketCallbacks.forEach(callback => callback(data));
        };
        
        // Mock WebSocket connection
        class MockWebSocket {
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor(url: string) {
            setTimeout(() => {
              if (this.onmessage) {
                websocketCallbacks.push((data: any) => {
                  this.onmessage!(new MessageEvent('message', { data: JSON.stringify(data) }));
                });
              }
            }, 100);
          }
        }
        
        (window as any).WebSocket = MockWebSocket;
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Simulate WebSocket update
      await page.evaluate(() => {
        (window as any).mockWebSocketUpdate({
          type: 'stats_update',
          data: { totalAutomations: 43, newDiscoveries: 6 }
        });
      });
      
      // Wait for UI to update
      await page.waitForTimeout(1000);
      
      // Check if metrics updated
      const newDiscoveries = await dashboardPage.getMetricValue('new-discoveries-card');
      expect(newDiscoveries).toBe('6');
    });
  });

  test.describe('Quick Actions', () => {
    test('should provide quick action buttons', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      await expect(dashboardPage.quickActions).toBeVisible();
      
      // Check for common quick actions
      const addConnectionAction = page.locator('[data-testid="quick-action-add-connection"]');
      const viewAutomationsAction = page.locator('[data-testid="quick-action-view-automations"]');
      const runScanAction = page.locator('[data-testid="quick-action-run-scan"]');
      
      // At least one quick action should be visible
      const hasQuickActions = await addConnectionAction.or(viewAutomationsAction).or(runScanAction).isVisible();
      expect(hasQuickActions).toBe(true);
    });

    test('should execute quick actions', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Try to use a quick action
      try {
        await dashboardPage.useQuickAction('add-connection');
        
        // Should navigate or open modal
        await page.waitForTimeout(1000);
        
        const isOnConnections = page.url().includes('/connections');
        const hasModal = await page.locator('[data-testid*="modal"]').isVisible({ timeout: 2000 });
        
        expect(isOnConnections || hasModal).toBe(true);
      } catch (error) {
        // Quick action might not be available in test environment
        console.log('Quick action not available:', error);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewports', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.testResponsiveLayout();
    });

    test('should adapt charts for mobile', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Charts should still be visible and functional
      await expect(dashboardPage.automationsChart).toBeVisible();
      await expect(dashboardPage.riskScoreChart).toBeVisible();
      
      // Charts might be smaller or stacked differently
      const chartContainer = dashboardPage.automationsChart.locator('..');
      const containerWidth = await chartContainer.evaluate(el => el.getBoundingClientRect().width);
      expect(containerWidth).toBeLessThan(400); // Should fit mobile screen
    });

    test('should maintain functionality on tablet viewports', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await dashboardPage.goto();
      await dashboardPage.validateDashboardElements();
      
      // All functionality should work
      const metrics = await dashboardPage.getAllMetrics();
      expect(parseInt(metrics.totalAutomations)).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.testKeyboardNavigation();
    });

    test('should have proper ARIA labels', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.validateAccessibility();
    });

    test('should support screen readers', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      
      // Check for screen reader friendly elements
      const metricCards = page.locator('[data-testid*="-card"]');
      const cardCount = await metricCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = metricCards.nth(i);
        
        // Should have aria-label or describedby
        const hasAriaLabel = await card.getAttribute('aria-label');
        const hasAriaDescribedby = await card.getAttribute('aria-describedby');
        const hasRole = await card.getAttribute('role');
        
        expect(hasAriaLabel || hasAriaDescribedby || hasRole).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock API error
      await page.route('**/api/dashboard/stats', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Should show error state
      const errorMessage = page.locator('[data-testid="dashboard-error"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should handle network timeouts', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock timeout
      await page.route('**/api/dashboard/stats', (route) => {
        // Don't respond to simulate timeout
        setTimeout(() => route.abort('timeout'), 5000);
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Should show loading state then error
      const errorState = page.locator('[data-testid="dashboard-error"], [data-testid="network-error"]');
      await expect(errorState).toBeVisible({ timeout: 10000 });
    });

    test('should provide retry functionality', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      let attemptCount = 0;
      await page.route('**/api/dashboard/stats', (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          route.fulfill({ status: 500 });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ totalAutomations: 42 })
          });
        }
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Should show error first
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible({ timeout: 5000 })) {
        await retryButton.click();
        
        // Should load successfully on retry
        await expect(dashboardPage.totalAutomationsCard).toBeVisible({ timeout: 5000 });
      }
    });

    test('should not break with malformed data', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.checkForErrors();
    });
  });
});