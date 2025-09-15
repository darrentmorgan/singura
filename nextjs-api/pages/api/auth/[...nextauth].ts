import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Enhanced interfaces for Enterprise OAuth
interface ExtendedJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  refreshTokenExpires?: number;
  scope?: string;
  organizationId?: string;
  permissions?: string[];
}

interface ExtendedSession extends Session {
  accessToken?: string;
  error?: string;
  organizationId?: string;
  permissions?: string[];
}

/**
 * NextAuth.js Configuration for Enterprise OAuth
 * Maintains compatibility with existing Express OAuth patterns
 * Supports Google Workspace and Slack (Slack via custom provider)
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.readonly',
            'https://www.googleapis.com/auth/admin.reports.audit.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    }),
    // Custom Slack Provider
    {
      id: 'slack',
      name: 'Slack',
      type: 'oauth',
      authorization: {
        url: 'https://slack.com/oauth/v2/authorize',
        params: {
          scope: [
            'channels:read',
            'groups:read',
            'im:read',
            'mpim:read',
            'users:read',
            'users:read.email',
            'team:read',
            'audit_logs:read',
            'files:read',
            'search:read'
          ].join(','),
          user_scope: 'identity.basic,identity.email,identity.team'
        }
      },
      token: 'https://slack.com/api/oauth.v2.access',
      userinfo: {
        url: 'https://slack.com/api/users.identity',
        async request({ tokens }) {
          const response = await fetch('https://slack.com/api/users.identity', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });
          return await response.json();
        }
      },
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      profile(profile: any) {
        return {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          image: profile.user.image_24,
          team: profile.team?.name
        };
      }
    }
  ],
  
  callbacks: {
    async jwt({ token, account, profile }): Promise<ExtendedJWT> {
      const extendedToken = token as ExtendedJWT;

      // Initial sign in
      if (account) {
        extendedToken.accessToken = account.access_token;
        extendedToken.refreshToken = account.refresh_token;
        extendedToken.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
        extendedToken.scope = account.scope;
        
        // Set organization context (in real implementation, derive from domain/team)
        extendedToken.organizationId = 'default-org';
        extendedToken.permissions = ['read', 'write'];
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (extendedToken.accessTokenExpires || 0)) {
        return extendedToken;
      }

      // Access token has expired, try to refresh it
      return await refreshAccessToken(extendedToken);
    },

    async session({ session, token }): Promise<ExtendedSession> {
      const extendedSession = session as ExtendedSession;
      const extendedToken = token as ExtendedJWT;

      extendedSession.accessToken = extendedToken.accessToken;
      extendedSession.organizationId = extendedToken.organizationId;
      extendedSession.permissions = extendedToken.permissions;
      
      if (extendedToken.error) {
        extendedSession.error = extendedToken.error as string;
      }

      return extendedSession;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
};

/**
 * Refresh access token - matches Express OAuth service pattern
 */
async function refreshAccessToken(token: ExtendedJWT): Promise<ExtendedJWT> {
  try {
    const url = 'https://oauth2.googleapis.com/token';
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken!,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export default NextAuth(authOptions);