#!/usr/bin/env node

/**
 * Artifact Read Utilities
 *
 * Provides functions for orchestrators to read agent work with selective detail expansion.
 * Enables 90%+ context reduction by loading only summaries by default, with on-demand
 * detail retrieval.
 *
 * @module artifact-read
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ARTIFACTS_DIR = join(__dirname, '..', 'artifacts');
const SESSIONS_DIR = join(ARTIFACTS_DIR, 'sessions');
const SHARED_DIR = join(ARTIFACTS_DIR, 'shared');
const CURRENT_SESSION_FILE = join(ARTIFACTS_DIR, '.current-session');

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
 * Agent summary structure
 */
interface AgentSummary {
  agentName: string;
  status: string;
  tasksCompleted: number;
  tasksInProgress: number;
  lastUpdate: string;
  tasks: TaskSummary[];
}

interface TaskSummary {
  taskId: string;
  title: string;
  status: string;
  summary: string;
  filesModified: string[];
}

/**
 * Task detail structure
 */
interface TaskDetail extends TaskSummary {
  started: string;
  completed?: string;
  decisions: string[];
  nextSteps: string[];
  details: string;
}

/**
 * Get the current session ID
 */
async function getCurrentSession(): Promise<string> {
  try {
    const sessionId = await readFile(CURRENT_SESSION_FILE, 'utf-8');
    return sessionId.trim();
  } catch {
    throw new Error('No active session found. Run artifact-write --init-session first.');
  }
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
 * Parse a task from scratchpad content (summary only)
 */
function parseTaskSummary(taskContent: string): TaskSummary | null {
  const titleMatch = taskContent.match(/## Task \d+: (.+)/);
  const idMatch = taskContent.match(/\*\*ID\*\*: (task-\d+)/);
  const statusMatch = taskContent.match(/\*\*Status\*\*: (.+)/);
  const summaryMatch = taskContent.match(/\*\*Summary\*\*:\s*\n(.+?)(?=\n\*\*|<details>|---|\n##|$)/s);
  const filesMatch = taskContent.match(/\*\*Files Modified\*\*:\s*\n((?:- .+\n?)+)/);

  if (!titleMatch || !idMatch || !statusMatch) {
    return null;
  }

  const filesModified: string[] = [];
  if (filesMatch) {
    const fileLines = filesMatch[1].split('\n').filter(line => line.trim());
    fileLines.forEach(line => {
      const fileMatch = line.match(/- (.+?) \(/);
      if (fileMatch) {
        filesModified.push(fileMatch[1]);
      }
    });
  }

  return {
    taskId: idMatch[1],
    title: titleMatch[1].trim(),
    status: statusMatch[1].trim(),
    summary: summaryMatch ? summaryMatch[1].trim() : '',
    filesModified
  };
}

/**
 * Parse a task with full details
 */
function parseTaskDetail(taskContent: string): TaskDetail | null {
  const summary = parseTaskSummary(taskContent);
  if (!summary) {
    return null;
  }

  const startedMatch = taskContent.match(/\*\*Started\*\*: (.+)/);
  const completedMatch = taskContent.match(/\*\*Completed\*\*: (.+)/);
  const decisionsMatch = taskContent.match(/\*\*Key Decisions\*\*:\s*\n((?:- .+\n?)+)/);
  const nextStepsMatch = taskContent.match(/\*\*Next Steps\*\*:\s*\n((?:- .+\n?)+)/);
  const detailsMatch = taskContent.match(/<details>.*?<summary>.*?<\/summary>\s*\n(.+?)\n<\/details>/s);

  const decisions: string[] = [];
  if (decisionsMatch) {
    decisionsMatch[1].split('\n').forEach(line => {
      const match = line.match(/^- (.+)/);
      if (match) decisions.push(match[1].trim());
    });
  }

  const nextSteps: string[] = [];
  if (nextStepsMatch) {
    nextStepsMatch[1].split('\n').forEach(line => {
      const match = line.match(/^- (.+)/);
      if (match) nextSteps.push(match[1].trim());
    });
  }

  return {
    ...summary,
    started: startedMatch ? startedMatch[1].trim() : '',
    completed: completedMatch ? completedMatch[1].trim() : undefined,
    decisions,
    nextSteps,
    details: detailsMatch ? detailsMatch[1].trim() : ''
  };
}

/**
 * Read an agent's scratchpad and return summary (excluding details sections)
 *
 * @param agentName - Name of the agent
 * @param sessionId - Optional session ID (uses current if not provided)
 * @returns Agent summary with task summaries
 */
export async function readAgentSummary(agentName: string, sessionId?: string): Promise<AgentSummary> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  const manifest = await loadManifest(sessionId);
  const agentMeta = manifest.agents[agentName];

  if (!agentMeta) {
    throw new Error(`Agent ${agentName} not found in session ${sessionId}`);
  }

  const scratchpadPath = join(SESSIONS_DIR, sessionId, agentMeta.scratchpad);
  const content = await readFile(scratchpadPath, 'utf-8');

  // Split into tasks
  const taskSections = content.split(/(?=## Task \d+:)/).slice(1);
  const tasks: TaskSummary[] = taskSections
    .map(parseTaskSummary)
    .filter((task): task is TaskSummary => task !== null);

  return {
    agentName,
    status: agentMeta.status,
    tasksCompleted: agentMeta.tasks_completed,
    tasksInProgress: agentMeta.tasks_in_progress,
    lastUpdate: agentMeta.last_update,
    tasks
  };
}

/**
 * Read full details for a specific task
 *
 * @param agentName - Name of the agent
 * @param taskId - Task ID (e.g., 'task-1')
 * @param sessionId - Optional session ID (uses current if not provided)
 * @returns Full task details including implementation notes
 */
export async function readTaskDetails(
  agentName: string,
  taskId: string,
  sessionId?: string
): Promise<TaskDetail> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  const manifest = await loadManifest(sessionId);
  const agentMeta = manifest.agents[agentName];

  if (!agentMeta) {
    throw new Error(`Agent ${agentName} not found in session ${sessionId}`);
  }

  const scratchpadPath = join(SESSIONS_DIR, sessionId, agentMeta.scratchpad);
  const content = await readFile(scratchpadPath, 'utf-8');

  // Find the specific task
  const taskRegex = new RegExp(`(## Task \\d+:.*?\\*\\*ID\\*\\*: ${taskId}.*?)(?=\\n---\\n|$)`, 's');
  const match = content.match(taskRegex);

  if (!match) {
    throw new Error(`Task ${taskId} not found in ${agentName}'s scratchpad`);
  }

  const taskDetail = parseTaskDetail(match[1]);
  if (!taskDetail) {
    throw new Error(`Failed to parse task ${taskId}`);
  }

  // Update context stats
  manifest.context_stats.detail_expansions++;
  const manifestPath = join(SESSIONS_DIR, sessionId, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return taskDetail;
}

/**
 * Get summaries for all agents in a session
 *
 * @param sessionId - Optional session ID (uses current if not provided)
 * @returns Array of agent summaries
 */
export async function getAllAgentSummaries(sessionId?: string): Promise<AgentSummary[]> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  const manifest = await loadManifest(sessionId);
  const agentNames = Object.keys(manifest.agents);

  const summaries = await Promise.all(
    agentNames.map(name => readAgentSummary(name, sessionId))
  );

  // Update context stats
  manifest.context_stats.orchestrator_reads++;
  const manifestPath = join(SESSIONS_DIR, sessionId, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return summaries;
}

/**
 * Search across all artifacts in a session
 *
 * @param query - Search query (case-insensitive)
 * @param scope - Optional scope: 'summaries' or 'all' (default: 'all')
 * @param sessionId - Optional session ID (uses current if not provided)
 * @returns Array of matching results
 */
export async function searchArtifacts(
  query: string,
  scope: 'summaries' | 'all' = 'all',
  sessionId?: string
): Promise<Array<{ agent: string; taskId: string; match: string }>> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  const manifest = await loadManifest(sessionId);
  const results: Array<{ agent: string; taskId: string; match: string }> = [];
  const queryLower = query.toLowerCase();

  for (const agentName of Object.keys(manifest.agents)) {
    const scratchpadPath = join(SESSIONS_DIR, sessionId, manifest.agents[agentName].scratchpad);
    let content = await readFile(scratchpadPath, 'utf-8');

    // If only searching summaries, remove details sections
    if (scope === 'summaries') {
      content = content.replace(/<details>.*?<\/details>/gs, '');
    }

    // Split into tasks
    const taskSections = content.split(/(?=## Task \d+:)/).slice(1);

    for (const taskContent of taskSections) {
      if (taskContent.toLowerCase().includes(queryLower)) {
        const idMatch = taskContent.match(/\*\*ID\*\*: (task-\d+)/);
        const titleMatch = taskContent.match(/## Task \d+: (.+)/);

        if (idMatch && titleMatch) {
          // Extract context around match
          const lines = taskContent.split('\n');
          const matchingLine = lines.find(line => line.toLowerCase().includes(queryLower)) || '';

          results.push({
            agent: agentName,
            taskId: idMatch[1],
            match: `${titleMatch[1]}: ${matchingLine.trim()}`
          });
        }
      }
    }
  }

  return results;
}

/**
 * Read a file from the shared knowledge directory
 *
 * @param filename - Filename in shared directory (e.g., 'decisions.md')
 * @returns File content
 */
export async function readSharedKnowledge(filename: string): Promise<string> {
  const filePath = join(SHARED_DIR, filename);
  return await readFile(filePath, 'utf-8');
}

// Import writeFile for updating manifest
import { writeFile } from 'fs/promises';

// CLI interface
const program = new Command();

program
  .name('artifact-read')
  .description('Read utilities for the artifact system')
  .version('1.0.0');

program
  .command('summary')
  .description('Read agent summary (without details)')
  .requiredOption('-a, --agent <name>', 'Agent name')
  .option('-s, --session <id>', 'Session ID (uses current if not provided)')
  .action(async (options) => {
    try {
      const summary = await readAgentSummary(options.agent, options.session);

      console.log(`\nAgent: ${summary.agentName}`);
      console.log(`Status: ${summary.status}`);
      console.log(`Tasks Completed: ${summary.tasksCompleted}`);
      console.log(`Tasks In Progress: ${summary.tasksInProgress}`);
      console.log(`Last Update: ${summary.lastUpdate}`);
      console.log('\nTasks:');

      for (const task of summary.tasks) {
        console.log(`\n  ${task.taskId}: ${task.title}`);
        console.log(`  Status: ${task.status}`);
        console.log(`  Summary: ${task.summary}`);
        if (task.filesModified.length > 0) {
          console.log(`  Files: ${task.filesModified.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('Failed to read agent summary:', error);
      process.exit(1);
    }
  });

program
  .command('task')
  .description('Read full task details')
  .requiredOption('-a, --agent <name>', 'Agent name')
  .requiredOption('-t, --task <id>', 'Task ID')
  .option('-s, --session <id>', 'Session ID (uses current if not provided)')
  .action(async (options) => {
    try {
      const detail = await readTaskDetails(options.agent, options.task, options.session);

      console.log(`\nTask: ${detail.title}`);
      console.log(`ID: ${detail.taskId}`);
      console.log(`Status: ${detail.status}`);
      console.log(`Started: ${detail.started}`);
      if (detail.completed) {
        console.log(`Completed: ${detail.completed}`);
      }

      console.log(`\nSummary:\n${detail.summary}`);

      if (detail.filesModified.length > 0) {
        console.log(`\nFiles Modified:\n${detail.filesModified.map(f => `  - ${f}`).join('\n')}`);
      }

      if (detail.decisions.length > 0) {
        console.log(`\nKey Decisions:\n${detail.decisions.map(d => `  - ${d}`).join('\n')}`);
      }

      if (detail.nextSteps.length > 0) {
        console.log(`\nNext Steps:\n${detail.nextSteps.map(s => `  - ${s}`).join('\n')}`);
      }

      if (detail.details) {
        console.log(`\nImplementation Details:\n${detail.details}`);
      }
    } catch (error) {
      console.error('Failed to read task details:', error);
      process.exit(1);
    }
  });

program
  .command('all')
  .description('Read all agent summaries for session')
  .option('-s, --session <id>', 'Session ID (uses current if not provided)')
  .action(async (options) => {
    try {
      const summaries = await getAllAgentSummaries(options.session);

      console.log('\n=== Session Summary ===\n');

      for (const summary of summaries) {
        console.log(`${summary.agentName}: ${summary.status}`);
        console.log(`  Completed: ${summary.tasksCompleted} | In Progress: ${summary.tasksInProgress}`);
        console.log(`  Last Update: ${summary.lastUpdate}`);

        if (summary.tasks.length > 0) {
          console.log('  Recent Tasks:');
          summary.tasks.slice(-3).forEach(task => {
            console.log(`    - ${task.taskId}: ${task.title} [${task.status}]`);
          });
        }
        console.log();
      }
    } catch (error) {
      console.error('Failed to read session summaries:', error);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Search across artifacts')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('--scope <scope>', 'Search scope: summaries or all (default: all)')
  .option('-s, --session <id>', 'Session ID (uses current if not provided)')
  .action(async (options) => {
    try {
      const results = await searchArtifacts(options.query, options.scope || 'all', options.session);

      console.log(`\nFound ${results.length} matches for "${options.query}":\n`);

      for (const result of results) {
        console.log(`${result.agent} / ${result.taskId}:`);
        console.log(`  ${result.match}\n`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      process.exit(1);
    }
  });

program
  .command('shared')
  .description('Read shared knowledge file')
  .requiredOption('-f, --file <filename>', 'Filename in shared directory')
  .action(async (options) => {
    try {
      const content = await readSharedKnowledge(options.file);
      console.log(content);
    } catch (error) {
      console.error('Failed to read shared knowledge:', error);
      process.exit(1);
    }
  });

// Parse CLI arguments if running as script
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
