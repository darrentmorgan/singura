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
    'update', 'modify', 'delete', 'remove', 'build'
  ];

  const fileTypeKeywords = [
    { keywords: ['component', 'react', 'tsx', 'ui', 'button', 'form'], agent: 'frontend-developer' },
    { keywords: ['api', 'handler', 'endpoint', 'route', 'express'], agent: 'backend-architect' },
    { keywords: ['test', 'spec', 'e2e', 'unit test', 'integration test'], agent: 'test-automator' },
    { keywords: ['migration', 'schema', 'database', 'sql', 'rls', 'rpc'], agent: 'backend-architect' },
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

/**
 * Main router function
 */
export function getAgentForRequest(
  userPrompt: string,
  modifiedFile?: string
): string | null {
  const map = loadDelegationMap();

  // 1. Check file pattern match first (most specific)
  if (modifiedFile) {
    const fileAgent = getAgentForFile(modifiedFile, map);
    if (fileAgent) return fileAgent;
  }

  // 2. Check keyword triggers (MCP operations, action words)
  const keywordAgent = getAgentForKeywords(userPrompt, map);
  if (keywordAgent) return keywordAgent;

  // 3. No delegation needed
  return null;
}

/**
 * CLI entry point (ESM-compatible)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: delegation-router.ts "<user prompt>" [modified-file]');
    console.error('');
    console.error('Examples:');
    console.error('  delegation-router.ts "Create migration for users"');
    console.error('  delegation-router.ts "Add button" src/components/Button.tsx');
    process.exit(1);
  }

  const prompt = args[0];
  const file = args[1];

  const agent = getAgentForRequest(prompt, file);
  console.log(agent || 'none');
}
