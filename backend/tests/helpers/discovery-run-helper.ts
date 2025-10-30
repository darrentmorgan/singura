/**
 * Helper function to create discovery runs for testing
 * Simplifies test setup by providing a reusable discovery run creator
 */

import { testDb } from './test-database';
import crypto from 'crypto';

export async function createDiscoveryRun(
  organizationId: string,
  platformConnectionId: string,
  overrides: Record<string, any> = {}
): Promise<string> {
  const result = await testDb.query(`
    INSERT INTO discovery_runs (
      organization_id, platform_connection_id, status,
      started_at, completed_at, automations_found
    ) VALUES (
      $1, $2, $3, NOW(), NOW(), $4
    ) RETURNING id
  `, [
    organizationId,
    platformConnectionId,
    overrides.status || 'completed',
    overrides.automations_found || 0
  ]);

  return result.rows[0].id;
}

export async function getOrCreateDiscoveryRun(
  fixtures: { organization: { id: string }; platformConnection: { id: string }; discoveryRun?: { id: string } }
): Promise<string> {
  if (fixtures.discoveryRun?.id) {
    return fixtures.discoveryRun.id;
  }

  return createDiscoveryRun(fixtures.organization.id, fixtures.platformConnection.id);
}
