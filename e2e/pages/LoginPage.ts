/**
 * Login Page Object Model
 * Encapsulates login page interactions and validations
 */

import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly loadingSpinner: Locator;
  readonly pageTitle: Locator;
  readonly logo: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form elements
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    
    // Error and status messages
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    
    // Navigation links
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    this.signUpLink = page.locator('[data-testid="signup-link"]');
    
    // Page elements
    this.pageTitle = page.locator('[data-testid="login-title"]');
    this.logo = page.locator('[data-testid="app-logo"]');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  /**
   * Wait for the login page to fully load
   */
  async waitForLoad() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  /**
   * Fill in the email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in the password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the login button
   */
  async clickLogin() {
    await this.loginButton.click();
  }

  /**
   * Perform complete login flow
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  /**
   * Perform login and wait for successful redirect
   */
  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Perform login expecting failure
   */
  async loginExpectingError(email: string, password: string) {
    await this.login(email, password);
    await expect(this.errorMessage).toBeVisible();
  }

  /**
   * Get the current error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoading(): Promise<boolean> {
    try {
      await expect(this.loadingSpinner).toBeVisible({ timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that the login form is properly displayed
   */
  async validateLoginForm() {
    // Check all required elements are visible
    await expect(this.logo).toBeVisible();
    await expect(this.pageTitle).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    
    // Check form is interactive
    await expect(this.emailInput).toBeEditable();
    await expect(this.passwordInput).toBeEditable();
    await expect(this.loginButton).toBeEnabled();
    
    // Check password field is properly masked
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
  }

  /**
   * Test form validation
   */
  async testFormValidation() {
    // Try to submit empty form
    await this.clickLogin();
    
    // Should show validation errors
    const emailError = this.page.locator('[data-testid="email-error"]');
    const passwordError = this.page.locator('[data-testid="password-error"]');
    
    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();
  }

  /**
   * Test email format validation
   */
  async testEmailValidation() {
    await this.fillEmail('invalid-email');
    await this.fillPassword('validpassword');
    await this.clickLogin();
    
    const emailError = this.page.locator('[data-testid="email-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText('valid email');
  }

  /**
   * Test password requirements
   */
  async testPasswordValidation() {
    await this.fillEmail('test@example.com');
    await this.fillPassword('weak');
    await this.clickLogin();
    
    const passwordError = this.page.locator('[data-testid="password-error"]');
    await expect(passwordError).toBeVisible();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL('/forgot-password');
  }

  /**
   * Click sign up link
   */
  async clickSignUp() {
    await this.signUpLink.click();
    await this.page.waitForURL('/signup');
  }

  /**
   * Check for security features
   */
  async validateSecurityFeatures() {
    // Check for HTTPS redirect (in production)
    const url = this.page.url();
    if (url.includes('localhost') === false) {
      expect(url).toMatch(/^https:/);
    }
    
    // Check for security headers (if applicable)
    const response = await this.page.goto('/login');
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
    ];
    
    securityHeaders.forEach(header => {
      expect(response?.headers()).toHaveProperty(header);
    });
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    await this.emailInput.focus();
    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.loginButton).toBeFocused();
    
    // Test Enter key submission
    await this.fillEmail('test@example.com');
    await this.fillPassword('TestPass123!');
    await this.passwordInput.press('Enter');
    
    // Should trigger login attempt
    await expect(this.loadingSpinner).toBeVisible({ timeout: 2000 });
  }

  /**
   * Test accessibility features
   */
  async testAccessibility() {
    // Check ARIA labels
    await expect(this.emailInput).toHaveAttribute('aria-label');
    await expect(this.passwordInput).toHaveAttribute('aria-label');
    
    // Check form labels
    const emailLabel = this.page.locator('label[for="email"]');
    const passwordLabel = this.page.locator('label[for="password"]');
    
    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
    
    // Check error announcements
    await this.testFormValidation();
    const emailError = this.page.locator('[data-testid="email-error"]');
    await expect(emailError).toHaveAttribute('role', 'alert');
  }
}