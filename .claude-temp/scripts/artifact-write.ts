#!/usr/bin/env node

/**
 * Artifact Write Utilities
 *
 * Provides functions for agents to write structured notes to their scratchpads,
 * manage sessions, and track outputs. Reduces context usage by persisting
 * implementation details to disk.
 *
 * @module artifact-write
 */

import { readFile, writeFile, mkdir, readdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ARTIFACTS_DIR = join(__dirname, '..', 'artifacts');
const SESSIONS_DIR = join(ARTIFACTS_DIR, 'sessions');
const TEMPLATES_DIR = join(ARTIFACTS_DIR, 'templates');
const CURRENT_SESSION_FILE = join(ARTIFACTS_DIR, '.current-session');

/**
 * Task data structure for scratchpad entries
 */
interface TaskData {
  title: string;
  status: 'in-progress' | 'complete' | 'failed';
  summary: string;
  filesModified?: Array<{ path: string; action: string; lineCount?: number }>;
  decisions?: string[];
  nextSteps?: string[];
  details?: string;
  started?: string;
  completed?: string;
}

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
 * Get the current session ID or create a new one
 */
async function getCurrentSession(): Promise<string> {
  try {
    const sessionId = await readFile(CURRENT_SESSION_FILE, 'utf-8');
    return sessionId.trim();
  } catch {
    // No current session, create new one
    return await initSession();
  }
}

/**
 * Set the current session ID
 */
async function setCurrentSession(sessionId: string): Promise<void> {
  await mkdir(dirname(CURRENT_SESSION_FILE), { recursive: true });
  await writeFile(CURRENT_SESSION_FILE, sessionId, 'utf-8');
}

/**
 * Generate a session ID in format YYYY-MM-DD_HHmm
 */
function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${date}_${hours}${minutes}`;
}

/**
 * Initialize a new session with manifest and directory structure
 *
 * @returns Session ID
 */
export async function initSession(): Promise<string> {
  const sessionId = generateSessionId();
  const sessionDir = join(SESSIONS_DIR, sessionId);
  const outputsDir = join(sessionDir, 'outputs');

  // Create directories
  await mkdir(outputsDir, { recursive: true });

  // Load manifest template
  const templatePath = join(TEMPLATES_DIR, 'manifest.json');
  let manifestContent = await readFile(templatePath, 'utf-8');

  // Replace template variables
  const timestamp = new Date().toISOString();
  manifestContent = manifestContent
    .replace(/{{SESSION_ID}}/g, sessionId)
    .replace(/{{TIMESTAMP}}/g, timestamp);

  // Write manifest
  const manifestPath = join(sessionDir, 'manifest.json');
  await writeFile(manifestPath, manifestContent, 'utf-8');

  // Set as current session
  await setCurrentSession(sessionId);

  return sessionId;
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
 * Save the manifest for a session
 */
async function saveManifest(sessionId: string, manifest: Manifest): Promise<void> {
  manifest.last_updated = new Date().toISOString();
  const manifestPath = join(SESSIONS_DIR, sessionId, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Register an agent in the current session manifest
 *
 * @param agentName - Name of the agent (e.g., 'frontend-developer')
 * @param sessionId - Optional session ID (uses current if not provided)
 */
export async function registerAgent(agentName: string, sessionId?: string): Promise<void> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  const manifest = await loadManifest(sessionId);

  // Check if agent already registered
  if (manifest.agents[agentName]) {
    return;
  }

  // Initialize agent scratchpad if it doesn't exist
  const scratchpadPath = join(SESSIONS_DIR, sessionId, `${agentName}.md`);
  try {
    await access(scratchpadPath);
  } catch {
    // Create scratchpad from template
    const templatePath = join(TEMPLATES_DIR, 'agent-scratchpad.md');
    let content = await readFile(templatePath, 'utf-8');

    content = content
      .replace(/{{AGENT_NAME}}/g, agentName)
      .replace(/{{SESSION_ID}}/g, sessionId)
      .replace(/{{TIMESTAMP}}/g, new Date().toISOString());

    await writeFile(scratchpadPath, content, 'utf-8');
  }

  // Register in manifest
  manifest.agents[agentName] = {
    scratchpad: `${agentName}.md`,
    tasks_completed: 0,
    tasks_in_progress: 0,
    last_update: new Date().toISOString(),
    status: 'active'
  };

  await saveManifest(sessionId, manifest);
}

/**
 * Get the next task number for an agent
 */
async function getNextTaskNumber(agentName: string, sessionId: string): Promise<number> {
  const scratchpadPath = join(SESSIONS_DIR, sessionId, `${agentName}.md`);
  const content = await readFile(scratchpadPath, 'utf-8');

  // Find all task numbers
  const taskRegex = /## Task (\d+):/g;
  const matches = Array.from(content.matchAll(taskRegex));

  if (matches.length === 0) {
    return 1;
  }

  const taskNumbers = matches.map(m => parseInt(m[1], 10));
  return Math.max(...taskNumbers) + 1;
}

/**
 * Format task status with emoji
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'in-progress':
      return '⏳ In Progress';
    case 'complete':
      return '✓ Complete';
    case 'failed':
      return '✗ Failed';
    default:
      return status;
  }
}

/**
 * Append a task to an agent's scratchpad with proper formatting
 *
 * @param agentName - Name of the agent
 * @param task - Task data to append
 * @param sessionId - Optional session ID (uses current if not provided)
 * @returns Task ID
 */
export async function appendToScratchpad(
  agentName: string,
  task: TaskData,
  sessionId?: string
): Promise<string> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  // Ensure agent is registered
  await registerAgent(agentName, sessionId);

  const taskNumber = await getNextTaskNumber(agentName, sessionId);
  const taskId = `task-${taskNumber}`;
  const timestamp = new Date().toISOString();

  // Build task entry
  let taskEntry = `\n## Task ${taskNumber}: ${task.title}\n`;
  taskEntry += `**ID**: ${taskId}\n`;
  taskEntry += `**Status**: ${formatStatus(task.status)}\n`;
  taskEntry += `**Started**: ${task.started || timestamp}\n`;

  if (task.status === 'complete' || task.status === 'failed') {
    taskEntry += `**Completed**: ${task.completed || timestamp}\n`;
  }

  if (task.filesModified && task.filesModified.length > 0) {
    taskEntry += `\n**Files Modified**:\n`;
    for (const file of task.filesModified) {
      const lineInfo = file.lineCount ? `, ${file.lineCount} lines` : '';
      taskEntry += `- ${file.path} (${file.action}${lineInfo})\n`;
    }
  }

  taskEntry += `\n**Summary**:\n${task.summary}\n`;

  if (task.decisions && task.decisions.length > 0) {
    taskEntry += `\n**Key Decisions**:\n`;
    for (const decision of task.decisions) {
      taskEntry += `- ${decision}\n`;
    }
  }

  if (task.nextSteps && task.nextSteps.length > 0) {
    taskEntry += `\n**Next Steps**:\n`;
    for (const step of task.nextSteps) {
      taskEntry += `- ${step}\n`;
    }
  }

  if (task.details) {
    const detailLines = task.details.split('\n').length;
    const autoCollapse = detailLines > 200;

    taskEntry += `\n**Details**:\n`;
    taskEntry += `<details>\n`;
    taskEntry += `<summary>Implementation Notes${autoCollapse ? ' (Click to expand)' : ''}</summary>\n\n`;
    taskEntry += `${task.details}\n\n`;
    taskEntry += `</details>\n`;
  }

  taskEntry += `\n---\n`;

  // Append to scratchpad
  const scratchpadPath = join(SESSIONS_DIR, sessionId, `${agentName}.md`);
  const existingContent = await readFile(scratchpadPath, 'utf-8');
  await writeFile(scratchpadPath, existingContent + taskEntry, 'utf-8');

  // Update manifest
  const manifest = await loadManifest(sessionId);
  const agentMeta = manifest.agents[agentName];

  if (task.status === 'complete') {
    agentMeta.tasks_completed++;
  } else if (task.status === 'in-progress') {
    agentMeta.tasks_in_progress++;
  }

  agentMeta.last_update = timestamp;
  agentMeta.status = task.status === 'complete' && agentMeta.tasks_in_progress === 0
    ? 'complete'
    : 'active';

  // Update context stats (estimate 4 tokens per line of details)
  if (task.details) {
    const detailLines = task.details.split('\n').length;
    manifest.context_stats.estimated_tokens_saved += detailLines * 4;
  }

  await saveManifest(sessionId, manifest);

  return taskId;
}

/**
 * Update the status of an existing task
 *
 * @param agentName - Name of the agent
 * @param taskId - Task ID (e.g., 'task-1')
 * @param status - New status
 * @param sessionId - Optional session ID (uses current if not provided)
 */
export async function updateTaskStatus(
  agentName: string,
  taskId: string,
  status: 'in-progress' | 'complete' | 'failed',
  sessionId?: string
): Promise<void> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  const scratchpadPath = join(SESSIONS_DIR, sessionId, `${agentName}.md`);
  let content = await readFile(scratchpadPath, 'utf-8');

  // Find the task
  const taskRegex = new RegExp(
    `(## Task \\d+:.*?\\n\\*\\*ID\\*\\*: ${taskId}\\n\\*\\*Status\\*\\*: )([^\\n]+)`,
    'g'
  );

  const match = taskRegex.exec(content);
  if (!match) {
    throw new Error(`Task ${taskId} not found in ${agentName}'s scratchpad`);
  }

  const oldStatus = match[2];
  const newStatusFormatted = formatStatus(status);

  // Update status
  content = content.replace(taskRegex, `$1${newStatusFormatted}`);

  // Add completion timestamp if completing
  if ((status === 'complete' || status === 'failed') && !oldStatus.includes('Complete') && !oldStatus.includes('Failed')) {
    const completedLine = `**Completed**: ${new Date().toISOString()}\n`;
    const insertAfter = `**ID**: ${taskId}\n**Status**: ${newStatusFormatted}\n**Started**:`;
    content = content.replace(
      new RegExp(`(\\*\\*ID\\*\\*: ${taskId}\\n\\*\\*Status\\*\\*: ${newStatusFormatted}\\n\\*\\*Started\\*\\*: [^\\n]+\\n)`),
      `$1${completedLine}`
    );
  }

  await writeFile(scratchpadPath, content, 'utf-8');

  // Update manifest
  const manifest = await loadManifest(sessionId);
  const agentMeta = manifest.agents[agentName];

  // Update counts based on old and new status
  if (oldStatus.includes('In Progress') && (status === 'complete' || status === 'failed')) {
    agentMeta.tasks_in_progress--;
    if (status === 'complete') {
      agentMeta.tasks_completed++;
    }
  } else if (!oldStatus.includes('In Progress') && status === 'in-progress') {
    agentMeta.tasks_in_progress++;
  }

  agentMeta.last_update = new Date().toISOString();
  agentMeta.status = agentMeta.tasks_in_progress === 0 ? 'complete' : 'active';

  await saveManifest(sessionId, manifest);
}

/**
 * Add an output file to the session manifest
 *
 * @param output - Output metadata
 * @param sessionId - Optional session ID (uses current if not provided)
 */
export async function addOutput(
  output: Omit<OutputMetadata, 'created'>,
  sessionId?: string
): Promise<void> {
  if (!sessionId) {
    sessionId = await getCurrentSession();
  }

  const manifest = await loadManifest(sessionId);

  manifest.outputs.push({
    ...output,
    created: new Date().toISOString()
  });

  await saveManifest(sessionId, manifest);
}

// CLI interface
const program = new Command();

program
  .name('artifact-write')
  .description('Write utilities for the artifact system')
  .version('1.0.0');

program
  .command('init-session')
  .description('Initialize a new session')
  .action(async () => {
    try {
      const sessionId = await initSession();
      console.log(`Created new session: ${sessionId}`);
      console.log(`Session directory: ${join(SESSIONS_DIR, sessionId)}`);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      process.exit(1);
    }
  });

program
  .command('register-agent')
  .description('Register an agent in the current session')
  .requiredOption('-a, --agent <name>', 'Agent name')
  .option('-s, --session <id>', 'Session ID (uses current if not provided)')
  .action(async (options) => {
    try {
      await registerAgent(options.agent, options.session);
      console.log(`Registered agent: ${options.agent}`);
    } catch (error) {
      console.error('Failed to register agent:', error);
      process.exit(1);
    }
  });

program
  .command('append-task')
  .description('Append a task to agent scratchpad')
  .requiredOption('-a, --agent <name>', 'Agent name')
  .requiredOption('-t, --title <title>', 'Task title')
  .requiredOption('--status <status>', 'Task status (in-progress, complete, failed)')
  .requiredOption('--summary <summary>', 'Task summary')
  .option('-s, --session <id>', 'Session ID (uses current if not provided)')
  .action(async (options) => {
    try {
      const taskData: TaskData = {
        title: options.title,
        status: options.status,
        summary: options.summary
      };

      const taskId = await appendToScratchpad(options.agent, taskData, options.session);
      console.log(`Appended task: ${taskId}`);
    } catch (error) {
      console.error('Failed to append task:', error);
      process.exit(1);
    }
  });

program
  .command('update-status')
  .description('Update task status')
  .requiredOption('-a, --agent <name>', 'Agent name')
  .requiredOption('-t, --task <id>', 'Task ID')
  .requiredOption('--status <status>', 'New status (in-progress, complete, failed)')
  .option('-s, --session <id>', 'Session ID (uses current if not provided)')
  .action(async (options) => {
    try {
      await updateTaskStatus(options.agent, options.task, options.status, options.session);
      console.log(`Updated task ${options.task} status to: ${options.status}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      process.exit(1);
    }
  });

// Parse CLI arguments if running as script
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
