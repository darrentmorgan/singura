/**
 * Dashboard Page Object Model
 * Encapsulates dashboard page interactions and validations
 */

import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  
  // Navigation elements
  readonly sidebarMenu: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly notificationsButton: Locator;
  
  // Dashboard content
  readonly dashboardContent: Locator;
  readonly welcomeMessage: Locator;
  readonly statsCards: Locator;
  readonly automationsChart: Locator;
  readonly riskScoreChart: Locator;
  readonly recentActivity: Locator;
  readonly quickActions: Locator;
  
  // Metric cards
  readonly totalAutomationsCard: Locator;
  readonly highRiskCard: Locator;
  readonly activeConnectionsCard: Locator;
  readonly newDiscoveriesCard: Locator;
  
  // Navigation links
  readonly connectionsLink: Locator;
  readonly automationsLink: Locator;
  readonly settingsLink: Locator;
  readonly reportsLink: Locator;
  
  // Real-time elements
  readonly realTimeIndicator: Locator;
  readonly refreshButton: Locator;
  readonly lastUpdatedTime: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Navigation
    this.sidebarMenu = page.locator('[data-testid="sidebar-menu"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
    this.notificationsButton = page.locator('[data-testid="notifications-button"]');
    
    // Main content
    this.dashboardContent = page.locator('[data-testid="dashboard-content"]');
    this.welcomeMessage = page.locator('[data-testid="welcome-message"]');
    this.statsCards = page.locator('[data-testid="stats-cards"]');
    this.automationsChart = page.locator('[data-testid="automations-chart"]');
    this.riskScoreChart = page.locator('[data-testid="risk-score-chart"]');
    this.recentActivity = page.locator('[data-testid="recent-activity"]');
    this.quickActions = page.locator('[data-testid="quick-actions"]');
    
    // Metric cards
    this.totalAutomationsCard = page.locator('[data-testid="total-automations-card"]');
    this.highRiskCard = page.locator('[data-testid="high-risk-card"]');
    this.activeConnectionsCard = page.locator('[data-testid="active-connections-card"]');
    this.newDiscoveriesCard = page.locator('[data-testid="new-discoveries-card"]');
    
    // Navigation links
    this.connectionsLink = page.locator('[data-testid="connections-nav-link"]');
    this.automationsLink = page.locator('[data-testid="automations-nav-link"]');
    this.settingsLink = page.locator('[data-testid="settings-nav-link"]');
    this.reportsLink = page.locator('[data-testid="reports-nav-link"]');
    
    // Real-time elements
    this.realTimeIndicator = page.locator('[data-testid="realtime-indicator"]');
    this.refreshButton = page.locator('[data-testid="refresh-button"]');
    this.lastUpdatedTime = page.locator('[data-testid="last-updated"]');
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.waitForLoad();
  }

  /**
   * Wait for the dashboard to fully load
   */
  async waitForLoad() {
    await expect(this.dashboardContent).toBeVisible({ timeout: 10000 });
    await expect(this.statsCards).toBeVisible();
    
    // Wait for charts to load
    await this.page.waitForFunction(() => {
      const charts = document.querySelectorAll('[data-testid*="chart"] svg');
      return charts.length > 0;
    }, { timeout: 15000 });
  }

  /**
   * Validate that all dashboard elements are present
   */
  async validateDashboardElements() {
    // Check navigation elements
    await expect(this.sidebarMenu).toBeVisible();
    await expect(this.userMenu).toBeVisible();
    
    // Check main content sections
    await expect(this.welcomeMessage).toBeVisible();
    await expect(this.statsCards).toBeVisible();
    await expect(this.automationsChart).toBeVisible();
    await expect(this.riskScoreChart).toBeVisible();
    await expect(this.recentActivity).toBeVisible();
    
    // Check metric cards
    await expect(this.totalAutomationsCard).toBeVisible();
    await expect(this.highRiskCard).toBeVisible();
    await expect(this.activeConnectionsCard).toBeVisible();
    await expect(this.newDiscoveriesCard).toBeVisible();
  }

  /**
   * Get the value from a metric card
   */
  async getMetricValue(cardTestId: string): Promise<string> {
    const card = this.page.locator(`[data-testid="${cardTestId}"] [data-testid="metric-value"]`);
    return await card.textContent() || '0';
  }

  /**
   * Get all metric values
   */
  async getAllMetrics() {
    return {
      totalAutomations: await this.getMetricValue('total-automations-card'),
      highRisk: await this.getMetricValue('high-risk-card'),
      activeConnections: await this.getMetricValue('active-connections-card'),
      newDiscoveries: await this.getMetricValue('new-discoveries-card'),
    };
  }

  /**
   * Navigate to connections page
   */
  async navigateToConnections() {
    await this.connectionsLink.click();
    await this.page.waitForURL('/connections');
  }

  /**
   * Navigate to automations page
   */
  async navigateToAutomations() {
    await this.automationsLink.click();
    await this.page.waitForURL('/automations');
  }

  /**
   * Navigate to settings page
   */
  async navigateToSettings() {
    await this.settingsLink.click();
    await this.page.waitForURL('/settings');
  }

  /**
   * Navigate to reports page
   */
  async navigateToReports() {
    await this.reportsLink.click();
    await this.page.waitForURL('/reports');
  }

  /**
   * Perform logout
   */
  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.page.waitForURL('/login');
  }

  /**
   * Refresh dashboard data
   */
  async refreshData() {
    await this.refreshButton.click();
    
    // Wait for refresh to complete
    await this.page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="realtime-indicator"]');
      return indicator?.classList.contains('refreshing') === false;
    }, { timeout: 10000 });
  }

  /**
   * Check if real-time updates are working
   */
  async validateRealTimeUpdates() {
    // Check if real-time indicator is active
    await expect(this.realTimeIndicator).toBeVisible();
    await expect(this.realTimeIndicator).toHaveClass(/connected|active/);
    
    // Check if last updated time is recent
    const lastUpdated = await this.lastUpdatedTime.textContent();
    expect(lastUpdated).toContain('ago');
  }

  /**
   * Interact with charts
   */
  async interactWithAutomationsChart() {
    // Hover over chart points
    const chartPoints = this.automationsChart.locator('circle, rect, path').first();
    await chartPoints.hover();
    
    // Check for tooltip
    const tooltip = this.page.locator('[data-testid="chart-tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
  }

  /**
   * Interact with risk score chart
   */
  async interactWithRiskScoreChart() {
    const chartSegments = this.riskScoreChart.locator('path, rect').first();
    await chartSegments.hover();
    
    // Check for tooltip or legend update
    const tooltip = this.page.locator('[data-testid="chart-tooltip"], [data-testid="chart-legend"]');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
  }

  /**
   * Check recent activity section
   */
  async validateRecentActivity() {
    await expect(this.recentActivity).toBeVisible();
    
    // Should have activity items
    const activityItems = this.recentActivity.locator('[data-testid="activity-item"]');
    await expect(activityItems).toHaveCount({ min: 1 });
    
    // Each item should have timestamp and description
    const firstItem = activityItems.first();
    await expect(firstItem.locator('[data-testid="activity-timestamp"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="activity-description"]')).toBeVisible();
  }

  /**
   * Use quick actions
   */
  async useQuickAction(actionName: string) {
    const action = this.quickActions.locator(`[data-testid="quick-action-${actionName}"]`);
    await expect(action).toBeVisible();
    await action.click();
  }

  /**
   * Test responsive layout
   */
  async testResponsiveLayout() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.waitForLoad();
    
    // Check if sidebar is collapsed or hidden
    const sidebar = this.page.locator('[data-testid="sidebar"]');
    const sidebarStyles = await sidebar.evaluate(el => getComputedStyle(el));
    
    // Should be transformed or hidden on mobile
    expect(['none', 'hidden']).toContain(sidebarStyles.display || sidebarStyles.visibility);
    
    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Focus first interactive element
    await this.page.keyboard.press('Tab');
    
    // Should be able to navigate through all interactive elements
    const focusableElements = await this.page.locator('button, a, input, [tabindex="0"]').count();
    
    for (let i = 0; i < Math.min(focusableElements, 10); i++) {
      await this.page.keyboard.press('Tab');
      
      // Verify an element is focused
      const focusedElement = this.page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  }

  /**
   * Check for error states
   */
  async checkForErrors() {
    // Look for error messages or empty states
    const errorMessages = this.page.locator('[data-testid*="error"], [role="alert"]');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      const errorText = await errorMessages.first().textContent();
      throw new Error(`Dashboard shows error: ${errorText}`);
    }
    
    // Check for loading states that might be stuck
    const loadingElements = this.page.locator('[data-testid*="loading"], [aria-live="polite"]');
    const loadingCount = await loadingElements.count();
    
    // Should not have persistent loading states
    expect(loadingCount).toBeLessThanOrEqual(1);
  }

  /**
   * Validate accessibility
   */
  async validateAccessibility() {
    // Check for proper heading hierarchy
    const headings = this.page.locator('h1, h2, h3, h4, h5, h6');
    const h1Count = await this.page.locator('h1').count();
    expect(h1Count).toBe(1); // Should have exactly one h1
    
    // Check for alt text on images
    const images = this.page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
    
    // Check ARIA labels on interactive elements
    const buttons = this.page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      
      // Button should have either text content or aria-label
      expect(hasText || hasAriaLabel).toBeTruthy();
    }
  }
}