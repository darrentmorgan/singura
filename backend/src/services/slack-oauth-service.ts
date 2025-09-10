import { WebClient } from '@slack/web-api';
import { 
  SlackOAuthResponse, 
  SlackOAuthCredentials, 
  SlackOAuthConfig,
  SlackOAuthRawResponse
} from '@saas-xray/shared-types';
import { 
  getEncryptionService, 
  createAuditLogEntry, 
  getRiskService 
} from './index';

export class SlackOAuthService {
  private slackClient: WebClient;
  private encryptionService = getEncryptionService();
  private riskService = getRiskService();

  constructor(private config: SlackOAuthConfig, private credentials: SlackOAuthCredentials) {
    this.slackClient = new WebClient(credentials.accessToken);
  }

  private transformRawResponse(response: SlackOAuthRawResponse): SlackOAuthCredentials {
    if (!response.access_token) {
      throw new Error('Missing access token in Slack OAuth response');
    }

    // Encrypt sensitive tokens
    const encryptedAccessToken = this.encryptionService.encrypt(response.access_token);
    const encryptedRefreshToken = response.refresh_token 
      ? this.encryptionService.encrypt(response.refresh_token) 
      : undefined;

    return {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenType: (response.token_type === 'bot' || response.token_type === 'user') ? response.token_type : 'bot',
      scope: response.scope?.split(',') || [],
      botUserId: response.bot_user_id,
      userId: response.authed_user?.id,
      teamId: response.team?.id,
      enterpriseId: response.enterprise?.id,
      expiresAt: response.expires_in ? new Date(Date.now() + response.expires_in * 1000) : undefined
    };
  }

  async authenticateSlackWorkspace(): Promise<SlackOAuthCredentials> {
    try {
      const response = await this.slackClient.oauth.v2.access({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: this.credentials.code,
        redirect_uri: this.config.redirectUri
      });

      if (!response.ok) {
        throw new Error('Slack OAuth authentication failed');
      }

      // Assess risk of Slack connection
      const riskScore = await this.riskService.assessSlackOAuthRisk(response);

      await createAuditLogEntry({
        type: 'OAUTH_CONNECTION',
        platform: 'slack',
        riskScore: riskScore,
        details: {
          workspaceId: response.team?.id,
          userId: response.authed_user?.id
        }
      });

      return this.transformRawResponse(response);
    } catch (error) {
      // Log security-sensitive errors without exposing details
      await createAuditLogEntry({
        type: 'OAUTH_FAILURE',
        platform: 'slack',
        severity: 'HIGH',
        details: { error: 'Authentication attempt failed' }
      });

      throw new Error('Slack OAuth authentication failed');
    }
  }

  async refreshAccessToken(currentCredentials: SlackOAuthCredentials): Promise<SlackOAuthCredentials> {
    try {
      if (!currentCredentials.refreshToken) {
        throw new Error('No refresh token available');
      }

      const decryptedRefreshToken = this.encryptionService.decrypt(currentCredentials.refreshToken);
      
      const response = await this.slackClient.oauth.v2.access({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken
      });

      if (!response.ok) {
        throw new Error('Slack token refresh failed');
      }

      await createAuditLogEntry({
        type: 'OAUTH_REFRESH',
        platform: 'slack',
        details: {
          workspaceId: response.team?.id,
          userId: response.authed_user?.id
        }
      });

      return this.transformRawResponse(response);
    } catch (error) {
      await createAuditLogEntry({
        type: 'OAUTH_REFRESH_FAILURE',
        platform: 'slack',
        severity: 'CRITICAL',
        details: { error: 'Token refresh attempt failed' }
      });

      throw new Error('Slack token refresh failed');
    }
  }
}