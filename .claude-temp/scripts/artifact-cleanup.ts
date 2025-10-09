#!/usr/bin/env node

/**
 * Artifact Cleanup Utilities
 *
 * Provides session management and cleanup functions to prevent artifact storage
 * from growing unbounded. Includes archival and statistical reporting.
 *
 * @module artifact-cleanup
 */

import { readFile, writeFile, readdir, rename, mkdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ARTIFACTS_DIR = join(__dirname, '..', 'artifacts');
const SESSIONS_DIR = join(ARTIFACTS_DIR, 'sessions');
const ARCHIVE_DIR = join(ARTIFACTS_DIR, 'archive');

/**
 * Session manifest structure
 */
interface Manifest {
  session_id: string;
  created: string;
  last_updated: string;
  agents: Record<string, AgentMetadata>;
  outputs: OutputMetadata[];
  context_stats: ContextStats;
}

interface AgentMetadata {
  scratchpad: string;
  tasks_completed: number;
  tasks_in_progress: number;
  last_update: string;
  status: 'active' | 'complete' | 'idle';
}

interface OutputMetadata {
  type: string;
  path: string;
  agent: string;
  task_id: string;
  created: string;
}

interface ContextStats {
  orchestrator_reads: number;
  detail_expansions: number;
  estimated_tokens_saved: number;
}

/**
 * Session metadata for listing
 */
interface SessionInfo {
  sessionId: string;
  created: Date;
  lastUpdated: Date;
  agentCount: number;
  totalTasks: number;
  tokensSaved: number;
  status: 'active' | 'complete';
  sizeBytes: number;
}

/**
 * Load the manifest for a session
 */
async function loadManifest(sessionId: string): Promise<Manifest> {
  const manifestPath = join(SESSIONS_DIR, sessionId, 'manifest.json');
  const content = await readFile(manifestPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else {
        const stats = await stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch {
    // Ignore errors (e.g., permission denied)
  }

  return totalSize;
}

/**
 * List all sessions with metadata
 *
 * @returns Array of session information
 */
export async function listSessions(): Promise<SessionInfo[]> {
  const sessions: SessionInfo[] = [];

  try {
    const sessionDirs = await readdir(SESSIONS_DIR);

    for (const sessionId of sessionDirs) {
      try {
        const manifest = await loadManifest(sessionId);
        const sessionDir = join(SESSIONS_DIR, sessionId);
        const sizeBytes = await getDirectorySize(sessionDir);

        let totalTasks = 0;
        let hasActiveAgent = false;

        for (const agentMeta of Object.values(manifest.agents)) {
          totalTasks += agentMeta.tasks_completed + agentMeta.tasks_in_progress;
          if (agentMeta.status === 'active') {
            hasActiveAgent = true;
          }
        }

        sessions.push({
          sessionId,
          created: new Date(manifest.created),
          lastUpdated: new Date(manifest.last_updated),
          agentCount: Object.keys(manifest.agents).length,
          totalTasks,
          tokensSaved: manifest.context_stats.estimated_tokens_saved,
          status: hasActiveAgent ? 'active' : 'complete',
          sizeBytes
        });
      } catch (error) {
        // Skip invalid sessions
        console.warn(`Warning: Could not load session ${sessionId}:`, error);
      }
    }

    // Sort by creation date (newest first)
    sessions.sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch {
    // Sessions directory doesn't exist yet
  }

  return sessions;
}

/**
 * Archive a session by moving it to the archive directory
 *
 * @param sessionId - Session ID to archive
 */
export async function archiveSession(sessionId: string): Promise<void> {
  const sourcePath = join(SESSIONS_DIR, sessionId);
  const targetPath = join(ARCHIVE_DIR, sessionId);

  // Ensure archive directory exists
  await mkdir(ARCHIVE_DIR, { recursive: true });

  // Move session to archive
  await rename(sourcePath, targetPath);
}

/**
 * Clean old sessions by archiving sessions older than specified days
 *
 * @param days - Number of days threshold
 * @returns Number of sessions archived
 */
export async function cleanOldSessions(days: number): Promise<number> {
  const sessions = await listSessions();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let archivedCount = 0;

  for (const session of sessions) {
    // Only archive completed sessions older than cutoff
    if (session.status === 'complete' && session.lastUpdated < cutoffDate) {
      try {
        await archiveSession(session.sessionId);
        archivedCount++;
      } catch (error) {
        console.warn(`Warning: Could not archive session ${session.sessionId}:`, error);
      }
    }
  }

  return archivedCount;
}

/**
 * Get detailed statistics for a specific session
 *
 * @param sessionId - Session ID
 * @returns Detailed session statistics
 */
export async function getSessionStats(sessionId: string): Promise<{
  manifest: Manifest;
  sizeBytes: number;
  agentDetails: Array<{
    name: string;
    tasksCompleted: number;
    tasksInProgress: number;
    status: string;
    scratchpadSize: number;
  }>;
}> {
  const manifest = await loadManifest(sessionId);
  const sessionDir = join(SESSIONS_DIR, sessionId);
  const sizeBytes = await getDirectorySize(sessionDir);

  const agentDetails = [];

  for (const [name, meta] of Object.entries(manifest.agents)) {
    const scratchpadPath = join(sessionDir, meta.scratchpad);
    let scratchpadSize = 0;

    try {
      const stats = await stat(scratchpadPath);
      scratchpadSize = stats.size;
    } catch {
      // Scratchpad doesn't exist
    }

    agentDetails.push({
      name,
      tasksCompleted: meta.tasks_completed,
      tasksInProgress: meta.tasks_in_progress,
      status: meta.status,
      scratchpadSize
    });
  }

  return {
    manifest,
    sizeBytes,
    agentDetails
  };
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format number with thousands separator
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// CLI interface
const program = new Command();

program
  .name('artifact-cleanup')
  .description('Session management and cleanup utilities for the artifact system')
  .version('1.0.0');

program
  .command('list')
  .description('List all sessions with metadata')
  .option('--sort <field>', 'Sort by: date, size, tasks (default: date)')
  .action(async (options) => {
    try {
      let sessions = await listSessions();

      // Apply sorting
      if (options.sort === 'size') {
        sessions.sort((a, b) => b.sizeBytes - a.sizeBytes);
      } else if (options.sort === 'tasks') {
        sessions.sort((a, b) => b.totalTasks - a.totalTasks);
      }

      console.log('\n=== Session List ===\n');

      if (sessions.length === 0) {
        console.log('No sessions found.');
        return;
      }

      for (const session of sessions) {
        console.log(`Session: ${session.sessionId}`);
        console.log(`  Status: ${session.status}`);
        console.log(`  Created: ${session.created.toISOString()}`);
        console.log(`  Last Updated: ${session.lastUpdated.toISOString()}`);
        console.log(`  Agents: ${session.agentCount}`);
        console.log(`  Total Tasks: ${session.totalTasks}`);
        console.log(`  Tokens Saved: ${formatNumber(session.tokensSaved)}`);
        console.log(`  Size: ${formatBytes(session.sizeBytes)}`);
        console.log();
      }

      // Summary
      const totalSessions = sessions.length;
      const totalSize = sessions.reduce((sum, s) => sum + s.sizeBytes, 0);
      const totalTokens = sessions.reduce((sum, s) => sum + s.tokensSaved, 0);

      console.log('=== Summary ===');
      console.log(`Total Sessions: ${totalSessions}`);
      console.log(`Total Size: ${formatBytes(totalSize)}`);
      console.log(`Total Tokens Saved: ${formatNumber(totalTokens)}`);
    } catch (error) {
      console.error('Failed to list sessions:', error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Archive sessions older than specified days')
  .requiredOption('-d, --days <days>', 'Archive sessions older than this many days', parseInt)
  .option('--dry-run', 'Show what would be archived without actually archiving')
  .action(async (options) => {
    try {
      const sessions = await listSessions();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.days);

      const toArchive = sessions.filter(
        s => s.status === 'complete' && s.lastUpdated < cutoffDate
      );

      if (toArchive.length === 0) {
        console.log(`No sessions older than ${options.days} days to archive.`);
        return;
      }

      console.log(`\nWill archive ${toArchive.length} session(s) older than ${options.days} days:\n`);

      for (const session of toArchive) {
        const ageInDays = Math.floor(
          (Date.now() - session.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`  ${session.sessionId} (${ageInDays} days old, ${formatBytes(session.sizeBytes)})`);
      }

      if (options.dryRun) {
        console.log('\n[Dry run - no changes made]');
        return;
      }

      console.log('\nArchiving...');
      const archivedCount = await cleanOldSessions(options.days);
      console.log(`\nArchived ${archivedCount} session(s).`);
    } catch (error) {
      console.error('Failed to clean sessions:', error);
      process.exit(1);
    }
  });

program
  .command('archive')
  .description('Archive a specific session')
  .requiredOption('-s, --session <id>', 'Session ID to archive')
  .action(async (options) => {
    try {
      await archiveSession(options.session);
      console.log(`Archived session: ${options.session}`);
    } catch (error) {
      console.error('Failed to archive session:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show detailed statistics for a session')
  .requiredOption('-s, --session <id>', 'Session ID')
  .action(async (options) => {
    try {
      const stats = await getSessionStats(options.session);

      console.log(`\n=== Session Statistics: ${options.session} ===\n`);

      console.log(`Created: ${stats.manifest.created}`);
      console.log(`Last Updated: ${stats.manifest.last_updated}`);
      console.log(`Total Size: ${formatBytes(stats.sizeBytes)}`);
      console.log();

      console.log('Context Stats:');
      console.log(`  Orchestrator Reads: ${stats.manifest.context_stats.orchestrator_reads}`);
      console.log(`  Detail Expansions: ${stats.manifest.context_stats.detail_expansions}`);
      console.log(`  Estimated Tokens Saved: ${formatNumber(stats.manifest.context_stats.estimated_tokens_saved)}`);
      console.log();

      console.log('Agents:');
      for (const agent of stats.agentDetails) {
        console.log(`  ${agent.name} [${agent.status}]`);
        console.log(`    Tasks Completed: ${agent.tasksCompleted}`);
        console.log(`    Tasks In Progress: ${agent.tasksInProgress}`);
        console.log(`    Scratchpad Size: ${formatBytes(agent.scratchpadSize)}`);
      }
      console.log();

      if (stats.manifest.outputs.length > 0) {
        console.log(`Outputs (${stats.manifest.outputs.length} total):`);
        stats.manifest.outputs.slice(-5).forEach(output => {
          console.log(`  ${output.type}: ${output.path}`);
          console.log(`    Agent: ${output.agent} | Task: ${output.task_id}`);
        });
      }
    } catch (error) {
      console.error('Failed to get session stats:', error);
      process.exit(1);
    }
  });

// Parse CLI arguments if running as script
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
