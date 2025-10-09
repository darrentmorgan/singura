# Testing Guide - Claude Code Configuration

Complete testing guide to verify all hooks, agents, commands, and functionality are working correctly.

---

## Quick Test (Automated)

Run the automated test suite:

```bash
cd /path/to/your/project
bash .claude/scripts/test-installation.sh
```

This checks:
- ✅ Directory structure
- ✅ Configuration files
- ✅ Agent configs
- ✅ Hook permissions
- ✅ Permissions in settings.local.json
- ✅ Placeholder replacement
- ✅ Global CLAUDE.md integration
- ✅ And more...

---

## Manual Testing (Interactive)

For complete verification, test each component manually:

### Test 1: Agent Delegation

**Purpose**: Verify agents auto-delegate on specific requests

**Steps**:
1. Open Claude Code in your project
2. Ask a specific, actionable question:
   ```
   Create a migration for adding a posts table with title and content
   ```

**Expected Result**:
- ✅ Claude should **immediately** delegate to `backend-architect` without asking
- ✅ You should see `Task` tool being called
- ✅ Agent returns with migration file created

**If it doesn't work**:
- Check: `~/.claude/CLAUDE.md` contains "Available Specialized Agents"
- Check: `.claude/agents/delegation-map.json` exists
- Check: `settings.local.json` has `"Task(*:*)"` permission

---

### Test 2: Tool-Use Hook (Auto-Format on Edit)

**Purpose**: Verify hooks trigger automatically after Edit/Write

**Steps**:
1. Edit any TypeScript file in your project:
   ```bash
   code src/example.ts
   ```

2. Make a change (add a comment or extra line)

3. Ask Claude to edit the file:
   ```
   Add a comment to src/example.ts explaining what it does
   ```

4. After Claude uses the Edit tool, check logs:
   ```bash
   cat .claude/.tool-use.log
   ```

**Expected Result**:
- ✅ `.claude/.tool-use.log` should have a new entry
- ✅ Hook runs Prettier (if configured)
- ✅ Hook output shows linting/formatting results

**If it doesn't work**:
- Check: `.claude/hooks/tool-use.sh` is executable (`ls -la .claude/hooks/`)
- Check: `settings.local.json` has `PostToolUse` hook configured
- Check: Hook script has no syntax errors (`bash -n .claude/hooks/tool-use.sh`)

---

### Test 3: Pre-Commit Hook (Quality Gate)

**Purpose**: Verify pre-commit quality checks run before commits

**Steps**:
1. Make a change to any file:
   ```bash
   echo "// Test change" >> src/test.ts
   git add src/test.ts
   ```

2. Attempt to commit:
   ```bash
   git commit -m "test commit"
   ```

**Expected Result**:
- ✅ Hook runs automatically
- ✅ Linting checks execute
- ✅ Type checking runs (if TypeScript project)
- ✅ Tests run (if configured)
- ✅ AI quality judge scores the changes
- ✅ Commit proceeds if score ≥ 80 or is blocked if < 80

**Output Example**:
```
Running pre-commit quality checks...
✓ Prettier formatting
✓ ESLint passed
✓ TypeScript compilation
✓ Tests passed
🤖 AI Quality Review: 85/100
✅ Quality gate passed - proceeding with commit
```

**If it doesn't work**:
- Check: Git hooks are configured (not using `--no-verify`)
- Check: `.claude/hooks/pre-commit.sh` exists and is executable
- Check: Package manager (pnpm/npm) is installed
- Check: Project has `lint` and `test` scripts in package.json

---

### Test 4: Slash Commands

**Purpose**: Verify custom slash commands work

**Steps**:
1. In Claude Code, type:
   ```
   /generate-api createUser POST
   ```

2. Or try:
   ```
   /create-component Button
   ```

**Expected Result**:
- ✅ Command is recognized
- ✅ Claude reads the command file from `.claude/commands/`
- ✅ Executes the instructions in the command
- ✅ Generates API endpoint or component as specified

**If it doesn't work**:
- Check: `.claude/commands/*.md` files exist
- Check: Command files have valid markdown and clear instructions
- Test with: `ls -la .claude/commands/`

---

### Test 5: Global Agent Sharing

**Purpose**: Verify agent configs are shared globally (if enabled)

**Steps**:
1. Check if using global sharing:
   ```bash
   ls -la .claude/agents/configs
   ```

2. If it's a symlink, verify target:
   ```bash
   readlink .claude/agents/configs
   # Should output: /Users/yourname/.claude/agents/shared/configs
   ```

3. Check target exists and has files:
   ```bash
   ls -la ~/.claude/agents/shared/configs/
   ```

**Expected Result**:
- ✅ `configs` is a symlink to `~/.claude/agents/shared/configs`
- ✅ Target directory exists with `.json` files
- ✅ All projects share the same agent configs

**If using local agents**:
- ✅ `configs` is a regular directory
- ✅ Contains `.json` files locally in the project

---

### Test 6: Permissions

**Purpose**: Verify Claude Code has necessary permissions

**Steps**:
1. Check permissions in settings:
   ```bash
   cat .claude/settings.local.json | jq '.permissions'
   ```

2. Test Task tool permission:
   ```
   (Ask Claude to delegate to an agent - see Test 1)
   ```

3. Test git permission:
   ```
   (Ask Claude to commit changes - see Test 3)
   ```

**Expected Result**:
- ✅ `Task(*:*)` permission exists (required for agents)
- ✅ `Bash(git:*)` permissions exist (for commits)
- ✅ Package manager permission exists (`Bash(pnpm:*)` etc.)

**If permission denied**:
- Add to `.claude/settings.local.json`:
  ```json
  {
    "permissions": {
      "allow": [
        "Task(*:*)",
        "Bash(git add:*)",
        "Bash(git commit:*)",
        "Bash(pnpm:*)"
      ]
    }
  }
  ```

---

### Test 7: Agent Routing Rules

**Purpose**: Verify keyword-based routing works

**Test different trigger keywords**:

```bash
# Should route to backend-architect
"Create a migration for users table"

# Should route to database-optimizer
"Optimize the slow query in posts"

# Should route to qa-expert
"Run E2E tests for login"

# Should route to frontend-developer
"Create a Dashboard component"

# Should route to documentation-expert
"How do I use Supabase RLS?"
```

**Expected Result**:
- ✅ Each request routes to the correct agent
- ✅ Claude uses Task tool immediately (for specific requests)
- ✅ Claude asks for clarification (for vague requests)

**Check routing rules**:
```bash
cat .claude/agents/delegation-map.json | jq '.mcp_routing_rules.routing_map[].keywords'
```

---

### Test 8: Logs and Debugging

**Purpose**: Verify logging is working

**Steps**:
1. Check log directory:
   ```bash
   ls -la .claude/logs/
   ```

2. Check session log:
   ```bash
   cat .claude/.session.log
   ```

3. Check tool-use log:
   ```bash
   cat .claude/.tool-use.log
   ```

**Expected Result**:
- ✅ Log directory exists and is writable
- ✅ Session log shows Claude Code activity
- ✅ Tool-use log shows Edit/Write operations

---

### Test 9: Quality Judge

**Purpose**: Test AI quality scoring on commits

**Steps**:
1. Make a deliberate low-quality change:
   ```typescript
   // Bad code - no types, poor naming
   function x(a,b){return a+b}
   ```

2. Try to commit:
   ```bash
   git add .
   git commit -m "bad code"
   ```

**Expected Result**:
- ✅ Pre-commit hook runs quality judge
- ✅ Low score (< 80) blocks the commit
- ✅ Feedback explains what's wrong

**Then make a good change**:
   ```typescript
   /**
    * Adds two numbers together
    * @param a - First number
    * @param b - Second number
    * @returns Sum of a and b
    */
   function addNumbers(a: number, b: number): number {
     return a + b;
   }
   ```

2. Commit again:
   ```bash
   git add .
   git commit -m "add addNumbers function"
   ```

**Expected Result**:
- ✅ High score (≥ 80) allows commit
- ✅ Positive feedback on code quality

---

### Test 10: Framework Detection

**Purpose**: Verify setup.sh detected your framework correctly

**Steps**:
1. Check what was detected:
   ```bash
   cat .claude/agents/delegation-map.json | jq '.delegation_rules[0].context.framework'
   ```

2. Verify it matches your project:
   - Next.js project → should say "Next.js" or "nextjs"
   - React project → should say "React 18"
   - Express project → should say "Express 5"

**Expected Result**:
- ✅ Framework matches your project type
- ✅ Routing rules are appropriate for your stack

---

## Common Issues & Fixes

### Issue 1: Hooks Not Running

**Symptom**: No output in `.claude/.tool-use.log` after edits

**Fix**:
```bash
# Make hooks executable
chmod +x .claude/hooks/*.sh

# Check hook configuration
cat .claude/settings.local.json | jq '.hooks'
```

---

### Issue 2: Agents Not Delegating

**Symptom**: Claude doesn't use Task tool

**Fix**:
```bash
# Check Task permission
cat .claude/settings.local.json | jq '.permissions.allow[] | select(contains("Task"))'

# If missing, add it:
# Edit .claude/settings.local.json and add "Task(*:*)" to permissions.allow
```

---

### Issue 3: Pre-Commit Hook Fails

**Symptom**: `pnpm: command not found` or similar

**Fix**:
```bash
# Check package manager in hooks
grep "PKG_MANAGER" .claude/hooks/pre-commit.sh

# Should show your package manager (pnpm, npm, etc.)
# If it shows "{{PKG_MANAGER}}", run setup.sh again
```

---

### Issue 4: Quality Gate Always Blocks

**Symptom**: All commits get score < 80

**Fix**:
```bash
# Lower threshold temporarily
# Edit .claude/agents/quality-judge.md
# Change min_score from 80 to 60

# Or disable AI judge
# Comment out lines 59-68 in .claude/hooks/pre-commit.sh
```

---

### Issue 5: Slash Commands Not Found

**Symptom**: `/generate-api` doesn't work

**Fix**:
```bash
# Check commands exist
ls .claude/commands/

# Commands must end with .md
# Example: generate-api.md (called with /generate-api)
```

---

## Success Checklist

After testing, you should have verified:

- [ ] Automated test script passes (`bash .claude/scripts/test-installation.sh`)
- [ ] Agent delegation works with specific requests
- [ ] Tool-use hook triggers after Edit/Write
- [ ] Pre-commit hook runs quality checks
- [ ] Quality gate blocks low-quality commits
- [ ] Slash commands execute correctly
- [ ] Logs are being written to `.claude/logs/`
- [ ] Global CLAUDE.md has agent reference
- [ ] Permissions allow Task and Bash tools
- [ ] Package manager is correctly configured

---

## Next Steps After Testing

1. **Customize for Your Stack**:
   - Edit `.claude/agents/delegation-map.json` for your file patterns
   - Update `.claude/commands/` for project-specific workflows

2. **Adjust Quality Gates**:
   - Modify `.claude/agents/quality-judge.md` thresholds
   - Enable/disable specific checks in hooks

3. **Share Configuration**:
   - Decide: commit `.claude/` to git (shared) or add to `.gitignore` (private)
   - Enable global agent sharing for consistency across projects

4. **Monitor Performance**:
   - Watch `.claude/logs/` for issues
   - Adjust hook timeouts if needed
   - Fine-tune agent routing rules

---

## Support

If tests fail or functionality doesn't work:

1. Check logs: `.claude/logs/`, `.claude/.session.log`, `.claude/.tool-use.log`
2. Verify permissions: `cat .claude/settings.local.json | jq '.permissions'`
3. Test hooks manually: `bash .claude/hooks/tool-use.sh /tmp/test.ts`
4. Review documentation: `.claude/docs/AGENT_REFERENCE.md`
5. Re-run setup: `bash /path/to/claude-config-template/setup.sh`

---

*Last Updated: 2025-10-08*
