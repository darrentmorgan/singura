# Agent Configuration Examples & Fixtures

This document provides complete, real-world examples of agent configurations from our codebase. Use these as templates when creating new agents.

**Note:** This document contains security vulnerability examples for educational purposes only. These patterns should NEVER be used in production code.

## Table of Contents

1. [Chrome DevTools MCP Agents](#chrome-devtools-mcp-agents)
2. [Supabase MCP Agents](#supabase-mcp-agents)
3. [Firecrawl MCP Agents](#firecrawl-mcp-agents)
4. [Context7 MCP Agents](#context7-mcp-agents)
5. [ClickUp MCP Agents](#clickup-mcp-agents)
6. [Tool-Based Markdown Agents](#tool-based-markdown-agents)
7. [Response Format Examples](#response-format-examples)

---

## Chrome DevTools MCP Agents

### Example: QA Expert (Browser Automation & E2E Testing)

**File:** `.claude/agents/configs/qa-expert.json`

Complete JSON configuration showing workflow with explicit MCP tool names, response format optimization, and proactive triggers.

[See full configuration in `.claude/agents/configs/qa-expert.json`]

**Key Features:**
- 7-step workflow with explicit `mcp__chrome-devtools__*` tool names
- Response format: `test_results_summary` with max 1000 tokens
- Excludes verbose logs, includes only actionable summaries
- Artifacts enabled for large test outputs

**Example Output:**

```markdown
## E2E Test Results: Authentication Flow

**Status:** ✓ PASSED (8/8 tests)
**Duration:** 12.4 seconds
**Coverage:** Login, Signup, Password Reset, Session Management

### Test Summary
- ✓ User can login with valid credentials
- ✓ User sees error with invalid credentials
- ✓ User can signup with new email
- ✓ User receives validation errors for weak passwords

### Performance Metrics
- **Page Load Time:** 1.2s (target: <2s) ✓
- **Time to Interactive:** 1.8s (target: <3s) ✓
- **Network Requests:** 12 total (8 successful, 0 failed)
- **Console Errors:** 0

### References
- `tests/auth.e2e.ts:42` - Main authentication test suite
- `src/pages/Login.tsx:108` - Login form component
```

---

## Supabase MCP Agents

### Example: Backend Architect (Database Schema & Migrations)

**File:** `.claude/agents/configs/backend-architect.json`

**Key Configuration Elements:**

```json
{
  "description": "Use PROACTIVELY for Supabase database schema design, migrations, and RLS policies. MUST BE USED with Supabase MCP for database operations.",

  "response_format": {
    "type": "architecture_summary",
    "max_tokens": 800,
    "include": [
      "migration_file_path",
      "schema_changes_summary",
      "rls_policies",
      "breaking_changes",
      "rollback_strategy"
    ],
    "exclude": [
      "full_migration_sql",
      "verbose_schema_dumps"
    ]
  },

  "workflow": {
    "step_1_inspect": "Use mcp__supabase__list_tables to review current schema",
    "step_2_design": "Design schema changes with proper types and constraints",
    "step_3_migrate": "Use mcp__supabase__apply_migration to create migration",
    "step_4_rls": "Use mcp__supabase__execute_sql for RLS policies",
    "step_5_validate": "Use mcp__supabase__get_advisors for security/performance checks"
  }
}
```

**Example Output:**

```markdown
## Database Migration: User Preferences

**Migration:** `supabase/migrations/20250112_add_user_preferences.sql`
**Status:** ✓ CREATED (not yet applied)
**Breaking Changes:** None

### Schema Changes
- Added table `user_preferences` with columns:
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `theme` (text, default 'light')
  - `notifications_enabled` (boolean, default true)

### RLS Policies
- `user_preferences_select_own`: Users can SELECT their own preferences
- `user_preferences_update_own`: Users can UPDATE their own preferences

### TypeScript Types
Generated types in `src/types/database.ts`:
- Interface `UserPreferences` with all fields typed

### Rollback Strategy
SQL command to drop table and cascade dependencies

### Next Steps
- [ ] Review migration file
- [ ] Test on dev branch
- [ ] Apply to production after approval

### References
- `supabase/migrations/20250112_add_user_preferences.sql` - Migration file
- `src/types/database.ts:42` - Generated TypeScript types
```

---

## Firecrawl MCP Agents

### Example: Web Scraper (Data Extraction)

**File:** `.claude/agents/configs/web-scraper.json`

**Key Features:**
- Uses lightweight Haiku model for cost efficiency
- Artifacts enabled for large scraped datasets
- Returns structured data (JSON/CSV/Markdown tables)
- Includes data quality validation

**Workflow Tools:**
- `FIRECRAWL_SCRAPE_EXTRACT_DATA_LLM` - Single page scraping
- `FIRECRAWL_CRAWL_URLS` - Multi-page crawling
- `FIRECRAWL_EXTRACT` - Structured data extraction
- `FIRECRAWL_CRAWL_JOB_STATUS` - Progress monitoring

**Example Output:**

```markdown
## Web Scraping Results: Competitor Product Pricing

**Source:** https://competitor.com/pricing
**Extracted:** 2025-01-12 14:32:00 UTC
**Status:** ✓ Complete (5 pricing tiers found)

### Pricing Data

| Tier | Monthly Price | Annual Price | Features Count |
|------|---------------|--------------|----------------|
| Free | $0 | $0 | 5 |
| Starter | $29 | $290 | 15 |
| Professional | $79 | $790 | 30 |
| Business | $199 | $1990 | 60 |

### Key Insights
- 17% discount on annual plans
- Free tier limited to 1,000 API calls/month
- Professional tier most popular

### Data Quality
- **Completeness:** 100%
- **Confidence:** High
- **Last Updated:** Page shows "Updated Jan 2025"
```

---

## Context7 MCP Agents

### Example: Documentation Expert (Library Documentation Lookup)

**File:** `.claude/agents/configs/documentation-expert.json`

**Workflow:**
1. `resolve-library-id` - Convert package names to Context7 IDs
2. `get-library-docs` - Retrieve up-to-date documentation
3. Extract relevant code examples and API signatures
4. Return concise summary with usage notes

**Example Output:**

```markdown
## Documentation: React Query v5 useQuery Hook

**Library:** @tanstack/react-query v5.17.0
**Source:** Official TanStack documentation

### API Signature
Function signature with TypeScript generics and all parameters

### Code Example
Complete working example with:
- Import statements
- Hook usage
- Error handling
- Loading states

### Key Changes in v5
- Breaking changes from v4
- New features
- Migration notes

### Best Practices
- Query key patterns
- Stale time configuration
- Error boundary implementation

### References
- Official docs URL
- Migration guide URL
```

---

## ClickUp MCP Agents

### Example: Task Coordinator (Lightweight CRUD Operations)

**File:** `.claude/agents/configs/task-coordinator.json`

**Key Features:**
- Haiku model for lightweight operations
- Delegates strategic planning to product-manager
- Artifacts for bulk task operations
- Efficient batch processing for rate limits

**Tools Available:**
- `clickup_create_task`
- `clickup_update_task`
- `clickup_assign_task`
- `clickup_add_comment`
- `clickup_set_priority`

**Example Output:**

```markdown
## Task Operations: Bug Fixes Created

**Operation:** CREATE
**Tasks Created:** 5
**Status:** ✓ Success

### Created Tasks

| Task ID | Title | Priority | Assignee | Due Date |
|---------|-------|----------|----------|----------|
| #CU-8fx2m | Fix login timeout | High | @john | 2025-01-15 |
| #CU-8fx2n | Update password validation | Medium | @sarah | 2025-01-16 |

### Summary
- **Total tasks:** 5
- **High priority:** 1
- **Medium priority:** 2
- **Low priority:** 2

### Task URLs
View all: https://app.clickup.com/12345/v/li/bug-fixes-sprint-12

### Next Actions
- [ ] Review high-priority task with assignee
- [ ] Update sprint board
```

---

## Tool-Based Markdown Agents

### Example: Security Scanner Structure

**File:** `.claude/agents/security-scanner.md`

**Key Elements:**
- Markdown agent with YAML frontmatter
- Uses fast tools: Read, Grep, Glob, LS
- Sonnet model for complex security analysis
- Returns structured JSON findings

**Example Output:**

```markdown
## Security Scan Results

**Files Scanned:** 247
**Scan Duration:** 3.2 seconds

### Severity Summary
- 🔴 **Critical:** 2
- 🟠 **High:** 5
- 🟡 **Medium:** 8
- 🟢 **Low:** 3

### Critical Issues

#### SEC-001: SQL Injection in User Query
**File:** `src/database/queries.ts:42`
**Severity:** 🔴 Critical
**CWE:** CWE-89

**Vulnerable Pattern:**
String concatenation in SQL query with user input

**Impact:** Arbitrary SQL execution risk

**Remediation:** Use parameterized queries with placeholders

---

#### SEC-002: Hardcoded API Key
**File:** `src/services/payment.ts:15`
**Severity:** 🔴 Critical
**CWE:** CWE-798

**Issue:** API key visible in source code

**Remediation:** Use environment variables

### Recommendations
- [ ] **Immediate:** Fix critical SQL injection
- [ ] **Immediate:** Remove hardcoded credentials
- [ ] **This sprint:** Add security linting to CI/CD
```

---

## Response Format Examples

### Standard Response Template

Every agent should return responses following this structure:

```markdown
## Summary
[2-3 sentence executive summary of what was accomplished]

## Key Findings
- Finding 1 with file reference (src/file.ts:42)
- Finding 2 with file reference (lib/helper.ts:108)

## [Type-Specific Section]
### For Code Changes:
**Files Modified:**
- `src/component.tsx:25-40` - Added validation logic
- `src/types.ts:15` - Updated interface

### For Test Results:
**Test Status:** ✓ PASSED / ✗ FAILED
**Coverage:** 85% (target: 80%)

### For Database Changes:
**Migration:** File path
**Tables Affected:** List of tables
**Breaking Changes:** None / Description

## Actions Taken
1. [Specific action performed]
2. [Another action performed]

## Recommendations
- [ ] Next step for user or delegating agent
- [ ] Optional follow-up task

## References
- `src/file.ts:42` - Function that handles X
- `docs/architecture.md` - Related architectural decisions
```

### Handoff Data (Optional)

For agent-to-agent communication, include structured JSON:

```json
{
  "next_agent": "test-automator",
  "files_to_test": ["src/component.tsx"],
  "test_type": "unit",
  "priority": "high"
}
```

---

## Key Patterns to Follow

### 1. File References
Always use `path:line` format:
- ✓ `src/components/Button.tsx:42`
- ✗ `Button component, line 42`

### 2. Status Indicators
Use visual indicators:
- ✓ Success
- ✗ Failure
- ⚠️ Warning
- ℹ️ Information

### 3. Action Items
Use checkboxes:
- [ ] Action to be taken
- [x] Completed action

### 4. Tables for Structured Data
Use Markdown tables for clarity

### 5. Code Blocks
Use syntax highlighting with language tags

---

## Template Checklist

When creating new agents, ensure:
- [ ] Description includes PROACTIVE keywords in CAPITALS
- [ ] All sensitive data uses ${ENV_VAR} format
- [ ] Workflow section with explicit tool names
- [ ] mcp_tools_available array (if using MCP)
- [ ] response_format configured with max_tokens
- [ ] Output follows Markdown structure template
- [ ] File references use path:line format

---

**Last Updated:** 2025-01-12
**Version:** 1.0
**Maintainer:** meta-agent
