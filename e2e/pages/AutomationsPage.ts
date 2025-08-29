/**
 * Automations Page Object Model
 * Encapsulates automation discovery and management page interactions
 */

import { Page, Locator, expect } from '@playwright/test';

export class AutomationsPage {
  readonly page: Page;
  
  // Page elements
  readonly pageTitle: Locator;
  readonly automationsTable: Locator;
  readonly automationsGrid: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;
  
  // Controls and filters
  readonly searchInput: Locator;
  readonly riskFilter: Locator;
  readonly platformFilter: Locator;
  readonly statusFilter: Locator;
  readonly sortDropdown: Locator;
  readonly viewToggle: Locator;
  readonly refreshButton: Locator;
  
  // Automation items
  readonly automationItems: Locator;
  readonly highRiskAutomations: Locator;
  readonly mediumRiskAutomations: Locator;
  readonly lowRiskAutomations: Locator;
  
  // Risk indicators
  readonly riskScores: Locator;
  readonly riskBadges: Locator;
  readonly criticalAlerts: Locator;
  
  // Platform indicators
  readonly platformBadges: Locator;
  readonly slackAutomations: Locator;
  readonly googleAutomations: Locator;
  readonly microsoftAutomations: Locator;
  
  // Actions
  readonly viewDetailsButtons: Locator;
  readonly acknowledgeButtons: Locator;
  readonly suppressButtons: Locator;
  readonly exportButton: Locator;
  
  // Summary stats
  readonly totalCount: Locator;
  readonly highRiskCount: Locator;
  readonly newDiscoveries: Locator;
  readonly lastScanTime: Locator;
  
  // Real-time updates
  readonly realTimeIndicator: Locator;
  readonly updateNotification: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Page elements
    this.pageTitle = page.locator('[data-testid="automations-page-title"]');
    this.automationsTable = page.locator('[data-testid="automations-table"]');
    this.automationsGrid = page.locator('[data-testid="automations-grid"]');
    this.emptyState = page.locator('[data-testid="automations-empty-state"]');
    this.loadingSpinner = page.locator('[data-testid="automations-loading"]');
    
    // Controls
    this.searchInput = page.locator('[data-testid="automations-search"]');
    this.riskFilter = page.locator('[data-testid="risk-filter"]');
    this.platformFilter = page.locator('[data-testid="platform-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    this.viewToggle = page.locator('[data-testid="view-toggle"]');
    this.refreshButton = page.locator('[data-testid="refresh-automations"]');
    
    // Automation items
    this.automationItems = page.locator('[data-testid="automation-item"]');
    this.highRiskAutomations = page.locator('[data-testid="automation-item"][data-risk="high"]');
    this.mediumRiskAutomations = page.locator('[data-testid="automation-item"][data-risk="medium"]');
    this.lowRiskAutomations = page.locator('[data-testid="automation-item"][data-risk="low"]');
    
    // Risk indicators
    this.riskScores = page.locator('[data-testid="risk-score"]');
    this.riskBadges = page.locator('[data-testid="risk-badge"]');
    this.criticalAlerts = page.locator('[data-testid="critical-alert"]');
    
    // Platform indicators
    this.platformBadges = page.locator('[data-testid="platform-badge"]');
    this.slackAutomations = page.locator('[data-testid="automation-item"][data-platform="slack"]');
    this.googleAutomations = page.locator('[data-testid="automation-item"][data-platform="google"]');
    this.microsoftAutomations = page.locator('[data-testid="automation-item"][data-platform="microsoft"]');
    
    // Actions
    this.viewDetailsButtons = page.locator('[data-testid="view-details-button"]');
    this.acknowledgeButtons = page.locator('[data-testid="acknowledge-button"]');
    this.suppressButtons = page.locator('[data-testid="suppress-button"]');
    this.exportButton = page.locator('[data-testid="export-automations"]');
    
    // Summary stats
    this.totalCount = page.locator('[data-testid="total-automations-count"]');
    this.highRiskCount = page.locator('[data-testid="high-risk-count"]');
    this.newDiscoveries = page.locator('[data-testid="new-discoveries-count"]');
    this.lastScanTime = page.locator('[data-testid="last-scan-time"]');
    
    // Real-time updates
    this.realTimeIndicator = page.locator('[data-testid="realtime-indicator"]');
    this.updateNotification = page.locator('[data-testid="update-notification"]');
  }

  /**
   * Navigate to automations page
   */
  async goto() {
    await this.page.goto('/automations');
    await this.waitForLoad();
  }

  /**
   * Wait for the automations page to load
   */
  async waitForLoad() {
    await expect(this.pageTitle).toBeVisible();
    
    // Wait for either automations to load or empty state to show
    await Promise.race([
      expect(this.automationItems.first()).toBeVisible({ timeout: 10000 }),
      expect(this.emptyState).toBeVisible({ timeout: 10000 })
    ]);
  }

  /**
   * Validate page elements
   */
  async validatePageElements() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.riskFilter).toBeVisible();
    await expect(this.platformFilter).toBeVisible();
    await expect(this.refreshButton).toBeVisible();
    await expect(this.totalCount).toBeVisible();
  }

  /**
   * Get the total number of automations
   */
  async getAutomationCount(): Promise<number> {
    return await this.automationItems.count();
  }

  /**
   * Get automations by risk level
   */
  async getAutomationsByRisk() {
    return {
      high: await this.highRiskAutomations.count(),
      medium: await this.mediumRiskAutomations.count(),
      low: await this.lowRiskAutomations.count(),
    };
  }

  /**
   * Get automations by platform
   */
  async getAutomationsByPlatform() {
    return {
      slack: await this.slackAutomations.count(),
      google: await this.googleAutomations.count(),
      microsoft: await this.microsoftAutomations.count(),
    };
  }

  /**
   * Search for automations
   */
  async searchAutomations(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
    return await this.getAutomationCount();
  }

  /**
   * Filter by risk level
   */
  async filterByRisk(riskLevel: 'high' | 'medium' | 'low' | 'all') {
    await this.riskFilter.click();
    
    const option = this.page.locator(`[data-testid="risk-filter-${riskLevel}"]`);
    await option.click();
    
    await this.page.waitForTimeout(500);
    return await this.getAutomationCount();
  }

  /**
   * Filter by platform
   */
  async filterByPlatform(platform: 'slack' | 'google' | 'microsoft' | 'all') {
    await this.platformFilter.click();
    
    const option = this.page.locator(`[data-testid="platform-filter-${platform}"]`);
    await option.click();
    
    await this.page.waitForTimeout(500);
    return await this.getAutomationCount();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: 'active' | 'acknowledged' | 'suppressed' | 'all') {
    await this.statusFilter.click();
    
    const option = this.page.locator(`[data-testid="status-filter-${status}"]`);
    await option.click();
    
    await this.page.waitForTimeout(500);
    return await this.getAutomationCount();
  }

  /**
   * Sort automations
   */
  async sortBy(criteria: 'risk' | 'discovered' | 'platform' | 'name') {
    await this.sortDropdown.click();
    
    const option = this.page.locator(`[data-testid="sort-${criteria}"]`);
    await option.click();
    
    await this.page.waitForTimeout(500);
  }

  /**
   * Toggle between grid and table view
   */
  async toggleView() {
    await this.viewToggle.click();
    
    const isGridView = await this.automationsGrid.isVisible({ timeout: 2000 }).catch(() => false);
    const isTableView = await this.automationsTable.isVisible({ timeout: 2000 }).catch(() => false);
    
    return isGridView ? 'grid' : (isTableView ? 'table' : 'unknown');
  }

  /**
   * Refresh automations data
   */
  async refreshAutomations() {
    await this.refreshButton.click();
    
    // Wait for refresh to complete
    await expect(this.loadingSpinner).toBeVisible({ timeout: 2000 });
    await expect(this.loadingSpinner).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * View details of a specific automation
   */
  async viewAutomationDetails(automationId: string) {
    const automation = this.automationItems.filter({ has: this.page.locator(`[data-automation-id="${automationId}"]`) });
    const detailsButton = automation.locator('[data-testid="view-details-button"]');
    
    await detailsButton.click();
    
    // Wait for details modal or navigation
    await Promise.race([
      expect(this.page.locator('[data-testid="automation-details-modal"]')).toBeVisible(),
      this.page.waitForURL(`/automations/${automationId}`)
    ]);
  }

  /**
   * Acknowledge an automation
   */
  async acknowledgeAutomation(automationId: string, reason?: string) {
    const automation = this.automationItems.filter({ has: this.page.locator(`[data-automation-id="${automationId}"]`) });
    const acknowledgeButton = automation.locator('[data-testid="acknowledge-button"]');
    
    await acknowledgeButton.click();
    
    // Fill reason if modal appears
    const reasonTextarea = this.page.locator('[data-testid="acknowledge-reason"]');
    if (await reasonTextarea.isVisible({ timeout: 2000 })) {
      if (reason) {
        await reasonTextarea.fill(reason);
      }
      
      const confirmButton = this.page.locator('[data-testid="confirm-acknowledge-button"]');
      await confirmButton.click();
    }
    
    // Verify status change
    const statusBadge = automation.locator('[data-testid="automation-status"]');
    await expect(statusBadge).toContainText('acknowledged');
  }

  /**
   * Suppress an automation
   */
  async suppressAutomation(automationId: string, reason?: string) {
    const automation = this.automationItems.filter({ has: this.page.locator(`[data-automation-id="${automationId}"]`) });
    const suppressButton = automation.locator('[data-testid="suppress-button"]');
    
    await suppressButton.click();
    
    // Fill reason in modal
    const reasonTextarea = this.page.locator('[data-testid="suppress-reason"]');
    if (await reasonTextarea.isVisible({ timeout: 2000 })) {
      if (reason) {
        await reasonTextarea.fill(reason);
      }
      
      const confirmButton = this.page.locator('[data-testid="confirm-suppress-button"]');
      await confirmButton.click();
    }
    
    // Verify status change
    const statusBadge = automation.locator('[data-testid="automation-status"]');
    await expect(statusBadge).toContainText('suppressed');
  }

  /**
   * Export automations data
   */
  async exportAutomations(format: 'csv' | 'json' | 'pdf' = 'csv') {
    await this.exportButton.click();
    
    const formatOption = this.page.locator(`[data-testid="export-${format}"]`);
    await formatOption.click();
    
    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download');
    
    const confirmExportButton = this.page.locator('[data-testid="confirm-export-button"]');
    await confirmExportButton.click();
    
    const download = await downloadPromise;
    return download;
  }

  /**
   * Validate risk scoring display
   */
  async validateRiskScoring() {
    const riskScores = await this.riskScores.all();
    
    for (const score of riskScores) {
      const scoreText = await score.textContent();
      const scoreValue = parseFloat(scoreText || '0');
      
      // Risk score should be between 0 and 100
      expect(scoreValue).toBeGreaterThanOrEqual(0);
      expect(scoreValue).toBeLessThanOrEqual(100);
    }
    
    // Validate risk badges
    const riskBadges = await this.riskBadges.all();
    
    for (const badge of riskBadges) {
      const riskLevel = await badge.getAttribute('data-risk');
      expect(['high', 'medium', 'low']).toContain(riskLevel);
    }
  }

  /**
   * Validate platform information display
   */
  async validatePlatformDisplay() {
    const platformBadges = await this.platformBadges.all();
    
    for (const badge of platformBadges) {
      const platform = await badge.getAttribute('data-platform');
      expect(['slack', 'google', 'microsoft']).toContain(platform);
      
      // Badge should have appropriate icon/text
      const badgeText = await badge.textContent();
      expect(badgeText).toBeTruthy();
    }
  }

  /**
   * Check for critical alerts
   */
  async checkCriticalAlerts() {
    const criticalCount = await this.criticalAlerts.count();
    
    if (criticalCount > 0) {
      // Critical alerts should be prominently displayed
      const firstAlert = this.criticalAlerts.first();
      await expect(firstAlert).toBeVisible();
      
      // Should have appropriate styling
      const alertClass = await firstAlert.getAttribute('class');
      expect(alertClass).toMatch(/(critical|danger|urgent)/i);
    }
    
    return criticalCount;
  }

  /**
   * Validate empty state
   */
  async validateEmptyState() {
    await expect(this.emptyState).toBeVisible();
    
    const emptyStateTitle = this.emptyState.locator('[data-testid="empty-state-title"]');
    const emptyStateDescription = this.emptyState.locator('[data-testid="empty-state-description"]');
    const emptyStateAction = this.emptyState.locator('[data-testid="empty-state-action"]');
    
    await expect(emptyStateTitle).toBeVisible();
    await expect(emptyStateDescription).toBeVisible();
    await expect(emptyStateAction).toBeVisible();
  }

  /**
   * Test real-time updates
   */
  async testRealTimeUpdates() {
    // Check if real-time indicator is active
    await expect(this.realTimeIndicator).toBeVisible();
    
    const indicatorStatus = await this.realTimeIndicator.getAttribute('data-status');
    expect(indicatorStatus).toBe('connected');
    
    // Wait for update notification
    const initialCount = await this.getAutomationCount();
    
    // Simulate new automation discovery (in real app, this would come via WebSocket)
    await this.page.evaluate(() => {
      // Mock WebSocket message for testing
      const event = new CustomEvent('newAutomationDiscovered', {
        detail: {
          id: 'test-automation-123',
          name: 'Test Automation',
          platform: 'slack',
          riskScore: 85
        }
      });
      document.dispatchEvent(event);
    });
    
    // Check for update notification
    await expect(this.updateNotification).toBeVisible({ timeout: 5000 });
    
    // Click to refresh and see new automation
    await this.updateNotification.click();
    
    // Verify count increased
    const updatedCount = await this.getAutomationCount();
    expect(updatedCount).toBeGreaterThan(initialCount);
  }

  /**
   * Validate accessibility features
   */
  async validateAccessibility() {
    // Check ARIA labels on interactive elements
    const interactiveElements = this.page.locator('button, [role="button"], input, select');
    const elementCount = await interactiveElements.count();
    
    for (let i = 0; i < elementCount; i++) {
      const element = interactiveElements.nth(i);
      const hasAriaLabel = await element.getAttribute('aria-label');
      const hasTitle = await element.getAttribute('title');
      const hasText = await element.textContent();
      
      // Should have some form of accessible label
      expect(hasAriaLabel || hasTitle || hasText).toBeTruthy();
    }
    
    // Check keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    // Mock API error
    await this.page.route('**/api/automations**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Try to refresh
    await this.refreshAutomations();
    
    // Should show error message
    const errorMessage = this.page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Error should be user-friendly
    const errorText = await errorMessage.textContent();
    expect(errorText).toMatch(/(failed|error|try again)/i);
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats() {
    const totalText = await this.totalCount.textContent();
    const highRiskText = await this.highRiskCount.textContent();
    const newDiscoveriesText = await this.newDiscoveries.textContent();
    
    return {
      total: parseInt(totalText || '0'),
      highRisk: parseInt(highRiskText || '0'),
      newDiscoveries: parseInt(newDiscoveriesText || '0')
    };
  }

  /**
   * Validate last scan timestamp
   */
  async validateLastScanTime() {
    await expect(this.lastScanTime).toBeVisible();
    
    const timeText = await this.lastScanTime.textContent();
    expect(timeText).toMatch(/(just now|minutes? ago|hours? ago|days? ago)/i);
  }
}