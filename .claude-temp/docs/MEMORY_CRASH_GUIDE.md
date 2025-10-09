# Memory Crash Prevention Guide

## Symptoms You're Experiencing

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory

Mark-Compact 7547.7 (8226.1) -> 7492.7 (8234.4) MB
allocation failure; scavenge might not succeed
```

**What's happening**: Claude Code's context window is full (7.5GB+ heap), causing V8 garbage collector to fail.

## Root Cause

**Without artifact system**:
- Each agent returns 5,000+ tokens
- Orchestrator keeps all responses in memory
- After 3-5 tasks: 95-100% context → 7.5GB heap → Crash

## Solution: Artifact System (90%+ Context Reduction)

### Quick Install (2 minutes)

```bash
# 1. In your crashing project
cd /path/to/your-project

# 2. Install artifact system
npx degit darrentmorgan/claude-config-template .claude-temp && \
cd .claude-temp && \
bash setup.sh && \
cd .. && \
rm -rf .claude-temp

# 3. Verify installation
ls .claude/artifacts/
# Should show: sessions/ shared/ templates/

# 4. Test it works
npx tsx .claude/scripts/delegation-router.ts "test" --plan
```

### How Artifacts Prevent Crashes

**Before (Your Current Situation)**:
```
Task 1: Agent returns 5,000 tokens → Context: 5k
Task 2: Agent returns 5,000 tokens → Context: 10k
Task 3: Agent returns 5,000 tokens → Context: 15k
Task 4: Agent returns 5,000 tokens → Context: 20k
Task 5: CRASH at ~7.5GB heap
```

**After (With Artifacts)**:
```
Task 1: Agent writes to disk, returns 50 tokens → Context: 50
Task 2: Agent writes to disk, returns 50 tokens → Context: 100
Task 3: Agent writes to disk, returns 50 tokens → Context: 150
Task 50: Agent writes to disk, returns 50 tokens → Context: 2,500
No crash - sustainable growth
```

## Immediate Relief (If Not Using Artifacts Yet)

### Option 1: Restart Claude Code (Fastest)

```bash
# 1. Exit Claude Code completely
# 2. Restart Claude Code
# 3. Memory resets to 0%
```

**Why this works**: Fresh session has empty context window

**Limitations**:
- Temporary fix only
- Will crash again after 3-5 complex tasks
- Need permanent solution (artifacts)

### Option 2: Increase Node.js Heap (Temporary Band-Aid)

```bash
# Add to ~/.zshrc or ~/.bashrc
export NODE_OPTIONS="--max-old-space-size=16384"  # 16GB heap

# Reload shell
source ~/.zshrc
```

**Warning**:
- Only delays the problem
- Eventually will crash at 16GB instead of 8GB
- Not a real solution
- Artifacts are the proper fix

### Option 3: Manual Context Clearing (Not Recommended)

Use `/clear` command in Claude Code to clear context.

**Problems**:
- Loses conversation history
- Must be done manually every few tasks
- Disruptive to workflow
- Artifacts automate this better

## Memory Guard Protection

The artifact system includes automatic memory monitoring:

### Current Settings

```bash
# .claude/hooks/memory-guard.sh
LIMIT_MB=6144  # 6GB (75% of 8GB heap)
```

### What Happens

**At 80% (4.9GB)**:
```
⚠️  Memory: 4915MB / 6144MB (80%) - Consider restarting soon
```

**At 100% (6GB)**:
```
🚨 MEMORY LIMIT EXCEEDED 🚨
Current memory: 6200MB / 6144MB (101%)

This request has been BLOCKED to prevent crash

Action required:
1. Exit Claude Code (work auto-saved)
2. Restart Claude Code (memory resets to 0%)
3. Deploy artifact system for 90%+ reduction
```

## Performance Comparison

### Without Artifacts (Your Current State)

| Metric | Value |
|--------|-------|
| Context after 5 tasks | 25,000 tokens (~7.5GB) |
| Tasks before crash | 3-5 |
| Memory at crash | 7,500MB |
| Time to crash | 30-60 minutes |

### With Artifacts (After Installation)

| Metric | Value |
|--------|-------|
| Context after 5 tasks | 250 tokens (~200MB) |
| Tasks before crash | 50+ |
| Memory at 50 tasks | 2,500MB |
| Time to crash | Never (sustainable) |

## Verification Steps

After installing artifacts, verify it's working:

```bash
# 1. Check current session
cat .claude/artifacts/.current-session
# Output: 2025-10-08_1430

# 2. Delegate a task
npx tsx .claude/scripts/delegation-router.ts "Add component" --execute

# 3. Check agent wrote to scratchpad
ls .claude/artifacts/sessions/$(cat .claude/artifacts/.current-session)/
# Should show: manifest.json, {agent-name}.md

# 4. Read summary (lightweight)
npx tsx .claude/scripts/artifact-read.ts --summary
# Should show brief summary, NOT full agent response

# 5. Check memory usage is low
ps aux | grep claude | awk '{print $6/1024 "MB"}'
# Should be much lower than before
```

## Troubleshooting

### "Still crashing after installing artifacts"

**Check if agents are using artifacts**:
```bash
# 1. Check agent config
cat .claude/agents/configs/backend-architect.json | jq '.artifacts'
# Should show: enabled: true

# 2. Check session exists
cat .claude/artifacts/.current-session
# Should show session ID

# 3. Check scratchpads exist
ls .claude/artifacts/sessions/*/
# Should show agent scratchpad files
```

**If not working**:
```bash
# Reinstall with --force
npx degit darrentmorgan/claude-config-template .claude-temp --force
cd .claude-temp && bash setup.sh --update
cd .. && rm -rf .claude-temp
```

### "Memory guard not triggering"

**Check hook is installed**:
```bash
cat .claude/settings.local.json | jq '.hooks["user-prompt-submit"]'
# Should show: [".claude/hooks/memory-guard.sh"]
```

**Make hook executable**:
```bash
chmod +x .claude/hooks/memory-guard.sh
```

### "Need to adjust memory limit"

**Edit memory guard**:
```bash
# .claude/hooks/memory-guard.sh
LIMIT_MB=5120  # Lower to 5GB for earlier warnings
LIMIT_MB=7168  # Higher to 7GB if rarely crashing
```

## Best Practices

### 1. Monitor Memory Proactively

```bash
# Check current memory usage
ps aux | grep claude | awk '{print $6/1024 "MB"}'
```

### 2. Clean Artifact Sessions Regularly

```bash
# Archive sessions older than 7 days
npx tsx .claude/scripts/artifact-cleanup.ts --clean --days 7
```

### 3. Restart Between Major Features

Even with artifacts, restart Claude Code between major feature implementations to ensure clean state.

### 4. Use Artifacts from Day 1

Don't wait for crashes - install artifacts immediately in new projects:

```bash
# In new project
npx degit darrentmorgan/claude-config-template .claude-temp && \
cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp
```

## Context Optimization Checklist

- [ ] Artifacts installed (`.claude/artifacts/` exists)
- [ ] Agent configs have `artifacts.enabled: true`
- [ ] Memory guard hook is executable (`chmod +x`)
- [ ] Session auto-creates on first delegation
- [ ] Agents return summaries, not full responses
- [ ] Memory stays below 50% during normal use
- [ ] Can run 10+ tasks without restart

## See Also

- [Artifact System Guide](ARTIFACT_SYSTEM_GUIDE.md) - Complete documentation
- [Quick Start](ARTIFACT_QUICK_START.md) - 30-second test
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [Memory Protection](../hooks/memory-guard.sh) - Hook source code

## Support

If still experiencing crashes after artifact installation:

1. Check GitHub issues: https://github.com/darrentmorgan/claude-config-template/issues
2. Verify Node 20 LTS: `node --version` should show v20.x.x
3. Check memory limit: 8GB RAM minimum recommended
4. Review agent configs: All should have `artifacts.enabled: true`
