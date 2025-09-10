// Slack OAuth specific types

export type SlackTokenType = 'bot' | 'user';

export interface SlackOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes: string[];
}

export interface SlackOAuthCredentials {
  accessToken: string;
  tokenType: SlackTokenType;
  scope: string | string[];
  code?: string;  // Added for initial authorization
  botUserId?: string;
  userId?: string;
  teamId?: string;
  enterpriseId?: string;
  expiresAt?: Date;
  refreshToken?: string;
}

export interface SlackOAuthRawResponse {
  ok: boolean;
  access_token?: string;  // Made optional to match Slack API response
  token_type?: string;  // Made string to match Slack API response
  scope?: string;
  bot_user_id?: string;
  authed_user?: {
    id?: string;
  };
  team?: {
    id?: string;
    name?: string;
  };
  enterprise?: {
    id?: string;
    name?: string;
  };
  expires_in?: number;
  refresh_token?: string;
}

export type SlackOAuthResponse = Pick<SlackOAuthCredentials, 
  'accessToken' | 
  'refreshToken' | 
  'tokenType' | 
  'scope' | 
  'botUserId' | 
  'userId' | 
  'teamId' | 
  'enterpriseId' | 
  'expiresAt'
>;