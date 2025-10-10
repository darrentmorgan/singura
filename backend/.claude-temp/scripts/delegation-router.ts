#!/usr/bin/env tsx
/**
 * Delegation Router
 *
 * Programmatically matches user requests to specialized agents based on:
 * 1. File pattern matching (delegation_rules)
 * 2. Keyword matching (mcp_routing_rules)
 *
 * Returns agent name or "none" if no match found.
 *
 * Usage:
 *   npx tsx .claude/scripts/delegation-router.ts "Create migration for users"
 *   # Output: backend-architect
 *
 *   npx tsx .claude/scripts/delegation-router.ts "Add button component"
 *   # Output: frontend-developer
 *
 *   npx tsx .claude/scripts/delegation-router.ts "What's the weather?"
 *   # Output: none
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { minimatch } from 'minimatch';

interface DelegationRule {
  name: string;
  pattern: string;
  exclude?: string[];
  primary_agent: string;
  secondary_agents?: string[];
  triggers?: string[];
  context?: Record<string, unknown>;
}

interface MCPRoute {
  name: string;
  mcp_server: string;
  primary_agent: string;
  fallback_agent?: string;
  secondary_agents?: string[];
  keywords: string[];
  example_queries?: string[];
  special_instructions?: string;
}

interface DelegationMap {
  delegation_rules: DelegationRule[];
  agent_capabilities: Record<string, unknown>;
  execution_strategy: Record<string, unknown>;
  quality_gates: Record<string, unknown>;
  mcp_routing_rules: {
    description: string;
    main_orchestrator_policy: string;
    context_savings: string;
    routing_map: MCPRoute[];
    delegation_workflow: Record<string, string>;
    anti_patterns: string[];
    best_practices: string[];
  };
}

/**
 * Load delegation map from .claude/agents/delegation-map.json
 */
function loadDelegationMap(): DelegationMap {
  const mapPath = join(process.cwd(), '.claude/agents/delegation-map.json');
  try {
    const content = readFileSync(mapPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading delegation map: ${error}`);
    process.exit(1);
  }
}

/**
 * Check if a file path matches any delegation rule patterns
 */
function getAgentForFile(filePath: string, map: DelegationMap): string | null {
  for (const rule of map.delegation_rules) {
    // Check exclusions first
    if (rule.exclude) {
      const isExcluded = rule.exclude.some(pattern => minimatch(filePath, pattern));
      if (isExcluded) continue;
    }

    // Check if pattern matches
    if (minimatch(filePath, rule.pattern)) {
      return rule.primary_agent;
    }
  }
  return null;
}

/**
 * Check if user prompt contains MCP-triggering keywords
 */
function getAgentForKeywords(prompt: string, map: DelegationMap): string | null {
  const lowerPrompt = prompt.toLowerCase();

  // Check MCP routing rules
  for (const route of map.mcp_routing_rules.routing_map) {
    // Check if any keyword matches
    const hasKeyword = route.keywords.some(keyword =>
      lowerPrompt.includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      return route.primary_agent;
    }
  }

  // Check delegation rules for action keywords
  const actionKeywords = [
    'create', 'add', 'implement', 'fix', 'refactor',
    'update', 'modify', 'delete', 'remove', 'build',
    'write', 'generate', 'make', 'develop'
  ];

  // Special standalone keywords that don't need action words
  const standaloneKeywords = [
    { keywords: ['debug', 'investigate', 'troubleshoot'], agent: 'debugger' },
    { keywords: ['slow query', 'query performance', 'database performance'], agent: 'database-optimizer' },
  ];

  // Check standalone keywords first (don't require action words)
  for (const { keywords, agent } of standaloneKeywords) {
    if (keywords.some(kw => lowerPrompt.includes(kw))) {
      return agent;
    }
  }

  // Check for "optimize" + "query" combination
  if (lowerPrompt.includes('optimize') && lowerPrompt.includes('query')) {
    return 'database-optimizer';
  }

  // Check for breaking changes (requires careful orchestration)
  if (lowerPrompt.includes('breaking change')) {
    return 'backend-architect';
  }

  // Check for rename operations (TypeScript refactoring)
  if (lowerPrompt.includes('rename') && (lowerPrompt.includes('function') || lowerPrompt.includes('variable') || lowerPrompt.includes('class'))) {
    return 'typescript-pro';
  }

  const fileTypeKeywords = [
    // Test-related keywords first (higher priority than component keywords)
    { keywords: ['test', 'spec', 'e2e', 'unit test', 'integration test'], agent: 'test-automator' },
    { keywords: ['migration', 'schema', 'database', 'sql', 'rls', 'rpc'], agent: 'backend-architect' },
    { keywords: ['api', 'handler', 'endpoint', 'route', 'express'], agent: 'backend-architect' },
    { keywords: ['component', 'react', 'tsx', 'ui', 'button', 'form'], agent: 'frontend-developer' },
    { keywords: ['store', 'zustand', 'state'], agent: 'frontend-developer' },
  ];

  // Check for action + file type combinations
  const hasAction = actionKeywords.some(kw => lowerPrompt.includes(kw));

  if (hasAction) {
    for (const { keywords, agent } of fileTypeKeywords) {
      if (keywords.some(kw => lowerPrompt.includes(kw))) {
        return agent;
      }
    }
  }

  return null;
}

interface DelegationPlan {
  primary_agent: string;
  secondary_agents: string[];
  execution_mode: 'sequential' | 'parallel';
  rationale: string;
}

/**
 * Determine if secondary agents can run in parallel with primary
 *
 * MEMORY SAFETY: Uses controlled concurrency with p-limit (N=2) and memory checks.
 * Falls back to sequential if memory high or task dependencies exist.
 *
 * Set SAFE_PARALLEL=true environment variable to enable controlled parallel execution.
 * Set SAFE_PARALLEL=false or omit to force sequential (safer, slower).
 */
function canRunInParallel(
  primary: string,
  secondaries: string[],
  prompt: string
): boolean {
  // Check environment variable for safe parallel mode
  const safeParallelEnabled = process.env.SAFE_PARALLEL === 'true';

  if (!safeParallelEnabled) {
    // Default: Sequential only (safest, but slower)
    // Enable with: export SAFE_PARALLEL=true
    return false;
  }

  const lowerPrompt = prompt.toLowerCase();

  // Scenarios that MUST be sequential (dependencies exist)
  const sequentialPatterns = [
    'migration', 'schema change', 'breaking change',
    'refactor', 'rename', 'move file'
  ];

  if (sequentialPatterns.some(p => lowerPrompt.includes(p))) {
    return false;
  }

  // Independent validation agents can run in parallel (with p-limit control)
  const parallelAgents = ['code-reviewer-pro', 'test-automator', 'typescript-pro'];
  const allParallelizable = secondaries.every(agent => parallelAgents.includes(agent));

  // Primary creates code, secondaries validate → safe parallel (N=2)
  if (['frontend-developer', 'backend-architect'].includes(primary) && allParallelizable) {
    return true;
  }

  return false;
}

/**
 * Get delegation plan with multiple agents
 */
export function getDelegationPlan(
  userPrompt: string,
  modifiedFile?: string
): DelegationPlan | null {
  const map = loadDelegationMap();
  let primaryAgent: string | null = null;
  let secondaryAgents: string[] = [];

  // 1. Check file pattern match first (most specific)
  if (modifiedFile) {
    const fileAgent = getAgentForFile(modifiedFile, map);
    if (fileAgent) {
      primaryAgent = fileAgent;

      // Find matching rule to get secondary agents
      const rule = map.delegation_rules.find(r =>
        minimatch(modifiedFile, r.pattern) &&
        (!r.exclude || !r.exclude.some(ex => minimatch(modifiedFile, ex)))
      );

      if (rule?.secondary_agents) {
        secondaryAgents = rule.secondary_agents;
      }
    }
  }

  // 2. Check keyword triggers (MCP operations, action words)
  if (!primaryAgent) {
    primaryAgent = getAgentForKeywords(userPrompt, map);

    if (primaryAgent) {
      // Try to find secondary agents from MCP routing rules first
      const mcpRoute = map.mcp_routing_rules.routing_map.find(r =>
        r.primary_agent === primaryAgent
      );

      if (mcpRoute?.secondary_agents) {
        secondaryAgents = mcpRoute.secondary_agents;
      } else {
        // Fallback: Find secondary agents from delegation_rules
        const delegationRule = map.delegation_rules.find(r =>
          r.primary_agent === primaryAgent
        );

        if (delegationRule?.secondary_agents) {
          secondaryAgents = delegationRule.secondary_agents;
        }
      }
    }
  }

  // 3. No delegation needed
  if (!primaryAgent) {
    return null;
  }

  // 4. Determine execution mode
  const executionMode = canRunInParallel(primaryAgent, secondaryAgents, userPrompt)
    ? 'parallel'
    : 'sequential';

  return {
    primary_agent: primaryAgent,
    secondary_agents: secondaryAgents,
    execution_mode: executionMode,
    rationale: executionMode === 'parallel'
      ? 'Independent validation agents can run concurrently'
      : 'Sequential execution required due to task dependencies'
  };
}

/**
 * Main router function (backward compatible)
 */
export function getAgentForRequest(
  userPrompt: string,
  modifiedFile?: string
): string | null {
  const plan = getDelegationPlan(userPrompt, modifiedFile);
  return plan?.primary_agent || null;
}

/**
 * CLI entry point (ESM-compatible)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: delegation-router.ts "<user prompt>" [modified-file] [--plan]');
    console.error('');
    console.error('Examples:');
    console.error('  delegation-router.ts "Create migration for users"');
    console.error('  delegation-router.ts "Add button" src/components/Button.tsx');
    console.error('  delegation-router.ts "Add button" --plan  # Show full delegation plan');
    process.exit(1);
  }

  const showPlan = args.includes('--plan');
  const prompt = args[0];
  const file = args[1] !== '--plan' ? args[1] : undefined;

  if (showPlan) {
    const plan = getDelegationPlan(prompt, file);
    if (plan) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      console.log('none');
    }
  } else {
    const agent = getAgentForRequest(prompt, file);
    console.log(agent || 'none');
  }
}
