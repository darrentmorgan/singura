# Artifact System Guide

## Overview

The artifact system provides disk-based working memory for AI agents, achieving **90%+ context reduction** by having agents write detailed notes to persistent scratchpads while returning only brief summaries to the orchestrator.

## Quick Start

### 1. Initialize a Session

Artifacts work automatically when using the delegation router:

```bash
# Router auto-creates session on first --execute
npx tsx .claude/scripts/delegation-router.ts "Add Button component" --execute

# Or manually create session
npx tsx .claude/scripts/artifact-write.ts --new-session
```

### 2. Check Session Status

```bash
# View current session ID
cat .claude/artifacts/.current-session

# See session manifest
cat .claude/artifacts/sessions/$(cat .claude/artifacts/.current-session)/manifest.json | jq

# List all sessions
npx tsx .claude/scripts/artifact-cleanup.ts --list
```

### 3. Read Agent Work

```bash
# Summary of all agent work (lightweight)
npx tsx .claude/scripts/artifact-read.ts --summary

# Specific agent's full scratchpad
npx tsx .claude/scripts/artifact-read.ts --agent backend-architect

# Expand specific task details
npx tsx .claude/scripts/artifact-read.ts --agent backend-architect --task task-1

# Search across all artifacts
npx tsx .claude/scripts/artifact-read.ts --search "button component"
```

## How It Works

### Agent Workflow

1. **Orchestrator delegates task to agent**
   ```
   Orchestrator → Agent: "Add Button component"
   ```

2. **Agent performs work and writes to scratchpad**
   ```typescript
   import { appendToScratchpad } from '../scripts/artifact-write.ts';

   await appendToScratchpad('frontend-developer', {
     title: 'Add Button Component',
     status: 'complete',
     summary: 'Implemented accessible button with variants',
     filesModified: ['src/components/Button.tsx'],
     decisions: ['Used forwardRef for ref forwarding'],
     details: `
       ## Implementation Details

       ### Component Structure
       - Base Button using forwardRef
       - Variant prop: primary, secondary, danger
       - Size prop: sm, md, lg

       ### Styling
       Used Tailwind classes with variant-based colors...
       [500+ lines of detailed notes]
     `
   });
   ```

3. **Agent returns lightweight summary**
   ```
   Agent → Orchestrator: "✓ Added Button component with variant support.
   Created src/components/Button.tsx (120 lines). Used forwardRef pattern."
   ```

4. **Orchestrator stays lean** (50 tokens vs 5,000 tokens)

### Context Comparison

**Without Artifacts**:
```
Orchestrator context: 125k tokens
- Agent 1 full response: 5k tokens
- Agent 2 full response: 5k tokens
- Agent 3 full response: 5k tokens
- ... (continues growing)
Result: Context exhausted after 3-5 agents
```

**With Artifacts**:
```
Orchestrator context: 5k tokens
- Agent 1 summary: 50 tokens (details in scratchpad)
- Agent 2 summary: 50 tokens (details in scratchpad)
- Agent 3 summary: 50 tokens (details in scratchpad)
- ... (sustainable growth)
Result: Context supports 50+ agents
```

## Agent Integration

### For Agent Developers

When creating an agent that uses artifacts:

```typescript
// In your agent's implementation
import { appendToScratchpad } from '../scripts/artifact-write.ts';

async function completeTask(task: Task) {
  // 1. Do the work
  const result = await implementFeature(task);

  // 2. Write detailed notes to scratchpad
  await appendToScratchpad('your-agent-name', {
    title: task.title,
    status: result.success ? 'complete' : 'failed',
    summary: 'Brief 2-3 sentence summary',
    filesModified: result.files,
    decisions: result.keyDecisions,
    details: result.fullImplementationNotes // Can be 1000+ lines
  });

  // 3. Return ONLY summary to orchestrator
  return `✓ ${task.title} complete. ${result.summary}`;
}
```

### Agent Config

Enable artifacts in `.claude/agents/configs/your-agent.json`:

```json
{
  "agentName": "your-agent",
  "artifacts": {
    "enabled": true,
    "scratchpad": true,
    "auto_summary": true,
    "detail_threshold": 200,
    "instructions": "Custom instructions for this agent..."
  }
}
```

## Orchestrator Patterns

### Pattern 1: Summary-First (Default)

Read all agent summaries first, expand details only when needed:

```typescript
import { getAllAgentSummaries, readTaskDetails } from './artifact-read';

// Get all summaries (lightweight)
const summaries = await getAllAgentSummaries();
console.log(summaries); // ~500 tokens total

// User asks about specific task
if (userQuery.includes('Button component')) {
  const details = await readTaskDetails('frontend-developer', 'task-1');
  // Now we have full context for this specific task
}
```

### Pattern 2: Progressive Expansion

Build context incrementally as conversation requires:

```typescript
// Start minimal
let context = await getAllAgentSummaries();

// User asks follow-up questions
if (needsMoreContext) {
  context += await readTaskDetails(agent, taskId);
}

// User asks about specific file
if (needsFileContext) {
  context += await searchArtifacts(`file:${filename}`);
}
```

### Pattern 3: Cross-Agent Coordination

Agents check each other's work:

```typescript
// Backend agent checks frontend agent's API usage
const frontendWork = await readAgentSummary('frontend-developer');

if (frontendWork.includes('API endpoints')) {
  // Read detailed API requirements
  const apiDetails = await searchArtifacts('API endpoint', 'summaries');
  // Design backend to match
}
```

## Session Management

### Session Lifecycle

```bash
# Sessions auto-created by delegation router
# Location: .claude/artifacts/sessions/{session-id}/

# Active session tracked in
.claude/artifacts/.current-session

# Session contains:
sessions/2025-10-08_1430/
├── manifest.json           # Metadata
├── backend-architect.md    # Agent scratchpads
├── frontend-developer.md
├── qa-expert.md
└── outputs/               # Generated files
```

### Cleanup

```bash
# List sessions with stats
npx tsx .claude/scripts/artifact-cleanup.ts --list

# Archive old sessions (keeps shared knowledge)
npx tsx .claude/scripts/artifact-cleanup.ts --clean --days 7

# Dry run first
npx tsx .claude/scripts/artifact-cleanup.ts --clean --days 7 --dry-run

# Archive specific session
npx tsx .claude/scripts/artifact-cleanup.ts --archive 2025-10-08_1430

# View session statistics
npx tsx .claude/scripts/artifact-cleanup.ts --stats 2025-10-08_1430
```

### Session Stats

```bash
npx tsx .claude/scripts/artifact-cleanup.ts --stats
```

Output:
```
Session: 2025-10-08_1430
Created: 2025-10-08T14:30:00Z
Duration: 2h 15m

Agents: 3
├─ frontend-developer (5 tasks, 15,234 tokens saved)
├─ backend-architect (3 tasks, 12,890 tokens saved)
└─ qa-expert (2 tasks, 8,456 tokens saved)

Total tokens saved: 36,580
Orchestrator reads: 12
Detail expansions: 3

Files generated: 8
Total size: 1.2 MB
```

## Shared Knowledge

### Architectural Decisions

Agents can record architectural decisions for future reference:

```typescript
import { appendToShared } from '../scripts/artifact-write';

await appendToShared('decisions.md', {
  title: 'Use React Server Components for Dashboard',
  agent: 'frontend-developer',
  context: 'Dashboard has heavy data fetching',
  decision: 'Migrate to RSC pattern',
  rationale: 'Reduces client bundle, improves initial load',
  implications: 'All dashboard components must be refactored'
});
```

Location: `.claude/artifacts/shared/decisions.md`

### Team Knowledge

Capture reusable patterns:

```typescript
await appendToShared('knowledge.md', {
  title: 'Form Validation Pattern',
  category: 'frontend',
  agent: 'frontend-developer',
  problem: 'Inconsistent form validation across app',
  solution: 'Centralized useFormValidation hook',
  example: 'src/hooks/useFormValidation.ts',
  whenToUse: 'Any form with 3+ fields'
});
```

Location: `.claude/artifacts/shared/knowledge.md`

### Reading Shared Knowledge

```typescript
import { readSharedKnowledge } from '../scripts/artifact-read';

// Check previous decisions
const decisions = await readSharedKnowledge('decisions.md');

// Find patterns
const patterns = await readSharedKnowledge('knowledge.md');
```

## Advanced Usage

### Custom Scratchpad Format

Agents can use custom formats beyond the template:

```markdown
# Agent: ml-engineer
Session: 2025-10-08_1430

---

## Experiment 1: Hyperparameter Tuning
**Status**: ✓ Complete
**Model**: BERT-base
**Dataset**: customer_feedback_1000

**Results**:
| Learning Rate | Batch Size | Accuracy |
|---------------|------------|----------|
| 1e-5          | 16         | 94.2%    |
| 2e-5          | 16         | 95.1%    | ← Best
| 3e-5          | 16         | 94.8%    |

**Conclusion**: 2e-5 learning rate optimal

<details>
<summary>Full Training Logs</summary>

```
Epoch 1/10: loss=0.342, acc=0.891
Epoch 2/10: loss=0.234, acc=0.923
...
[5000+ lines of logs]
```

</details>
```

### Search Patterns

```bash
# Find by file
npx tsx .claude/scripts/artifact-read.ts --search "file:Button.tsx"

# Find by agent
npx tsx .claude/scripts/artifact-read.ts --search "agent:frontend-developer"

# Find by status
npx tsx .claude/scripts/artifact-read.ts --search "status:failed"

# Find by keyword
npx tsx .claude/scripts/artifact-read.ts --search "performance optimization"

# Search only summaries (faster)
npx tsx .claude/scripts/artifact-read.ts --search "API" --scope summaries

# Search all details
npx tsx .claude/scripts/artifact-read.ts --search "API" --scope all
```

### Programmatic API

```typescript
import {
  initSession,
  registerAgent,
  appendToScratchpad,
  updateTaskStatus,
  addOutput
} from './.claude/scripts/artifact-write';

import {
  readAgentSummary,
  readTaskDetails,
  getAllAgentSummaries,
  searchArtifacts,
  readSharedKnowledge
} from './.claude/scripts/artifact-read';

// Create session
const sessionId = await initSession();

// Register agent
await registerAgent('custom-agent', sessionId);

// Agent writes work
await appendToScratchpad('custom-agent', {
  title: 'Custom Task',
  status: 'complete',
  summary: 'Brief summary',
  filesModified: ['src/custom.ts'],
  decisions: ['Key decision'],
  details: 'Full notes...'
});

// Orchestrator reads
const summary = await readAgentSummary('custom-agent', sessionId);
console.log(summary); // Lightweight, no details

// Need more context?
const fullTask = await readTaskDetails('custom-agent', 'task-1', sessionId);
```

## Performance Optimization

### Token Savings by Pattern

| Pattern | Before | After | Savings |
|---------|--------|-------|---------|
| Single agent | 5k tokens | 50 tokens | 99% |
| 3 agents parallel | 15k tokens | 150 tokens | 99% |
| 10 agents sequential | 50k tokens | 500 tokens | 99% |
| Detail expansion | +5k tokens | +100 tokens | 98% |

### Best Practices

1. **Read summaries first**: Always start with `getAllAgentSummaries()`
2. **Expand selectively**: Only call `readTaskDetails()` when user needs it
3. **Search before reading**: Use `searchArtifacts()` to find relevant sections
4. **Clean regularly**: Archive sessions older than 7 days
5. **Use shared knowledge**: Reference decisions.md and knowledge.md to avoid rediscovering patterns

## Troubleshooting

### No session created

```bash
# Check if .current-session exists
cat .claude/artifacts/.current-session

# If not, create manually
npx tsx .claude/scripts/artifact-write.ts --new-session
```

### Agent not using artifacts

1. Check agent config has `artifacts.enabled: true`
```bash
cat .claude/agents/configs/{agent}.json | jq '.artifacts'
```

2. Verify agent is registered
```bash
cat .claude/artifacts/sessions/*/manifest.json | jq '.agents'
```

3. Check if scratchpad exists
```bash
ls .claude/artifacts/sessions/*/
```

### Scratchpad getting large

```bash
# Check sizes
npx tsx .claude/scripts/artifact-cleanup.ts --stats

# If > 10MB, archive old sessions
npx tsx .claude/scripts/artifact-cleanup.ts --clean --days 7
```

### Can't find task details

```bash
# List all tasks for agent
npx tsx .claude/scripts/artifact-read.ts --agent backend-architect

# Search for task by title
npx tsx .claude/scripts/artifact-read.ts --search "task title"
```

## Integration Examples

### With Delegation Router

```bash
# Router automatically handles sessions and artifacts
npx tsx .claude/scripts/delegation-router.ts "Add feature" --execute

# Disable artifacts for one-off task
npx tsx .claude/scripts/delegation-router.ts "Quick fix" --execute --no-artifacts

# Use specific session
npx tsx .claude/scripts/delegation-router.ts "Continue work" --execute --session 2025-10-08_1430
```

### With Pre-Request Hook

```bash
# .claude/hooks/pre-request-router.sh
# Automatically initialize session if needed

if [ ! -f ".claude/artifacts/.current-session" ]; then
  npx tsx .claude/scripts/artifact-write.ts --new-session
fi
```

### With Post-Task Hook

```bash
# .claude/hooks/post-task.sh
# Show summary after each agent completes

AGENT_NAME="$1"
npx tsx .claude/scripts/artifact-read.ts --agent "$AGENT_NAME" --summary
```

## See Also

- [Main Artifact README](.claude/artifacts/README.md) - Complete system overview
- [Agent Reference](AGENT_REFERENCE.md) - Agent capabilities and configs
- [Delegation Guide](MCP_DELEGATION_GUIDE.md) - How to delegate to agents
- [Parallel Execution](PARALLEL_EXECUTION_GUIDE.md) - Running agents concurrently
