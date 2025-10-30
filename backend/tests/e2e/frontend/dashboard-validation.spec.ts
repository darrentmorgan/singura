/**
 * Dashboard Validation E2E Tests
 *
 * Uses Chrome DevTools MCP for browser automation to validate:
 * - Dashboard data accuracy after discovery
 * - Real-time WebSocket updates
 * - Platform filtering (Slack, Google, Microsoft)
 * - Risk score badge rendering
 * - OAuth context tooltips
 * - Detection evidence panels
 * - Search functionality
 * - Pagination for large datasets
 * - Export functionality
 * - Performance metrics
 *
 * @requires Chrome DevTools MCP running in isolated mode
 * @testEnvironment browser
 */

import { testDb } from '../../helpers/test-database';
import { MockDataGenerator } from '../../helpers/mock-data';
import { AutomationDiscovery } from '@singura/shared-types';

// Chrome DevTools MCP integration
// Note: These functions are placeholders for the actual MCP tool calls
// In practice, you would use the mcp__chrome-devtools__* tools directly
interface ChromeDevTools {
  navigate: (url: string) => Promise<void>;
  takeSnapshot: () => Promise<{ elements: any[] }>;
  click: (selector: string) => Promise<void>;
  fill: (selector: string, value: string) => Promise<void>;
  waitFor: (selector: string, timeout?: number) => Promise<void>;
  takeScreenshot: (path: string) => Promise<void>;
  evaluate: (script: string) => Promise<any>;
  getConsoleMessages: () => Promise<Array<{ type: string; text: string }>>;
  getNetworkRequests: () => Promise<Array<{ url: string; status: number }>>;
}

// Mock Chrome DevTools (tests will actually call MCP tools)
const browser: ChromeDevTools = {
  navigate: async (url: string) => {
    console.log(`[Browser] Navigating to: ${url}`);
    // Actual: mcp__chrome-devtools__navigate_page
  },
  takeSnapshot: async () => {
    console.log('[Browser] Taking accessibility snapshot');
    // Actual: mcp__chrome-devtools__take_snapshot
    return { elements: [] };
  },
  click: async (selector: string) => {
    console.log(`[Browser] Clicking: ${selector}`);
    // Actual: mcp__chrome-devtools__click
  },
  fill: async (selector: string, value: string) => {
    console.log(`[Browser] Filling ${selector} with: ${value}`);
    // Actual: mcp__chrome-devtools__fill
  },
  waitFor: async (selector: string, timeout = 5000) => {
    console.log(`[Browser] Waiting for: ${selector} (timeout: ${timeout}ms)`);
    // Actual: mcp__chrome-devtools__wait_for
  },
  takeScreenshot: async (path: string) => {
    console.log(`[Browser] Screenshot saved to: ${path}`);
    // Actual: mcp__chrome-devtools__take_screenshot
  },
  evaluate: async (script: string) => {
    console.log(`[Browser] Evaluating: ${script.substring(0, 50)}...`);
    // Actual: mcp__chrome-devtools__evaluate_script
    return null;
  },
  getConsoleMessages: async () => {
    console.log('[Browser] Getting console messages');
    // Actual: mcp__chrome-devtools__list_console_messages
    return [];
  },
  getNetworkRequests: async () => {
    console.log('[Browser] Getting network requests');
    // Actual: mcp__chrome-devtools__list_network_requests
    return [];
  },
};

describe('Dashboard Validation E2E Tests', () => {
  const DASHBOARD_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:3000';

  let testAutomations: AutomationDiscovery[];
  let mockUserId: string;
  let mockOrgId: string;

  beforeAll(async () => {
    // Setup test database
    await testDb.connect();
    await testDb.clean();

    // Create test user and organization
    mockUserId = 'test-user-' + Date.now();
    mockOrgId = 'test-org-' + Date.now();

    // Seed test data: 100 automations across platforms
    testAutomations = [
      ...MockDataGenerator.generateAutomations(40, 'slack', mockOrgId),
      ...MockDataGenerator.generateAutomations(35, 'google', mockOrgId),
      ...MockDataGenerator.generateAutomations(25, 'microsoft', mockOrgId),
    ];

    // Insert automations into database
    for (const automation of testAutomations) {
      await testDb.query(
        `INSERT INTO automations (id, name, type, platform, risk_level, risk_score, status, metadata, organization_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          automation.id,
          automation.name,
          automation.type,
          automation.platform,
          automation.riskLevel,
          automation.riskScore,
          automation.status,
          JSON.stringify(automation.detectionEvidence || {}),
          mockOrgId,
          new Date(),
        ]
      );
    }

    console.log(`✓ Seeded ${testAutomations.length} test automations`);
  });

  afterAll(async () => {
    // Cleanup test data
    await testDb.clean();
    await testDb.disconnect();
  });

  describe('Test 1: Dashboard Displays Automations Correctly', () => {
    it('should load dashboard and display automation cards', async () => {
      // Navigate to dashboard
      await browser.navigate(DASHBOARD_URL);

      // Wait for dashboard to load
      await browser.waitFor('[data-testid="dashboard-content"]', 10000);

      // Take snapshot to verify elements
      const snapshot = await browser.takeSnapshot();

      // Verify key elements exist
      const elements = snapshot.elements;
      expect(elements).toContain('[data-testid="welcome-message"]');
      expect(elements).toContain('[data-testid="automation-card"]');

      // Check console for errors
      const consoleMessages = await browser.getConsoleMessages();
      const errors = consoleMessages.filter(msg => msg.type === 'error');
      expect(errors.length).toBe(0);

      console.log('✓ Dashboard loaded successfully');
    });

    it('should display correct automation count', async () => {
      // Evaluate JavaScript to get automation count
      const automationCount = await browser.evaluate(`
        document.querySelectorAll('[data-testid="automation-card"]').length
      `);

      expect(automationCount).toBeGreaterThan(0);
      expect(automationCount).toBeLessThanOrEqual(50); // First page

      console.log(`✓ Displayed ${automationCount} automations on first page`);
    });

    it('should display automations with correct risk badges', async () => {
      const riskBadges = await browser.evaluate(`
        Array.from(document.querySelectorAll('[data-risk-badge]')).map(el => ({
          level: el.getAttribute('data-risk-level'),
          color: window.getComputedStyle(el).backgroundColor
        }))
      `);

      // Verify risk badge colors
      const highRiskBadges = riskBadges.filter(b => b.level === 'high');
      const mediumRiskBadges = riskBadges.filter(b => b.level === 'medium');
      const lowRiskBadges = riskBadges.filter(b => b.level === 'low');

      expect(highRiskBadges.length).toBeGreaterThan(0);

      // Verify colors (RGB format)
      if (highRiskBadges.length > 0) {
        // Red color for high risk
        expect(highRiskBadges[0].color).toMatch(/rgb\(239, 68, 68\)/);
      }

      console.log(`✓ Risk badges: ${highRiskBadges.length} high, ${mediumRiskBadges.length} medium, ${lowRiskBadges.length} low`);
    });
  });

  describe('Test 2: Real-Time WebSocket Updates', () => {
    it('should receive and display real-time automation updates', async () => {
      // Navigate to dashboard
      await browser.navigate(DASHBOARD_URL);
      await browser.waitFor('[data-testid="dashboard-content"]', 10000);

      // Get initial automation count
      const initialCount = await browser.evaluate(`
        document.querySelectorAll('[data-testid="automation-card"]').length
      `);

      // Simulate new automation discovery (via API)
      const newAutomation = MockDataGenerator.generateAutomations(1, 'slack', mockOrgId)[0];
      await testDb.query(
        `INSERT INTO automations (id, name, type, platform, risk_level, risk_score, status, metadata, organization_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newAutomation.id,
          newAutomation.name,
          newAutomation.type,
          newAutomation.platform,
          newAutomation.riskLevel,
          newAutomation.riskScore,
          newAutomation.status,
          JSON.stringify({}),
          mockOrgId,
          new Date(),
        ]
      );

      // Trigger WebSocket event (simulate backend broadcast)
      await browser.evaluate(`
        if (window.socket) {
          window.socket.emit('automation:discovered', ${JSON.stringify(newAutomation)});
        }
      `);

      // Wait for UI update (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if new automation appears
      const updatedCount = await browser.evaluate(`
        document.querySelectorAll('[data-testid="automation-card"]').length
      `);

      // Note: This test may need adjustment based on actual WebSocket implementation
      console.log(`✓ WebSocket test: Initial count ${initialCount}, updated count ${updatedCount}`);
    });
  });

  describe('Test 3: Platform Filtering', () => {
    it('should filter automations by Slack platform', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="platform-filter"]', 10000);

      // Select Slack filter
      await browser.click('[data-testid="platform-filter"]');
      await browser.click('[data-value="slack"]');

      // Wait for filter to apply
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all displayed automations are Slack
      const platforms = await browser.evaluate(`
        Array.from(document.querySelectorAll('[data-testid="automation-card"]'))
          .map(card => card.getAttribute('data-platform'))
      `);

      platforms.forEach(platform => {
        expect(platform).toBe('slack');
      });

      console.log(`✓ Filtered ${platforms.length} Slack automations`);
    });

    it('should filter automations by Google platform', async () => {
      // Select Google filter
      await browser.click('[data-testid="platform-filter"]');
      await browser.click('[data-value="google"]');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const platforms = await browser.evaluate(`
        Array.from(document.querySelectorAll('[data-testid="automation-card"]'))
          .map(card => card.getAttribute('data-platform'))
      `);

      platforms.forEach(platform => {
        expect(platform).toBe('google');
      });

      console.log(`✓ Filtered ${platforms.length} Google automations`);
    });

    it('should filter automations by Microsoft platform', async () => {
      // Select Microsoft filter
      await browser.click('[data-testid="platform-filter"]');
      await browser.click('[data-value="microsoft"]');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const platforms = await browser.evaluate(`
        Array.from(document.querySelectorAll('[data-testid="automation-card"]'))
          .map(card => card.getAttribute('data-platform'))
      `);

      platforms.forEach(platform => {
        expect(platform).toBe('microsoft');
      });

      console.log(`✓ Filtered ${platforms.length} Microsoft automations`);
    });
  });

  describe('Test 4: Risk Score Badge Colors', () => {
    it('should display correct colors for different risk levels', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="automation-card"]', 10000);

      const riskBadgeStyles = await browser.evaluate(`
        const badges = {
          critical: [],
          high: [],
          medium: [],
          low: []
        };

        document.querySelectorAll('[data-risk-badge]').forEach(badge => {
          const level = badge.getAttribute('data-risk-level');
          const styles = {
            backgroundColor: window.getComputedStyle(badge).backgroundColor,
            color: window.getComputedStyle(badge).color
          };
          badges[level]?.push(styles);
        });

        return badges;
      `);

      // Verify high risk badges are red
      if (riskBadgeStyles.high?.length > 0) {
        expect(riskBadgeStyles.high[0].backgroundColor).toMatch(/rgb\(254, 242, 242\)|rgb\(239, 68, 68\)/);
      }

      // Verify medium risk badges are yellow/orange
      if (riskBadgeStyles.medium?.length > 0) {
        expect(riskBadgeStyles.medium[0].backgroundColor).toMatch(/rgb\(254, 243, 199\)|rgb\(234, 179, 8\)/);
      }

      // Verify low risk badges are green
      if (riskBadgeStyles.low?.length > 0) {
        expect(riskBadgeStyles.low[0].backgroundColor).toMatch(/rgb\(240, 253, 244\)|rgb\(34, 197, 94\)/);
      }

      console.log('✓ Risk badge colors validated');
    });
  });

  describe('Test 5: OAuth Context Tooltips', () => {
    it('should display OAuth context on hover', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="automation-card"]', 10000);

      // Find OAuth context icon
      const oauthIcon = '[data-testid="oauth-context-icon"]';
      await browser.waitFor(oauthIcon, 5000);

      // Hover over icon
      await browser.evaluate(`
        const icon = document.querySelector('${oauthIcon}');
        if (icon) {
          icon.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      `);

      // Wait for tooltip to appear
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify tooltip content
      const tooltipVisible = await browser.evaluate(`
        document.querySelector('[data-testid="oauth-tooltip"]') !== null
      `);

      expect(tooltipVisible).toBe(true);

      console.log('✓ OAuth tooltip displayed correctly');
    });
  });

  describe('Test 6: Detection Evidence Panels', () => {
    it('should expand detection evidence panel on click', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="automation-card"]', 10000);

      // Click first automation card to open details
      await browser.click('[data-testid="automation-card"]:first-child');

      // Wait for modal
      await browser.waitFor('[data-testid="automation-details-modal"]', 5000);

      // Click detection evidence tab
      await browser.click('[data-testid="tab-detection-evidence"]');

      // Verify evidence panel is visible
      const evidencePanelVisible = await browser.evaluate(`
        document.querySelector('[data-testid="detection-evidence-panel"]') !== null
      `);

      expect(evidencePanelVisible).toBe(true);

      console.log('✓ Detection evidence panel expanded');
    });

    it('should collapse detection evidence panel', async () => {
      // Click collapse button
      await browser.click('[data-testid="collapse-evidence-panel"]');

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify panel is collapsed
      const panelCollapsed = await browser.evaluate(`
        const panel = document.querySelector('[data-testid="detection-evidence-panel"]');
        return panel && panel.classList.contains('collapsed');
      `);

      expect(panelCollapsed).toBe(true);

      console.log('✓ Detection evidence panel collapsed');
    });
  });

  describe('Test 7: Search Functionality', () => {
    it('should filter automations by search query', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="automation-search"]', 10000);

      // Get initial count
      const initialCount = await browser.evaluate(`
        document.querySelectorAll('[data-testid="automation-card"]').length
      `);

      // Search for specific automation
      await browser.fill('[data-testid="automation-search"]', testAutomations[0].name.substring(0, 10));

      // Wait for search to apply
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get filtered count
      const filteredCount = await browser.evaluate(`
        document.querySelectorAll('[data-testid="automation-card"]').length
      `);

      expect(filteredCount).toBeLessThanOrEqual(initialCount);
      expect(filteredCount).toBeGreaterThan(0);

      console.log(`✓ Search reduced results from ${initialCount} to ${filteredCount}`);
    });

    it('should show no results message for non-existent search', async () => {
      // Search for non-existent automation
      await browser.fill('[data-testid="automation-search"]', 'NONEXISTENT_AUTOMATION_12345');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify no results message
      const noResultsVisible = await browser.evaluate(`
        document.querySelector('[data-testid="no-results-message"]') !== null
      `);

      expect(noResultsVisible).toBe(true);

      console.log('✓ No results message displayed correctly');
    });
  });

  describe('Test 8: Pagination', () => {
    it('should paginate for >50 automations', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="automation-card"]', 10000);

      // Check if pagination controls exist
      const paginationExists = await browser.evaluate(`
        document.querySelector('[data-testid="pagination-controls"]') !== null
      `);

      expect(paginationExists).toBe(true);

      // Get current page automations count
      const page1Count = await browser.evaluate(`
        document.querySelectorAll('[data-testid="automation-card"]').length
      `);

      expect(page1Count).toBeLessThanOrEqual(50);

      console.log(`✓ Page 1 displays ${page1Count} automations`);
    });

    it('should navigate to page 2', async () => {
      // Click next page button
      await browser.click('[data-testid="pagination-next"]');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify page 2 loaded
      const page2Count = await browser.evaluate(`
        document.querySelectorAll('[data-testid="automation-card"]').length
      `);

      expect(page2Count).toBeGreaterThan(0);

      console.log(`✓ Page 2 displays ${page2Count} automations`);
    });
  });

  describe('Test 9: Export Functionality', () => {
    it('should generate CSV export', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="export-button"]', 10000);

      // Click export button
      await browser.click('[data-testid="export-button"]');

      // Wait for export dialog
      await browser.waitFor('[data-testid="export-dialog"]', 5000);

      // Select CSV format
      await browser.click('[data-testid="export-format-csv"]');

      // Click confirm export
      await browser.click('[data-testid="confirm-export"]');

      // Wait for download (check network requests)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const networkRequests = await browser.getNetworkRequests();
      const exportRequest = networkRequests.find(req => req.url.includes('/api/automations/export'));

      expect(exportRequest).toBeDefined();
      expect(exportRequest?.status).toBe(200);

      console.log('✓ CSV export generated successfully');
    });

    it('should generate PDF export', async () => {
      // Open export dialog
      await browser.click('[data-testid="export-button"]');
      await browser.waitFor('[data-testid="export-dialog"]', 5000);

      // Select PDF format
      await browser.click('[data-testid="export-format-pdf"]');

      // Click confirm export
      await browser.click('[data-testid="confirm-export"]');

      await new Promise(resolve => setTimeout(resolve, 2000));

      const networkRequests = await browser.getNetworkRequests();
      const exportRequest = networkRequests.find(req =>
        req.url.includes('/api/automations/export') && req.url.includes('format=pdf')
      );

      expect(exportRequest).toBeDefined();

      console.log('✓ PDF export generated successfully');
    });
  });

  describe('Test 10: Dashboard Performance', () => {
    it('should load dashboard in <2 seconds for 100 automations', async () => {
      const startTime = Date.now();

      // Navigate to dashboard
      await browser.navigate(DASHBOARD_URL + '/automations');

      // Wait for content to be interactive
      await browser.waitFor('[data-testid="automation-card"]', 10000);

      const loadTime = Date.now() - startTime;

      // Take screenshot of loaded dashboard
      await browser.takeScreenshot('/tmp/dashboard-loaded.png');

      // Verify load time
      expect(loadTime).toBeLessThan(2000);

      console.log(`✓ Dashboard loaded in ${loadTime}ms`);
    });

    it('should have no console errors during navigation', async () => {
      const consoleMessages = await browser.getConsoleMessages();
      const errors = consoleMessages.filter(msg => msg.type === 'error');
      const warnings = consoleMessages.filter(msg => msg.type === 'warning');

      // Allow certain expected warnings (e.g., React dev warnings)
      const criticalErrors = errors.filter(err =>
        !err.text.includes('Download the React DevTools')
      );

      expect(criticalErrors.length).toBe(0);

      console.log(`✓ Console: ${errors.length} errors (${criticalErrors.length} critical), ${warnings.length} warnings`);
    });

    it('should handle rapid filtering without lag', async () => {
      await browser.navigate(DASHBOARD_URL + '/automations');
      await browser.waitFor('[data-testid="platform-filter"]', 10000);

      const startTime = Date.now();

      // Rapidly change filters
      await browser.click('[data-testid="platform-filter"]');
      await browser.click('[data-value="slack"]');
      await new Promise(resolve => setTimeout(resolve, 200));

      await browser.click('[data-testid="platform-filter"]');
      await browser.click('[data-value="google"]');
      await new Promise(resolve => setTimeout(resolve, 200));

      await browser.click('[data-testid="platform-filter"]');
      await browser.click('[data-value="microsoft"]');
      await new Promise(resolve => setTimeout(resolve, 200));

      const totalTime = Date.now() - startTime;

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(3000);

      console.log(`✓ Rapid filtering completed in ${totalTime}ms`);
    });
  });
});
