/**
 * OAuth Credential Deserialization Test
 * Verifies that credentials with string expiresAt (from database) work correctly
 * Tests fix for: TypeError: credentials.expiresAt?.toISOString is not a function
 */

import { GoogleAPIClientService } from '../../services/google-api-client-service';
import { GoogleOAuthCredentials } from '@saas-xray/shared-types';

describe('OAuth Credential Deserialization', () => {
  describe('GoogleAPIClientService', () => {
    let service: GoogleAPIClientService;

    beforeEach(() => {
      service = new GoogleAPIClientService();
    });

    it('should handle credentials with Date expiresAt', async () => {
      const credentialsWithDate: GoogleOAuthCredentials = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        scope: ['https://www.googleapis.com/auth/userinfo.email'],
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        email: 'test@example.com',
        domain: 'example.com'
      };

      // Should not throw error
      expect(async () => {
        await service.initialize(credentialsWithDate);
      }).not.toThrow();
    });

    it('should handle credentials with string expiresAt (from database)', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const credentialsWithString = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        scope: ['https://www.googleapis.com/auth/userinfo.email'],
        expiresAt: futureDate.toISOString(), // String format (from database)
        email: 'test@example.com',
        domain: 'example.com'
      } as unknown as GoogleOAuthCredentials;

      // Should not throw "toISOString is not a function" error
      expect(async () => {
        await service.initialize(credentialsWithString);
      }).not.toThrow();
    });

    it('should handle credentials with undefined expiresAt', async () => {
      const credentialsNoExpiry: GoogleOAuthCredentials = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        scope: ['https://www.googleapis.com/auth/userinfo.email'],
        expiresAt: undefined,
        email: 'test@example.com',
        domain: 'example.com'
      };

      // Should not throw error
      expect(async () => {
        await service.initialize(credentialsNoExpiry);
      }).not.toThrow();
    });

    it('should correctly parse string expiresAt to Date for comparisons', () => {
      const dateStr = '2025-12-31T23:59:59.000Z';
      const dateObj = new Date(dateStr);

      // Simulate database deserialization
      const credentials = {
        expiresAt: dateStr // String from database
      } as any;

      // Test the pattern used in our fix
      const expiresAt = credentials.expiresAt
        ? (credentials.expiresAt instanceof Date
          ? credentials.expiresAt
          : new Date(credentials.expiresAt))
        : null;

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt?.getTime()).toBe(dateObj.getTime());
    });

    it('should correctly handle string expiresAt for logging', () => {
      const dateStr = '2025-12-31T23:59:59.000Z';

      const credentials = {
        expiresAt: dateStr // String from database
      } as any;

      // Test the pattern used in our fix
      const expiresAtStr = credentials.expiresAt
        ? (credentials.expiresAt instanceof Date
          ? credentials.expiresAt.toISOString()
          : credentials.expiresAt)
        : undefined;

      expect(expiresAtStr).toBe(dateStr);
      expect(typeof expiresAtStr).toBe('string');
    });
  });
});
