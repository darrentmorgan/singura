/**
 * Express.js TypeScript augmentations
 * Extends the Express Request interface with custom properties
 */

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        userId: string;
        organizationId: string;
        permissions: string[];
        sessionId: string;
        email?: string;
        name?: string;
        isAdmin?: boolean;
      };
    }
  }
}

export {};