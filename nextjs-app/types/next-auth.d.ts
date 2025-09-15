/**
 * NextAuth.js type extensions
 * Extends default session and JWT types for SaaS X-Ray
 */

import { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    provider?: string;
    user: {
      id: string;
    } & DefaultSession['user'];
  }

  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
    expiresAt?: number;
  }
}