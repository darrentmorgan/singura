/**
 * Mock OAuth Servers for E2E Testing
 *
 * Exports all platform-specific OAuth mock servers for use in E2E tests.
 * Each server simulates the complete OAuth 2.0 flow for its platform.
 */

export { BaseMockOAuthServer } from './base-mock-oauth-server';
export type {
  TokenData,
  AuthCodeData,
  OAuthErrorCode,
  MockServerResponse,
  BaseMockServerConfig,
} from './base-mock-oauth-server';

export { SlackMockOAuthServer } from './slack-mock-server';
export type { SlackMockServerConfig } from './slack-mock-server';

export { GoogleMockOAuthServer } from './google-mock-server';
export type { GoogleMockServerConfig } from './google-mock-server';

export { MicrosoftMockOAuthServer } from './microsoft-mock-server';
export type { MicrosoftMockServerConfig } from './microsoft-mock-server';
