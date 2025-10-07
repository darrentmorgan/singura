# Monitor and Fix PR Command

Autonomously monitor GitHub PR CI/CD pipeline and fix failures automatically.

## Workflow

This command runs a continuous loop that:

1. **Monitor PR Status** (every 30 seconds)
   - Check GitHub PR checks status
   - Detect failures, pending, or success

2. **On Failure Detected**
   - Fetch failed job logs from GitHub Actions
   - Analyze error messages
   - Delegate to appropriate agent:
     - Type errors → `typescript-pro`
     - Test failures → `debugger`
     - Linting errors → `frontend-developer` or `backend-architect`
     - Build errors → `typescript-pro`
     - E2E failures → `qa-expert`

3. **Agent Fixes Issues**
   - Agent analyzes the specific error
   - Applies fixes
   - Runs local verification

4. **Auto-Commit and Push**
   - Commit fixes with descriptive message
   - Push to PR branch
   - Triggers new CI run

5. **Repeat Until Success**
   - Continue monitoring
   - Fix new failures if they appear
   - Stop when all checks pass ✅

## Usage

```bash
/monitor-and-fix-pr 2
```

Or with custom options:
```bash
/monitor-and-fix-pr 2 --interval 30 --max-attempts 10
```

## Implementation (For Claude)

When you see this command, execute this workflow:

```typescript
async function monitorAndFixPR(prNumber: number) {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // 1. Check PR status
    const status = await checkPRStatus(prNumber);

    if (status.allPassed) {
      return "✅ All checks passed!";
    }

    if (status.hasFailed) {
      // 2. Get failure details
      const failures = await getFailureDetails(prNumber);

      // 3. Delegate to appropriate agent
      for (const failure of failures) {
        const agent = selectAgent(failure.type);
        await Task({
          subagent_type: agent,
          description: `Fix ${failure.type} error in CI`,
          prompt: `Fix this CI failure:\n\n${failure.log}`
        });
      }

      // 4. Commit and push fixes
      await commitAndPush("fix: resolve CI failures via autonomous agents");

      // 5. Wait for new CI run to start
      await sleep(60000); // 1 minute
    }

    // Wait before next check
    await sleep(30000); // 30 seconds
    attempts++;
  }

  throw new Error("Max attempts reached");
}
```

## Agent Selection Logic

| Error Pattern | Agent |
|---------------|-------|
| `Unexpected any`, `Type error` | `typescript-pro` |
| `Test failed`, `ReferenceError` | `debugger` |
| `Linting error`, `ESLint` | `frontend-developer` |
| `Build failed`, `Cannot find module` | `typescript-pro` |
| `E2E test failed`, `Playwright` | `qa-expert` |
| `Memory`, `heap`, `timeout` | `debugger` |

## Output

The command will output:

```
🔍 Monitoring PR #2...

⏳ [09:18:30] Checks pending (3 running)
⏳ [09:19:00] Checks pending (2 running)
❌ [09:19:30] FAILURE DETECTED in Quality Gate job

🤖 Delegating to debugger agent...
   Issue: ReferenceError: expect is not defined
   Files: 4 test files

✅ Agent fixed the issue
📝 Committed: fix: add explicit Vitest imports
⬆️  Pushed to PR branch
🔄 New CI run triggered

⏳ [09:20:30] Checks pending (3 running)
⏳ [09:21:00] Checks pending (2 running)
⏳ [09:21:30] Checks pending (1 running)
✅ [09:22:00] ALL CHECKS PASSED!

Summary:
- Total iterations: 8
- Failures detected: 1
- Agents used: debugger
- Final status: SUCCESS ✅
```

## Configuration

**Check interval:** 30 seconds (configurable)
**Max duration:** 20 minutes (40 iterations)
**Timeout:** Stop if no progress after 5 failures
**Rate limit:** Max 10 auto-commits per PR

## Notes

- Runs autonomously - no human intervention needed
- Logs all activity to `.claude/.pr-monitor.log`
- Saves status to `.claude/.pr-status.json`
- Can be stopped with Ctrl+C
- Resumes from current state if restarted

## Benefits

✅ **Hands-off monitoring** - You don't need to check manually
✅ **Automatic fixes** - Agents fix issues as they appear
✅ **Continuous iteration** - Keeps fixing until success
✅ **Full transparency** - All actions logged
✅ **Smart delegation** - Right agent for each error type

## Example Session

```bash
# You create a PR
gh pr create ...

# Start autonomous monitor
/monitor-and-fix-pr 2

# Claude monitors and fixes autonomously
# You can do other work or step away
# Returns when all checks pass or max attempts reached
```

## Future Enhancements

- [ ] Slack/Discord notifications on failure/success
- [ ] Learning from patterns (cache common fixes)
- [ ] Parallel agent execution for multiple failures
- [ ] Cost tracking for agent invocations
- [ ] Human approval for risky fixes
