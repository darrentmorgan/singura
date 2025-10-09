# Parallel Agent Execution Guide

## Overview

The delegation system now supports **parallel agent execution** to maximize throughput and reduce latency when multiple agents can work on independent tasks concurrently.

**Key Benefit**: Instead of running 3 agents sequentially (9+ minutes), run them in parallel (3-4 minutes).

---

## How It Works

### 1. **Auto-Detection**

The `delegation-router.ts` analyzes requests and determines:
- Which agents should handle the task
- Whether agents can run in **parallel** or must run **sequentially**
- Provides rationale for the decision

### 2. **Pre-Request Hook Guidance**

When you submit a request, the `pre-request-router.sh` hook shows:

```
🤖 AUTO-DELEGATION TRIGGERED
========================================
Query: "Add a Button component"
Primary Agent: frontend-developer
Secondary Agents:
  - code-reviewer-pro
  - test-automator
Execution Mode: parallel
Rationale: Independent validation agents can run concurrently

✅ PARALLEL EXECUTION ENABLED

Example (run in PARALLEL):
  Task(frontend-developer) + Task(code-reviewer-pro) + Task(test-automator)

Do NOT run sequentially. Use one message with multiple Task blocks.
```

### 3. **Execution**

The main orchestrator sends **one message** with **multiple Task calls**:

```typescript
// CORRECT - Parallel execution
Task({
  subagent_type: "frontend-developer",
  prompt: "Create Button component with shadcn/ui patterns"
})

Task({
  subagent_type: "code-reviewer-pro", 
  prompt: "Review Button component for security and best practices"
})

Task({
  subagent_type: "test-automator",
  prompt: "Generate tests for Button component"
})
```

All three agents run **concurrently** and return results independently.

---

## Parallel vs Sequential Decision Logic

### ✅ Run in PARALLEL when:

- **Independent validation** (code review + type checking + tests)
- **Multi-domain features** (backend API + frontend UI + docs)
- **Quality gates** (security audit + performance check + accessibility)

**Examples:**

```
✅ "Add login form" → frontend-developer + code-reviewer-pro + test-automator
✅ "Build analytics dashboard" → backend-architect + frontend-developer + qa-expert
✅ "Audit security" → code-reviewer-pro + security-auditor + qa-expert
```

### ❌ Run SEQUENTIALLY when:

- **Task dependencies exist** (migration → code → tests)
- **Breaking changes** (API contract change → update clients → tests)
- **Refactoring** (rename variable → update references → run tests)

**Examples:**

```
❌ "Create migration and use it" → backend-architect (migration) → THEN frontend-developer
❌ "Refactor API handler" → backend-architect → THEN code-reviewer-pro
❌ "Rename function across codebase" → typescript-pro → THEN test-automator
```

---

## Common Patterns

### Pattern 1: Code + Validation (Parallel)

**Scenario**: Generate new code and validate it simultaneously

**Agents**:
- `frontend-developer` (primary) - Creates code
- `code-reviewer-pro` (validation) - Reviews security/quality
- `typescript-pro` (validation) - Checks types

**Example**:

```
User: "Add a UserProfile component"

Execution:
  Task(frontend-developer)  ┐
  Task(code-reviewer-pro)   ├─ RUN IN PARALLEL
  Task(typescript-pro)      ┘
```

### Pattern 2: Full Stack Feature (Parallel)

**Scenario**: Build backend API, frontend UI, and tests independently

**Agents**:
- `backend-architect` - Creates API endpoints
- `frontend-developer` - Builds UI components
- `test-automator` - Generates test suite

**Example**:

```
User: "Build user settings page with API"

Execution:
  Task(backend-architect)   ┐
  Task(frontend-developer)  ├─ RUN IN PARALLEL
  Task(test-automator)      ┘
```

### Pattern 3: Database Migration (Sequential)

**Scenario**: Migration must complete before code uses new schema

**Agents**:
- `backend-architect` (migration) - Creates schema
- `backend-architect` (code) - Uses new schema
- `test-automator` - Tests new code

**Example**:

```
User: "Add user_preferences table and use it"

Execution:
  1. Task(backend-architect) → Create migration
  2. THEN Task(backend-architect) → Write code using schema
  3. THEN Task(test-automator) → Test integration
```

---

## Testing Parallel Execution

### Test the Router

```bash
# Test with parallel scenario
npx tsx .claude/scripts/delegation-router.ts "Add Button component" --plan

# Expected output:
{
  "primary_agent": "frontend-developer",
  "secondary_agents": ["code-reviewer-pro", "test-automator"],
  "execution_mode": "parallel",
  "rationale": "Independent validation agents can run concurrently"
}

# Test with sequential scenario
npx tsx .claude/scripts/delegation-router.ts "Create migration and use it" --plan

# Expected output:
{
  "primary_agent": "backend-architect",
  "secondary_agents": [],
  "execution_mode": "sequential",
  "rationale": "Sequential execution required due to task dependencies"
}
```

### Test the Hook

```bash
# Trigger hook manually
.claude/hooks/pre-request-router.sh "Add login form"

# Check stderr output for delegation plan
```

---

## Performance Impact

### Before (Sequential)

```
Request: "Add Button component with tests"
→ frontend-developer (3 min)
→ code-reviewer-pro (2 min)  
→ test-automator (3 min)
TOTAL: ~8-9 minutes
```

### After (Parallel)

```
Request: "Add Button component with tests"
→ frontend-developer (3 min) ┐
→ code-reviewer-pro (2 min)  ├─ CONCURRENT
→ test-automator (3 min)     ┘
TOTAL: ~3-4 minutes (66% faster!)
```

---

## Configuration

### Max Concurrent Agents

Set in `.claude/agents/delegation-map.json`:

```json
"execution_strategy": {
  "parallel": {
    "max_concurrent": 3,  // Default: 3 agents max
    "use_when": "tasks are independent"
  }
}
```

**Recommended values**:
- `max_concurrent: 3` - Standard (balanced performance)
- `max_concurrent: 5` - High-end machine (faster but more resource-intensive)
- `max_concurrent: 2` - Conservative (slower machine)

### Parallelization Rules

Edit `canRunInParallel()` in `scripts/delegation-router.ts`:

```typescript
function canRunInParallel(
  primary: string,
  secondaries: string[],
  prompt: string
): boolean {
  // Add custom logic here
  
  // Example: Block parallel for migrations
  if (prompt.includes('migration')) {
    return false;
  }
  
  // Example: Force parallel for UI work
  if (primary === 'frontend-developer') {
    return true;
  }
}
```

---

## Troubleshooting

### Issue: Agents running sequentially despite parallel mode

**Cause**: Main orchestrator is not sending Task calls in single message

**Fix**: Ensure Task calls are in **one message**, not separate messages:

```typescript
// ❌ WRONG - Sequential
await Task({ subagent_type: "frontend-developer", ... })
// then later...
await Task({ subagent_type: "code-reviewer-pro", ... })

// ✅ CORRECT - Parallel
Task({ subagent_type: "frontend-developer", ... })
Task({ subagent_type: "code-reviewer-pro", ... })
Task({ subagent_type: "test-automator", ... })
// All in same message
```

### Issue: Hook not showing parallel suggestion

**Cause**: `jq` not installed or routing logic issue

**Fix**:

```bash
# Install jq
brew install jq  # macOS
sudo apt install jq  # Linux

# Test router directly
npx tsx .claude/scripts/delegation-router.ts "Add component" --plan
```

### Issue: Router always returns sequential

**Cause**: Keyword matching in `canRunInParallel()` too strict

**Fix**: Check patterns in `delegation-router.ts:160-166`:

```typescript
const sequentialPatterns = [
  'migration', 'schema change', 'breaking change',
  'refactor', 'rename', 'move file'
];
```

Remove patterns that shouldn't force sequential mode.

---

## Best Practices

1. **Use parallel for independent work**
   - Code generation + validation ✅
   - Multiple domain features ✅
   - Quality audits ✅

2. **Use sequential for dependencies**
   - Schema changes → Code ✅
   - Refactors → Tests ✅
   - Breaking API changes → Client updates ✅

3. **Monitor performance**
   - Track task completion times
   - Adjust `max_concurrent` based on machine capacity
   - Profile agent execution with logs

4. **Clear agent prompts**
   - Each agent should have independent, clear instructions
   - Avoid inter-agent communication requirements
   - Provide sufficient context in each Task call

---

## Next Steps

- [ ] Test parallel execution with real requests
- [ ] Monitor performance improvements (before/after)
- [ ] Adjust `max_concurrent` based on machine specs
- [ ] Add custom parallelization rules to `canRunInParallel()`
- [ ] Review agent response times and optimize prompts

**See also**:
- [Agent Reference](.claude/docs/AGENT_REFERENCE.md)
- [Delegation Protocol](CLAUDE_MD_DELEGATION_PROTOCOL.md)
- [Delegation Map](.claude/agents/delegation-map.json)
