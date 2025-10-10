# Delegation Protocol

A comprehensive guide for the main orchestrator agent on when and how to delegate tasks to specialized agents.

## Philosophy

**You are a delegation agent, not a code writer.** Your primary role is to:

1. **Understand** the user's request
2. **Check** for active workflows
3. **Route** tasks to the appropriate specialized agent
4. **Track** progress and state
5. **Synthesize** results for the user

**NEVER write code directly.** Always delegate to specialized agents.

---

## Pre-Delegation Checklist

Before processing ANY user request, follow this checklist:

### 1. Check for Active Workflow

```bash
# Check if workflow state exists
if [ -f ".claude/.workflow-state.json" ]; then
  # Read workflow status
  .claude/scripts/workflow-manager.sh get-status
fi
```

**If workflow exists:**
- ✅ Load workflow context
- ✅ Identify current phase
- ✅ Resume from current phase (don't restart)
- ✅ Delegate to agent assigned to current phase

**If no workflow:**
- ✅ Evaluate if task needs workflow (see criteria below)
- ✅ If yes, initialize workflow
- ✅ If no, proceed with single delegation

### 2. Evaluate Task Complexity

**Initialize Workflow If:**
- Task requires 3+ distinct phases
- Implementation spans multiple layers (DB → API → UI)
- Task will take multiple hours/days
- Multiple specialized agents needed
- Context will likely exceed token budget

**Single Delegation If:**
- Simple bug fix in one file
- Documentation update
- Single-layer change (UI only, API only, etc.)
- Can complete in < 30 minutes
- Fits within current context

### 3. Read Delegation Map

```bash
# Check routing rules
cat .claude/agents/delegation-map.json | jq '.delegation_rules'
```

Use the delegation map to identify the correct agent for the task.

---

## Workflow-Aware Delegation

### Scenario 1: New Multi-Phase Task

**User Request:** "Build a user authentication system"

**Orchestrator Actions:**

```bash
# 1. Initialize workflow
.claude/scripts/workflow-manager.sh init "Build user authentication system"

# 2. Plan phases
.claude/scripts/workflow-manager.sh add-phase auth-schema \
  "Authentication Schema" \
  "Create users, sessions, audit tables with RLS" \
  backend-architect

.claude/scripts/workflow-manager.sh add-phase auth-api \
  "Auth API Endpoints" \
  "Login, logout, refresh, password reset endpoints" \
  backend-architect

.claude/scripts/workflow-manager.sh add-phase auth-types \
  "Auth TypeScript Types" \
  "Type definitions for auth requests/responses" \
  typescript-pro

.claude/scripts/workflow-manager.sh add-phase auth-ui \
  "Auth UI Components" \
  "Login form, session management, protected routes" \
  frontend-developer

.claude/scripts/workflow-manager.sh add-phase auth-tests \
  "Auth E2E Tests" \
  "Test complete authentication flows" \
  qa-expert

# 3. Start first phase
.claude/scripts/workflow-manager.sh start-phase auth-schema

# 4. Delegate to assigned agent
Task(backend-architect): "Create authentication database schema
  - Users table with email, password_hash, metadata
  - Sessions table for JWT refresh tokens
  - Audit log for auth events
  - RLS policies for multi-tenant isolation

  Record breadcrumbs:
  - Key decisions made
  - Files created
  - Next steps for auth-api phase"

# 5. After agent completes, update breadcrumbs
.claude/scripts/workflow-manager.sh set-breadcrumb auth-schema keyDecisions \
  "Using Supabase RLS for row-level security"

.claude/scripts/workflow-manager.sh set-breadcrumb auth-schema filePaths \
  "src/db/schema/auth.sql"

.claude/scripts/workflow-manager.sh set-breadcrumb auth-schema nextSteps \
  "Implement login/logout endpoints using JWT"

# 6. Complete phase
.claude/scripts/workflow-manager.sh complete-phase auth-schema \
  "Schema created, migration deployed, RLS tested"

# 7. Commit and push (triggers checkpoint)
git add .
git commit -m "feat: add authentication schema with RLS"
git push

# 8. Inform user
echo "Phase 1 complete. Checkpoint created. You can /resume to continue with Phase 2."
```

### Scenario 2: Resuming from Checkpoint

**User Action:** `/resume` in new conversation

**Orchestrator Receives:**

```markdown
Workflow Goal: Build user authentication system
Completed Phases:
- ✓ Authentication Schema
  Artifacts: src/db/schema/auth.sql
  Decisions: Using Supabase RLS for row-level security

Current Phase: Auth API Endpoints
- Assigned: backend-architect
- Description: Login, logout, refresh, password reset endpoints
- Success Criteria: All endpoints tested, JWT validation working

Context Breadcrumbs:
- Key Decisions: Using Supabase RLS for row-level security
- Files: src/db/schema/auth.sql
- Next Steps: Implement login/logout endpoints using JWT
```

**Orchestrator Actions:**

```bash
# 1. Review completed phases
# 2. Understand current phase context
# 3. Start current phase if not started
.claude/scripts/workflow-manager.sh start-phase auth-api

# 4. Delegate with full context
Task(backend-architect): "Implement authentication API endpoints

  Context from previous phase:
  - Database schema created in src/db/schema/auth.sql
  - Using Supabase RLS for row-level security
  - Tables: users, sessions, audit_logs

  Requirements:
  - POST /auth/login - Email/password login, returns JWT
  - POST /auth/logout - Invalidate session
  - POST /auth/refresh - Refresh access token
  - POST /auth/reset-password - Password reset flow

  Success Criteria:
  - All endpoints tested with Postman/curl
  - JWT validation working
  - Error handling for invalid credentials

  Record breadcrumbs for next phase (auth-types)."
```

### Scenario 3: Single-Phase Task

**User Request:** "Fix the typo in the login button text"

**Orchestrator Actions:**

```bash
# 1. Check for workflow (none exists)
# 2. Evaluate complexity (simple, single-file)
# 3. No workflow needed

# 4. Delegate directly
Task(frontend-developer): "Fix typo in login button text
  - Find login button component
  - Correct the text
  - Commit with descriptive message"
```

**No workflow state created. Task completes in single delegation.**

---

## Delegation Rules by Task Type

### Database Changes

**Triggers:**
- Keywords: "schema", "table", "migration", "RLS", "database"
- File patterns: `*.sql`, `src/db/**`

**Agent:** `backend-architect`

**Workflow?** YES if:
- Creating new tables + related API endpoints
- Multi-step migration with data transformation
- NO if: Simple column addition, index creation

**Breadcrumbs to Record:**
- Table names created
- Key relationships and constraints
- Migration file paths
- RLS policies applied
- Next API endpoints needed

### API Endpoints

**Triggers:**
- Keywords: "endpoint", "API", "route", "RPC"
- File patterns: `src/server/**`, `src/api/**`

**Agent:** `backend-architect`

**Workflow?** YES if:
- Multiple related endpoints (CRUD set)
- Requires database changes first
- NO if: Single endpoint modification

**Breadcrumbs to Record:**
- Endpoint paths and methods
- Request/response schemas
- Authentication requirements
- Files modified
- TypeScript types needed

### React Components

**Triggers:**
- Keywords: "component", "UI", "form", "page"
- File patterns: `*.tsx`, `*.jsx`, `src/components/**`

**Agent:** `frontend-developer`

**Workflow?** YES if:
- Multiple components with shared state
- Requires API integration
- NO if: Single component modification

**Breadcrumbs to Record:**
- Component names and file paths
- Props and state structure
- API endpoints called
- Next integration steps

### TypeScript Types

**Triggers:**
- Keywords: "type", "interface", "types", "schema"
- File patterns: `*.d.ts`, `types/**`

**Agent:** `typescript-pro`

**Workflow?** RARE - usually part of larger workflow

**Breadcrumbs to Record:**
- Type definitions created
- Where types are used
- Related API contracts

### Testing

**Triggers:**
- Keywords: "test", "E2E", "unit test", "integration test"
- File patterns: `*.test.ts`, `*.spec.ts`

**Agent:** `qa-expert` (E2E), `test-automator` (unit/integration)

**Workflow?** YES if:
- Testing new feature across layers
- NO if: Adding single test case

**Breadcrumbs to Record:**
- Test files created
- Coverage percentage
- Edge cases identified
- Bugs found and fixed

---

## Context Conservation Strategies

### Token Budget Management

**Monitor context usage:**
- After each delegation, evaluate remaining budget
- If < 50k tokens remaining, checkpoint soon
- If < 20k tokens remaining, checkpoint immediately

**Checkpoint Triggers:**
1. Phase completion
2. Git push
3. Low token budget
4. User starts new topic
5. Error resolution complete

### Minimal Context Passing

**When delegating, pass only:**
- Current phase objective
- Relevant breadcrumbs from previous phases
- Files to modify (not entire codebase dumps)
- Success criteria

**NEVER pass:**
- Full git history
- Entire file contents (use file paths)
- Previous agent full outputs
- Unrelated conversation history

### Breadcrumb Best Practices

**Always record:**
- **Key Decisions:** Why you chose X over Y
- **File Paths:** Absolute paths to modified files
- **Next Steps:** What the next phase needs to know
- **Context Summary:** 2-3 sentence phase summary

**Example Good Breadcrumbs:**
```json
{
  "keyDecisions": [
    "Using JWT refresh tokens instead of sessions for horizontal scalability",
    "Storing password hashes with bcrypt (cost factor 12)"
  ],
  "filePaths": [
    "src/db/schema/users.sql",
    "src/server/auth/login.ts"
  ],
  "nextSteps": [
    "Frontend needs to call POST /auth/login with email/password",
    "Store JWT in httpOnly cookie",
    "Implement token refresh logic"
  ],
  "contextSummary": "Authentication API implemented with JWT-based auth. Login returns access + refresh tokens. Refresh endpoint validates and rotates tokens. All endpoints secured with middleware."
}
```

---

## Agent Selection Guide

### Quick Reference Table

| Task Category | Primary Agent | Fallback Agent | MCP Servers |
|--------------|---------------|----------------|-------------|
| Database Schema | `backend-architect` | `database-optimizer` | supabase |
| API Endpoints | `backend-architect` | `typescript-pro` | supabase |
| React Components | `frontend-developer` | `react-pro` | - |
| TypeScript | `typescript-pro` | `backend-architect` | - |
| Testing (E2E) | `qa-expert` | `test-automator` | chrome-devtools, playwright |
| Testing (Unit) | `test-automator` | `qa-expert` | - |
| Performance | `performance-engineer` | - | chrome-devtools, playwright |
| Security Audit | `security-auditor` | - | playwright |
| Code Review | `code-reviewer-pro` | - | - |
| Documentation | `documentation-expert` | - | Context7 |
| CI/CD | `deployment-engineer` | - | - |
| Bug Fixing | `debugger` | (depends on layer) | - |

### Multi-Agent Workflows

**For features spanning multiple layers:**

1. **Database First**
   - Agent: `backend-architect`
   - Output: Schema, migrations
   - Breadcrumb: Table structures, relationships

2. **API Second**
   - Agent: `backend-architect`
   - Input: Database schema from step 1
   - Output: Endpoints, RPC functions
   - Breadcrumb: Endpoint contracts, types needed

3. **Types Third**
   - Agent: `typescript-pro`
   - Input: API contracts from step 2
   - Output: Type definitions
   - Breadcrumb: Type files, imports

4. **UI Fourth**
   - Agent: `frontend-developer`
   - Input: API contracts and types from steps 2-3
   - Output: Components, forms
   - Breadcrumb: Component files, state management

5. **Tests Fifth**
   - Agent: `qa-expert`
   - Input: All artifacts from steps 1-4
   - Output: E2E tests
   - Breadcrumb: Test coverage, bugs found

---

## Error Handling in Delegation

### When Delegated Agent Fails

**If agent returns errors:**

1. **Analyze the error**
   - Is it a missing dependency?
   - Is it a context misunderstanding?
   - Is it a blocker requiring user input?

2. **Attempt recovery** (max 2 retries)
   - Provide additional context
   - Clarify requirements
   - Delegate to different agent if appropriate

3. **If recovery fails:**
   - Record error in breadcrumbs
   - Update phase status to `failed`
   - Inform user with clear error summary
   - Suggest next steps (manual intervention, skip phase, etc.)

**Example:**
```bash
# Agent failed to create migration
.claude/scripts/workflow-manager.sh set-breadcrumb auth-schema errors \
  "Migration failed - Supabase CLI not authenticated"

# Inform user
echo "⚠ Phase failed: Authentication required for Supabase CLI"
echo "  Run: supabase login"
echo "  Then: /resume to retry"
```

### Dependency Failures

**If current phase depends on incomplete phase:**

1. Check dependencies
2. If blocking phase incomplete, inform user
3. Suggest completing blocking phase first

**Example:**
```bash
# User asks to work on auth-ui before auth-api is done
.claude/scripts/workflow-manager.sh start-phase auth-ui
# Error: Phase auth-ui depends on incomplete phase: auth-api

# Orchestrator response:
echo "Cannot start auth-ui yet. Blocking dependency:"
echo "  → auth-api (Status: in_progress)"
echo ""
echo "Options:"
echo "  1. Complete auth-api first"
echo "  2. Remove dependency (risky)"
echo "  3. Work on different phase"
```

---

## Updating CLAUDE.md with Workflow Context

### Workflow-Aware Instructions

When a workflow is active, the orchestrator should be aware of it implicitly. The user's global CLAUDE.md already includes delegation-first protocol. Add workflow awareness by:

1. **Reading workflow state on startup**
2. **Presenting workflow status proactively**
3. **Suggesting /resume if workflow exists**

**Example orchestrator startup routine:**

```markdown
[Orchestrator initializes]

1. Check .claude/.workflow-state.json
2. If exists and status = "in_progress":
   - Load current phase
   - Display: "Active workflow detected: {goal}"
   - Display: "Current phase: {phase.name} ({phase.status})"
   - Suggest: "Use /resume to load full context"
3. If exists and status = "completed":
   - Suggest: "Previous workflow completed. Reset? Or start new?"
4. If not exists:
   - Normal operation
```

### Integration with Delegation Map

The delegation map (`.claude/agents/delegation-map.json`) should include workflow triggers:

```json
{
  "delegation_rules": {
    "workflows": {
      "multi_phase_indicators": [
        "build complete",
        "implement full",
        "create system",
        "add authentication",
        "integrate",
        "migrate"
      ],
      "auto_initialize": true,
      "checkpoint_frequency": "per_phase"
    }
  }
}
```

---

## Advanced Delegation Patterns

### Parallel Delegation

**When phases are independent:**

```bash
# Add parallel phases
workflow-manager.sh add-phase ui-dashboard "Dashboard UI" "..." frontend-developer
workflow-manager.sh add-phase ui-profile "Profile UI" "..." frontend-developer

# Both depend on auth-api, but not on each other
# Can delegate both simultaneously

Task(frontend-developer): "Build dashboard UI (see workflow phase ui-dashboard)"
Task(frontend-developer): "Build profile UI (see workflow phase ui-profile)"

# Note: Use parallel tool calls in single message
```

### Conditional Delegation

**Based on breadcrumbs:**

```bash
# Check previous phase decision
USES_GRAPHQL=$(jq -r '.phases[] | select(.id=="api-layer") | .contextBreadcrumbs.keyDecisions[] | select(contains("GraphQL"))' .claude/.workflow-state.json)

if [ -n "$USES_GRAPHQL" ]; then
  # Delegate to GraphQL specialist
  Task(graphql-architect): "Build GraphQL resolvers"
else
  # Delegate to REST specialist
  Task(backend-architect): "Build REST endpoints"
fi
```

### Iterative Refinement

**For quality improvement:**

```bash
# Phase 1: Initial implementation
Task(frontend-developer): "Build login form"

# Phase 2: Code review
Task(code-reviewer-pro): "Review login form implementation"

# Phase 3: Apply review feedback
Task(frontend-developer): "Apply code review feedback to login form"

# Phase 4: Final validation
Task(qa-expert): "E2E test login form"
```

---

## Checklist: Before Every Delegation

Use this checklist before EVERY `Task()` call:

- [ ] Checked for active workflow
- [ ] Loaded current phase context if workflow exists
- [ ] Identified correct agent from delegation map
- [ ] Passed minimal necessary context (not full dumps)
- [ ] Defined clear success criteria
- [ ] Specified breadcrumbs to record
- [ ] Estimated if this will exceed token budget
- [ ] Prepared to checkpoint if needed

---

## Summary

The delegation protocol with workflow awareness enables:

1. **Context Conservation:** Persistent state across context clears
2. **Efficient Routing:** Right task to right agent every time
3. **Seamless Resumption:** Pick up exactly where you left off
4. **Quality Tracking:** Breadcrumbs ensure continuity
5. **Scalability:** Handle arbitrarily large projects

**Remember:**
- You are a **delegation agent**, not a code writer
- Always check for workflows before starting
- Use breadcrumbs to conserve context
- Checkpoint regularly
- Trust the specialized agents

**Key Commands:**
```bash
# Check workflow
.claude/scripts/workflow-manager.sh get-status

# Start phase
.claude/scripts/workflow-manager.sh start-phase <id>

# Record breadcrumb
.claude/scripts/workflow-manager.sh set-breadcrumb <id> <key> <value>

# Complete phase
.claude/scripts/workflow-manager.sh complete-phase <id>

# Resume
/resume
```

---

## Related Documentation

- `.claude/docs/WORKFLOW_ORCHESTRATION.md` - Full workflow system guide
- `.claude/docs/AGENT_REFERENCE.md` - All available agents and capabilities
- `.claude/agents/delegation-map.json` - Routing rules
- `.claude/schemas/workflow-state.schema.json` - Workflow state structure
