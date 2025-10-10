# Workflow Orchestration System

A context-aware workflow orchestration system for managing large, multi-phase tasks across context boundaries in Claude Code.

## Overview

The workflow orchestration system enables the main orchestrator agent to:

- Break large tasks into discrete, manageable phases
- Persist workflow state between context clears
- Track progress with breadcrumbs for seamless resumption
- Delegate phases to specialized agents
- Create checkpoints at stable points (e.g., after git push)
- Resume work from any checkpoint without losing context

## Architecture

### Components

1. **Workflow State Schema** (`.claude/schemas/workflow-state.schema.json`)
   - JSON schema defining workflow structure
   - Validates state file integrity
   - Documents expected data format

2. **Workflow Manager Script** (`.claude/scripts/workflow-manager.sh`)
   - Command-line tool for workflow operations
   - Manages state transitions and validation
   - Provides atomic state file updates

3. **Post-Push Hook** (`.claude/hooks/post-git-push.sh`)
   - Triggered after successful `git push`
   - Creates checkpoint events
   - Displays workflow status and next steps

4. **Resume Command** (`.claude/commands/resume.md` + `.claude/commands/resume.sh`)
   - Loads workflow state into new context
   - Formats state for Claude consumption
   - Provides continuation instructions

### State File Structure

```json
{
  "goal": "Overall workflow objective",
  "initiatedAt": "2024-01-15T10:30:00Z",
  "currentPhaseId": "phase-1",
  "status": "in_progress",
  "phases": [
    {
      "id": "phase-1",
      "name": "Human-readable name",
      "description": "What this phase accomplishes",
      "status": "in_progress",
      "assignedAgent": "backend-architect",
      "successCriteria": [
        "All tests pass",
        "Schema deployed to dev"
      ],
      "artifacts": [
        "src/db/schema/users.sql",
        "src/db/migrations/001_create_users.sql"
      ],
      "dependencies": [],
      "startedAt": "2024-01-15T10:35:00Z",
      "completedAt": null,
      "contextBreadcrumbs": {
        "keyDecisions": [
          "Using PostgreSQL with RLS",
          "Bcrypt for password hashing"
        ],
        "filePaths": [
          "src/db/schema/users.sql"
        ],
        "nextSteps": [
          "Create migration file",
          "Deploy to dev database"
        ],
        "contextSummary": "Users table schema designed with email, password_hash, and metadata fields. RLS policies drafted."
      }
    }
  ],
  "completedPhases": [],
  "history": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "event": "workflow_initialized",
      "phaseId": null,
      "notes": "Workflow initialized"
    }
  ]
}
```

## When to Use

### Good Use Cases

**Use the workflow system when:**

1. **Large Feature Development**
   - Multi-day implementations
   - Requires database + API + UI changes
   - Example: "Build complete authentication system"

2. **Complex Refactoring**
   - Multiple file changes across layers
   - Requires incremental testing
   - Example: "Migrate from REST to GraphQL"

3. **System Integration**
   - Multiple services/systems involved
   - Phased rollout needed
   - Example: "Integrate payment processor"

4. **Migration Projects**
   - Data migration with validation steps
   - Requires rollback planning
   - Example: "Migrate users from Auth0 to Supabase"

### When NOT to Use

**Skip the workflow system for:**

- Single-file changes
- Simple bug fixes
- Documentation updates
- One-off script execution
- Tasks completable in single context window

## Usage Guide

### 1. Initialize Workflow

```bash
.claude/scripts/workflow-manager.sh init "Build user authentication system"
```

**Output:**
```
✓ Workflow initialized
  Goal: Build user authentication system
  State file: .claude/.workflow-state.json
```

### 2. Plan Phases

Add phases in logical order with dependencies:

```bash
# Phase 1: Database
.claude/scripts/workflow-manager.sh add-phase auth-db \
  "Database Schema" \
  "Create users, sessions, and audit tables" \
  backend-architect

# Phase 2: API (depends on database)
.claude/scripts/workflow-manager.sh add-phase auth-api \
  "Authentication API" \
  "Login, logout, refresh token endpoints" \
  backend-architect

# Phase 3: UI (depends on API)
.claude/scripts/workflow-manager.sh add-phase auth-ui \
  "Auth UI Components" \
  "Login form, session management, protected routes" \
  frontend-developer

# Phase 4: Testing
.claude/scripts/workflow-manager.sh add-phase auth-tests \
  "E2E Authentication Tests" \
  "Test complete auth flow" \
  qa-expert
```

### 3. Execute Phases

#### Start Phase

```bash
.claude/scripts/workflow-manager.sh start-phase auth-db
```

**Output:**
```
✓ Phase started
  ID: auth-db
  Name: Database Schema
```

#### Work on Phase

As you work, record context breadcrumbs:

```bash
# Record important decisions
.claude/scripts/workflow-manager.sh set-breadcrumb auth-db keyDecisions \
  "Using Supabase RLS for row-level security"

# Track files created/modified
.claude/scripts/workflow-manager.sh set-breadcrumb auth-db filePaths \
  "src/db/schema/users.sql"

# Note next steps
.claude/scripts/workflow-manager.sh set-breadcrumb auth-db nextSteps \
  "Create migration and deploy to dev environment"

# Update context summary
.claude/scripts/workflow-manager.sh set-breadcrumb auth-db contextSummary \
  "Users table created with email, password_hash, metadata. RLS policies defined for user isolation."
```

#### Complete Phase

When all success criteria are met:

```bash
.claude/scripts/workflow-manager.sh complete-phase auth-db \
  "Schema created, migration deployed to dev, tests passing"
```

**Output:**
```
✓ Phase completed
  ID: auth-db
  Name: Database Schema
  Progress: 1/4 phases
  Next phase: Authentication API (auth-api)
```

### 4. Checkpoint and Resume

#### Create Checkpoint

Checkpoints are created automatically after `git push`:

```bash
git add .
git commit -m "feat: add user authentication schema"
git push
```

**Post-push hook output:**
```
═══════════════════════════════════════════════════════
✓ Git push successful - Workflow checkpoint reached
═══════════════════════════════════════════════════════

  Current Phase: Authentication API (auth-api)
  Status: in_progress

Checkpoint Options:

  1. Continue working in this conversation
  2. Start fresh conversation with: /resume
  3. Mark phase complete if all success criteria met

  Next Phase: Auth UI Components (auth-ui)

  Progress: 1/4 phases completed

═══════════════════════════════════════════════════════
```

#### Resume from Checkpoint

In a new conversation:

```bash
/resume
```

This loads the full workflow state with:
- Completed phase summaries
- Current phase context
- Pending phases
- Continuation instructions

### 5. Check Status

At any time, view workflow status:

```bash
# Full status
.claude/scripts/workflow-manager.sh get-status

# Current phase only
.claude/scripts/workflow-manager.sh get-current

# List all phases
.claude/scripts/workflow-manager.sh list-phases
```

## Integration with Delegation Protocol

The workflow system integrates seamlessly with the delegation protocol:

1. **Phase Planning:** Assign each phase to the appropriate specialized agent
2. **Delegation:** When executing a phase, delegate to the assigned agent via Task tool
3. **Context Preservation:** Agent outputs are captured in breadcrumbs
4. **Handoff:** Completed phase artifacts guide the next agent

### Example Delegation Flow

```markdown
Phase: auth-api (assigned to backend-architect)

Orchestrator:
1. Starts phase: `workflow-manager.sh start-phase auth-api`
2. Delegates to backend-architect via Task tool
3. Backend-architect implements API endpoints
4. Orchestrator records artifacts and decisions
5. Completes phase: `workflow-manager.sh complete-phase auth-api`
6. Next phase auto-assigned to frontend-developer
```

## Best Practices

### Phase Design

1. **Single Responsibility:** Each phase should accomplish one cohesive objective
2. **Clear Dependencies:** Explicitly define what must complete first
3. **Testable Completion:** Define concrete success criteria
4. **Agent Alignment:** Assign to agent with right expertise

### Breadcrumb Management

1. **Record Early and Often:** Don't wait until phase end
2. **Be Specific:** "Using bcrypt" vs "Using hashing"
3. **Include Why:** "Using PostgreSQL RLS because we need row-level multi-tenancy"
4. **Update Context Summary:** Keep it current as phase progresses

### Checkpoint Strategy

1. **Checkpoint at Stable Points:** After tests pass, before major changes
2. **Commit Atomically:** Each checkpoint should be a working state
3. **Meaningful Messages:** Commit messages should reflect phase progress
4. **Push Regularly:** Don't let too much work accumulate

### Context Management

1. **Clear Context at Checkpoints:** Don't drag old context through phases
2. **Trust Breadcrumbs:** If you recorded it properly, you can resume
3. **Resume Deliberately:** Review completed phases before continuing
4. **Update Frequently:** Keep breadcrumbs fresh

## Workflow Lifecycle Example

### Scenario: Add Payment Processing

#### Planning Phase

```bash
# Initialize
workflow-manager.sh init "Integrate Stripe payment processing"

# Add phases
workflow-manager.sh add-phase payment-schema \
  "Payment Schema" \
  "Add subscriptions, invoices, payment_methods tables" \
  backend-architect

workflow-manager.sh add-phase stripe-api \
  "Stripe API Integration" \
  "Implement webhook handlers and payment intents" \
  backend-architect

workflow-manager.sh add-phase payment-ui \
  "Payment UI" \
  "Checkout flow, payment method management" \
  frontend-developer

workflow-manager.sh add-phase payment-tests \
  "Payment E2E Tests" \
  "Test full checkout and subscription flows" \
  qa-expert
```

#### Execution Phase

```bash
# Start first phase
workflow-manager.sh start-phase payment-schema

# Work on schema...
# Record decisions as you go
workflow-manager.sh set-breadcrumb payment-schema keyDecisions \
  "Storing stripe_customer_id on users table"

workflow-manager.sh set-breadcrumb payment-schema filePaths \
  "src/db/schema/payments.sql"

workflow-manager.sh set-breadcrumb payment-schema contextSummary \
  "Created subscriptions table with foreign key to users. Added payment_methods table with encrypted card tokens."

# Complete phase
workflow-manager.sh complete-phase payment-schema \
  "Schema created, migration deployed, manual testing successful"

# Checkpoint
git add . && git commit -m "feat: add payment schema" && git push

# Continue to next phase or /resume in new context
```

#### Resume After Context Clear

```bash
/resume
```

Claude sees:
- ✓ Payment Schema phase completed
- Artifacts: `src/db/schema/payments.sql`
- Decisions: "Storing stripe_customer_id on users table"
- → Current: Stripe API Integration (stripe-api)
- Next steps: Implement webhook handlers

Continue work seamlessly!

## Troubleshooting

### State File Corruption

If state file becomes invalid:

```bash
# Validate JSON
jq . .claude/.workflow-state.json

# Backup before fixing
cp .claude/.workflow-state.json .claude/.workflow-state.json.backup

# Reset if necessary
workflow-manager.sh reset
```

### Dependency Issues

If you can't start a phase:

```bash
# Check status of dependencies
workflow-manager.sh list-phases

# Complete blocking phases first
workflow-manager.sh complete-phase <blocking-phase-id>
```

### Lost Context

If breadcrumbs are insufficient:

```bash
# Review git history
git log --oneline -10

# Check file changes
git diff <last-checkpoint>

# Read recently modified files
ls -lt src/ | head -10
```

### Workflow Won't Complete

If final phase completes but workflow stays in_progress:

```bash
# Check phase count
jq '.phases | length' .claude/.workflow-state.json
jq '.completedPhases | length' .claude/.workflow-state.json

# Manually mark complete if needed
jq '.status = "completed"' .claude/.workflow-state.json > temp.json
mv temp.json .claude/.workflow-state.json
```

## Advanced Usage

### Custom Phase Attributes

Add custom fields to phases by editing state file:

```json
{
  "id": "auth-api",
  "estimatedHours": 4,
  "priority": "high",
  "tags": ["security", "backend"],
  ...
}
```

### Parallel Phases

For independent phases that can run simultaneously:

```bash
# Add phases with same dependency
workflow-manager.sh add-phase ui-dashboard "Dashboard UI" "..." frontend-developer
workflow-manager.sh add-phase ui-profile "Profile UI" "..." frontend-developer

# Both depend on auth-api being complete
# Can be worked on in parallel after auth-api
```

### Workflow Templates

Create reusable templates for common workflows:

```json
// .claude/templates/workflow-crud-feature.json
{
  "goal": "Add CRUD for {entity}",
  "phases": [
    {
      "id": "{entity}-schema",
      "name": "{Entity} Schema",
      "assignedAgent": "backend-architect"
    },
    {
      "id": "{entity}-api",
      "name": "{Entity} API",
      "assignedAgent": "backend-architect"
    },
    {
      "id": "{entity}-ui",
      "name": "{Entity} UI",
      "assignedAgent": "frontend-developer"
    }
  ]
}
```

### State File Versioning

Track workflow evolution in git:

```bash
# Include in commits
git add .claude/.workflow-state.json

# Review workflow history
git log --oneline -- .claude/.workflow-state.json

# Restore previous state
git checkout <commit> -- .claude/.workflow-state.json
```

## Integration with Other Systems

### CI/CD Integration

Use workflow state in CI pipelines:

```yaml
# .github/workflows/deploy.yml
- name: Check Workflow Status
  run: |
    STATUS=$(jq -r '.status' .claude/.workflow-state.json)
    if [ "$STATUS" != "completed" ]; then
      echo "Workflow incomplete, blocking deploy"
      exit 1
    fi
```

### Project Management Sync

Sync workflow phases to external systems:

```bash
# Example: Create Jira tickets from phases
jq -r '.phases[] | "\(.name): \(.description)"' .claude/.workflow-state.json | \
  while read line; do
    # Create Jira ticket via API
    curl -X POST ... -d "$line"
  done
```

## FAQ

**Q: Should I commit the workflow state file to git?**
A: Yes for team workflows, optional for solo work. Add to `.gitignore` if it contains sensitive context.

**Q: Can I have multiple workflows?**
A: The system currently supports one active workflow. Complete or reset before starting a new one.

**Q: What if I need to change phases mid-workflow?**
A: Edit `.claude/.workflow-state.json` directly, or reset and re-plan if major changes needed.

**Q: How detailed should breadcrumbs be?**
A: Enough to resume confidently. Include key decisions, files touched, and next actions.

**Q: Can I skip phases?**
A: You can mark them complete, but respect dependencies. Don't skip foundational phases.

## Related Documentation

- `.claude/docs/DELEGATION.md` - Agent delegation protocol
- `.claude/docs/AGENT_REFERENCE.md` - Available agents and capabilities
- `.claude/schemas/workflow-state.schema.json` - State schema definition
- `.claude/commands/resume.md` - Resume command documentation

## Summary

The workflow orchestration system enables context-aware, multi-phase task execution:

1. **Plan:** Break large tasks into phases with clear objectives
2. **Execute:** Work on phases incrementally with breadcrumb tracking
3. **Checkpoint:** Push code at stable points to create checkpoints
4. **Resume:** Use `/resume` to continue seamlessly after context clears
5. **Complete:** Finish phases systematically until workflow goal achieved

This system transforms Claude Code into a persistent, long-running development partner capable of handling complex, multi-day projects without losing context.
