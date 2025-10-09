# Artifact System Scripts

TypeScript utilities for the artifact system - providing persistent, disk-based working memory for AI agents with 90%+ context reduction.

## Installation

```bash
pnpm install
# or
npm install
```

## Scripts Overview

### 1. artifact-write.ts

Write utilities for agents to persist work to scratchpads.

**CLI Commands:**

```bash
# Initialize a new session
npx tsx .claude/scripts/artifact-write.ts init-session

# Register an agent
npx tsx .claude/scripts/artifact-write.ts register-agent -a frontend-developer

# Append a task
npx tsx .claude/scripts/artifact-write.ts append-task \
  -a frontend-developer \
  -t "Add Button Component" \
  --status complete \
  --summary "Implemented accessible button with variants"

# Update task status
npx tsx .claude/scripts/artifact-write.ts update-status \
  -a frontend-developer \
  -t task-1 \
  --status complete
```

**Programmatic Usage:**

```typescript
import { initSession, registerAgent, appendToScratchpad } from './artifact-write.js';

// Initialize session
const sessionId = await initSession();

// Register agent
await registerAgent('frontend-developer');

// Append task
await appendToScratchpad('frontend-developer', {
  title: 'Add Button Component',
  status: 'complete',
  summary: 'Implemented accessible button with variants',
  filesModified: [
    { path: 'src/components/Button.tsx', action: 'created', lineCount: 120 }
  ],
  decisions: ['Used forwardRef for ref forwarding'],
  nextSteps: ['Add unit tests'],
  details: 'Full implementation notes here...'
});
```

### 2. artifact-read.ts

Read utilities for orchestrators to access agent work with selective detail expansion.

**CLI Commands:**

```bash
# Read agent summary (summaries only, no details)
npx tsx .claude/scripts/artifact-read.ts summary -a frontend-developer

# Read full task details
npx tsx .claude/scripts/artifact-read.ts task -a frontend-developer -t task-1

# Read all agent summaries
npx tsx .claude/scripts/artifact-read.ts all

# Search across artifacts
npx tsx .claude/scripts/artifact-read.ts search -q "button component"

# Search summaries only
npx tsx .claude/scripts/artifact-read.ts search -q "button" --scope summaries

# Read shared knowledge
npx tsx .claude/scripts/artifact-read.ts shared -f decisions.md
```

**Programmatic Usage:**

```typescript
import {
  readAgentSummary,
  readTaskDetails,
  getAllAgentSummaries,
  searchArtifacts
} from './artifact-read.js';

// Read agent summary (5-10 tokens per task)
const summary = await readAgentSummary('frontend-developer');
console.log(`${summary.agentName}: ${summary.tasksCompleted} tasks completed`);

// Read full task details (100-1000 tokens)
const details = await readTaskDetails('frontend-developer', 'task-1');
console.log(details.details); // Full implementation notes

// Get all agent summaries
const allSummaries = await getAllAgentSummaries();

// Search artifacts
const results = await searchArtifacts('button component', 'summaries');
```

### 3. artifact-cleanup.ts

Session management and cleanup utilities.

**CLI Commands:**

```bash
# List all sessions
npx tsx .claude/scripts/artifact-cleanup.ts list

# Sort by size or tasks
npx tsx .claude/scripts/artifact-cleanup.ts list --sort size

# Clean old sessions (dry run)
npx tsx .claude/scripts/artifact-cleanup.ts clean -d 7 --dry-run

# Clean old sessions (actually archive)
npx tsx .claude/scripts/artifact-cleanup.ts clean -d 7

# Archive specific session
npx tsx .claude/scripts/artifact-cleanup.ts archive -s 2025-10-08_1234

# Show session statistics
npx tsx .claude/scripts/artifact-cleanup.ts stats -s 2025-10-08_1234
```

**Programmatic Usage:**

```typescript
import {
  listSessions,
  cleanOldSessions,
  archiveSession,
  getSessionStats
} from './artifact-cleanup.js';

// List all sessions
const sessions = await listSessions();
console.log(`Found ${sessions.length} sessions`);

// Clean sessions older than 7 days
const archivedCount = await cleanOldSessions(7);
console.log(`Archived ${archivedCount} sessions`);

// Get session stats
const stats = await getSessionStats('2025-10-08_1234');
console.log(`Tokens saved: ${stats.manifest.context_stats.estimated_tokens_saved}`);
```

## Session Format

### Session ID
Format: `YYYY-MM-DD_HHmm` (e.g., `2025-10-08_1430`)

Auto-detected from `.claude/artifacts/.current-session`

### Directory Structure

```
.claude/artifacts/
├── sessions/
│   └── 2025-10-08_1430/
│       ├── manifest.json              # Session metadata
│       ├── frontend-developer.md      # Agent scratchpad
│       ├── backend-architect.md       # Agent scratchpad
│       └── outputs/                   # Generated files
├── shared/
│   ├── decisions.md                   # Architectural decisions
│   └── knowledge.md                   # Reusable patterns
└── templates/
    ├── agent-scratchpad.md            # Template
    └── manifest.json                  # Template
```

## Task Format

Each task in an agent's scratchpad follows this structure:

```markdown
## Task 1: Add Button Component
**ID**: task-1
**Status**: ✓ Complete
**Started**: 2025-10-08T10:30:00Z
**Completed**: 2025-10-08T10:35:00Z

**Files Modified**:
- src/components/Button.tsx (created, 120 lines)
- src/components/index.ts (modified, +1 line)

**Summary**:
Implemented accessible Button component with variant support.

**Key Decisions**:
- Used forwardRef for ref forwarding
- Implemented size variants: sm, md, lg

**Next Steps**:
- Add unit tests

**Details**:
<details>
<summary>Implementation Notes (Click to expand)</summary>

Full implementation details here...
Auto-collapsed if > 200 lines.

</details>

---
```

## Context Savings

The artifact system reduces context usage by:

1. **Summaries First**: Orchestrator reads only summaries (5-10 tokens/task)
2. **On-Demand Details**: Expands details only when needed (100-1000 tokens)
3. **Persistent Storage**: Survives session restarts
4. **Searchable History**: Query past work without loading everything

**Typical Savings:**
- Before: 5,000 tokens per agent response
- After: 50 tokens per agent response
- **Reduction: 99%**

## Integration Example

```typescript
// In delegation system
import { appendToScratchpad } from '.claude/scripts/artifact-write.js';
import { readAgentSummary } from '.claude/scripts/artifact-read.js';

// Agent completes work
const taskId = await appendToScratchpad('frontend-developer', {
  title: 'Add Button Component',
  status: 'complete',
  summary: 'Implemented accessible button with variants',
  filesModified: [{ path: 'src/components/Button.tsx', action: 'created' }],
  decisions: ['Used forwardRef'],
  details: '... 500 lines of implementation notes ...'
});

// Returns to orchestrator: "✓ task-1 completed"

// Later, orchestrator checks progress
const summary = await readAgentSummary('frontend-developer');
// Returns: ~50 tokens with all task summaries

// If details needed
const details = await readTaskDetails('frontend-developer', 'task-1');
// Returns: Full 500-line implementation notes
```

## TypeScript Configuration

The scripts use `tsconfig.json` with:
- ES2022 target
- ESM modules
- Strict type checking
- Node.js types

## Dependencies

- `commander`: CLI argument parsing
- `@types/node`: TypeScript types for Node.js
- `typescript`: TypeScript compiler
- `tsx`: TypeScript execution (already in project)

## Error Handling

All functions include proper error handling:
- Create directories if they don't exist
- Handle missing sessions gracefully
- Validate agent names and task IDs
- Provide clear error messages

## Testing

Run the test suite:

```bash
# Initialize test session
npx tsx .claude/scripts/artifact-write.ts init-session

# Register agent
npx tsx .claude/scripts/artifact-write.ts register-agent -a test-agent

# Add task
npx tsx .claude/scripts/artifact-write.ts append-task \
  -a test-agent \
  -t "Test Task" \
  --status complete \
  --summary "Test summary"

# Read back
npx tsx .claude/scripts/artifact-read.ts summary -a test-agent

# List sessions
npx tsx .claude/scripts/artifact-cleanup.ts list
```

## See Also

- [Artifact System Documentation](../artifacts/README.md)
- [Agent Reference](../docs/AGENT_REFERENCE.md)
- [Delegation Guide](../docs/DELEGATION.md)
