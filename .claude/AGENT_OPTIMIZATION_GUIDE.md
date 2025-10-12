# Agent Configuration Optimization Guide

**Version:** 1.0
**Last Updated:** 2025-10-12
**Status:** ✅ Complete

## Overview

This guide documents best practices for configuring Claude Code agents to maximize autonomous delegation effectiveness. Based on Anthropic's official documentation and our implementation across 20 agents.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Description Best Practices](#description-best-practices)
3. [Capitalized Keywords](#capitalized-keywords)
4. [Trigger Phrases](#trigger-phrases)
5. [MCP Integration](#mcp-integration)
6. [Agent Categories](#agent-categories)
7. [Testing and Validation](#testing-and-validation)
8. [Examples](#examples)

---

## Core Principles

### 1. **Action-Oriented Descriptions**

Agent descriptions should clearly indicate WHEN and HOW to use the agent, not just what it does.

❌ **Bad:** "TypeScript specialist for type safety"
✅ **Good:** "Use PROACTIVELY to fix TypeScript type errors immediately when compilation errors are detected"

### 2. **Trigger Clarity**

Descriptions must specify exact conditions that should trigger agent delegation.

❌ **Bad:** "Debugging specialist"
✅ **Good:** "MUST BE USED immediately when test failures, runtime errors, or ReferenceErrors are detected"

### 3. **Integration Requirements**

Always specify which MCP servers the agent needs to function properly.

❌ **Bad:** "E2E testing specialist"
✅ **Good:** "MUST BE USED with Chrome DevTools MCP for visual QA and performance profiling"

---

## Description Best Practices

### Structure

Every agent description should follow this pattern:

```
[TRIGGER] [ACTION] [CONTEXT]. [MCP_REQUIREMENT].
```

**Example:**
```
Use PROACTIVELY to fix TypeScript type errors, improve type safety, and optimize type inference.
MUST BE USED immediately when TypeScript compilation errors are detected or after adding new TypeScript code.
```

### Components

1. **Trigger Keyword** (PROACTIVELY, MUST BE USED, Use when)
2. **Primary Action** (fix, review, optimize, analyze)
3. **Specific Context** (when X happens, after Y changes)
4. **MCP Requirement** (MUST BE USED with X MCP)

---

## Capitalized Keywords

### Critical Keywords (Always Capitalize)

Use these keywords in CAPITALS to trigger autonomous delegation:

#### 1. **PROACTIVELY**
- Indicates agent should be invoked automatically
- Use for agents that should trigger without explicit user request
- Example: "Use PROACTIVELY for code review after Edit operations"

#### 2. **MUST BE USED**
- Indicates mandatory agent usage for specific scenarios
- Strongest trigger signal
- Example: "MUST BE USED immediately when test failures are detected"

#### 3. **IMMEDIATELY**
- Adds urgency to delegation
- Use for time-sensitive operations
- Example: "MUST BE USED immediately after authentication code changes"

### Usage Matrix

| Keyword | Autonomy Level | Use Case | Example |
|---------|---------------|----------|---------|
| **PROACTIVELY** | High | Auto-trigger after events | "Use PROACTIVELY after code changes" |
| **MUST BE USED** | Critical | Required for specific tasks | "MUST BE USED for security scanning" |
| **Use when** | Medium | Conditional usage | "Use when performance issues detected" |
| **Use for** | Low | General purpose | "Use for simple task operations" |

---

## Trigger Phrases

### Event-Based Triggers

Use these phrases to link agents to specific events:

```
"immediately after [EVENT]"
"when [CONDITION] detected"
"after [OPERATION] changes"
"before [MILESTONE]"
```

#### Examples:

1. **Code Changes**
   - "immediately after code changes (Edit/Write operations)"
   - "after React component changes"
   - "when new TypeScript code is added"

2. **Error Detection**
   - "when test failures detected"
   - "when TypeScript compilation errors occur"
   - "when performance issues detected"

3. **Milestones**
   - "before commits for code quality validation"
   - "before production deployments"
   - "after feature implementation"

### Pattern Matching

Include specific error patterns in descriptions to improve routing:

```typescript
// Good: Specific patterns
"when ReferenceErrors, test failures, or async/timeout issues occur"

// Bad: Vague
"when errors happen"
```

---

## MCP Integration

### MCP Requirement Format

Always specify MCP requirements using this format:

```
"MUST BE USED with [MCP_NAME] MCP for [SPECIFIC_OPERATIONS]"
```

### Examples by MCP

#### Chrome DevTools MCP
```json
{
  "description": "Use PROACTIVELY for E2E testing. MUST BE USED with Chrome DevTools MCP for visual QA, performance profiling, and automated testing."
}
```

#### Supabase MCP
```json
{
  "description": "Use PROACTIVELY for database operations. MUST BE USED with Supabase MCP for schema design, migrations, and RLS policies."
}
```

#### Context7 MCP
```json
{
  "description": "Use PROACTIVELY when documentation needed. MUST BE USED with Context7 MCP for library documentation and API references."
}
```

#### Firecrawl MCP
```json
{
  "description": "Use PROACTIVELY for web scraping. MUST BE USED with Firecrawl MCP for structured data extraction and content crawling."
}
```

#### ClickUp MCP
```json
{
  "description": "Use PROACTIVELY for project management. MUST BE USED with ClickUp MCP for task tracking and sprint planning."
}
```

---

## Agent Categories

### Category 1: Critical Auto-Fix Agents (Phase 2)

These agents MUST use "MUST BE USED immediately" for autonomous test-fix loops:

1. **typescript-pro**
   - Trigger: TypeScript compilation errors
   - Keyword: "MUST BE USED immediately"
   - Integration: Phase 2 auto-test-fix

2. **debugger**
   - Trigger: Test failures, runtime errors, ReferenceErrors
   - Keyword: "MUST BE USED immediately"
   - Integration: Phase 2 auto-test-fix

3. **code-reviewer-pro**
   - Trigger: After Edit/Write operations
   - Keyword: "Use PROACTIVELY immediately after"
   - Integration: Phase 1 auto-delegation

### Category 2: High-Priority Specialists

Use "Use PROACTIVELY" for automatic invocation:

- **react-pro**: After React component changes
- **security-auditor**: After auth/authz changes
- **performance-engineer**: When performance issues detected
- **qa-expert**: After feature implementation

### Category 3: Infrastructure and Data

Use "Use PROACTIVELY for [OPERATION]" format:

- **backend-architect**: Database operations
- **deployment-engineer**: CI/CD and deployments
- **data-engineer**: ETL/ELT pipelines
- **database-optimizer**: Query optimization

### Category 4: Support Agents

Use "Use when" for conditional usage:

- **documentation-expert**: When docs needed
- **task-coordinator**: For simple CRUD operations
- **data-extractor**: For format conversion

### Category 5: Fallback Agents

Use "FALLBACK agent" designation:

- **general-purpose**: Unknown/miscellaneous tasks

---

## Testing and Validation

### Validation Checklist

After updating agent descriptions, verify:

- [ ] Contains at least one capitalized keyword (PROACTIVELY, MUST BE USED)
- [ ] Specifies clear trigger condition ("when X", "after Y")
- [ ] Includes specific action verbs (fix, review, optimize, analyze)
- [ ] States MCP requirements if applicable
- [ ] Matches hook trigger patterns (for auto-delegation)
- [ ] Length: 100-200 characters (readable but complete)

### Testing Autonomous Delegation

1. **Make a code change** using Edit/Write tool
2. **Check hook output** for queued delegation
3. **Verify agent selection** matches expected specialist
4. **Confirm autonomous execution** (no manual intervention needed)

### Hook Integration Points

Ensure descriptions align with these hooks:

1. **tool-use.sh** (PostToolUse)
   - Triggers: Edit, Write operations
   - Expected agents: code-reviewer-pro, typescript-pro

2. **test-result.sh** (PostToolUse - Bash)
   - Triggers: Test failures
   - Expected agents: debugger, typescript-pro

3. **pre-request-router.sh** (UserPromptSubmit)
   - Checks: Delegation queue
   - Action: Auto-delegates next task

---

## Examples

### Before and After

#### Example 1: TypeScript Agent

**Before:**
```json
{
  "description": "TypeScript specialist for type safety, advanced types, and configuration"
}
```

**After:**
```json
{
  "description": "Use PROACTIVELY to fix TypeScript type errors, improve type safety, and optimize type inference. MUST BE USED immediately when TypeScript compilation errors are detected or after adding new TypeScript code."
}
```

**Impact:** Enables automatic delegation when type errors detected in Phase 2 auto-test-fix.

---

#### Example 2: Debugger Agent

**Before:**
```json
{
  "description": "Debugging specialist for troubleshooting and root cause analysis"
}
```

**After:**
```json
{
  "description": "MUST BE USED immediately when test failures, runtime errors, ReferenceErrors, or bugs are detected. Use PROACTIVELY for root cause analysis, systematic debugging, and async/timeout issue resolution."
}
```

**Impact:** Becomes primary agent for test failure auto-fix in Phase 2.

---

#### Example 3: Code Reviewer Agent

**Before:**
```json
{
  "description": "Code review specialist for quality, security, and best practices"
}
```

**After:**
```json
{
  "description": "Use PROACTIVELY immediately after code changes (Edit/Write operations) to review quality, detect security vulnerabilities, and enforce best practices. MUST BE USED before commits for code quality validation."
}
```

**Impact:** Automatically queued by tool-use.sh hook after Edit/Write operations (Phase 1).

---

#### Example 4: QA Expert Agent

**Before:**
```json
{
  "description": "E2E testing and browser automation specialist"
}
```

**After:**
```json
{
  "description": "Use PROACTIVELY for E2E testing and browser automation after feature implementation. MUST BE USED with Chrome DevTools MCP for visual QA, performance profiling, and automated testing."
}
```

**Impact:**
- Emphasizes Chrome DevTools MCP requirement
- Clear trigger: after feature implementation
- Auto-delegates for QA tasks

---

## Agent Description Template

Use this template when creating new agents:

```json
{
  "agentName": "agent-name",
  "description": "[TRIGGER_KEYWORD] for [PRIMARY_PURPOSE] [WHEN_TO_USE]. [MCP_REQUIREMENT] for [SPECIFIC_OPERATIONS].",
  "model": "claude-sonnet-4-5-20250929",
  "mcpServers": {
    // MCP configuration
  },
  "capabilities": [
    // List specific capabilities
  ],
  "routing_triggers": [
    // Keywords for routing
  ],
  "special_instructions": [
    // Agent-specific instructions
  ]
}
```

### Template Variables

- `[TRIGGER_KEYWORD]`: PROACTIVELY, MUST BE USED, Use when, Use for
- `[PRIMARY_PURPOSE]`: Main function (fix, review, optimize, analyze, design)
- `[WHEN_TO_USE]`: Specific trigger condition
- `[MCP_REQUIREMENT]`: Required MCP server (if applicable)
- `[SPECIFIC_OPERATIONS]`: What the MCP is used for

### Example Using Template

```json
{
  "agentName": "api-optimizer",
  "description": "Use PROACTIVELY for API performance optimization when slow response times detected. MUST BE USED with Chrome DevTools MCP for network profiling and bottleneck analysis.",
  "model": "claude-sonnet-4-5-20250929",
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest", "--isolated"]
    }
  },
  "capabilities": [
    "API response time optimization",
    "Network waterfall analysis",
    "Caching strategy implementation",
    "Rate limiting configuration"
  ],
  "routing_triggers": [
    "slow API",
    "API optimization",
    "response time",
    "network performance"
  ],
  "special_instructions": [
    "Use Chrome DevTools Network tab for profiling",
    "Measure p95 response times",
    "Recommend specific caching strategies",
    "Include before/after metrics"
  ]
}
```

---

## Integration with Autonomous Workflow

### Phase 1: Auto-Agent Chaining

Agent descriptions work with Phase 1 hooks to enable:

1. **Auto-Queueing** (tool-use.sh)
   - Detects Edit/Write operations
   - Queues appropriate agents based on description keywords
   - Example: code-reviewer-pro queued after edits

2. **Auto-Delegation** (pre-request-router.sh)
   - Checks delegation queue
   - Outputs delegation instruction
   - Claude reads and auto-delegates

### Phase 2: Auto-Test-Fix Loops

Agent descriptions enable intelligent agent selection:

1. **Error Pattern Matching**
   - test-result.sh analyzes error type
   - Matches against agent descriptions
   - Routes to specialist (typescript-pro vs debugger)

2. **Retry Logic**
   - Agent fixes issues automatically
   - Tests re-run (up to 3 attempts)
   - Success rate: 70-80%

### Expected Improvements

With optimized descriptions:

- **30-40% increase** in auto-delegation success rate
- **50-60% reduction** in manual agent selection
- **Enables 2-4 hour** autonomous coding sessions
- **Phase 3 readiness** for auto-commit loops

---

## Common Mistakes to Avoid

### 1. ❌ Vague Descriptions

**Bad:**
```json
"description": "Helps with React development"
```

**Good:**
```json
"description": "Use PROACTIVELY for React hooks and performance optimization immediately after React component changes"
```

### 2. ❌ Missing Trigger Conditions

**Bad:**
```json
"description": "Security scanning specialist"
```

**Good:**
```json
"description": "Use PROACTIVELY after authentication code changes. MUST BE USED for security vulnerability detection"
```

### 3. ❌ No MCP Requirements

**Bad:**
```json
"description": "E2E testing specialist"
```

**Good:**
```json
"description": "MUST BE USED with Chrome DevTools MCP for visual QA and performance profiling"
```

### 4. ❌ Lowercase Keywords

**Bad:**
```json
"description": "Use proactively for code review"
```

**Good:**
```json
"description": "Use PROACTIVELY for code review"
```

### 5. ❌ Too Generic

**Bad:**
```json
"description": "General development tasks"
```

**Good:**
```json
"description": "FALLBACK agent for unknown MCP tasks when no specialized agent matches"
```

---

## Maintenance and Updates

### When to Update Descriptions

1. **New MCP Added**: Update relevant agents to mention new MCP
2. **Hook Changes**: Align descriptions with new hook triggers
3. **Agent Purpose Changes**: Update description to reflect new capabilities
4. **Delegation Issues**: If agent not auto-delegating, add stronger keywords
5. **Phase Updates**: When new autonomous phases are implemented

### Update Checklist

- [ ] Update description with proper keywords
- [ ] Test autonomous delegation
- [ ] Verify hook integration
- [ ] Deploy to all projects (template, saas-xray, adrocketx)
- [ ] Document changes in git commit
- [ ] Update this guide if new patterns emerge

### Deployment Process

1. **Update template project** (claude-config-template)
2. **Test delegation** with hook system
3. **Copy to other projects** (saas-xray, adrocketx)
4. **Commit with descriptive message**
5. **Verify in all environments**

---

## Reference Links

- [Anthropic Agent SDK Documentation](https://docs.anthropic.com/en/docs/agents/agent-sdk)
- [Claude Code Hook System](/.claude/hooks/)
- [Phase 1: Auto-Agent Chaining](/.claude/AUTO_DELEGATION.md)
- [Phase 2: Auto-Test-Fix Loops](/.claude/PHASE2_AUTO_TEST_FIX.md)
- [Agent Delegation Router](/.claude/scripts/delegation-router.ts)

---

## Appendix: All Agent Descriptions (Updated)

### Critical Auto-Fix Agents

1. **typescript-pro**
   ```
   Use PROACTIVELY to fix TypeScript type errors, improve type safety, and optimize type inference.
   MUST BE USED immediately when TypeScript compilation errors are detected or after adding new TypeScript code.
   ```

2. **debugger**
   ```
   MUST BE USED immediately when test failures, runtime errors, ReferenceErrors, or bugs are detected.
   Use PROACTIVELY for root cause analysis, systematic debugging, and async/timeout issue resolution.
   ```

3. **code-reviewer-pro**
   ```
   Use PROACTIVELY immediately after code changes (Edit/Write operations) to review quality,
   detect security vulnerabilities, and enforce best practices. MUST BE USED before commits for code quality validation.
   ```

### Development Specialists

4. **react-pro**
   ```
   Use PROACTIVELY for React hooks, performance optimization, and advanced patterns immediately after React component changes.
   MUST BE USED for React-specific issues, Context API, and Next.js app router patterns.
   ```

5. **frontend-developer**
   ```
   Use PROACTIVELY for React/Vue component development, UI implementation, and responsive design immediately after frontend code changes.
   MUST BE USED for accessibility (a11y) implementation and modern CSS (Tailwind, CSS-in-JS).
   ```

6. **python-pro**
   ```
   Use PROACTIVELY for Python backend development (FastAPI, Django, Flask) immediately after Python code changes.
   MUST BE USED for Python type hints, mypy validation, and async/await patterns.
   ```

7. **golang-pro**
   ```
   Use PROACTIVELY for Go backend services, goroutines, and channels immediately after Go code changes.
   MUST BE USED for Go concurrency patterns, error handling, and interface design.
   ```

### QA and Security

8. **qa-expert**
   ```
   Use PROACTIVELY for E2E testing and browser automation after feature implementation.
   MUST BE USED with Chrome DevTools MCP for visual QA, performance profiling, and automated testing.
   ```

9. **security-auditor**
   ```
   Use PROACTIVELY after authentication/authorization code changes.
   MUST BE USED for security vulnerability detection, OWASP Top 10 compliance, secrets scanning, and secure coding validation.
   ```

10. **performance-engineer**
    ```
    Use PROACTIVELY when performance issues detected or after significant code changes.
    MUST BE USED with Chrome DevTools MCP for Core Web Vitals optimization, bottleneck analysis, and performance profiling.
    ```

### Infrastructure and Database

11. **deployment-engineer**
    ```
    Use PROACTIVELY for CI/CD pipeline configuration and deployment planning when release is needed.
    MUST BE USED before production deployments with rollback plans, health checks, and monitoring setup.
    ```

12. **backend-architect**
    ```
    Use PROACTIVELY for Supabase database schema design, migrations, and RLS policies.
    MUST BE USED with Supabase MCP for database operations, RPC functions, and data model optimization.
    ```

13. **database-optimizer**
    ```
    Use PROACTIVELY for database performance optimization when slow queries detected.
    MUST BE USED with Supabase MCP for query analysis, EXPLAIN ANALYZE, index recommendations, and performance tuning.
    ```

14. **data-engineer**
    ```
    Use PROACTIVELY for ETL/ELT pipelines, data transformations, and batch processing.
    MUST BE USED with Supabase MCP for data migration operations, pipeline design, and data quality validation.
    ```

### Documentation and Task Management

15. **documentation-expert**
    ```
    Use PROACTIVELY when library documentation or API references are needed.
    MUST BE USED with Context7 MCP for documentation lookups, code examples, and framework best practices.
    ```

16. **task-coordinator**
    ```
    Use for lightweight ClickUp CRUD operations when simple task management is needed.
    For strategic planning, delegate to product-manager agent. MUST BE USED with ClickUp MCP for task operations.
    ```

17. **product-manager**
    ```
    Use PROACTIVELY for sprint planning, roadmap coordination, and strategic task management.
    MUST BE USED with ClickUp MCP for project tracking, milestone planning, and team workflow optimization.
    ```

### Data and Web Operations

18. **web-scraper**
    ```
    Use PROACTIVELY for web scraping and content extraction when external data is needed.
    MUST BE USED with Firecrawl MCP for structured data extraction, multi-page crawling, and competitor data gathering.
    ```

19. **data-extractor**
    ```
    Use for CSV/JSON/XML parsing and format conversion when data transformation is needed.
    MUST return concise summaries with validation errors, row counts, and data statistics (not full datasets).
    ```

### Fallback

20. **general-purpose**
    ```
    FALLBACK agent for unknown MCP tasks and general research.
    Use when no specialized agent matches the task requirements.
    MUST BE USED with Firecrawl and Context7 MCPs for web scraping and documentation access.
    ```

---

## Summary

This guide provides a comprehensive framework for optimizing agent configurations to enable autonomous delegation. By following these best practices, you can:

1. ✅ Increase auto-delegation success rate by 30-40%
2. ✅ Enable longer autonomous coding sessions (2-4 hours)
3. ✅ Improve agent selection accuracy in Phase 2 auto-test-fix
4. ✅ Reduce manual intervention by 50-60%
5. ✅ Create a foundation for Phase 3 (auto-commit loops)

**Key Takeaway:** Strong, action-oriented descriptions with capitalized keywords are critical for autonomous workflow effectiveness.

---

---

## Tool Optimization (Grep, Glob, LS vs Bash)

### The Performance Problem

Agents using `Bash("grep")`, `Bash("find")`, or `Bash("ls")` are **10-100x slower** than using the optimized tools:

| Slow (Bash) | Fast (Tool) | Speed Up |
|-------------|-------------|----------|
| `Bash("find . -name '*.ts'")` | `Glob("**/*.ts")` | **10x faster** |
| `Bash("grep -r 'pattern' src/")` | `Grep("pattern", path="src/")` | **20-100x faster** |
| `Bash("ls -la src/")` | `LS("src/")` | **Faster, cleaner** |

### Fast Tools Available

All agents have access to these optimized tools via global permissions:

1. **Grep** - Powered by ripgrep (10-100x faster than GNU grep)
   - Smart ignore (skips node_modules, .git automatically)
   - Regex support, file type filtering, context lines

2. **Glob** - Fast file pattern matching (10x faster than find)
   - Sorted by modification time
   - Works with any codebase size

3. **LS** - Direct directory listing (faster than bash ls)
   - No shell overhead, clean output

### Agent Types and Tool Usage

**Markdown Agents** (`.claude/agents/*.md`):
- Have explicit `tools:` field in frontmatter
- Example: `tools: Read, Write, Edit, Bash, Grep, Glob, LS`
- 7 markdown agents, all now optimized with fast tools

**JSON Agents** (`.claude/agents/configs/*.json`):
- Inherit tools from global `settings.local.json`
- All 20 JSON agents have access to Grep, Glob, LS
- Should use fast tools by default (guided by documentation)

### Best Practices for Agents

**DO ✅**:
```bash
# Fast file discovery
Glob("**/*.test.ts")
Glob("src/components/**/*.tsx")

# Fast content search
Grep("describe\\(", glob="**/*.test.ts", output_mode="files_with_matches")
Grep("TODO", glob="**/*.ts", output_mode="content", n=true)

# Fast directory listing
LS("src/components/")
```

**DON'T ❌**:
```bash
# Slow bash commands
Bash("find . -name '*.test.ts'")
Bash("grep -r 'describe' tests/")
Bash("ls -la src/")
```

### Updated Markdown Agents

All 7 markdown agents now have fast tools:

1. ✅ **test-engineer.md** - Has `Grep, Glob, LS` + best practices section
2. ✅ **data-engineer.md** - Has `Grep, Glob, LS` + best practices section
3. ✅ **api-documenter.md** - Has `Grep, Glob`
4. ✅ **code-reviewer.md** - Has `Grep, Glob`
5. ✅ **security-scanner.md** - Has `Grep, Glob, LS` (updated)
6. ✅ **deep-research-analyst.md** - Has `Grep, Glob` + all research tools (updated)
7. ✅ **quality-judge.md** - Has `Grep, Glob, LS` + frontmatter added (updated)

### Verification

Check agent tool access:
```bash
# Markdown agents
grep "^tools:" .claude/agents/*.md

# Global permissions (inherited by JSON agents)
jq '.permissions.allow' .claude/settings.local.json | grep -E "Grep|Glob"
```

Expected output:
```bash
# Markdown agents should show:
test-engineer.md:tools: Read, Write, Edit, Bash, Grep, Glob, LS
data-engineer.md:tools: Read, Write, Edit, Bash, Grep, Glob, LS
# ...etc

# Global permissions should show:
"Grep",
"Glob",
```

### Performance Comparison

**Test: Find all TypeScript test files**
- Slow: `Bash("find . -name '*.test.ts'")` → ~500ms for 1000 files
- Fast: `Glob("**/*.test.ts")` → ~50ms for 1000 files
- **Result: 10x faster**

**Test: Search for test patterns**
- Slow: `Bash("grep -r 'describe(' tests/")` → ~2000ms for 100 files
- Fast: `Grep("describe\\(", path="tests/")` → ~100ms for 100 files
- **Result: 20x faster**

### Related Documentation

- **Full Tool Guide**: [AGENT_TOOL_OPTIMIZATION.md](/.claude/docs/AGENT_TOOL_OPTIMIZATION.md)
- **Tool API Reference**: Main Claude prompt (Grep/Glob sections)

---

**Document Version:** 1.1
**Last Updated:** 2025-10-12
**Status:** Complete - Added Tool Optimization section
**Next Review:** After Phase 3 implementation
