# Build - Execute Implementation Plan via TDD

Phase 3 of the Scout → Plan → Build workflow.

Executes the implementation plan step-by-step using test-driven development and specialist agent delegation.

## Purpose

Builder transforms Planner's checklist into working code by:
- Writing failing tests first (TDD)
- Delegating implementation to specialist agents
- Running tests after each step
- Making incremental git commits
- Stopping on failures

**Input**: `.claude/artifacts/plan.md` (from Planner)
**Output**: Working code, tests, git commits

---

## Usage

```bash
# After planning
User: "Execute the implementation plan"

# With specific plan file
User: "Build from plan at .claude/artifacts/plan.md"

# With test execution
User: "Execute plan and run tests after each step"
```

---

## Workflow

This command invokes the `build-executor` agent via Task tool:

### For Each Step in Plan:

1. **Write Failing Test**
   - Read test case from plan step
   - Delegate to `test-automator` if complex
   - Or write directly if simple
   - Save test file

2. **Run Test Suite**
   - Execute: `pnpm test` (or npm/yarn)
   - **Verify test fails** (red phase)
   - If test passes prematurely, flag error

3. **Implement Code**
   - Delegate to specialist agent based on step:
     - React component → `frontend-developer`
     - API handler → `backend-architect`
     - Database → `backend-architect` or `database-optimizer`
     - Types/contracts → `typescript-pro`
   - Keep implementation **minimal** - just enough to pass test

4. **Run Test Suite Again**
   - Execute tests
   - **Verify test passes** (green phase)
   - If fails, debug or report

5. **Refactor (Optional)**
   - Clean up code if needed
   - Maintain passing tests
   - Keep changes small

6. **Git Commit**
   - Stage all changes: `git add -A`
   - Commit with format: `feat: {step-title}` or `test: add {test-name}`
   - Example: `git commit -m "feat: add dark mode toggle to Settings"`

7. **Trigger Pre-Commit Hook**
   - Hook runs: linting, type-check, full test suite
   - **If hook fails, STOP**
   - Report failure to user
   - Do not proceed to next step

8. **Log Progress**
   - Record step completion
   - Track commits made
   - Note any issues

### Stop Conditions:

- ✅ All steps completed successfully
- ❌ Test failure that can't be resolved
- ❌ Pre-commit hook blocks commit
- ❌ Two consecutive failures on same step (prevent infinite loops)
- ⚠️ Token budget exceeded (warn and pause)

---

## Agent Delegation Examples

Builder orchestrates specialist agents:

### React Component Step
```
build-executor → Task(frontend-developer)
  Prompt: "Implement Button component with variant prop.
          Test file exists at src/components/Button.test.tsx.
          Make test pass with minimal code."
```

### API Endpoint Step
```
build-executor → Task(backend-architect)
  Prompt: "Create POST /api/users endpoint with Zod validation.
          Test exists. Implement handler to pass test."
```

### Type Safety Step
```
build-executor → Task(typescript-pro)
  Prompt: "Fix type errors in UserProfile interface.
          Ensure contracts.ts type-checks."
```

---

## Example Execution

**Plan**:
```markdown
### Step 1: Write failing test for theme store
### Step 2: Implement theme store logic
### Step 3: Wire toggle to UI
```

**Builder Execution**:

```
🏗️  Build-Executor Starting...

Step 1/3: Write failing test for theme store
  ├─ Create src/lib/theme.test.ts
  ├─ Run tests... ❌ FAIL (expected)
  ├─ Implement src/lib/theme.ts (delegate to frontend-developer)
  ├─ Run tests... ✅ PASS
  ├─ Git commit: "test: add theme store tests"
  └─ Pre-commit hook: ✅ PASS

Step 2/3: Implement theme store logic
  ├─ Tests already exist (Step 1)
  ├─ Add toggle() and persistence (delegate to frontend-developer)
  ├─ Run tests... ✅ PASS
  ├─ Git commit: "feat: implement theme store with persistence"
  └─ Pre-commit hook: ✅ PASS

Step 3/3: Wire toggle to Settings UI
  ├─ Create Settings.test.tsx
  ├─ Run tests... ❌ FAIL (expected)
  ├─ Update Settings.tsx (delegate to frontend-developer)
  ├─ Run tests... ✅ PASS
  ├─ Git commit: "feat: add dark mode toggle button to Settings"
  └─ Pre-commit hook: ✅ PASS

✅ Build Complete!
  Files changed: 4
  Commits: 3
  Tests: 8 passing
```

---

## Success Criteria

✅ All plan steps executed sequentially
✅ Every step has passing tests
✅ Incremental git commits made (one per step)
✅ Pre-commit hooks passed
✅ No test failures in final state
✅ Minimal code changes (respects Scout's scope)

---

## Failure Handling

### Test Failure
```
❌ Step 2: Test failed after implementation

Error: TypeError: themeStore.toggle is not a function
  at Settings.test.tsx:15

Action: Stopped execution. Fix manually or re-plan.
```

### Pre-Commit Hook Failure
```
❌ Step 3: Pre-commit hook blocked commit

Error: ESLint found 2 errors
  src/Settings.tsx:23 - unused variable 'oldTheme'

Action: Stopped. Fix lint errors before proceeding.
```

### Two Consecutive Failures
```
❌ Step 2: Failed twice (attempt 1 and 2)

Issue: Cannot resolve type error in theme.ts

Action: Marking step as BLOCKED. Manual intervention needed.
```

---

## Integration with Quality Gates

Builder respects existing template quality gates:

- **Pre-commit hook** (`.claude/hooks/pre-commit.sh`):
  - Linting
  - Type checking
  - Unit tests
  - AI code review (if enabled)
  - Min score: 80/100

- **Tool-use hook** (`.claude/hooks/tool-use.sh`):
  - Runs after Write/Edit
  - Auto-formatting
  - Quick checks

Builder does NOT bypass these - all checks must pass.

---

## Best Practices

### ✅ Do
- **Follow TDD strictly**: Red → Green → Refactor
- **Stop on failure**: Don't proceed if tests fail
- **Keep commits atomic**: One logical change per commit
- **Respect scope**: Only touch files from Scout's analysis
- **Use descriptive commit messages**: Others can understand changes

### ❌ Don't
- Skip writing tests (defeats TDD purpose)
- Make large multi-step commits
- Bypass quality gates with `--no-verify`
- Add unrelated changes or "improvements"
- Continue after repeated failures (infinite loops)

---

## Configuration

### Commit Message Format

Defined in `agents/configs/build-executor.json`:

```json
{
  "commit_message_format": {
    "test": "test: add {test-description}",
    "implementation": "feat: {feature-summary}",
    "refactor": "refactor: {what-improved}",
    "fix": "fix: {bug-description}"
  }
}
```

### Stop After N Failures

```json
{
  "special_instructions": [
    "If a step fails 2 times, mark as blocked and stop"
  ]
}
```

---

## Unattended Mode (Advanced)

⚠️ **Use with caution** - only in sandboxed environments

Builder can run unattended if:
- Working in isolated branch
- All work committed to git
- Running in container/sandbox
- No production credentials in repo

**Not recommended for**:
- Production code
- Main branch
- Large refactors
- Unclear requirements

---

## Next Steps

After Builder completes:

1. **Review commits**: `git log --oneline`
2. **Run full test suite**: `pnpm test`
3. **Manual testing**: Verify features work as expected
4. **Create PR**: If approved, push and open pull request
5. **Deploy** (optional): Use `/deploy` command

---

## Notes

- Builder delegates to specialists - doesn't implement directly
- Respects all existing hooks and quality gates
- Creates one commit per plan step (traceable history)
- Stops immediately on failure (safe by default)
- Works best with clear, detailed plans from Planner
