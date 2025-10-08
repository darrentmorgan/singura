# Agent Delegation Examples

## Overview

This document provides comprehensive examples of how to delegate tasks to specialized agents. These patterns ensure efficient context usage and proper task routing.

---

## Example 1: Database Migration

### User Request
> "Create a migration for adding user_preferences table with RLS"

### Main Agent Analysis
- **Detects triggers**: "migration", "table", "RLS"
- **Routes to**: `backend-architect` (has Supabase MCP access)

### Delegation
```typescript
Task({
  subagent_type: "backend-architect",
  prompt: "Create Supabase migration for user_preferences table with RLS policies for tenant isolation"
})
```

### Agent Response
```json
{
  "summary": "Created migration 20251008_user_preferences.sql with RLS policies for tenant isolation",
  "files_changed": ["supabase/migrations/20251008_user_preferences.sql"],
  "artifacts": ["migration SQL file"],
  "next_steps": ["Run migration on dev: supabase db push", "Test RLS policies"],
  "issues": [],
  "references": ["https://supabase.com/docs/guides/auth/row-level-security"]
}
```

---

## Example 2: React Component

### User Request
> "Add a loading spinner component"

### ✅ CORRECT Approach
```typescript
Task({
  subagent_type: "frontend-developer",
  prompt: "Create a loading spinner component following our shadcn/ui patterns"
})
```

### ❌ WRONG Approach
```typescript
// DON'T DO THIS:
Read("src/components/Button.tsx")
Read("src/components/Card.tsx")
Read("src/components/Loading.tsx")
// ... read 10 more files
// Then implement spinner yourself
```

**Why wrong**: Consumes 50K+ tokens on context, violates delegation-first protocol

---

## Example 3: E2E Testing

### User Request
> "Run E2E tests for the checkout flow and take screenshots"

### Main Agent Analysis
- **Detects triggers**: "E2E test", "screenshot"
- **Routes to**: `qa-expert` (has chrome-devtools + playwright MCP access)

### Delegation
```typescript
Task({
  subagent_type: "qa-expert",
  prompt: "Execute E2E tests for checkout flow, take screenshots at each step, and report failures with detailed diagnostics"
})
```

### Agent Response
```json
{
  "summary": "Executed 12 E2E tests for checkout flow. 10 passed, 2 failed due to payment gateway timeout",
  "files_changed": [],
  "artifacts": [
    "screenshots/checkout-step1.png",
    "screenshots/checkout-step2-failure.png"
  ],
  "next_steps": [
    "Increase payment gateway timeout",
    "Add retry logic for failed payments"
  ],
  "issues": [
    "tests/e2e/checkout.spec.ts:67 - Payment timeout after 5s",
    "tests/e2e/checkout.spec.ts:89 - Invalid coupon code handling"
  ],
  "references": []
}
```

---

## Example 4: OAuth Integration

### User Request
> "Add Microsoft 365 OAuth integration"

### ✅ CORRECT Approach
```typescript
Task({
  subagent_type: "oauth-integration-specialist",
  prompt: "Implement Microsoft 365 OAuth integration following our Slack/Google patterns. Include: OAuth flow, credential storage, token refresh, RLS policies, and security tests"
})
```

### ❌ WRONG Approach
```typescript
// DON'T DO THIS:
Read("src/server/oauth/slack-oauth-service.ts")
Edit("src/server/oauth/microsoft-oauth-service.ts", ...) // Main agent writes code
```

**Why wrong**: Main agent should NEVER handle OAuth/security code directly

---

## Example 5: Multi-Agent Complex Task

### User Request
> "Build a campaign analytics dashboard with real-time data, database queries, and full test coverage"

### Main Agent Analysis
- **Complex multi-domain task**
- **Routes to**: `agent-organizer` (orchestrates multiple specialists)

### Delegation
```typescript
Task({
  subagent_type: "agent-organizer",
  prompt: "Coordinate building campaign analytics dashboard with: backend-architect for schema design, database-optimizer for query performance, frontend-developer for React UI, test-automator for unit tests, qa-expert for E2E visual validation"
})
```

### Agent Organizer Assembles Team
1. **backend-architect** - Design database schema for analytics
2. **database-optimizer** - Optimize real-time query performance
3. **frontend-developer** - Build dashboard UI components
4. **test-automator** - Create unit and integration tests
5. **qa-expert** - E2E testing with visual validation

### Execution Strategy
- **Phase 1**: `backend-architect` + `database-optimizer` (parallel)
- **Phase 2**: `frontend-developer` (depends on Phase 1)
- **Phase 3**: `test-automator` + `qa-expert` (parallel)

### Final Synthesized Response
```json
{
  "summary": "Built campaign analytics dashboard with real-time data pipeline, optimized queries, React UI, and comprehensive test coverage",
  "files_changed": [
    "supabase/migrations/20251008_analytics_schema.sql",
    "src/components/AnalyticsDashboard.tsx",
    "src/hooks/useAnalytics.ts",
    "tests/analytics.test.ts",
    "tests/e2e/analytics.spec.ts"
  ],
  "artifacts": [
    "screenshots/dashboard-desktop.png",
    "screenshots/dashboard-mobile.png",
    "performance-report.json"
  ],
  "next_steps": [
    "Deploy to staging",
    "Run load tests with 1000 concurrent users",
    "Review analytics data accuracy"
  ],
  "issues": [],
  "references": [
    "https://supabase.com/docs/guides/database/replication",
    "https://react.dev/reference/react/hooks"
  ]
}
```

---

## Example 6: TypeScript Error Fixing

### User Request
> "Fix the TypeScript errors in the OAuth service"

### ✅ CORRECT Approach
```typescript
Task({
  subagent_type: "typescript-guardian",
  prompt: "Analyze and fix TypeScript errors in OAuth services. Ensure full type coverage and shared-types usage"
})
```

### ❌ WRONG Approach
```typescript
// DON'T DO THIS:
Bash("npx tsc --noEmit")
// Read error output
Read("src/server/oauth/oauth-credential-storage-service.ts")
Edit("...", ...) // Main agent fixes types
```

**Why wrong**: TypeScript specialist has patterns and type coverage expertise

---

## Example 7: Performance Optimization

### User Request
> "The discovery query is slow, optimize it"

### ✅ CORRECT Approach
```typescript
Task({
  subagent_type: "performance-optimizer",
  prompt: "Analyze and optimize the discovery query performance. Profile execution, add indexes if needed, and implement caching strategy"
})
```

### Agent Response
```json
{
  "summary": "Optimized discovery query from 3.2s to 180ms via composite index and Redis caching",
  "files_changed": [
    "supabase/migrations/20251008_add_discovery_index.sql:1",
    "src/server/services/discovery-service.ts:45"
  ],
  "artifacts": ["performance-report-before-after.json"],
  "next_steps": [
    "Monitor query performance in production",
    "Consider materialized view for complex aggregations"
  ],
  "issues": [],
  "references": ["https://www.postgresql.org/docs/current/indexes-types.html"]
}
```

---

## Best Practices Summary

### ✅ DO
- Delegate at first sign of complexity
- Use keyword matching for automatic routing
- Let specialists handle their domains
- Trust agent responses (don't re-implement)
- Check `.claude/agents/delegation-map.json` for routing rules

### ❌ DON'T
- Read extensive files before delegating
- Implement code yourself when specialists exist
- Skip delegation for "quick fixes"
- Modify agent outputs
- Handle OAuth/security/database directly

---

## Quick Decision Tree

```
User request received
  ↓
Contains delegation trigger keywords? → YES → Task tool immediately
  ↓ NO
  ↓
Requires code changes? → YES → Delegate to specialist
  ↓ NO
  ↓
Simple question/clarification? → YES → Answer directly
  ↓ NO
  ↓
Cross-domain (3+ agents)? → YES → Delegate to agent-organizer
  ↓ NO
  ↓
Default → Delegate to general-purpose
```

---

*For agent capabilities and MCP access, see `.claude/agents/README.md`*
