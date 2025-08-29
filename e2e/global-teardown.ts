/**
 * Global Teardown for Playwright Tests
 * Cleans up after all tests have completed
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  try {
    // Clean up authentication state file
    const authStatePath = path.join(__dirname, '../test-results/auth-state.json');
    try {
      await fs.unlink(authStatePath);
      console.log('✅ Authentication state cleaned up');
    } catch (error) {
      // File may not exist, which is fine
    }

    // Clean up temporary test files
    const tempFiles = [
      'test-results/temp-*.json',
      'test-results/debug-*.log',
    ];

    // Note: In a real scenario, you might want to clean up test data
    // from the database or reset any modified state
    
    console.log('✅ Global teardown completed');
    
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
  }
}

export default globalTeardown;