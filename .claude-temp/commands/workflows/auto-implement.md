# Auto-Implement - Autonomous Scout → Plan → Build Orchestrator

Single-command autonomous implementation workflow. Collects inputs upfront, then runs Scout → Plan → Build sequentially with file-based state transfer.

---

## Purpose

Execute complete feature implementation in one continuous flow:
1. Collect all inputs from user request (ONCE at start)
2. Phase 1: Scout identifies minimal context
3. Phase 2: Planner creates TDD plan
4. Phase 3: Builder executes with incremental commits

**This is an ORCHESTRATOR** - it coordinates agents but doesn't implement directly.

---

## Usage

```bash
# Basic usage - extract all info from request
User: "Auto-implement dark mode toggle in Settings"

# With explicit directories
User: "Auto-implement user profiles, scan app and src directories"

# With documentation
User: "Auto-implement Stripe checkout, reference Stripe SDK docs"

# With custom commit prefix
User: "Auto-implement loading spinners, use commit prefix 'ui'"
```

---

## Orchestration Workflow

### Step 1: Parse User Request & Collect Inputs

**Extract from user's message**:

- **task**: The feature/bug description
  - Example: "Add dark mode toggle in Settings"
  - Example: "Fix payment processing timeout"
  - Example: "Implement user profile management"

- **code_roots**: Directories to scan
  - Default: `"app,src,components,pages,lib"`
  - Override if user specifies: "scan src and lib" → `"src,lib"`

- **doc_urls**: External documentation URLs
  - Extract if mentioned: "check Stripe docs" → identify Stripe SDK URL
  - Default: empty string `""`

- **commit_prefix**: Git commit message prefix
  - Default: `"feat"`
  - Override if specified: "use prefix 'ui'" → `"ui"`

- **run_tests**: Whether to run tests after each step
  - Default: `true`

**Display collected inputs** to user for confirmation:
```
📋 Auto-Implement Configuration:
  Task: Add dark mode toggle in Settings
  Scan: app,src,components,pages,lib
  Docs: (none)
  Commit Prefix: feat
  Run Tests: true

Starting Scout → Plan → Build workflow...
```

---

### Step 2: Prepare Artifacts Directory

Create artifacts directory if it doesn't exist:

```
Bash: mkdir -p .claude/artifacts
```

---

### Step 3: PHASE 1 - Scout (Context Identification)

**Invoke scout-agent** using the Task tool with this exact prompt structure:

```
Task Tool Parameters:
  subagent_type: "scout-agent"
  description: "Identify files for {task}"
  prompt: "Identify minimal files and dependencies for implementing: {task}

Scan these directories: {code_roots}

Your goal is to find ONLY the files truly needed for this task. Focus on:
- Files that will need modification
- Files needed for context (imports, dependencies)
- Key symbols and their relationships

Use these tools strategically:
- Glob: Find files by pattern
- Grep: Search for symbols, imports, class names
- Read: Examine specific files (minimal, targeted)

Create a scout report and write to: .claude/artifacts/scout-report.md

Format the report as:

# Scout Report: {task}

## Summary
{1-2 sentences about scope}

## Relevant Files

### Files to Modify
| Path | Reason | Ranges | Symbols | Risk |
|------|--------|--------|---------|------|
| {path} | {why needed} | lines X-Y | {exports} | low/med/high |

### Files for Context Only
| Path | Reason | Ranges | Symbols |
|------|--------|--------|---------|
| {path} | {why needed} | lines X-Y | {exports} |

## Dependencies
- {File A} → {File B} ({relationship})

## Key Symbols
- {symbol name} ({type: component/function/type})

## Open Questions
- {question}?

## Scope Estimate
- Files: {number}
- Complexity: {Low/Medium/High}
- Risk: {Low/Medium/High}

Be minimal - only include what's truly necessary for implementing {task}."
```

**Wait for scout-agent to complete.**

After completion:
1. Read the file: `.claude/artifacts/scout-report.md`
2. Display to user: `"✓ Scout complete: {files} files identified, {complexity} complexity"`

---

### Step 4: PHASE 2 - Planner (TDD Planning)

**Invoke planner-agent** using the Task tool with this exact prompt structure:

```
Task Tool Parameters:
  subagent_type: "planner-agent"
  description: "Create TDD plan for {task}"
  prompt: "Create a test-driven implementation plan for: {task}

Load the scout report from: .claude/artifacts/scout-report.md

{if doc_urls is not empty}
Reference these documentation URLs: {doc_urls}

If you need detailed API documentation or code examples:
- Delegate to documentation-expert agent using Task tool
- Ask for specific framework/library documentation
- Include examples in your plan
{endif}

Create a step-by-step TDD plan following these rules:

1. **Test-First**: Every step must start with a failing test
2. **Minimal Steps**: Break into < 10 discrete steps
3. **Specialist Delegation**: Specify which agents to use per step
4. **Token Budgeting**: Estimate tokens (small: <500, medium: 500-1500, large: >1500)
5. **Defer Extras**: Move non-critical enhancements to "Next Iterations"

Write plan to: .claude/artifacts/plan.md

Format as:

# Implementation Plan: {task}

## Goal
{1-2 sentence description}

## Prerequisites
- Files: {list from scout}
- Dependencies: {from scout}

## Steps

### Step 1: {title}
- **Test**: {specific failing test to write}
- **Implementation**: {minimal code description - just enough to pass test}
- **Agents**: [{agent-name}, {agent-name}]
- **Tokens**: ~{number} ({small/medium/large})
- **Risk**: {low/medium/high}

### Step 2: {title}
[... same format ...]

[... more steps ...]

## Total Estimate
- Steps: {count}
- Tokens: ~{total}
- Duration: ~{minutes} minutes

## Next Iterations (Deferred)
- {enhancement that's not critical}
- {nice-to-have feature}

## Rollback Plan
- {how to undo changes if needed}

Focus on WHAT to build, not HOW (Builder handles implementation details).
Respect Scout's file recommendations - don't expand scope.
Break complex steps into smaller ones if needed."
```

**Wait for planner-agent to complete.**

After completion:
1. Read the file: `.claude/artifacts/plan.md`
2. Display to user: `"✓ Plan complete: {steps} steps planned, ~{tokens} tokens estimated"`

---

### Step 5: PHASE 3 - Builder (TDD Execution)

**Invoke build-executor** using the Task tool with this exact prompt structure:

```
Task Tool Parameters:
  subagent_type: "build-executor"
  description: "Execute plan via TDD"
  prompt: "Execute the implementation plan via strict test-driven development.

Load the plan from: .claude/artifacts/plan.md

Configuration:
- Commit prefix: {commit_prefix}
- Run tests after each step: {run_tests}
- Stop on failures: true

For EACH step in the plan, execute this TDD cycle:

**1. Write Failing Test**
- Read the test specification from the plan step
- If test is complex, delegate to test-automator agent
- If test is simple, write it directly
- Save test file

**2. Verify Test Fails (Red Phase)**
- Run test suite (pnpm test or npm test)
- Confirm test FAILS as expected
- If test passes prematurely, something is wrong - stop and report

**3. Implement Code (Green Phase)**
- Delegate to the specialist agent(s) listed in the step:
  * React components, UI → frontend-developer
  * API handlers, database → backend-architect
  * Type issues, contracts → typescript-pro
  * Complex test logic → test-automator
  * Query optimization → database-optimizer
- Use Task tool to invoke specialist with precise instructions
- Keep implementation MINIMAL - just enough to make test pass

**4. Verify Test Passes**
- Run test suite again
- Confirm test PASSES
- If still fails, try once more or mark step as blocked

**5. Refactor (Optional)**
- Clean up code if needed
- Keep changes minimal
- Maintain passing tests

**6. Git Commit**
- Stage all changes: git add -A
- Commit with format: \"{commit_prefix}: {step title}\"
- Example: \"feat: add dark mode toggle to Settings\"
- Pre-commit hook will run automatically (linting, type-check, tests)

**7. Validate Hooks**
- If pre-commit hook fails:
  * Stop immediately
  * Report failure details
  * Do NOT continue to next step
- If hook passes, proceed

**8. Log Progress**
- Record step completion
- Track commit SHA
- Note any issues

**Stop Conditions** (fail-fast):
- ❌ Test fails after implementation (and retry fails)
- ❌ Pre-commit hook blocks commit
- ❌ Same step fails twice consecutively
- ❌ Token budget significantly exceeded (warn user)

Return a structured summary:

## Execution Summary

### Steps Completed
- Step 1: {title} ✓
- Step 2: {title} ✓
- Step 3: {title} ✓

### Git Commits
- {sha}: {commit message}
- {sha}: {commit message}
- {sha}: {commit message}

### Files Changed
- {filepath}
- {filepath}

### Test Status
- Total: {count}
- Passing: {count}
- Failing: {count}

### Quality Score
- {score}/100 (from pre-commit hook if available)

### Issues Encountered
- {issue description} (if any)

### Next Steps
- Review commits: git log -{count}
- Run full test suite: pnpm test
- Create PR: gh pr create
- Deploy: /deploy

Do NOT improvise or skip steps. Follow the plan exactly.
Do NOT bypass quality gates or use --no-verify.
Do NOT continue after failures - stop and report."
```

**Wait for build-executor to complete.**

---

### Step 6: Present Final Summary

Display comprehensive summary to user:

```
═══════════════════════════════════════
✅ Auto-Implement Complete!
═══════════════════════════════════════

📊 Summary:
  Task: {task}
  Duration: {total time from start to finish}

🏗️  Execution:
  Phase 1: Scout - {files} files identified
  Phase 2: Planner - {steps} TDD steps created
  Phase 3: Builder - {steps} steps executed

📝 Changes:
  Files modified: {count}
    - {file1}
    - {file2}

🔨 Commits: {count}
  - {sha}: {message}
  - {sha}: {message}
  - {sha}: {message}

✅ Tests: {passing}/{total} passing

📈 Quality: {score}/100

🎯 Next Steps:
  1. Review commits: git log -{count} --oneline
  2. Manual testing: Verify feature works
  3. Create PR: gh pr create
  4. Deploy: /deploy

═══════════════════════════════════════
```

---

## Input Parsing Examples

### Example 1: Simple Request
```
User: "Auto-implement dark mode toggle"

Parsed Inputs:
✓ task: "dark mode toggle"
✓ code_roots: "app,src,components,pages,lib" (default)
✓ doc_urls: ""
✓ commit_prefix: "feat" (default)
✓ run_tests: true (default)
```

### Example 2: Detailed Request
```
User: "Auto-implement Stripe payment integration, scan src and lib directories, reference Stripe SDK docs"

Parsed Inputs:
✓ task: "Stripe payment integration"
✓ code_roots: "src,lib" (user specified)
✓ doc_urls: "Stripe SDK documentation" (search or use provided URL)
✓ commit_prefix: "feat" (default)
✓ run_tests: true (default)
```

### Example 3: Custom Settings
```
User: "Auto-implement loading spinners with ui prefix, skip tests"

Parsed Inputs:
✓ task: "loading spinners"
✓ code_roots: "app,src,components,pages,lib" (default)
✓ doc_urls: ""
✓ commit_prefix: "ui" (user specified)
✓ run_tests: false (user specified "skip tests")
```

---

## Data Persistence & State Management

### Artifacts Directory Structure

```
.claude/artifacts/
├── scout-report.md         # Phase 1 → Phase 2
├── plan.md                 # Phase 2 → Phase 3
├── design-notes.md         # Phase 2 (optional)
└── build-log.md            # Phase 3 (optional)
```

### State Transfer Mechanism

```
auto-implement command (orchestrator)
    ↓
  Task(scout-agent)
    ↓ (blocks/waits)
  scout-agent completes
    ↓ (writes file)
  scout-report.md created
    ↓
  orchestrator continues
    ↓ (reads file)
  Read(scout-report.md) → into memory
    ↓ (passes file path)
  Task(planner-agent) with "Load scout report from: .claude/artifacts/scout-report.md"
    ↓ (blocks/waits)
  planner-agent completes
    ↓ (writes file)
  plan.md created
    ↓
  orchestrator continues
    ↓ (reads file)
  Read(plan.md) → into memory
    ↓ (passes file path)
  Task(build-executor) with "Execute plan from: .claude/artifacts/plan.md"
    ↓ (blocks/waits)
  build-executor completes
    ↓ (returns summary)
  orchestrator continues
    ↓
  Present final summary to user
```

**Key**: File paths are passed as **strings** in Task tool prompts, agents read files from disk.

---

## Execution Flow (Detailed)

```
USER INPUT
  ↓
┌─────────────────────────────────────────────┐
│ ORCHESTRATOR (auto-implement command)       │
│                                             │
│ [Parse request]                             │
│   task = extract_task(user_message)        │
│   code_roots = extract_dirs(user_message)  │
│   doc_urls = extract_docs(user_message)    │
│   commit_prefix = extract_prefix() || "feat"│
│   run_tests = true                          │
│                                             │
│ [Display config to user]                    │
│   "📋 Starting with: {task}, {code_roots}..." │
│                                             │
│ [Create artifacts dir]                      │
│   Bash: mkdir -p .claude/artifacts         │
└────────────┬────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ PHASE 1: SCOUT                               │
│                                              │
│ Task(scout-agent):                           │
│   prompt: "Identify files for: {task}       │
│            Scan: {code_roots}               │
│            Output: .claude/artifacts/       │
│                   scout-report.md"          │
│                                              │
│ [WAIT - Task tool blocks]                   │
│                                              │
│ scout-agent executes:                        │
│   - Globs for files                         │
│   - Greps for symbols                       │
│   - Reads relevant sections                 │
│   - Writes scout-report.md                  │
│                                              │
│ [Agent returns - orchestrator continues]    │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ ORCHESTRATOR READS ARTIFACT                  │
│                                              │
│ Read: .claude/artifacts/scout-report.md     │
│                                              │
│ [Parse scout report]                         │
│   files_found = count_files(report)         │
│   complexity = report.scope_estimate        │
│                                              │
│ [Display progress]                           │
│   "✓ Scout complete: {files_found} files,   │
│    {complexity} complexity"                  │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ PHASE 2: PLANNER                             │
│                                              │
│ Task(planner-agent):                         │
│   prompt: "Create TDD plan for: {task}      │
│            Input: .claude/artifacts/        │
│                   scout-report.md           │
│            {if doc_urls:}                   │
│            Reference docs: {doc_urls}       │
│            Output: .claude/artifacts/       │
│                   plan.md"                  │
│                                              │
│ [WAIT - Task tool blocks]                   │
│                                              │
│ planner-agent executes:                      │
│   - Reads scout-report.md                   │
│   - (May delegate to documentation-expert)  │
│   - Breaks task into TDD steps             │
│   - Writes plan.md + design-notes.md       │
│                                              │
│ [Agent returns - orchestrator continues]    │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ ORCHESTRATOR READS ARTIFACT                  │
│                                              │
│ Read: .claude/artifacts/plan.md             │
│                                              │
│ [Parse plan]                                 │
│   steps_count = count_steps(plan)           │
│   tokens_estimate = plan.total_estimate     │
│                                              │
│ [Display progress]                           │
│   "✓ Plan complete: {steps_count} steps,    │
│    ~{tokens_estimate} tokens"               │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ PHASE 3: BUILDER                             │
│                                              │
│ Task(build-executor):                        │
│   prompt: "Execute plan via TDD:            │
│            Plan: .claude/artifacts/plan.md  │
│            Commit prefix: {commit_prefix}   │
│            Run tests: {run_tests}           │
│                                              │
│            For each step:                    │
│            1. Write failing test            │
│            2. Delegate to specialists       │
│            3. Verify test passes            │
│            4. Git commit                    │
│            5. Validate hooks                │
│                                              │
│            Stop on failures."               │
│                                              │
│ [WAIT - Task tool blocks]                   │
│                                              │
│ build-executor executes:                     │
│   - Reads plan.md                           │
│   - For each step:                          │
│     * Writes test                           │
│     * Delegates to specialist               │
│     * Runs tests                            │
│     * Git commits                           │
│   - Returns summary                         │
│                                              │
│ [Agent returns with summary]                │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ ORCHESTRATOR FINAL SUMMARY                   │
│                                              │
│ [Display to user]:                           │
│                                              │
│ ✅ Auto-Implement Complete!                  │
│   Task: {task}                              │
│   Duration: {total_time}                    │
│   Files: {files_changed}                    │
│   Commits: {commits_made}                   │
│   Tests: {passing_count} passing            │
│   Quality: {score}/100                      │
│                                              │
│ Next: Review & deploy                       │
└──────────────────────────────────────────────┘
```

---

## Critical Implementation Details

### 1. Sequential Blocking Execution

**The Task tool is blocking** - Claude waits for each agent to complete before continuing:

```
auto-implement starts
  ↓
Task(scout-agent) invoked
  ↓ [CLAUDE WAITS HERE - BLOCKING]
scout-agent finishes, returns control
  ↓ [orchestrator continues]
Read scout-report.md
  ↓
Task(planner-agent) invoked
  ↓ [CLAUDE WAITS HERE - BLOCKING]
planner-agent finishes, returns control
  ↓ [orchestrator continues]
Read plan.md
  ↓
Task(build-executor) invoked
  ↓ [CLAUDE WAITS HERE - BLOCKING]
build-executor finishes, returns control
  ↓ [orchestrator continues]
Present summary
```

### 2. No User Intervention Between Phases

Unlike the current design with pause points, this runs **continuously**:

❌ **Old Design**:
```
Scout → [USER REVIEWS] → Plan → [USER REVIEWS] → Build
```

✅ **New Design** (Matches Video):
```
Scout → Plan → Build → Final Summary
(continuous, no pauses)
```

### 3. All Inputs Collected Once

**At the start**, parse everything from user's message:

```
User: "Auto-implement user profiles, scan app and src, check React docs, use prefix 'feature'"

Parse immediately:
  task = "user profiles"
  code_roots = "app,src"
  doc_urls = "React documentation" (resolve to URL)
  commit_prefix = "feature"
  run_tests = true (default)

Then run all phases with these inputs - NO additional questions.
```

---

## Success Criteria

✅ Single command invocation (`/auto-implement {task}`)
✅ All inputs collected upfront from user's request
✅ Three phases run sequentially without manual intervention
✅ File-based state transfer (artifacts)
✅ Final summary presented to user
✅ Working code with tests and git commits

---

## Example End-to-End

**Input**:
```
User: "Auto-implement dark mode toggle in Settings component"
```

**Orchestrator Executes**:

```
📋 Configuration:
  Task: dark mode toggle in Settings
  Scan: app,src,components,pages,lib
  Docs: (none)
  Prefix: feat
  Tests: true

🔍 Phase 1: Scout
  → Invoking scout-agent...
  → Analyzing codebase...
  ✓ Complete: 2 files, Low complexity

📋 Phase 2: Planner
  → Invoking planner-agent...
  → Creating TDD plan...
  ✓ Complete: 3 steps, ~1200 tokens

🏗️  Phase 3: Builder
  → Invoking build-executor...

  Step 1/3: Test theme store
    ├─ Write theme.test.ts
    ├─ Tests: ❌ FAIL (expected)
    ├─ Delegate to frontend-developer
    ├─ Tests: ✅ PASS
    ├─ Commit: feat: add theme store tests
    └─ Hook: ✅ PASS

  Step 2/3: Implement theme logic
    ├─ Delegate to frontend-developer
    ├─ Tests: ✅ PASS
    ├─ Commit: feat: implement theme store
    └─ Hook: ✅ PASS

  Step 3/3: Wire toggle to UI
    ├─ Delegate to frontend-developer
    ├─ Tests: ✅ PASS
    ├─ Commit: feat: add toggle to Settings
    └─ Hook: ✅ PASS

✅ Auto-Implement Complete!
   Duration: 4m 32s
   Files: 3 changed
   Commits: 3 made
   Tests: 8 passing
   Quality: 87/100

Next: Review commits, create PR, deploy
```

**All from ONE command, no manual steps!**

---

## Notes

- This is an **orchestrator** - it manages workflow, doesn't implement
- Uses **file artifacts** for state transfer between phases
- **Blocking execution** - each Task tool call waits for completion
- **No pauses** for human review (continuous flow)
- **Fail-fast** - stops on any error, doesn't continue
- Works best for **well-defined tasks** with clear requirements
- Requires **good test coverage** in project
- Safe because: feature branch + incremental commits + quality gates

---

## See Also

- [Workflow Architecture](../../docs/WORKFLOW_ARCHITECTURE.md) - Data flow details
- [Scout Command](./scout.md) - Phase 1 standalone
- [Plan Command](./plan.md) - Phase 2 standalone
- [Build Command](./build.md) - Phase 3 standalone
- [WORKFLOWS.md](../../docs/WORKFLOWS.md) - Complete guide
