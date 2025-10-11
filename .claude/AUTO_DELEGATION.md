# Autonomous Agent Delegation System

## Overview

This system enables Claude Code to work autonomously for extended periods (1-10+ hours) by automatically chaining agent delegations without manual intervention.

## How It Works

### 1. **Delegation Queue System**

When you edit/write files, the `tool-use.sh` hook automatically:
- Detects file type and selects appropriate agent
- Adds delegation task to `.claude/.auto-delegation-queue.json`
- Checks chain depth limit (default: 3 agents max)

### 2. **Auto-Execution on Next Request**

When you send your next message, the `pre-request-router.sh` hook:
- Checks for queued delegations
- Outputs clear **AUTO-DELEGATION INSTRUCTION** for Claude
- Claude reads this and immediately invokes the Task tool

### 3. **Chain Depth Tracking**

The system prevents infinite delegation loops by tracking chain depth in `.claude/.agent-chain-depth.json`:
- **Current depth**: Increments with each delegation
- **Max depth**: Default 3 (configurable via `MAX_AGENT_CHAIN_DEPTH`)
- **Auto-reset**: Resets to 0 after successful completion

## Configuration

### Environment Variables

`.env` file:
```bash
# Enable autonomous mode
AUTONOMY_LEVEL=high

# Max sequential delegations (prevents infinite loops)
MAX_AGENT_CHAIN_DEPTH=3

# Timeout per agent (seconds)
AGENT_TIMEOUT_SECONDS=300
```

### Autonomy Levels

- **`low`**: Manual approval for all delegations (safest)
- **`medium`**: Auto-fix minor issues (formatting, linting)
- **`high`**: Full autonomous agent chaining (fastest)

## Usage Examples

### Example 1: Edit File → Auto Review

```bash
# You edit a React component
# tool-use.sh detects .tsx → queues frontend-developer

# You send next message: "continue"
# pre-request-router.sh sees queue → instructs Claude
# Claude auto-invokes: Task('frontend-developer', 'Review Button.tsx')
```

### Example 2: Chain Delegation

```bash
# Agent 1: frontend-developer reviews your code
# Agent 1 completes → could queue code-reviewer-pro
# Agent 2: code-reviewer-pro does final validation
# Agent 2 completes → could queue test-engineer
# Agent 3: test-engineer generates tests
# Chain depth = 3 → STOP (max reached)
```

### Example 3: Manual Override

```bash
# Set autonomy to low for this session
AUTONOMY_LEVEL=low

# Hooks will suggest but not auto-execute
# You manually decide: "run the suggested delegation"
```

## Queue Management

### Check Queue Status
```bash
.claude/scripts/auto-delegate.sh list
```

Output:
```
Auto-Delegation Queue Status
  Pending: 2
  In Progress: 1
  Completed: 5

Pending Tasks:
  [frontend-developer] src/components/Button.tsx - Review and validate code quality
  [code-reviewer-pro] src/components/Form.tsx - Final validation
```

### Clear Old Tasks
```bash
.claude/scripts/auto-delegate.sh cleanup
```

### Reset Chain Depth
```bash
.claude/scripts/auto-delegate.sh reset-depth
```

## Safety Mechanisms

### 1. **Max Chain Depth**
Prevents runaway delegation loops:
- Default: 3 agents
- Configurable: `MAX_AGENT_CHAIN_DEPTH=5`

### 2. **Agent Timeout**
Each agent has execution timeout:
- Default: 300 seconds (5 minutes)
- Configurable: `AGENT_TIMEOUT_SECONDS=600`

### 3. **Kill Switch**
Instantly disable autonomous mode:
```bash
# In your terminal or .env
export AUTONOMY_LEVEL=low
```

### 4. **Queue Inspection**
Always visible in hook output:
```
╔════════════════════════════════════════╗
║  QUEUED DELEGATION DETECTED           ║
╚════════════════════════════════════════╝

🤖 AUTO-DELEGATION INSTRUCTION
...
```

## Troubleshooting

### Delegations Not Auto-Executing

**Check**:
1. `AUTONOMY_LEVEL=high` in `.env`
2. `.claude/scripts/auto-delegate.sh` exists and is executable
3. Queue has pending tasks: `.claude/scripts/auto-delegate.sh list`
4. Chain depth not maxed out

**Fix**:
```bash
chmod +x .claude/scripts/auto-delegate.sh
.claude/scripts/auto-delegate.sh reset-depth
```

### Too Many Delegations

**Reduce chain depth**:
```bash
# In .env
MAX_AGENT_CHAIN_DEPTH=2
```

### Agent Loops

The system should prevent this, but if it happens:
```bash
# Kill switch
export AUTONOMY_LEVEL=low

# Reset state
rm .claude/.auto-delegation-queue.json
rm .claude/.agent-chain-depth.json
```

## Advanced: Manual Queue Manipulation

### Add Custom Delegation
```bash
.claude/scripts/auto-delegate.sh queue \
  "backend-architect" \
  "src/api/users.ts" \
  "Optimize database queries"
```

### Mark Task Complete
```bash
TASK_ID="task_1234567890"
.claude/scripts/auto-delegate.sh complete "$TASK_ID" "success"
```

## Integration with Existing Workflows

### Works With:
- ✅ `/scout_plan_build` - Auto-delegates after build
- ✅ `/monitor-and-fix-pr` - Auto-delegates fixes
- ✅ Pre-commit hooks - Auto-reviews before commit
- ✅ CI/CD pipelines - Can trigger delegations on failures

### Doesn't Interfere With:
- ✅ Manual Task tool usage
- ✅ Slash commands
- ✅ Direct file operations
- ✅ Git operations

## Files Modified

- `.env.example` - Configuration template
- `.claude/hooks/tool-use.sh` - Queues delegations
- `.claude/hooks/pre-request-router.sh` - Executes queue
- `.claude/scripts/auto-delegate.sh` - Queue manager (new)

## State Files

- `.claude/.auto-delegation-queue.json` - Pending/in-progress/completed tasks
- `.claude/.agent-chain-depth.json` - Current delegation chain tracking
- `.claude/.tool-use.log` - Audit log of all tool uses

## Next Steps

This is **Phase 1** of the autonomous workflow system. Future phases will add:

- **Phase 2**: Auto-test-fix loops
- **Phase 3**: Autonomous commit loops
- **Phase 4**: Auto-PR creation
- **Phase 5**: E2E testing in CI

Each phase builds on this delegation foundation to enable longer autonomous coding sessions.
