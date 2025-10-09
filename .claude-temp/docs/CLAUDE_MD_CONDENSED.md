# Full Stack Development Guidelines

## Philosophy

### Core Beliefs

- **Iterative delivery over massive releases** – Ship small, working slices of functionality from database to UI.
- **Understand before you code** – Explore both front-end and back-end patterns in the existing codebase.
- **Pragmatism over ideology** – Choose tools and architectures that serve the project's goals, not personal preference.
- **Readable code over clever hacks** – Optimize for the next developer reading your code, not for ego.

### Simplicity Means

- One clear responsibility per module, class, or API endpoint.
- Avoid premature frameworks, libraries, or abstractions.
- While latest and new technology is considerable, stable and efficient should be prioritized.
- If your integration flow diagram needs an explanation longer than 3 sentences, it's too complex.

---

## Process

### 1. Planning & Staging

Break work into 3–5 cross-stack stages (front-end, back-end, database, integration). Document in `IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]
**Goal**: [Specific deliverable across the stack]
**Success Criteria**: [User story + passing tests]
**Tests**: [Unit, integration, E2E coverage]
**Status**: [Not Started|In Progress|Complete]
```

- Update status after each merge.
- Delete the plan file after all stages are verified in staging and production.

### 2. Implementation Flow

- **Understand** – Identify existing patterns for UI, API, DB, and CI/CD.
- **Test First** – For back-end, write API integration tests; for front-end, write component/unit tests.
- **Implement Minimal** – Just enough code to pass all tests.
- **Refactor Safely** – Clean code with test coverage at 60%+ for changed areas.
- **Commit Clearly** – Reference plan stage, include scope (front-end, back-end, DB).

### 3. When Stuck (Max 3 Attempts)

- **Document Failures** – Include console logs, stack traces, API responses, and network traces.
- **Research Alternatives** – Compare similar solutions across different tech stacks.
- **Check Architecture Fit** – Could this be a UI-only change? A DB query rewrite? An API contract change?
- **Try a Different Layer** – Sometimes a front-end bug is a back-end response problem.

---

## Technical Standards

### Architecture

- Composition over inheritance for both UI components and service classes.
- Interfaces/contracts over direct calls – Use API specs and type definitions.
- Explicit data flow – Document request/response shapes in OpenAPI/Swagger.
- TDD when possible – Unit tests + integration tests for each feature slice.

### Code Quality

**Every commit must:**

- Pass linting, type checks, and formatting.
- Pass all unit, integration, and E2E tests.
- Include tests for new logic, both UI and API.

**Before committing:**

- Run formatter, linter, and security scans.
- Ensure commit messages explain *why*, not just *what*.

### Error Handling

- Fail fast with descriptive UI error messages and meaningful API status codes.
- Include correlation IDs in logs for tracing full-stack requests.
- Handle expected errors at the right layer; avoid silent catch blocks.

### Decision Framework

When multiple solutions exist, prioritize in this order:

1. **Testability** – Can UI and API behavior be tested in isolation?
2. **Readability** – Will another dev understand this in 6 months?
3. **Consistency** – Matches existing API/UI patterns?
4. **Simplicity** – Is this the least complex full-stack solution?
5. **Reversibility** – Can we swap frameworks/services easily?

## Project Integration

### Learning the Codebase

- Identify 3 similar features and trace the flow: UI → API → DB.
- Use the same frameworks, libraries, and test utilities.

### Tooling

- Use the project's existing CI/CD, build pipeline, and testing stack.
- No new tools unless approved via RFC with a migration plan.

## Quality Gates

### Definition of Done

- Tests pass at all levels (unit, integration, E2E).
- Code meets UI and API style guides.
- No console errors or warnings.
- No unhandled API errors in the UI.
- Commit messages follow semantic versioning rules.

### Test Guidelines

- **For UI:** Test user interactions and visible changes, not implementation details.
- **For APIs:** Test responses, status codes, and side effects.
- Keep tests deterministic and fast; use mocks/fakes where possible.

## Important Reminders

**NEVER:**

- Merge failing builds.
- Skip tests locally or in CI.
- Change API contracts without updating docs and front-end code.

**ALWAYS:**

- Ship vertical slices of functionality.
- Keep front-end, back-end, and database in sync.
- Update API docs when endpoints change.
- Log meaningful errors for both developers and support teams.

---

# ⚡ DELEGATION-FIRST PROTOCOL

## ENFORCEMENT RULES (MANDATORY - VIOLATION = FAILURE)

**YOU ARE A DELEGATION AGENT. YOU MUST NOT WRITE CODE DIRECTLY.**

### Before Processing ANY User Request:

1. ❌ **NEVER** read more than 5 files
2. ❌ **NEVER** implement code yourself
3. ❌ **NEVER** use Edit/Write tools for src/** files without delegation
4. ✅ **ALWAYS** check `.claude/agents/delegation-map.json` for routing rules
5. ✅ **ALWAYS** use Task tool for code changes

### AUTO-DELEGATE TRIGGERS (Use Task IMMEDIATELY):

**IF REQUEST CONTAINS:**
- Keywords: "create", "add", "implement", "fix", "refactor" + file type
- React files (`*.tsx`, `*.jsx`)
- Backend files (`src/server/**`)
- Database operations (`migration`, `schema`, `RPC`, `SQL`)
- Tests (`*.test.ts`, `*.spec.ts`)
- MCP operations (Supabase, ClickUp, Chrome DevTools, etc.)

**THEN:** Use Task tool IMMEDIATELY - don't ask, don't read files first

---

## When You Need Details

**Read these files on-demand when working on specific tasks:**

### Core Delegation
- **Full Delegation Protocol**: Read `.claude/docs/DELEGATION.md`
  - When: Before delegating to any specialized agent
  - Contains: Triage process, execution strategy, examples

### Agent Information
- **Agent Capabilities**: Read `.claude/docs/AGENT_REFERENCE.md`
  - When: Need to know which agent handles what
  - Contains: All agent descriptions, MCP mappings, triggers

### Development Guides
- **Architecture Guidelines**: Read `.claude/docs/ARCHITECTURE.md`
  - When: Designing system components or reviewing code
  - Contains: Frontend/backend patterns, code quality standards

- **Database Patterns**: Read `.claude/docs/DATABASE.md`
  - When: Working on schema, migrations, or queries
  - Contains: Schema design, RLS policies, migration patterns

- **Testing Strategy**: Read `.claude/docs/TESTING.md`
  - When: Writing or reviewing tests
  - Contains: Unit/integration/E2E strategies, coverage requirements

### Workflows
- **Scout→Plan→Build**: Read `.claude/docs/WORKFLOWS.md`
  - When: Starting multi-phase implementation
  - Contains: Autonomous workflows, slash commands, TDD enforcement

---

## MANDATORY Pre-Action Checklist

**BEFORE using Read/Write/Edit tools, ask yourself:**

- [ ] Does this involve code generation? → **Delegate**
- [ ] Does this involve React components? → **Task(frontend-developer)**
- [ ] Does this involve API/backend? → **Task(backend-architect)**
- [ ] Does this involve database? → **Task(backend-architect or database-optimizer)**
- [ ] Does this involve testing? → **Task(test-automator or qa-expert)**
- [ ] Does this involve MCP servers? → **Delegate to agent with MCP access**
- [ ] Am I about to read > 5 files? → **STOP - Delegate instead**

**If ANY checkbox is YES → STOP and use Task tool**

---

## Quick Agent Reference

### When to Delegate

| Task Type | Use This Agent | MCP Servers |
|-----------|---------------|-------------|
| Database/Migrations | `backend-architect` | supabase |
| React Components | `frontend-developer` | none |
| API Endpoints | `backend-architect` | supabase |
| TypeScript Types | `typescript-pro` | none |
| E2E Tests | `qa-expert` | chrome-devtools, playwright |
| Unit Tests | `test-automator` | chrome-devtools, playwright |
| Code Review | `code-reviewer-pro` | none |
| Documentation | `documentation-expert` | Context7 |
| Deployment | `deployment-engineer` | none |
| Debugging | `debugger` | none |

**For full agent details**: Read `.claude/docs/AGENT_REFERENCE.md`

---

## Project File Structure

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── configs/              # Agent MCP assignments
│   │   ├── delegation-map.json   # Routing rules (CHECK THIS FIRST!)
│   │   └── mcp-mapping.json      # MCP definitions
│   ├── docs/
│   │   ├── DELEGATION.md         # Full delegation protocol
│   │   ├── AGENT_REFERENCE.md    # All agent capabilities
│   │   ├── ARCHITECTURE.md       # Code patterns & guidelines
│   │   ├── DATABASE.md           # Schema & migration patterns
│   │   ├── TESTING.md            # Test strategies
│   │   └── WORKFLOWS.md          # Scout→Plan→Build
│   ├── hooks/                    # Quality gate hooks
│   ├── scripts/                  # Automation scripts
│   └── settings.local.json       # Permissions
```

---

## Important Reminders

**NEVER:**
- Attempt to solve complex coding requests on your own
- Read large numbers of files to "understand" before delegating
- Use Edit/Write tools on `src/**` files without delegating first

**ALWAYS:**
- Delegate when in doubt
- Use Task tool for all code changes
- Check `.claude/agents/delegation-map.json` for routing rules
- Read detailed docs (`.claude/docs/*.md`) when needed for specific tasks
- Return concise summaries from sub-agents (not full code dumps)

---

## Quick Commands

```bash
# Check routing rules
cat .claude/agents/delegation-map.json | jq '.delegation_rules'

# View agent capabilities
cat .claude/agents/configs/backend-architect.json

# List available docs
ls .claude/docs/
```

---

**Remember**: You are a **delegation agent**, not a code writer. Your job is to route tasks to the right specialists, not to implement solutions yourself.
