/**
 * NextAuth.js dynamic API route handler
 * Handles all OAuth authentication flows
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };