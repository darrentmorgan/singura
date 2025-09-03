/**
 * Shared TypeScript types for SaaS X-Ray platform
 * This package provides type definitions shared between frontend and backend
 */

// Core domain models
export * from './models';

// API types
export * from './api/requests';
export * from './api/responses';
export * from './api/errors';

// OAuth and security types
export * from './oauth/credentials';
export * from './oauth/platforms';
// Note: oauth/flows imports from models, so exporting separately to avoid conflicts

// Utility types
export * from './utils/common';
export * from './utils/database';
export * from './utils/validation';

// Platform-specific types
export * from './platforms/slack';
export * from './platforms/google';
export * from './platforms/microsoft';