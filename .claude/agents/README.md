# SaaS X-Ray Sub-Agent Architecture

This directory contains specialized AI sub-agents designed to handle specific aspects of the SaaS X-Ray codebase efficiently. Each sub-agent operates in its own context window, preventing main conversation pollution and enabling longer development sessions.

## Why Sub-Agents?

**Problem**: Complex tasks consume the main context window (1M tokens), requiring frequent session resets.

**Solution**: Delegate specialized tasks to sub-agents with focused expertise and separate context windows.

**Benefits:**
- ✅ Preserve main context for high-level planning
- ✅ Specialized expertise for each domain
- ✅ Faster task completion with focused agents
- ✅ Reusable across different features
- ✅ Team-sharable (checked into git)

## Available Sub-Agents

### Tier 1: Core Technical Specialists

#### 1. `oauth-integration-specialist`
**Use for**: OAuth flows, credential storage, platform API debugging, organization ID issues

**Example invocations:**
- "Debug why Slack OAuth credentials aren't being found"
- "Fix Google Workspace API authentication error"
- "Investigate organization ID mismatch in OAuth callback"

**Key expertise:**
- Singleton pattern (state loss prevention)
- Dual storage architecture (metadata + credentials)
- Platform API quirks (Slack has NO apps.list!)
- Clerk organization scoping

---

#### 2. `database-architect`
**Use for**: PostgreSQL schema, repository patterns, JSONB columns, migrations, query optimization

**Example invocations:**
- "Fix JSONB invalid input syntax error"
- "Create migration to add new column to platform_connections"
- "Optimize slow query for connection stats"

**Key expertise:**
- T | null repository pattern
- JSONB handling (objects not strings)
- Docker PostgreSQL (port 5433)
- Foreign key constraints

---

#### 3. `typescript-guardian`
**Use for**: TypeScript errors, shared-types integration, type coverage, strict mode compliance

**Example invocations:**
- "Fix the 78 remaining TypeScript errors"
- "Migrate local types to @saas-xray/shared-types"
- "Add explicit return types to all functions in oauth-service.ts"

**Key expertise:**
- Shared-types build order
- T | null patterns
- Type guards for unknown
- Import from shared-types package

---

#### 4. `react-clerk-expert`
**Use for**: React components, Clerk hooks, Zustand stores, auth flows, organization switching

**Example invocations:**
- "Fix blank screen - component not rendering"
- "Migrate component from Zustand auth to Clerk hooks"
- "Add organization context to API call"

**Key expertise:**
- Clerk hooks (useAuth, useOrganization)
- Deprecated Zustand auth migration
- Organization context extraction
- shadcn/ui components

### Tier 2: Technical Specialists

#### 5. `api-middleware-specialist`
**Use for**: Express routes, middleware, Clerk authentication, CORS, request/response debugging

**Example invocations:**
- "Fix 404 error on DELETE /api/connections/:id"
- "Debug why Clerk headers aren't being extracted"
- "Add new API endpoint for connection refresh"

---

#### 6. `detection-algorithm-engineer`
**Use for**: AI detection, cross-platform correlation, ML algorithms, automation discovery

**Example invocations:**
- "Implement new detection algorithm for Microsoft Teams bots"
- "Optimize cross-platform correlation performance"
- "Add ML-based anomaly detection for API usage"

---

#### 7. `test-suite-manager`
**Use for**: Writing tests, fixing failures, improving coverage, ensuring 80%+ threshold

**Example invocations:**
- "Write integration tests for new OAuth callback endpoint"
- "Fix failing Vitest tests in PlatformCard component"
- "Improve test coverage for oauth-credential-storage-service"

---

#### 8. `security-compliance-auditor`
**Use for**: OAuth security, encryption, audit logs, GDPR/SOC2 compliance

**Example invocations:**
- "Review OAuth security implementation"
- "Validate encryption meets SOC2 requirements"
- "Generate GDPR compliance audit report"

### Tier 3: Support Specialists

#### 9. `code-reviewer-pro`
**Use for**: Post-change reviews, pattern enforcement, quality gates

**Automatic delegation**: After significant code changes (use PROACTIVELY)

---

#### 10. `documentation-sync`
**Use for**: Keeping docs in sync with code changes

**Example invocations:**
- "Update API_REFERENCE.md with new endpoint"
- "Add today's OAuth pitfalls to CLAUDE.md"
- "Update TYPESCRIPT_ERRORS_TO_FIX.md (78 → 60 errors)"

---

#### 11. `performance-optimizer`
**Use for**: Database optimization, React rendering, API response times

**Example invocations:**
- "Optimize slow connections query"
- "Reduce dashboard load time to <2 seconds"
- "Profile and fix React re-render issues"

---

#### 12. `docker-deployment-expert`
**Use for**: Docker issues, CI/CD failures, container orchestration

**Example invocations:**
- "Debug PostgreSQL container not starting"
- "Fix GitHub Actions workflow failure"
- "Update Docker Compose for production deployment"

## How to Use Sub-Agents

### Automatic Delegation (Recommended)

Claude Code will automatically invoke the appropriate sub-agent based on your task description:

```
> Fix the OAuth callback not storing credentials
→ Automatically delegates to: oauth-integration-specialist

> The dashboard query is taking 5 seconds to load
→ Automatically delegates to: performance-optimizer

> Write tests for the new discovery endpoint
→ Automatically delegates to: test-suite-manager
```

### Explicit Invocation

You can explicitly request a specific sub-agent:

```
> Use the typescript-guardian sub-agent to fix type errors
> Ask the database-architect to optimize this query
> Have the security-compliance-auditor review OAuth security
```

### Chaining Sub-Agents

For complex workflows, chain multiple sub-agents:

```
> First use the oauth-integration-specialist to fix the Slack connection,
  then have the test-suite-manager write integration tests,
  finally ask the code-reviewer-pro to review everything
```

## Sub-Agent Management

### View Available Agents
```bash
/agents
```

### Create New Agent
```bash
/agents
# Select "Create New Agent"
# Choose project-level or user-level
# Define name, description, tools, model
```

### Edit Existing Agent
```bash
# Edit the .md file directly
nano .claude/agents/oauth-integration-specialist.md

# Or use /agents command for guided editing
/agents
```

### Test Agent Delegation
```bash
# Try a task that should trigger the agent
> Debug OAuth callback credential storage

# Check which agent was invoked in the response
```

## Best Practices

1. **Let Claude choose** - Automatic delegation is usually best
2. **Be specific** - Clear task descriptions help agent selection
3. **Review results** - Sub-agents can miss context, validate their work
4. **Iterate on agents** - Customize system prompts based on results
5. **Share with team** - Check agents into git for team use

## When NOT to Use Sub-Agents

Don't use sub-agents for:
- Simple questions (faster to answer directly)
- Tasks requiring cross-domain knowledge
- Quick one-liners
- Tasks needing full conversation context

## Monitoring Agent Effectiveness

Track which agents are most valuable:
- Which agents get invoked most frequently?
- Which agents save the most context/time?
- Which agents need prompt refinement?
- Are there gaps needing new agents?

## Future Agents to Consider

Based on emerging patterns:
- `microsoft-365-integration-specialist` (when M365 integration starts)
- `data-migration-expert` (for large data migrations)
- `monitoring-alerting-specialist` (for observability)
- `customer-support-engineer` (for user-facing issues)

---

**Created**: October 2025
**Last Updated**: October 2025
**Agents**: 13 specialized sub-agents
**Purpose**: Context preservation, specialized expertise, faster development
