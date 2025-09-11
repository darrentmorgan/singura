/**
 * SaaS X-Ray Shared Types - Main Export File
 * Exports all shared types for use across frontend and backend
 */

// Common utility types
export * from './utils/common';
export * from './utils/database';
export * from './utils/database-types';
export * from './utils/type-guards';
export * from './utils/job-types';
export * from './utils/socket-types';
export * from './utils/detection-patterns';
export * from './utils/google-api-client';

// Domain model types
export * from './models/automation';
export * from './models/connection';
export * from './models/events';

// API types
export * from './api/requests';
export * from './api/responses';
export * from './api/errors';
export * from './api/mock-data-toggle';

// OAuth types
export * from './oauth/credentials';
export * from './oauth/slack';
export * from './oauth/google';

// Platform-specific types
export * from './platforms/google';
export * from './platforms/microsoft';
export * from './platforms/google-workspace';