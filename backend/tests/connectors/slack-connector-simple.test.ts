/**
 * Slack Connector Unit Tests - Simplified Version
 * Tests Slack platform connector functionality with basic mocks
 */

import { SlackConnector } from '../../src/connectors/slack';
import { OAuthCredentials } from '../../src/connectors/types';
import { WebClient } from '@slack/web-api';

// Mock WebClient
const mockWebClient = {
  auth: {
    test: jest.fn(),
  },
  users: {
    info: jest.fn(),
    list: jest.fn(),
  },
  team: {
    info: jest.fn(),
  },
};

// Mock the WebClient class
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => mockWebClient),
}));

jest.mock('../../src/database/repositories/encrypted-credential', () => ({
  encryptedCredentialRepository: {
    getDecryptedValue: jest.fn(),
  },
}));

describe('SlackConnector', () => {
  let slackConnector: SlackConnector;

  const mockCredentials: OAuthCredentials = {
    accessToken: 'xoxb-mock-access-token',
    refreshToken: 'xoxr-mock-refresh-token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000),
    scope: 'channels:read,users:read,chat:write'
  };

  beforeEach(() => {
    slackConnector = new SlackConnector();
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      // Setup mocks
      mockWebClient.auth.test.mockResolvedValue({
        ok: true,
        url: 'https://testteam.slack.com/',
        team: 'Test Team',
        user: 'testuser',
        team_id: 'T123456789',
        user_id: 'U123456789',
      });

      mockWebClient.users.info.mockResolvedValue({
        ok: true,
        user: {
          id: 'U123456789',
          name: 'testuser',
          real_name: 'Test User',
          profile: {
            email: 'test@testteam.slack.com',
            display_name: 'Test User'
          }
        }
      });

      mockWebClient.team.info.mockResolvedValue({
        ok: true,
        team: {
          id: 'T123456789',
          name: 'Test Team',
          domain: 'testteam',
        }
      });

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe('U123456789');
      expect(result.platformWorkspaceId).toBe('T123456789');
    });

    it('should handle authentication failure', async () => {
      mockWebClient.auth.test.mockRejectedValue(new Error('Invalid token'));

      const result = await slackConnector.authenticate(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.errorCode).toBe('SLACK_AUTH_ERROR');
    });
  });
});