/**
 * NextAuth.js configuration for SaaS X-Ray
 * Enterprise OAuth integration for Google Workspace and Slack
 * Maintains security standards and credential encryption
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/admin.directory.group.readonly https://www.googleapis.com/auth/admin.reports.audit.readonly',
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    }),
    // Slack OAuth provider will be added via custom provider since NextAuth doesn't have built-in Slack support
    {
      id: 'slack',
      name: 'Slack',
      type: 'oauth',
      authorization: {
        url: 'https://slack.com/oauth/v2/authorize',
        params: {
          scope: 'admin channels:read groups:read im:read mpim:read users:read team:read files:read chat:write',
          user_scope: 'identity.basic identity.email identity.team'
        }
      },
      token: 'https://slack.com/api/oauth.v2.access',
      userinfo: 'https://slack.com/api/users.identity',
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          image: profile.user.image_24
        };
      }
    }
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist OAuth tokens for API access
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.provider = token.provider as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Ensure redirects stay within the app domain
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  debug: process.env.NODE_ENV === 'development'
};