# Advanced Workflows - Scout → Plan → Build

Complete guide to the autonomous multi-phase implementation workflow system.

---

## Overview

The Scout → Plan → Build workflow enables **autonomous feature implementation** through a three-phase process that minimizes context, enforces TDD, and delegates to specialist agents.

### The Three Phases

```
┌─────────────┐
│   SCOUT     │  Identify minimal context
│             │  → What files matter?
│  📍 Read-only│  → What are dependencies?
└──────┬──────┘
       │ scout-report.md
       ▼
┌─────────────┐
│   PLAN      │  Create TDD implementation plan
│             │  → Break into steps
│  📋 Planning │  → Define failing tests
└──────┬──────┘
       │ plan.md
       ▼
┌─────────────┐
│   BUILD     │  Execute plan via TDD
│             │  → Write tests
│  🏗️ Building │  → Delegate to specialists
│             │  → Incremental commits
└──────┬──────┘
       │
       ▼
    ✅ Working Code
```

### Key Benefits

- **74-90% context reduction** via Scout (only load what's needed)
- **TDD enforcement** (failing tests first, always)
- **Specialist delegation** (right agent for each step)
- **Incremental commits** (atomic, traceable, revertable)
- **Quality gates** (hooks validate before commit)
- **Autonomous execution** (minimal human intervention)

---

## When to Use Workflows

### Use Auto-Implement For:

✅ **Complex Features** (3-10 files)
- Dark mode implementation
- User profile management
- Payment integration
- Multi-component features

✅ **Cross-Domain Changes** (UI + API + DB)
- CRUD operations with full stack
- Feature flags with config + UI
- Analytics integration

✅ **Well-Defined Tasks**
- Clear requirements
- Existing patterns to follow
- Good test coverage

### Use Single-Phase Commands For:

⚡ **Simple Tasks** (1-2 files)
- New React component → `/create-component`
- New API endpoint → `/generate-api`
- Deployment → `/deploy`

🔍 **Investigation Only**
- Understanding code → `/scout` only
- Architecture review → manual

### Don't Use Workflows For:

❌ **Exploratory Work** (unclear requirements)
❌ **Architecture Changes** (too complex)
❌ **Security-Critical** (needs expert review)
❌ **Production Hotfixes** (too automated)

---

## Quick Start

### Option 1: Full Auto-Implement

```bash
User: "Auto-implement loading spinner for Dashboard component"
```

Runs all three phases automatically with pause points for review.

### Option 2: Manual Phasing

```bash
# Phase 1: Scout
User: "Scout the codebase for adding dark mode toggle"
# Review .claude/artifacts/scout-report.md

# Phase 2: Plan
User: "Create implementation plan from scout report"
# Review .claude/artifacts/plan.md

# Phase 3: Build
User: "Execute the implementation plan"
# Monitors progress, reviews commits
```

---

## Command Reference

| Command | Phase | Input | Output | Use When |
|---------|-------|-------|--------|----------|
| `/scout` | 1 | Task description | scout-report.md | Need minimal context |
| `/plan` | 2 | scout-report.md | plan.md | Need TDD breakdown |
| `/build` | 3 | plan.md | Code + commits | Ready to implement |
| `/auto-implement` | 1+2+3 | Task description | Everything | Full autonomous workflow |

### Command Locations

```
commands/workflows/
├── scout.md           # Phase 1
├── plan.md            # Phase 2
├── build.md           # Phase 3
└── auto-implement.md  # All phases
```

---

## Agents

The workflow uses three meta-agents that delegate to specialists:

### Scout Agent (`scout-agent`)

**Role**: Context Minimization
**Tools**: Read, Grep, Glob (read-only)
**MCP**: None
**Delegates to**: Nobody (autonomous)

**Responsibilities**:
- Find relevant files (< 10 for most tasks)
- Identify line/byte ranges
- Map dependencies
- Flag open questions

**Config**: `agents/configs/scout-agent.json`

### Planner Agent (`planner-agent`)

**Role**: TDD Planning
**Tools**: Read
**MCP**: None
**Delegates to**: `documentation-expert` (for API docs)

**Responsibilities**:
- Break task into < 10 TDD steps
- Define failing tests
- Estimate token costs
- Defer non-critical work
- Assess risks

**Config**: `agents/configs/planner-agent.json`

### Build Executor (`build-executor`)

**Role**: TDD Execution
**Tools**: Read, Write, Git
**MCP**: None
**Delegates to**: All specialist agents

**Responsibilities**:
- Execute plan step-by-step
- Delegate to specialists:
  - `frontend-developer` (React)
  - `backend-architect` (API/DB)
  - `typescript-pro` (Types)
  - `test-automator` (Tests)
- Incremental git commits
- Run tests after each step
- Validate quality gates

**Config**: `agents/configs/build-executor.json`

---

## Workflow Deep Dive

### Phase 1: Scout

**Input**: User's task description

**Process**:
1. Analyze task requirements
2. Scan directories (`app/`, `src/`, etc.)
3. Use Grep to find symbols
4. Identify dependencies
5. Determine byte/line ranges
6. Generate scout-report.md

**Output**: `.claude/artifacts/scout-report.md`

**Pause Point**: Review scope before planning

**Example**:
```markdown
# Scout Report: Add Dark Mode Toggle

## Relevant Files
| Path | Reason | Ranges | Risk |
|------|--------|--------|------|
| src/components/Settings.tsx | Add toggle UI | lines 23-67 | low |
| src/lib/theme.ts | Toggle logic | lines 10-25 | medium |

## Dependencies
- Settings → themeStore
- themeStore → localStorage

## Scope: Low (2 files, ~50 lines)
```

---

### Phase 2: Plan

**Input**: scout-report.md

**Process**:
1. Load Scout's minimal context
2. Fetch docs if needed (delegate to documentation-expert)
3. Design API contracts
4. Break into TDD steps
5. Define failing tests
6. Estimate costs
7. Defer extras
8. Generate plan.md

**Output**: `.claude/artifacts/plan.md`, `design-notes.md`

**Pause Point**: Review plan before building

**Example**:
```markdown
# Implementation Plan: Dark Mode Toggle

## Steps

### Step 1: Test theme store
- **Test**: theme.test.ts - toggle and persistence
- **Implementation**: Zustand store scaffold
- **Agents**: test-automator, frontend-developer
- **Tokens**: ~300 (small)

### Step 2: Implement store logic
- **Test**: Tests from Step 1 pass
- **Implementation**: toggle(), localStorage
- **Agents**: frontend-developer
- **Tokens**: ~500 (medium)

### Step 3: Wire toggle to UI
- **Test**: Settings.test.tsx - button calls store
- **Implementation**: onClick handler
- **Agents**: frontend-developer
- **Tokens**: ~400 (small)

## Total: ~1200 tokens (3 steps)
```

---

### Phase 3: Build

**Input**: plan.md

**Process** (for each step):
1. Write failing test
2. Run tests (verify fail)
3. Delegate implementation to specialist
4. Run tests (verify pass)
5. Git commit
6. Pre-commit hook validation
7. Next step

**Stop If**:
- Test fails after implementation
- Pre-commit hook blocks
- 2 consecutive failures

**Output**: Code, tests, git commits

**Example**:
```
Step 1/3: Test theme store
  ├─ Create theme.test.ts
  ├─ Tests: ❌ FAIL (expected)
  ├─ Delegate to frontend-developer
  ├─ Tests: ✅ PASS
  ├─ Commit: "test: add theme store tests"
  └─ Hook: ✅ PASS

Step 2/3: Implement store
  ├─ Delegate to frontend-developer
  ├─ Tests: ✅ PASS
  ├─ Commit: "feat: implement theme store"
  └─ Hook: ✅ PASS

Step 3/3: Wire UI
  ├─ Delegate to frontend-developer
  ├─ Tests: ✅ PASS
  ├─ Commit: "feat: add toggle to Settings"
  └─ Hook: ✅ PASS

✅ Complete! 3 commits, 5 tests passing
```

---

## Artifacts

All workflow outputs saved to `.claude/artifacts/`:

```
.claude/artifacts/
├── scout-report.md      # Phase 1 output
├── plan.md              # Phase 2 output
└── design-notes.md      # Phase 2 output (optional)
```

**Lifecycle**:
- Created during workflow
- Used as input for next phase
- Ephemeral (can delete after build)
- Or commit for team visibility

**See**: [Artifacts README](./artifacts/README.md)

---

## Integration with Existing System

Workflows complement, don't replace, existing commands:

### Existing Commands (Unchanged)

| Command | Use Case |
|---------|----------|
| `/create-component` | Single React component |
| `/generate-api` | Single API endpoint |
| `/deploy` | Deployment workflow |
| `/run-qa` | E2E testing |

### New Workflow Commands

| Command | Use Case |
|---------|----------|
| `/scout` | Context minimization |
| `/plan` | TDD planning |
| `/build` | Plan execution |
| `/auto-implement` | Full autonomous workflow |

### Decision Tree

```
Task complexity?
├─ Simple (1-2 files)
│  └─ Use specific command
│     (/create-component, /generate-api)
│
├─ Medium (3-5 files)
│  └─ Use /auto-implement
│     or /scout → /plan → /build
│
└─ Complex (6-10 files)
   └─ Use /scout → /plan
      Review & adjust plan
      Then /build manually
```

---

## Safety & Best Practices

### Safety Features

✅ **Read-only Scout** (no file modifications)
✅ **TDD enforcement** (tests required)
✅ **Incremental commits** (atomic, revertable)
✅ **Quality gates** (pre-commit hooks)
✅ **Fail-fast** (stops on errors)
✅ **Token budgeting** (prevents runaway)

### Best Practices

#### ✅ Do
- Review scout-report before planning
- Adjust plan before building
- Run in feature branch
- Have good test coverage
- Use for well-defined tasks

#### ❌ Don't
- Skip reviews (defeats pause points)
- Run unattended on main branch
- Use for exploratory work
- Bypass quality gates
- Exceed reasonable scope (< 10 files)

---

## Troubleshooting

### Scout finds too many files (> 10)

**Solution**: Make task more specific or break into subtasks

### Planner creates too many steps (> 10)

**Solution**: Task too complex - split into smaller features

### Builder stops on test failure

**Solution**: Review failure, fix manually or regenerate plan

### Pre-commit hook blocks

**Solution**: Fix lint/type errors, then continue

### Token budget exceeded

**Solution**: Break task into phases, complete incrementally

---

## Advanced Usage

### Custom Scan Directories

Edit `scout.md` command:
```markdown
Default scan locations:
- `your-custom-dir/`
- `your-components/`
```

### Adjust Step Limits

Edit `planner-agent.json`:
```json
{
  "special_instructions": [
    "Break tasks into <10 steps"  // Adjust number
  ]
}
```

### Unattended Mode (Sandbox Only)

⚠️ **Extreme caution required**

```
Requirements:
- Isolated git branch
- Container/sandbox environment
- Full test coverage
- No production credentials

Usage:
User: "Auto-implement with no pauses (unattended mode)"
```

---

## Examples

### Example 1: Loading Spinner

```bash
User: "Auto-implement loading spinner for Dashboard"

Scout: ✓ Found Dashboard.tsx, Spinner.tsx, useDashboardData()
Plan: ✓ 3 steps, ~800 tokens
Build: ✓ 3 commits, 5 tests passing
Result: ✅ Complete in 4m 23s
```

### Example 2: Dark Mode

```bash
User: "Auto-implement dark mode toggle in Settings"

Scout: ✓ Settings.tsx, theme.ts (2 files)
Plan: ✓ 3 steps (test store, implement, wire UI)
Build: ✓ 3 commits, 6 tests passing
Result: ✅ Complete in 5m 12s
```

### Example 3: Manual Phasing

```bash
User: "/scout for adding user profile management"
# Reviews scout-report.md → 8 files identified

User: "/plan from scout report"
# Reviews plan.md → 7 steps planned

User: "/build from plan"
# Monitors execution → 7 commits, 15 tests
```

---

## See Also

- [Scout Command](../commands/workflows/scout.md)
- [Plan Command](../commands/workflows/plan.md)
- [Build Command](../commands/workflows/build.md)
- [Auto-Implement Command](../commands/workflows/auto-implement.md)
- [Agent Reference](./AGENT_REFERENCE.md)
- [Testing Guide](./TESTING_GUIDE.md)

---

*Last Updated: 2025-10-08*
