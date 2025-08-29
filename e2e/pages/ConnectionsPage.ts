/**
 * Connections Page Object Model
 * Encapsulates OAuth connections page interactions and validations
 */

import { Page, Locator, expect } from '@playwright/test';

export class ConnectionsPage {
  readonly page: Page;
  
  // Page elements
  readonly pageTitle: Locator;
  readonly connectionsTable: Locator;
  readonly connectionsGrid: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;
  
  // Actions
  readonly addConnectionButton: Locator;
  readonly refreshButton: Locator;
  readonly viewToggleButton: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;
  
  // Connection cards/rows
  readonly connectionItems: Locator;
  readonly activeConnections: Locator;
  readonly inactiveConnections: Locator;
  readonly errorConnections: Locator;
  
  // Platform-specific connection buttons
  readonly connectSlackButton: Locator;
  readonly connectGoogleButton: Locator;
  readonly connectMicrosoftButton: Locator;
  
  // Connection actions
  readonly testConnectionButtons: Locator;
  readonly disconnectButtons: Locator;
  readonly refreshTokenButtons: Locator;
  readonly viewDetailsButtons: Locator;
  
  // Status indicators
  readonly statusBadges: Locator;
  readonly healthIndicators: Locator;
  readonly lastSyncTimestamps: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Page elements
    this.pageTitle = page.locator('[data-testid="connections-page-title"]');
    this.connectionsTable = page.locator('[data-testid="connections-table"]');
    this.connectionsGrid = page.locator('[data-testid="connections-grid"]');
    this.emptyState = page.locator('[data-testid="connections-empty-state"]');
    this.loadingSpinner = page.locator('[data-testid="connections-loading"]');
    
    // Actions
    this.addConnectionButton = page.locator('[data-testid="add-connection-button"]');
    this.refreshButton = page.locator('[data-testid="refresh-connections-button"]');
    this.viewToggleButton = page.locator('[data-testid="view-toggle-button"]');
    this.searchInput = page.locator('[data-testid="connections-search"]');
    this.filterDropdown = page.locator('[data-testid="connections-filter"]');
    
    // Connection items
    this.connectionItems = page.locator('[data-testid="connection-item"]');
    this.activeConnections = page.locator('[data-testid="connection-item"][data-status="active"]');
    this.inactiveConnections = page.locator('[data-testid="connection-item"][data-status="inactive"]');
    this.errorConnections = page.locator('[data-testid="connection-item"][data-status="error"]');
    
    // Platform buttons
    this.connectSlackButton = page.locator('[data-testid="connect-slack-button"]');
    this.connectGoogleButton = page.locator('[data-testid="connect-google-button"]');
    this.connectMicrosoftButton = page.locator('[data-testid="connect-microsoft-button"]');
    
    // Connection actions
    this.testConnectionButtons = page.locator('[data-testid="test-connection-button"]');
    this.disconnectButtons = page.locator('[data-testid="disconnect-button"]');
    this.refreshTokenButtons = page.locator('[data-testid="refresh-token-button"]');
    this.viewDetailsButtons = page.locator('[data-testid="view-details-button"]');
    
    // Status indicators
    this.statusBadges = page.locator('[data-testid="connection-status-badge"]');
    this.healthIndicators = page.locator('[data-testid="connection-health-indicator"]');
    this.lastSyncTimestamps = page.locator('[data-testid="last-sync-timestamp"]');
  }

  /**
   * Navigate to connections page
   */
  async goto() {
    await this.page.goto('/connections');
    await this.waitForLoad();
  }

  /**
   * Wait for the connections page to load
   */
  async waitForLoad() {
    await expect(this.pageTitle).toBeVisible();
    
    // Wait for either connections to load or empty state to show
    await Promise.race([
      expect(this.connectionItems.first()).toBeVisible({ timeout: 5000 }),
      expect(this.emptyState).toBeVisible({ timeout: 5000 })
    ]);
  }

  /**
   * Validate page elements
   */
  async validatePageElements() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.addConnectionButton).toBeVisible();
    await expect(this.refreshButton).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.filterDropdown).toBeVisible();
  }

  /**
   * Get the number of connections
   */
  async getConnectionCount(): Promise<number> {
    return await this.connectionItems.count();
  }

  /**
   * Get connections by status
   */
  async getConnectionsByStatus() {
    return {
      active: await this.activeConnections.count(),
      inactive: await this.inactiveConnections.count(),
      error: await this.errorConnections.count(),
    };
  }

  /**
   * Start OAuth flow for Slack
   */
  async connectToSlack() {
    await this.addConnectionButton.click();
    
    // Wait for connection modal or dropdown
    const slackOption = this.page.locator('[data-testid="slack-connection-option"]');
    await expect(slackOption).toBeVisible();
    await slackOption.click();
    
    // Should redirect to OAuth flow
    await this.page.waitForURL(/oauth.*slack/, { timeout: 10000 });
  }

  /**
   * Start OAuth flow for Google
   */
  async connectToGoogle() {
    await this.addConnectionButton.click();
    
    const googleOption = this.page.locator('[data-testid="google-connection-option"]');
    await expect(googleOption).toBeVisible();
    await googleOption.click();
    
    await this.page.waitForURL(/oauth.*google/, { timeout: 10000 });
  }

  /**
   * Start OAuth flow for Microsoft
   */
  async connectToMicrosoft() {
    await this.addConnectionButton.click();
    
    const microsoftOption = this.page.locator('[data-testid="microsoft-connection-option"]');
    await expect(microsoftOption).toBeVisible();
    await microsoftOption.click();
    
    await this.page.waitForURL(/oauth.*microsoft/, { timeout: 10000 });
  }

  /**
   * Test a connection
   */
  async testConnection(connectionId: string) {
    const connection = this.connectionItems.filter({ has: this.page.locator(`[data-connection-id="${connectionId}"]`) });
    const testButton = connection.locator('[data-testid="test-connection-button"]');
    
    await testButton.click();
    
    // Wait for test to complete
    const statusIndicator = connection.locator('[data-testid="connection-test-status"]');
    await expect(statusIndicator).toBeVisible({ timeout: 10000 });
    
    return await statusIndicator.getAttribute('data-status');
  }

  /**
   * Disconnect a connection
   */
  async disconnectConnection(connectionId: string) {
    const connection = this.connectionItems.filter({ has: this.page.locator(`[data-connection-id="${connectionId}"]`) });
    const disconnectButton = connection.locator('[data-testid="disconnect-button"]');
    
    await disconnectButton.click();
    
    // Confirm disconnection in modal
    const confirmButton = this.page.locator('[data-testid="confirm-disconnect-button"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Wait for connection to be removed or status to change
    await expect(connection.locator('[data-testid="connection-status-badge"]')).toContainText('inactive');
  }

  /**
   * Refresh token for a connection
   */
  async refreshToken(connectionId: string) {
    const connection = this.connectionItems.filter({ has: this.page.locator(`[data-connection-id="${connectionId}"]`) });
    const refreshButton = connection.locator('[data-testid="refresh-token-button"]');
    
    await refreshButton.click();
    
    // Wait for refresh to complete
    const lastSync = connection.locator('[data-testid="last-sync-timestamp"]');
    
    // Store original timestamp
    const originalTime = await lastSync.textContent();
    
    // Wait for timestamp to update
    await this.page.waitForFunction(
      (original) => {
        const element = document.querySelector(`[data-connection-id="${connectionId}"] [data-testid="last-sync-timestamp"]`);
        return element?.textContent !== original;
      },
      originalTime,
      { timeout: 15000 }
    );
  }

  /**
   * View connection details
   */
  async viewConnectionDetails(connectionId: string) {
    const connection = this.connectionItems.filter({ has: this.page.locator(`[data-connection-id="${connectionId}"]`) });
    const detailsButton = connection.locator('[data-testid="view-details-button"]');
    
    await detailsButton.click();
    
    // Wait for details modal or navigation
    await Promise.race([
      expect(this.page.locator('[data-testid="connection-details-modal"]')).toBeVisible(),
      this.page.waitForURL(`/connections/${connectionId}`)
    ]);
  }

  /**
   * Search connections
   */
  async searchConnections(query: string) {
    await this.searchInput.fill(query);
    
    // Wait for search results to update
    await this.page.waitForTimeout(500); // Debounce
    
    return await this.getConnectionCount();
  }

  /**
   * Filter connections by status
   */
  async filterByStatus(status: 'active' | 'inactive' | 'error' | 'all') {
    await this.filterDropdown.click();
    
    const filterOption = this.page.locator(`[data-testid="filter-${status}"]`);
    await filterOption.click();
    
    // Wait for filter to apply
    await this.page.waitForTimeout(500);
    
    return await this.getConnectionCount();
  }

  /**
   * Toggle between grid and table view
   */
  async toggleView() {
    await this.viewToggleButton.click();
    
    // Check which view is now active
    const isGridView = await this.connectionsGrid.isVisible({ timeout: 2000 }).catch(() => false);
    const isTableView = await this.connectionsTable.isVisible({ timeout: 2000 }).catch(() => false);
    
    return isGridView ? 'grid' : (isTableView ? 'table' : 'unknown');
  }

  /**
   * Refresh connections list
   */
  async refreshConnections() {
    await this.refreshButton.click();
    
    // Wait for refresh to complete
    await expect(this.loadingSpinner).toBeVisible({ timeout: 2000 });
    await expect(this.loadingSpinner).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Validate connection health indicators
   */
  async validateHealthIndicators() {
    const healthyConnections = this.page.locator('[data-testid="connection-health-indicator"][data-health="healthy"]');
    const unhealthyConnections = this.page.locator('[data-testid="connection-health-indicator"][data-health="unhealthy"]');
    
    const healthyCount = await healthyConnections.count();
    const unhealthyCount = await unhealthyConnections.count();
    
    return { healthy: healthyCount, unhealthy: unhealthyCount };
  }

  /**
   * Check for recent sync timestamps
   */
  async validateSyncTimestamps() {
    const timestamps = await this.lastSyncTimestamps.all();
    
    for (const timestamp of timestamps) {
      const text = await timestamp.textContent();
      expect(text).toMatch(/(just now|minutes? ago|hours? ago|days? ago|Never)/i);
    }
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
   * Handle OAuth callback completion
   */
  async handleOAuthCallback(platform: 'slack' | 'google' | 'microsoft') {
    // Wait for return to connections page after OAuth
    await this.page.waitForURL('/connections', { timeout: 30000 });
    
    // Wait for new connection to appear
    await this.page.waitForFunction(
      (platform) => {
        const connections = document.querySelectorAll('[data-testid="connection-item"]');
        return Array.from(connections).some(conn => 
          conn.getAttribute('data-platform') === platform
        );
      },
      platform,
      { timeout: 10000 }
    );
    
    // Validate the new connection
    const newConnection = this.page.locator(`[data-testid="connection-item"][data-platform="${platform}"]`);
    await expect(newConnection).toBeVisible();
    
    const statusBadge = newConnection.locator('[data-testid="connection-status-badge"]');
    await expect(statusBadge).toContainText('active');
  }

  /**
   * Validate security features
   */
  async validateSecurityFeatures() {
    // Check that sensitive data is not exposed
    const connectionItems = await this.connectionItems.all();
    
    for (const item of connectionItems) {
      // Should not display tokens or secrets
      const itemText = await item.textContent();
      expect(itemText).not.toMatch(/(xox[abp]-|ya29\.|EwBwA8l6)/); // Common OAuth token patterns
      
      // Should have secure indicators
      const secureIndicator = item.locator('[data-testid="connection-secure-indicator"]');
      await expect(secureIndicator).toBeVisible();
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    // Test with invalid connection ID
    const invalidConnection = this.page.locator('[data-connection-id="invalid-id"]');
    const invalidTestButton = invalidConnection.locator('[data-testid="test-connection-button"]');
    
    if (await invalidTestButton.count() > 0) {
      await invalidTestButton.click();
      
      // Should show error message
      const errorMessage = this.page.locator('[data-testid="connection-error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  }
}