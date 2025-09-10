/**
 * Services barrel exports
 * Central export file for all service modules
 */

// Mock implementations for missing services - TODO: Replace with real implementations
export const getEncryptionService = () => ({
  encrypt: (data: string): string => {
    // Mock encryption - just return the data for now (NOT SECURE - FOR DEVELOPMENT ONLY)
    console.warn('WARNING: Using mock encryption service - not suitable for production');
    return data;
  },
  decrypt: (encryptedData: string): string => {
    // Mock decryption - just return the data for now (NOT SECURE - FOR DEVELOPMENT ONLY)
    console.warn('WARNING: Using mock decryption service - not suitable for production');
    return encryptedData;
  }
});

export const createAuditLogEntry = async (entry: {
  type: string;
  platform: string;
  severity?: string;
  riskScore?: number;
  details: Record<string, unknown>;
}): Promise<void> => {
  // Mock audit logging - just log to console for now
  console.log('AUDIT LOG:', JSON.stringify(entry, null, 2));
  return Promise.resolve();
};

export const getRiskService = () => ({
  assessSlackOAuthRisk: async (response: any): Promise<number> => {
    // Mock risk assessment - return a low risk score for development
    console.log('RISK ASSESSMENT: Slack OAuth response:', response);
    return 25; // Low risk score
  }
});

// Export other services
export * from './data-provider';