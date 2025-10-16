module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/src/**/*.test.ts',
    '**/__tests__/**/*.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@singura/shared-types)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8', // Use v8 instead of babel for TypeScript coverage
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  maxWorkers: '50%',
  // Environment variables for testing
  setupFiles: ['<rootDir>/tests/env.ts'],
  // Remove ESM for now as it's causing issues
  // extensionsToTreatAsEsm: ['.ts'],
  // Module mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@singura/shared-types$': '<rootDir>/../shared-types/src/index.ts'
  },
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};