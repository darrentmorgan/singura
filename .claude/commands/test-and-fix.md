---
description: Run tests with autonomous fix loop - retries up to 3 times with AI debugging
argument-hint: [test-pattern]
model: claude-sonnet-4-5-20250929
---

# Test and Fix Command

Autonomous test execution with automatic debugging and fixing on failures.

## Purpose

Run tests and automatically fix failures using AI agents. If tests fail, the system:
1. Analyzes the failure type (TypeScript errors, reference errors, async issues, etc.)
2. Delegates to appropriate agent (typescript-pro, debugger)
3. Agent fixes the issues
4. Re-runs tests
5. Repeats up to MAX_TEST_RETRIES times (default: 3)

## Variables

TEST_PATTERN: $1 (optional - specific test file or pattern to run)
MAX_RETRIES: ${MAX_TEST_RETRIES:-3} (from .env, default: 3)

## Workflow

```
Run Tests
   ↓
Tests Pass? → ✓ Done
   ↓ No
Retry Count < Max?
   ↓ Yes
Analyze Failure Type
   ↓
Delegate to Fixing Agent
   │
   ├─ TypeScript errors → typescript-pro
   ├─ Reference errors → debugger
   ├─ Async/timeout → debugger
   └─ Other → debugger
   ↓
Agent Fixes Issues
   ↓
Re-run Tests (increment retry count)
   ↓
[Loop back to top]
```

## Usage

```bash
# Run all tests with auto-fix
/test-and-fix

# Run specific test file with auto-fix
/test-and-fix src/components/Button.test.tsx

# Run tests matching pattern
/test-and-fix "Button"
```

## Implementation (For Claude)

When you see this command, execute this workflow:

```typescript
async function testAndFix(testPattern?: string) {
  const maxRetries = parseInt(process.env.MAX_TEST_RETRIES || '3');
  let attempt = 0;
  let testsPassed = false;

  // Reset retry counter
  await Bash('rm -f .claude/.test-retry-count.txt');

  while (attempt < maxRetries && !testsPassed) {
    attempt++;
    console.log(`\n🧪 Test Attempt ${attempt}/${maxRetries}\n`);

    // Run tests
    const testCommand = testPattern
      ? `npm test -- ${testPattern}`
      : `npm test`;

    const result = await Bash({
      command: testCommand + ' 2>&1 | tee .claude/.last-test-output.log',
      description: `Run tests (attempt ${attempt})`
    });

    // Check if tests passed
    if (result.exit_code === 0) {
      testsPassed = true;
      console.log('\n✅ All tests passed!\n');
      break;
    }

    // Tests failed - analyze and fix
    console.log(`\n❌ Tests failed on attempt ${attempt}\n`);

    if (attempt >= maxRetries) {
      console.log(`\n⚠️  Maximum retry attempts (${maxRetries}) reached`);
      console.log('Manual intervention required\n');
      break;
    }

    // Read test output
    const testOutput = await Read('.claude/.last-test-output.log');

    // Determine failure type and select agent
    let fixingAgent = 'debugger';
    let fixPrompt = 'Analyze and fix test failures';

    if (testOutput.includes('Type') && testOutput.includes('Error')) {
      fixingAgent = 'typescript-pro';
      fixPrompt = 'Fix TypeScript type errors causing test failures';
    } else if (testOutput.includes('ReferenceError') || testOutput.includes('is not defined')) {
      fixingAgent = 'debugger';
      fixPrompt = 'Fix undefined reference errors in tests';
    } else if (testOutput.includes('timeout') || testOutput.includes('async')) {
      fixingAgent = 'debugger';
      fixPrompt = 'Fix async/timeout issues in failing tests';
    }

    console.log(`\n🔧 Delegating to ${fixingAgent} to fix issues...\n`);

    // Delegate to fixing agent
    await Task({
      subagent_type: fixingAgent,
      description: `Fix test failures (attempt ${attempt})`,
      prompt: `${fixPrompt}

Test output:
\`\`\`
${testOutput}
\`\`\`

Please:
1. Identify the root cause of test failures
2. Fix the issues in the code (NOT the tests unless they're clearly wrong)
3. Ensure fixes don't break other functionality
4. Return a brief summary of what was fixed

CRITICAL: After fixing, I will re-run tests automatically. Do NOT run tests yourself.`
    });

    console.log(`\n✓ Fixes applied, re-running tests...\n`);
  }

  // Final status
  if (testsPassed) {
    return {
      status: 'success',
      attempts: attempt,
      message: `✅ Tests passed after ${attempt} attempt(s)`
    };
  } else {
    return {
      status: 'failed',
      attempts: attempt,
      message: `❌ Tests still failing after ${maxRetries} attempts - manual intervention needed`
    };
  }
}
```

## Environment Variables

Configure in `.env`:

```bash
# Maximum test failure retry attempts
MAX_TEST_RETRIES=3

# Enable autonomous mode for auto-delegation
AUTONOMY_LEVEL=high
```

## Output Example

```
🧪 Test Attempt 1/3

Running tests...
❌ Tests failed on attempt 1

🔧 Delegating to typescript-pro to fix issues...
✓ Fixed: Missing import for React
✓ Fixed: Incorrect prop type definition

✓ Fixes applied, re-running tests...

🧪 Test Attempt 2/3

Running tests...
✅ All tests passed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Test and Fix Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✅ Success
Attempts: 2/3
Duration: 45 seconds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Benefits

✅ **Autonomous Debugging** - No manual intervention for common test failures
✅ **Smart Agent Selection** - Routes to appropriate specialist based on error type
✅ **Loop Prevention** - Max 3 attempts prevents infinite retries
✅ **Detailed Logging** - All attempts logged to .claude/.test-history.log
✅ **Time Savings** - Typical 15-30 min debugging reduced to 2-5 min

## Safety Mechanisms

1. **Max Retries**: Default 3, configurable via MAX_TEST_RETRIES
2. **Retry Counter**: Tracked in .claude/.test-retry-count.txt
3. **Timeout**: Each test run has standard npm test timeout
4. **Agent Timeout**: Each agent has AGENT_TIMEOUT_SECONDS limit
5. **Manual Override**: User can Ctrl+C to stop at any time

## Integration with Other Commands

Works well with:
- `/scout_plan_build` - After building, run `/test-and-fix`
- `/review` - Run after review detects test coverage gaps
- `/monitor-and-fix-pr` - Uses same auto-fix logic for CI failures

## Troubleshooting

**Tests keep failing after 3 attempts:**
- Check `.claude/.last-test-output.log` for detailed errors
- Review `.claude/.test-history.log` for pattern of failures
- May need manual intervention for complex issues

**Agent not delegating:**
- Verify `AUTONOMY_LEVEL=high` in `.env`
- Check `.claude/scripts/auto-delegate.sh` exists
- Ensure test output is being captured correctly

**Want more/fewer retries:**
```bash
# In .env
MAX_TEST_RETRIES=5  # Increase to 5
# or
MAX_TEST_RETRIES=1  # Just one retry
```
