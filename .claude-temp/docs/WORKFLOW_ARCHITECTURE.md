# Scout → Plan → Build - Data Flow Architecture

## Overview

The `/auto-implement` command is a **single orchestrator** that collects all inputs upfront and manages three sequential phases with file-based state transfer.

---

## Desired User Experience (From Video)

### Single Command Invocation

```bash
User: "/auto-implement Add dark mode toggle to Settings"
```

**What happens**:
1. ✅ Command collects all inputs upfront (task, directories, docs, etc.)
2. ✅ Runs Phase 1 (Scout) → writes scout-report.md
3. ✅ Runs Phase 2 (Planner) → reads scout-report.md → writes plan.md
4. ✅ Runs Phase 3 (Builder) → reads plan.md → creates code + commits
5. ✅ Returns final summary

**No manual intervention** - runs continuously from start to finish.

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  USER: "/auto-implement Add dark mode to Settings"         │
│                                                              │
│  Inputs collected UPFRONT:                                  │
│  - task: "Add dark mode to Settings"                        │
│  - code_roots: "app,src,components" (default)               │
│  - doc_urls: "" (optional)                                  │
│  - commit_prefix: "feat" (default)                          │
│  - run_tests: true (default)                                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
         ┌──────────────────────────┐
         │   ORCHESTRATOR           │
         │   (auto-implement.md)    │
         │                          │
         │   Manages 3 phases       │
         │   via Task tool          │
         └──────────┬───────────────┘
                    │
        ╔═══════════▼════════════╗
        ║   PHASE 1: SCOUT       ║
        ╚═══════════╤════════════╝
                    │
    Task tool → scout-agent
    Input: task="Add dark mode"
           code_roots="app,src,components"
                    │
          [Scout analyzes codebase]
                    │
                    ▼
    ┌───────────────────────────────┐
    │ ARTIFACT: scout-report.md     │
    │                               │
    │ relevant_files:               │
    │  - Settings.tsx (lines 23-67) │
    │  - theme.ts (new file)        │
    │ dependencies:                 │
    │  - Settings → themeStore      │
    │ scope: 2 files, low risk      │
    └───────────┬───────────────────┘
                │
    [Orchestrator READS scout-report.md]
                │
                ▼
        ╔═══════════════════════╗
        ║   PHASE 2: PLAN       ║
        ╚═══════════╤═══════════╝
                    │
    Task tool → planner-agent
    Input: scout_report=".claude/artifacts/scout-report.md"
           task="Add dark mode"
           doc_urls="" (if any)
                    │
       [Planner creates TDD steps]
                    │
                    ▼
    ┌────────────────────────────────┐
    │ ARTIFACT: plan.md              │
    │                                │
    │ Step 1: Test theme store       │
    │ Step 2: Implement toggle logic │
    │ Step 3: Wire UI to store       │
    │ Total: 3 steps, ~1200 tokens   │
    └───────────┬────────────────────┘
                │
    [Orchestrator READS plan.md]
                │
                ▼
        ╔═══════════════════════╗
        ║   PHASE 3: BUILD      ║
        ╚═══════════╤═══════════╝
                    │
    Task tool → build-executor
    Input: plan=".claude/artifacts/plan.md"
           commit_prefix="feat"
           run_tests=true
                    │
      [Builder executes TDD steps]
      [Delegates to specialists]
      [Makes git commits]
                    │
                    ▼
    ┌────────────────────────────────┐
    │ OUTPUTS:                       │
    │                                │
    │ Code files:                    │
    │  - src/lib/theme.ts (new)      │
    │  - src/components/Settings.tsx │
    │                                │
    │ Git commits:                   │
    │  - abc123: test: theme tests   │
    │  - def456: feat: theme store   │
    │  - ghi789: feat: UI toggle     │
    │                                │
    │ Tests: 8 passing               │
    │ Quality: 85/100                │
    └───────────┬────────────────────┘
                │
    [Orchestrator collects results]
                │
                ▼
         ┌──────────────────┐
         │  FINAL SUMMARY   │
         │  to USER         │
         └──────────────────┘
```

---

## File-Based State Transfer

### Why Files?

Claude Code commands can't pass complex objects between agent invocations.

**Solution**: Use file artifacts as the data pipeline:

```
scout-agent writes → scout-report.md
                    ↓
planner-agent reads scout-report.md
planner-agent writes → plan.md
                       ↓
build-executor reads plan.md
build-executor writes → code + commits
```

### Artifact Locations

```
.claude/artifacts/
├── scout-report.md     # Phase 1 output → Phase 2 input
├── plan.md             # Phase 2 output → Phase 3 input
├── design-notes.md     # Phase 2 output (optional reference)
└── build-log.md        # Phase 3 output (optional)
```

---

## Command Orchestration Pattern

### How auto-implement.md Works

The command file contains **instructions** for Claude to follow, not executable code:

```markdown
# /auto-implement command

**Purpose**: Run Scout → Plan → Build sequentially with inputs collected upfront

**Collect these inputs from the user's request**:
- task: Extract from user's message (e.g., "Add dark mode toggle")
- code_roots: Default to "app,src,components,pages,lib" or ask if unclear
- doc_urls: Parse from request or leave empty
- commit_prefix: Default to "feat"
- run_tests: Default to true

**Execute these phases sequentially**:

## Phase 1: Scout

Invoke scout-agent via Task tool with this exact prompt:

"Identify minimal files and dependencies for implementing: {task}

Scan these directories: {code_roots}

Output a scout report to .claude/artifacts/scout-report.md with:
- Relevant files (paths, line ranges, symbols)
- Dependencies between files
- Scope estimate (number of files, complexity)
- Open questions

Use Read, Grep, Glob tools. Be thorough but minimal."

**Wait for scout-agent to complete.**

After completion, Read the file: .claude/artifacts/scout-report.md

---

## Phase 2: Plan

Invoke planner-agent via Task tool with this exact prompt:

"Create a TDD implementation plan for: {task}

Use the scout report at: .claude/artifacts/scout-report.md

{if doc_urls provided: "Reference these documentation URLs: {doc_urls}"}

Output a plan to .claude/artifacts/plan.md with:
- Ordered steps (< 10)
- Failing test for each step
- Implementation description
- Agents to delegate to
- Token estimates
- Deferred work

Follow TDD strictly - tests first, always."

**Wait for planner-agent to complete.**

After completion, Read the file: .claude/artifacts/plan.md

---

## Phase 3: Build

Invoke build-executor via Task tool with this exact prompt:

"Execute the implementation plan at: .claude/artifacts/plan.md

For each step:
1. Write failing test
2. Verify test fails
3. Delegate implementation to appropriate specialist agent
4. Verify test passes
5. Git commit with prefix: {commit_prefix}
6. Trigger pre-commit hook validation

Run tests after each step: {run_tests}

Stop immediately if:
- Tests fail after implementation
- Pre-commit hook blocks commit
- Same step fails twice

Return summary:
- Steps completed
- Commits made (with SHAs)
- Files changed
- Tests passing
- Quality score"

**Wait for build-executor to complete.**

---

## Final Summary

Present to user:
- Total duration
- Files changed
- Commits made
- Tests status
- Quality score
- Next steps (deploy, create PR, etc.)
```

---

## The Orchestrator's Role

The `auto-implement` command is a **manager**, not a worker:

| Role | Responsibility |
|------|----------------|
| **Collect Inputs** | Ask user for task, directories, docs, etc. ONCE at start |
| **Invoke Agents** | Use Task tool to launch scout → planner → builder |
| **Wait for Completion** | Each Task tool call blocks until agent finishes |
| **Read Artifacts** | Load scout-report.md, plan.md between phases |
| **Pass Data** | Include artifact file paths in next agent's prompt |
| **Return Summary** | Synthesize final results for user |

### What Orchestrator Does NOT Do

❌ Doesn't implement features (delegates to specialists)
❌ Doesn't write tests (delegates to test-automator)
❌ Doesn't make code changes (delegates to frontend-developer, backend-architect, etc.)
❌ Doesn't run git commands (delegates to build-executor)

**It only coordinates and transfers state via files.**

---

## Sequential Execution Flow

```javascript
// Pseudo-code of what auto-implement does

async function autoImplement(userRequest) {
  // 1. Parse inputs from user request
  const inputs = {
    task: extractTask(userRequest),
    code_roots: "app,src,components,pages,lib",
    doc_urls: extractDocs(userRequest) || "",
    commit_prefix: "feat",
    run_tests: true
  };

  // 2. Phase 1: Scout
  await invokeAgent('scout-agent', {
    prompt: `Identify files for: ${inputs.task}. Scan: ${inputs.code_roots}`,
    output: '.claude/artifacts/scout-report.md'
  });

  const scoutReport = readFile('.claude/artifacts/scout-report.md');

  // 3. Phase 2: Planner
  await invokeAgent('planner-agent', {
    prompt: `Create TDD plan for: ${inputs.task}. Use scout report: .claude/artifacts/scout-report.md`,
    output: '.claude/artifacts/plan.md'
  });

  const plan = readFile('.claude/artifacts/plan.md');

  // 4. Phase 3: Builder
  const buildResult = await invokeAgent('build-executor', {
    prompt: `Execute plan: .claude/artifacts/plan.md. Commit prefix: ${inputs.commit_prefix}`,
  });

  // 5. Return summary
  return {
    duration: '5m 12s',
    files_changed: buildResult.files,
    commits: buildResult.commits,
    tests: buildResult.tests_passing,
    quality: buildResult.quality_score
  };
}
```

---

## Implementation in Claude Code

Since Claude Code commands are **markdown instructions**, not executable scripts, the command translates to:

```markdown
# /auto-implement

You are orchestrating a three-phase autonomous workflow.

**Step 1**: Parse the user's request to extract:
- task: The feature/bug description
- code_roots: Directories to scan (default: app,src,components,pages,lib)
- doc_urls: Documentation URLs mentioned (or empty)
- commit_prefix: Git commit prefix (default: feat)
- run_tests: Whether to run tests (default: true)

**Step 2**: Invoke scout-agent using the Task tool:

Prompt for scout-agent:
"Identify minimal files and dependencies for: {task}

Scan directories: {code_roots}

Write output to: .claude/artifacts/scout-report.md

Include:
- Relevant files with line/byte ranges
- Dependencies
- Key symbols
- Scope estimate
- Open questions

Be minimal - only what's truly needed."

**Step 3**: After scout-agent completes, READ the file .claude/artifacts/scout-report.md

**Step 4**: Invoke planner-agent using the Task tool:

Prompt for planner-agent:
"Create TDD implementation plan for: {task}

Input: Scout report at .claude/artifacts/scout-report.md
{if doc_urls: "Reference docs: {doc_urls}"}

Write output to: .claude/artifacts/plan.md

Include:
- Ordered steps (< 10)
- Failing tests for each
- Agents to delegate to
- Token estimates
- Deferred work

Follow TDD - tests first."

**Step 5**: After planner-agent completes, READ the file .claude/artifacts/plan.md

**Step 6**: Invoke build-executor using the Task tool:

Prompt for build-executor:
"Execute plan at: .claude/artifacts/plan.md

Settings:
- Commit prefix: {commit_prefix}
- Run tests: {run_tests}

For each step:
1. Write failing test
2. Delegate to specialist
3. Verify test passes
4. Git commit
5. Validate hooks

Stop on failures."

**Step 7**: After build-executor completes, present final summary to user with:
- Duration
- Files changed
- Commits made (with SHAs)
- Tests status
- Quality score
- Next steps
```

---

## Critical Design Points

### 1. Sequential Blocking Execution

Each phase **blocks** until complete:

```
Task(scout-agent)
  ↓ (waits)
scout completes
  ↓ (orchestrator continues)
Read scout-report.md
  ↓
Task(planner-agent)
  ↓ (waits)
planner completes
  ↓ (orchestrator continues)
Read plan.md
  ↓
Task(build-executor)
  ↓ (waits)
builder completes
  ↓ (orchestrator continues)
Present summary
```

**Key**: Task tool invocations are **blocking** - Claude waits for agent to finish before continuing.

### 2. File-Based State Transfer

```
scout-agent:
  - Writes to: .claude/artifacts/scout-report.md
  - No return value needed (file contains all data)

orchestrator:
  - Reads: scout-report.md
  - Passes file path to planner: "Use scout report at .claude/artifacts/scout-report.md"

planner-agent:
  - Reads: .claude/artifacts/scout-report.md (from disk)
  - Writes to: .claude/artifacts/plan.md

orchestrator:
  - Reads: plan.md
  - Passes file path to builder: "Execute plan at .claude/artifacts/plan.md"

build-executor:
  - Reads: .claude/artifacts/plan.md (from disk)
  - Writes: code files, git commits
  - Returns: summary object
```

### 3. Input Collection (Upfront)

Instead of asking user 3 separate times, ask ONCE:

**Current (bad)**:
```
/scout
  → Claude asks: "What task?"
/plan
  → Claude asks: "What docs?"
/build
  → Claude asks: "Commit prefix?"
```

**Desired (good)**:
```
/auto-implement Add dark mode to Settings, check Tailwind docs, use commit prefix "feat"
  → Claude extracts ALL inputs from this one message
  → Runs all three phases without asking again
```

---

## Agent Prompt Structure

### Scout Agent Prompt

```
Identify minimal files and dependencies for implementing: {task}

Scan these directories: {code_roots}

Create a scout report with:

## Relevant Files
| Path | Reason | Ranges | Symbols | Risk |
|------|--------|--------|---------|------|
| ... | ... | ... | ... | ... |

## Dependencies
- Component A → Component B
- ...

## Scope Estimate
Files: 2
Complexity: Low
Risk: Low

## Open Questions
- Question 1?
- Question 2?

Write this report to: .claude/artifacts/scout-report.md

Use Read, Grep, Glob tools for analysis. Be thorough but minimal.
```

### Planner Agent Prompt

```
Create a TDD implementation plan for: {task}

Load the scout report from: .claude/artifacts/scout-report.md

{if doc_urls provided}
Reference these documentation URLs for best practices:
{doc_urls}
Delegate to documentation-expert agent if you need detailed API docs.
{endif}

Create an implementation plan with:

## Steps

### Step 1: {title}
- **Test**: Failing test to write
- **Implementation**: Minimal code description
- **Agents**: [test-automator, frontend-developer]
- **Tokens**: ~300 (small)
- **Risk**: low

[... more steps ...]

## Total Estimate: ~1200 tokens

## Next Iterations (Deferred)
- Enhancement 1
- Enhancement 2

## Rollback Plan
- How to undo if needed

Write this plan to: .claude/artifacts/plan.md

Follow TDD strictly - every step must have a failing test.
Break into < 10 steps.
```

### Build Executor Prompt

```
Execute the implementation plan at: .claude/artifacts/plan.md

Settings:
- Commit prefix: {commit_prefix}
- Run tests after each step: {run_tests}

For each step in the plan:

1. Write the failing test specified in the step
2. Run test suite - verify it FAILS (red phase)
3. Delegate implementation to the specialist agents listed in step:
   - React components → frontend-developer
   - API handlers → backend-architect
   - Type fixes → typescript-pro
   - Complex tests → test-automator
4. Run test suite - verify it PASSES (green phase)
5. Refactor if needed (minimal)
6. Git commit: "{commit_prefix}: {step title}"
7. Pre-commit hook validation (must pass)
8. Log progress

Stop immediately if:
- Test fails after implementation
- Pre-commit hook blocks commit
- Same step fails twice

Return a summary with:
- Steps completed
- Commits made (SHAs and messages)
- Files changed
- Tests passing
- Quality score (if available)
```

---

## Artifact File Formats

### scout-report.md

```markdown
# Scout Report: {task}

## Summary
{1-2 sentence scope overview}

## Relevant Files

### Files to Modify
| Path | Reason | Ranges | Symbols | Risk |
|------|--------|--------|---------|------|
| {path} | {why} | {lines} | {exports} | {low/med/high} |

### Files for Context Only
| Path | Reason | Ranges | Symbols |
|------|--------|--------|---------|
| {path} | {why} | {lines} | {exports} |

## Dependencies
- {File A} → {File B} ({relationship})

## Key Symbols
- {symbol name} ({type})

## Open Questions
- {question}?

## Scope Estimate
- Files: {number}
- Complexity: {Low/Medium/High}
- Risk: {Low/Medium/High}
```

### plan.md

```markdown
# Implementation Plan: {task}

## Goal
{1-2 sentence description}

## Prerequisites
- Files: {from scout report}
- Dependencies: {from scout}

## Steps

### Step {n}: {title}
- **Test**: {failing test description}
- **Implementation**: {minimal code description}
- **Agents**: [{agent1}, {agent2}]
- **Tokens**: ~{estimate} ({small/medium/large})
- **Risk**: {low/medium/high}

[... more steps ...]

## Total Estimate
- Steps: {count}
- Tokens: ~{total}
- Duration: ~{minutes estimate}

## Next Iterations (Deferred)
- {enhancement 1}
- {enhancement 2}

## Rollback Plan
- {how to undo}
```

---

## Orchestrator Execution Logic

```
ORCHESTRATOR START
│
├─ Parse user request
│  ├─ Extract: task
│  ├─ Extract: code_roots (or use default)
│  ├─ Extract: doc_urls (or empty)
│  ├─ Set: commit_prefix = "feat"
│  └─ Set: run_tests = true
│
├─ Create artifacts directory
│  └─ Bash: mkdir -p .claude/artifacts
│
├─ PHASE 1: Scout
│  ├─ Task(scout-agent, prompt with task + code_roots)
│  ├─ WAIT for completion
│  ├─ Read(.claude/artifacts/scout-report.md)
│  └─ Display: "✓ Scout complete: {scope} identified"
│
├─ PHASE 2: Planner
│  ├─ Task(planner-agent, prompt with task + scout-report path + doc_urls)
│  ├─ WAIT for completion
│  ├─ Read(.claude/artifacts/plan.md)
│  └─ Display: "✓ Plan complete: {step_count} steps, ~{tokens} tokens"
│
├─ PHASE 3: Builder
│  ├─ Task(build-executor, prompt with plan path + commit_prefix + run_tests)
│  ├─ WAIT for completion
│  ├─ Capture: commits, files, tests, quality
│  └─ Display: "✓ Build complete: {commits} commits, {tests} tests passing"
│
└─ FINAL SUMMARY
   ├─ Duration: {total_time}
   ├─ Files: {changed_files}
   ├─ Commits: {commit_list}
   ├─ Tests: {passing_count}
   ├─ Quality: {score}/100
   └─ Next: "Review commits: git log -3"
```

---

## Key Insight: Markdown Commands as Instructions

Claude Code slash commands are **instructions for Claude to execute**, not shell scripts.

When you type `/auto-implement Add dark mode`, Claude:

1. Reads the `auto-implement.md` file
2. Follows the instructions sequentially
3. Uses Task tool to invoke agents (blocking calls)
4. Reads artifact files between phases
5. Continues to next phase
6. Returns final result

**The command file IS the orchestration logic.**

---

## Comparison: Video Approach vs Current Template

### Video Approach (What User Wants)
```python
# Single command, all inputs upfront
/auto-implement "Add dark mode" --dirs app,src --docs tailwind

# Runs continuously:
Scout (auto) → writes scout-report.md
Plan (auto) → reads scout-report.md → writes plan.md
Build (auto) → reads plan.md → creates code + commits

# Returns final summary
```

### Current Template (Before This Update)
```bash
# Three separate commands
/scout "Add dark mode"          # Returns, user reviews
/plan                           # Separate invocation
/build                          # Separate invocation
```

### New Design (After This Update)
```python
# Matches video approach
/auto-implement "Add dark mode toggle to Settings"

# Orchestrator collects inputs, then:
Phase 1: Scout (automatic)
  ↓ scout-report.md
Phase 2: Planner (automatic, reads scout-report.md)
  ↓ plan.md
Phase 3: Builder (automatic, reads plan.md)
  ↓ code + commits

# Single continuous flow, file-based state transfer
```

---

## Next Implementation Step

**Redesign `auto-implement.md`** to be a TRUE orchestrator with:
1. Clear input collection instructions
2. Sequential Task tool invocations
3. Artifact reading between phases
4. Final summary synthesis

This makes it match the video's single-command, continuous-flow pattern.
