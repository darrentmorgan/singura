/**
 * Jest configuration for feedback security tests
 * Minimal configuration without database setup
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*security.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  // Skip global setup for unit tests
  globalSetup: undefined,
  globalTeardown: undefined,
  setupFilesAfterEnv: undefined
};
