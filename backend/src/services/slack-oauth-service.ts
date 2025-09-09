import { WebClient } from '@slack/web-api';
import { OAuth2Client } from 'google-auth-library';
import { SlackOAuthResponse, SlackAuthCredentials } from '@saas-xray/shared-types';
import { 
  getEncryptionService, 
  createAuditLogEntry, 
  getRiskService 
} from './index';

export class SlackOAuthService {
  private slackClient: WebClient;
  private encryptionService = getEncryptionService();
  private riskService = getRiskService();

  constructor(private credentials: SlackAuthCredentials) {
    this.slackClient = new WebClient(credentials.accessToken);
  }

  async authenticateSlackWorkspace(): Promise<SlackOAuthResponse> {
    try {
      const response = await this.slackClient.oauth.v2.access({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code: this.credentials.authorizationCode
      });

      if (!response.ok) {
        throw new Error('Slack OAuth authentication failed');
      }

      // Encrypt sensitive tokens
      const encryptedAccessToken = this.encryptionService.encrypt(response.access_token);
      const encryptedRefreshToken = response.refresh_token 
        ? this.encryptionService.encrypt(response.refresh_token) 
        : null;

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

      return {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        teamId: response.team?.id,
        teamName: response.team?.name,
        userId: response.authed_user?.id,
        scope: response.scope?.split(',') || [],
        riskScore: riskScore
      };
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

  async refreshAccessToken(refreshToken: string): Promise<SlackOAuthResponse> {
    try {
      const decryptedRefreshToken = this.encryptionService.decrypt(refreshToken);
      
      const response = await this.slackClient.oauth.v2.access({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken
      });

      if (!response.ok) {
        throw new Error('Slack token refresh failed');
      }

      const encryptedAccessToken = this.encryptionService.encrypt(response.access_token);
      const encryptedRefreshToken = response.refresh_token 
        ? this.encryptionService.encrypt(response.refresh_token) 
        : null;

      return {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        teamId: response.team?.id,
        teamName: response.team?.name,
        userId: response.authed_user?.id,
        scope: response.scope?.split(',') || [],
        riskScore: await this.riskService.assessSlackOAuthRisk(response)
      };
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