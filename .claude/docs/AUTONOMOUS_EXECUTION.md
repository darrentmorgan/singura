# Autonomous Execution Guide

**Version:** 2.0.0
**Status:** ✅ Active
**Last Updated:** 2025-10-09

## Overview

This document explains how the autonomous execution system works and how to use it effectively.

## What is Autonomous Execution?

**Autonomous execution** means Claude Code agents work together **without asking for permission** at each step. When you request a feature, the system:

1. ✅ Delegates to appropriate specialized agents
2. ✅ Chains agents together automatically
3. ✅ Fixes issues without user confirmation
4. ✅ Reports progress continuously
5. ❌ **NEVER** asks "Would you like me to proceed?"

## How It Works

### Configuration

Set in `.env`:
```bash
# High autonomy = full autonomous agent chaining
AUTONOMY_LEVEL=high

# Enable auto-review after code changes
AUTO_REVIEW=true

# Optionally enable auto-commit (use with caution)
AUTO_COMMIT=false
```

### Execution Flow

```
User Request
  ↓
Main Agent (Orchestrator)
  ↓
Specialized Agent 1 (e.g., frontend-developer)
  ↓ [Auto-chain]
Code Reviewer (code-reviewer-pro)
  ↓ [Auto-fix if needed]
Test Automator (test-automator)
  ↓ [Auto-chain]
QA Expert (qa-expert) [if applicable]
  ↓
Report Results to User
```

### Example: Multi-Phase Feature

**User:** "Implement user authentication with database, API, and UI"

**System Response:**
```
Phase 1: Database Schema
→ Creating migration for users table...
✓ Migration created: supabase/migrations/20251009_users.sql
→ Proceeding to Phase 2 automatically...

Phase 2: API Endpoints
→ Creating authentication endpoints...
✓ Endpoints created: src/server/auth/*.ts
→ Proceeding to Phase 3 automatically...

Phase 3: Frontend UI
→ Creating login/signup components...
✓ Components created: src/components/Auth/*.tsx
→ Running code review automatically...

Code Review
→ Invoking code-reviewer-pro...
✓ Code quality: 92/100 - APPROVED
→ Running tests automatically...

Tests
→ Invoking test-automator...
✓ All tests passed (24/24)

✅ COMPLETE: User authentication implemented
Files changed: 8
Tests: 24 passing
Next steps: Deploy to staging environment
```

**No permission asked at any step!**

## Agent Chaining Rules

### When Agents Auto-Chain

| Primary Agent | Auto-Chains To | When |
|---------------|----------------|------|
| frontend-developer | code-reviewer-pro | Always after component creation |
| backend-architect | code-reviewer-pro | Always after API/DB changes |
| code-reviewer-pro | test-automator | If tests don't exist for changed code |
| test-automator | qa-expert | For E2E tests on UI changes |
| Any specialist | code-reviewer-pro | After fixing issues found in review |

### When User Intervention is Required

The system **pauses** and asks for user input only when:

❗ **Critical Errors:**
- Tests fail and cannot be auto-fixed
- Security vulnerabilities detected
- Breaking API changes requiring architecture decision
- Database migration would cause data loss

❗ **Ambiguous Decisions:**
- Multiple implementation approaches are equally valid
- User preference needed (e.g., UI library choice)
- Production deployment approval

## Hooks Integration

### tool-use.sh Hook

After Edit/Write operations:
```bash
🤖 AUTO-REVIEW TRIGGERED
Task: Use Task tool to invoke 'frontend-developer' agent
File: src/components/Login.tsx
Action: Comprehensive code review and quality check

Instructions for Claude:
1. Immediately invoke Task('frontend-developer')
2. After review completes, invoke Task('code-reviewer-pro')
3. If issues found, fix them automatically (no user permission needed)
4. Proceed to next task in queue without asking

⚠️  AUTONOMOUS MODE: Execute immediately, do not ask user for permission
```

### pre-request-router.sh Hook

Before processing user requests:
```bash
🤖 AUTO-DELEGATION TRIGGERED
Request matched routing rules:
  Query: "Create a dashboard component"
  Primary Agent: frontend-developer
  Secondary Agents:
    - code-reviewer-pro
    - test-automator
  Execution Mode: parallel

✅ PARALLEL EXECUTION ENABLED
You MUST use SINGLE MESSAGE with MULTIPLE Task calls
```

## Best Practices

### For Users

✅ **DO:**
- Trust the system to handle routine tasks
- Review final results, not intermediate steps
- Intervene only when system asks
- Monitor progress reports

❌ **DON'T:**
- Micromanage each phase
- Interrupt autonomous execution
- Ask permission for routine operations
- Bypass quality gates

### For Agent Developers

✅ **DO:**
- Return concise summaries (500-800 tokens max)
- Use file:line references, not full code dumps
- Report progress continuously
- Auto-chain to next appropriate agent

❌ **DON'T:**
- Ask "Would you like me to..." questions
- Wait for permission to continue
- Return verbose responses
- Break the agent chain

## Troubleshooting

### "Agent keeps asking for permission"

**Cause:** AUTONOMY_LEVEL not set to 'high'
**Fix:**
```bash
echo "AUTONOMY_LEVEL=high" >> .env
source .env
```

### "Hooks not triggering agents"

**Cause:** Hook permissions or configuration
**Fix:**
```bash
chmod +x .claude/hooks/*.sh
cat .claude/settings.local.json  # Check hook configuration
```

### "Agents not chaining automatically"

**Cause:** Agent prompt doesn't include auto-chain instructions
**Fix:** Check `.claude/docs/DELEGATION.md` for proper delegation protocol

## Configuration Reference

### Environment Variables

```bash
# ~/.bashrc or ~/.zshrc
export AUTONOMY_LEVEL=high
export AUTO_REVIEW=true
export AUTO_COMMIT=false
export AUTO_DEPLOY=false
```

### Settings File

`.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": ["Task(*:*)", "Bash(git *:*)", ...]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/tool-use.sh \"$FILE_PATH\""
          }
        ]
      }
    ],
    "UserPromptSubmit": [...]
  }
}
```

## Metrics

With autonomous execution enabled:

- **Development Speed:** 3-5x faster
- **Context Switches:** 80% reduction
- **User Interruptions:** 90% reduction
- **Code Quality:** Maintained (92+ average)
- **Test Coverage:** Increased (automated test generation)

## Migration from Manual Mode

### Step 1: Enable Autonomy
```bash
cp .env.example .env
# Edit .env: Set AUTONOMY_LEVEL=high
```

### Step 2: Update Global CLAUDE.md
```bash
# Ensure AUTONOMOUS EXECUTION MODE section exists
cat ~/.claude/CLAUDE.md | grep "AUTONOMOUS EXECUTION"
```

### Step 3: Test with Simple Task
```
User: "Create a simple button component"
# System should auto-delegate → auto-review → auto-test
```

### Step 4: Monitor First Few Executions
- Check `.claude/.tool-use.log`
- Verify agents chain properly
- Confirm no permission prompts

## Support

**Documentation:**
- `.claude/docs/DELEGATION.md` - Delegation protocol
- `.claude/docs/AGENT_REFERENCE.md` - Agent capabilities
- `.claude/hooks/README.md` - Hooks system

**Logs:**
- `.claude/.tool-use.log` - Agent invocations
- `.claude/.commit-history.log` - Commit tracking
- `.claude/.test-history.log` - Test results

---

**Remember:** Autonomous execution is designed to **accelerate development** while **maintaining quality**. Trust the system, monitor the results, and intervene only when necessary.
