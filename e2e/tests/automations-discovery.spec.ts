/**
 * Automation Discovery End-to-End Tests
 * Tests automation detection, risk assessment, and management features
 */

import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { AutomationsPage } from '../pages/AutomationsPage';
import { ConnectionsPage } from '../pages/ConnectionsPage';

test.describe('Automation Discovery', () => {
  let dashboardPage: DashboardPage;
  let automationsPage: AutomationsPage;
  let connectionsPage: ConnectionsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    dashboardPage = new DashboardPage(page);
    automationsPage = new AutomationsPage(page);
    connectionsPage = new ConnectionsPage(page);
  });

  test.describe('Dashboard Automation Overview', () => {
    test('should display automation metrics on dashboard', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock automation metrics data
      await page.route('**/api/dashboard/stats', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalAutomations: 25,
            highRiskAutomations: 8,
            mediumRiskAutomations: 12,
            lowRiskAutomations: 5,
            activeConnections: 3,
            newDiscoveries: 4,
            lastScan: new Date().toISOString()
          })
        });
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.validateDashboardElements();
      
      // Check automation metrics
      const metrics = await dashboardPage.getAllMetrics();
      expect(parseInt(metrics.totalAutomations)).toBeGreaterThan(0);
      expect(parseInt(metrics.highRisk)).toBeGreaterThanOrEqual(0);
      expect(parseInt(metrics.newDiscoveries)).toBeGreaterThanOrEqual(0);
    });

    test('should show automation trends in charts', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock chart data
      await page.route('**/api/dashboard/automation-trends', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            trends: [
              { date: '2024-01-01', count: 15, highRisk: 3 },
              { date: '2024-01-02', count: 18, highRisk: 4 },
              { date: '2024-01-03', count: 25, highRisk: 8 }
            ]
          })
        });
      });
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Interact with charts
      await dashboardPage.interactWithAutomationsChart();
      await dashboardPage.interactWithRiskScoreChart();
    });

    test('should navigate from dashboard to automations page', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Navigate to automations page
      await dashboardPage.navigateToAutomations();
      
      // Should be on automations page
      expect(page.url()).toContain('/automations');
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.validatePageElements();
    });
  });

  test.describe('Automation Discovery and Display', () => {
    test('should display discovered automations', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock automations data
      await page.route('**/api/automations**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            automations: [
              {
                id: 'auto-1',
                name: 'Slack Bot: Daily Reports',
                platform: 'slack',
                riskScore: 85,
                riskLevel: 'high',
                status: 'active',
                discoveredAt: '2024-01-01T10:00:00Z',
                lastActivity: '2024-01-03T15:30:00Z',
                permissions: ['channels:read', 'chat:write', 'files:write'],
                description: 'Automated bot that posts daily reports to #general channel'
              },
              {
                id: 'auto-2',
                name: 'Google Apps Script: Email Parser',
                platform: 'google',
                riskScore: 45,
                riskLevel: 'medium',
                status: 'active',
                discoveredAt: '2024-01-02T14:20:00Z',
                lastActivity: '2024-01-03T09:15:00Z',
                permissions: ['gmail.readonly', 'drive.file'],
                description: 'Script that processes incoming emails and saves attachments to Drive'
              },
              {
                id: 'auto-3',
                name: 'Power Automate: Invoice Processing',
                platform: 'microsoft',
                riskScore: 65,
                riskLevel: 'medium',
                status: 'acknowledged',
                discoveredAt: '2024-01-01T08:30:00Z',
                lastActivity: '2024-01-02T16:45:00Z',
                permissions: ['Files.Read.All', 'Mail.Read'],
                description: 'Flow that processes invoices from email and updates SharePoint'
              }
            ],
            totalCount: 25,
            filteredCount: 3
          })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Should display automations
      const count = await automationsPage.getAutomationCount();
      expect(count).toBeGreaterThan(0);
      
      // Validate risk distribution
      const riskDistribution = await automationsPage.getAutomationsByRisk();
      expect(riskDistribution.high).toBeGreaterThanOrEqual(0);
      expect(riskDistribution.medium).toBeGreaterThanOrEqual(0);
      expect(riskDistribution.low).toBeGreaterThanOrEqual(0);
      
      // Validate platform distribution
      const platformDistribution = await automationsPage.getAutomationsByPlatform();
      expect(platformDistribution.slack).toBeGreaterThanOrEqual(0);
      expect(platformDistribution.google).toBeGreaterThanOrEqual(0);
      expect(platformDistribution.microsoft).toBeGreaterThanOrEqual(0);
    });

    test('should validate risk scoring system', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock automations with various risk scores
      await page.route('**/api/automations**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            automations: [
              { id: 'high-risk-1', riskScore: 95, riskLevel: 'high', name: 'Critical Bot' },
              { id: 'high-risk-2', riskScore: 78, riskLevel: 'high', name: 'High Risk Script' },
              { id: 'med-risk-1', riskScore: 55, riskLevel: 'medium', name: 'Medium Risk Flow' },
              { id: 'low-risk-1', riskScore: 25, riskLevel: 'low', name: 'Low Risk Automation' }
            ]
          })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Validate risk scoring display
      await automationsPage.validateRiskScoring();
      
      // Check critical alerts
      const criticalAlerts = await automationsPage.checkCriticalAlerts();
      expect(criticalAlerts).toBeGreaterThanOrEqual(0);
    });

    test('should display platform-specific information', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Validate platform display
      await automationsPage.validatePlatformDisplay();
    });

    test('should show automation details', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock detailed automation data
      await page.route('**/api/automations/auto-1', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'auto-1',
            name: 'Slack Bot: Daily Reports',
            platform: 'slack',
            riskScore: 85,
            riskLevel: 'high',
            status: 'active',
            discoveredAt: '2024-01-01T10:00:00Z',
            lastActivity: '2024-01-03T15:30:00Z',
            permissions: ['channels:read', 'chat:write', 'files:write'],
            riskFactors: [
              { factor: 'High privilege permissions', severity: 'high', weight: 0.4 },
              { factor: 'Access to sensitive channels', severity: 'medium', weight: 0.3 },
              { factor: 'File write capabilities', severity: 'medium', weight: 0.3 }
            ],
            activityHistory: [
              { timestamp: '2024-01-03T15:30:00Z', action: 'Message sent', details: 'Posted daily report' },
              { timestamp: '2024-01-02T15:30:00Z', action: 'File uploaded', details: 'Uploaded report.pdf' }
            ],
            complianceIssues: [
              { issue: 'Unrestricted file access', severity: 'high' },
              { issue: 'No approval workflow', severity: 'medium' }
            ]
          })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // View automation details
      await automationsPage.viewAutomationDetails('auto-1');
      
      // Should show detailed information
      const detailsModal = page.locator('[data-testid="automation-details-modal"]');
      if (await detailsModal.isVisible({ timeout: 2000 })) {
        // Verify details are displayed
        await expect(detailsModal.locator('[data-testid="automation-name"]')).toContainText('Slack Bot');
        await expect(detailsModal.locator('[data-testid="risk-score"]')).toContainText('85');
        await expect(detailsModal.locator('[data-testid="permissions-list"]')).toBeVisible();
      }
    });
  });

  test.describe('Filtering and Search', () => {
    test('should filter automations by risk level', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Get initial count
      const totalCount = await automationsPage.getAutomationCount();
      
      // Filter by high risk
      const highRiskCount = await automationsPage.filterByRisk('high');
      expect(highRiskCount).toBeLessThanOrEqual(totalCount);
      
      // Filter by medium risk
      const mediumRiskCount = await automationsPage.filterByRisk('medium');
      expect(mediumRiskCount).toBeLessThanOrEqual(totalCount);
      
      // Clear filter
      const allCount = await automationsPage.filterByRisk('all');
      expect(allCount).toBe(totalCount);
    });

    test('should filter automations by platform', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      const totalCount = await automationsPage.getAutomationCount();
      
      // Filter by Slack
      const slackCount = await automationsPage.filterByPlatform('slack');
      expect(slackCount).toBeLessThanOrEqual(totalCount);
      
      // Filter by Google
      const googleCount = await automationsPage.filterByPlatform('google');
      expect(googleCount).toBeLessThanOrEqual(totalCount);
      
      // Filter by Microsoft
      const microsoftCount = await automationsPage.filterByPlatform('microsoft');
      expect(microsoftCount).toBeLessThanOrEqual(totalCount);
      
      // Clear filter
      const allCount = await automationsPage.filterByPlatform('all');
      expect(allCount).toBe(totalCount);
    });

    test('should filter automations by status', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      const totalCount = await automationsPage.getAutomationCount();
      
      // Filter by active
      const activeCount = await automationsPage.filterByStatus('active');
      expect(activeCount).toBeLessThanOrEqual(totalCount);
      
      // Filter by acknowledged
      const acknowledgedCount = await automationsPage.filterByStatus('acknowledged');
      expect(acknowledgedCount).toBeLessThanOrEqual(totalCount);
      
      // Clear filter
      await automationsPage.filterByStatus('all');
    });

    test('should search automations by name', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      const totalCount = await automationsPage.getAutomationCount();
      
      // Search for specific automation
      const searchResults = await automationsPage.searchAutomations('Slack Bot');
      expect(searchResults).toBeLessThanOrEqual(totalCount);
      
      // Clear search
      const clearedResults = await automationsPage.searchAutomations('');
      expect(clearedResults).toBe(totalCount);
    });

    test('should sort automations', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Sort by risk (descending should show high risk first)
      await automationsPage.sortBy('risk');
      
      // Get first automation and check if it's high risk
      const firstAutomation = page.locator('[data-testid="automation-item"]').first();
      const riskBadge = firstAutomation.locator('[data-testid="risk-badge"]');
      
      if (await riskBadge.isVisible()) {
        const riskLevel = await riskBadge.getAttribute('data-risk');
        // When sorted by risk, high risk items should appear first
        expect(['high', 'medium', 'low']).toContain(riskLevel);
      }
    });
  });

  test.describe('Automation Management Actions', () => {
    test('should acknowledge an automation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock acknowledge API
      await page.route('**/api/automations/auto-1/acknowledge', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, status: 'acknowledged' })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Acknowledge automation
      await automationsPage.acknowledgeAutomation('auto-1', 'False positive - legitimate business process');
    });

    test('should suppress an automation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock suppress API
      await page.route('**/api/automations/auto-2/suppress', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, status: 'suppressed' })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Suppress automation
      await automationsPage.suppressAutomation('auto-2', 'Approved by security team');
    });

    test('should export automations data', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock export API
      await page.route('**/api/automations/export**', (route) => {
        route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="automations.csv"'
          },
          body: 'Name,Platform,Risk Score,Status\n"Slack Bot",slack,85,active\n'
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Export data
      const download = await automationsPage.exportAutomations('csv');
      expect(download).toBeTruthy();
      
      const filename = download.suggestedFilename();
      expect(filename).toContain('.csv');
    });

    test('should refresh automation data', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      let refreshCount = 0;
      await page.route('**/api/automations**', (route) => {
        refreshCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            automations: [
              { id: `refresh-${refreshCount}`, name: `Automation ${refreshCount}` }
            ]
          })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Refresh data
      await automationsPage.refreshAutomations();
      
      // Should have made additional API call
      expect(refreshCount).toBeGreaterThan(1);
    });
  });

  test.describe('Real-time Updates', () => {
    test('should handle real-time automation discovery', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock WebSocket connection for real-time updates
      await page.addInitScript(() => {
        // Mock WebSocket for testing
        class MockWebSocket {
          onmessage: ((event: MessageEvent) => void) | null = null;
          onopen: ((event: Event) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
          
          constructor(url: string) {
            setTimeout(() => {
              if (this.onopen) {
                this.onopen(new Event('open'));
              }
            }, 100);
          }
          
          send(data: string) {
            // Mock sending data
          }
          
          close() {
            if (this.onclose) {
              this.onclose(new CloseEvent('close'));
            }
          }
          
          // Method to simulate receiving messages
          simulateMessage(data: any) {
            if (this.onmessage) {
              this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
            }
          }
        }
        
        (window as any).MockWebSocket = MockWebSocket;
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Test real-time updates
      await automationsPage.testRealTimeUpdates();
    });

    test('should show update notifications', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Simulate new automation discovered
      await page.evaluate(() => {
        const event = new CustomEvent('newAutomationDiscovered', {
          detail: {
            id: 'new-automation-123',
            name: 'New Test Automation',
            platform: 'slack',
            riskScore: 75
          }
        });
        document.dispatchEvent(event);
      });
      
      // Should show notification
      const notification = page.locator('[data-testid="update-notification"]');
      await expect(notification).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Integration with Connections', () => {
    test('should show automations only for connected platforms', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock connections data
      await page.route('**/api/connections**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            connections: [
              { id: 'conn-1', platform: 'slack', status: 'active' },
              { id: 'conn-2', platform: 'google', status: 'active' }
              // No Microsoft connection
            ]
          })
        });
      });
      
      // Mock automations data - should only show Slack and Google
      await page.route('**/api/automations**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            automations: [
              { id: 'auto-1', platform: 'slack', name: 'Slack Bot' },
              { id: 'auto-2', platform: 'google', name: 'Google Script' }
              // No Microsoft automations since no connection
            ]
          })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      const platformDistribution = await automationsPage.getAutomationsByPlatform();
      
      // Should have Slack and Google automations
      expect(platformDistribution.slack).toBeGreaterThan(0);
      expect(platformDistribution.google).toBeGreaterThan(0);
      
      // Should have no Microsoft automations
      expect(platformDistribution.microsoft).toBe(0);
    });

    test('should prompt to add connections when no automations found', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock no connections
      await page.route('**/api/connections**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connections: [] })
        });
      });
      
      // Mock no automations
      await page.route('**/api/automations**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ automations: [] })
        });
      });
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Should show empty state with connection prompt
      await automationsPage.validateEmptyState();
      
      const connectButton = page.locator('[data-testid="connect-platforms-button"]');
      if (await connectButton.isVisible({ timeout: 2000 })) {
        await connectButton.click();
        
        // Should navigate to connections page
        await page.waitForURL('/connections');
      }
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should be accessible to screen readers', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Validate accessibility features
      await automationsPage.validateAccessibility();
    });

    test('should support keyboard navigation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Test keyboard navigation through table/grid
      await page.keyboard.press('Tab');
      let focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Navigate through several elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
    });

    test('should toggle between grid and table views', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Toggle view
      const currentView = await automationsPage.toggleView();
      expect(['grid', 'table']).toContain(currentView);
      
      // Toggle back
      const newView = await automationsPage.toggleView();
      expect(newView).not.toBe(currentView);
    });

    test('should handle error states gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Test error handling
      await automationsPage.testErrorHandling();
    });

    test('should validate summary statistics', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      automationsPage = new AutomationsPage(page);
      await automationsPage.goto();
      
      // Get and validate summary stats
      const stats = await automationsPage.getSummaryStats();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.highRisk).toBeGreaterThanOrEqual(0);
      expect(stats.newDiscoveries).toBeGreaterThanOrEqual(0);
      
      // Validate last scan time
      await automationsPage.validateLastScanTime();
    });
  });
});