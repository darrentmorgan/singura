# Design: Skills Infrastructure Architecture

## Overview

This design establishes a skills-based extensibility system for Singura that enables rapid integration of new capabilities through:
1. **Skills** - Procedural knowledge and workflows (meta-skills like skill-creator, technical skills like mcp-builder)
2. **MCP Servers** - Tool integrations for external APIs (Supabase, ClickUp, monitoring services)

## Architecture Decisions

### 1. Skills vs Sub-Agents Boundary

**Decision**: Skills handle **procedural knowledge** and **tool integration patterns**, while sub-agents handle **complex implementation work**.

**Rationale**:
- Skills provide context-efficient guidance through progressive disclosure (metadata → instructions → resources)
- Sub-agents perform actual coding, analysis, and multi-step workflows
- This separation prevents duplication and maintains clarity of responsibility

**Example**:
- ✅ **skill-creator** (skill): Teaches *how* to create skills with templates and validation
- ✅ **backend-architect** (agent): Actually *implements* database schemas and migrations
- ✅ **mcp-builder** (skill): Guides *how* to build MCP servers with best practices
- ✅ **api-middleware-specialist** (agent): Actually *writes* API endpoint code

**Decision Matrix**:
```
┌─────────────────────────────────────────────────────┐
│  Use SKILL when:                                    │
│  • Task requires procedural knowledge/workflow      │
│  • Output is guidance, not code                     │
│  • Same pattern repeats frequently                  │
│  • Progressive disclosure reduces context usage     │
│                                                      │
│  Use AGENT when:                                    │
│  • Task requires complex reasoning/analysis         │
│  • Output is code implementation                    │
│  • Multiple files/systems need coordination         │
│  • Specialized tools (MCP servers) needed           │
└─────────────────────────────────────────────────────┘
```

### 2. Skill Structure & Loading

**Decision**: Follow Anthropic's three-tier progressive disclosure pattern.

**Structure**:
```
.claude/skills/<skill-name>/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description)
│   └── Markdown instructions
├── scripts/ (optional)
│   └── *.py, *.sh - Executable helpers
├── references/ (optional)
│   └── *.md - Documentation loaded as needed
└── assets/ (optional)
    └── * - Templates, boilerplate used in output
```

**Loading Tiers**:
1. **Metadata** (~100 tokens): Always in context via system prompt
2. **SKILL.md body** (<5k tokens): Loaded when skill triggers
3. **Resources** (unlimited): Loaded only when Claude references them

**Rationale**: Minimizes context consumption while maintaining capability discoverability.

### 3. MCP Server Architecture

**Decision**: Use TypeScript MCP SDK with stdio transport for all Singura MCP servers.

**Standard Structure**:
```typescript
// server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new Server({
  name: "singura-<integration>-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Tool registration with Zod validation
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_database",
      description: "Execute Supabase query",
      inputSchema: zodToJsonSchema(QueryInputSchema)
    }
  ]
}));

// Tool execution with error handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const validated = QueryInputSchema.parse(request.params.arguments);
    const result = await executeQuery(validated);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});
```

**Rationale**:
- **TypeScript**: Type safety aligns with Singura's strict TypeScript standards
- **stdio transport**: Simplest, most reliable for local development
- **Zod validation**: Prevents invalid inputs from reaching external APIs
- **Structured errors**: Returns user-friendly errors without exposing secrets

### 4. mcp.json Configuration Management

**Decision**: Centralized mcp.json with validation and version tracking.

**Structure**:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "description": "Browser automation for testing",
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated"]
    },
    "supabase": {
      "description": "Supabase database client for RLS and migrations",
      "command": "node",
      "args": ["./mcp-servers/supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    },
    "clickup": {
      "description": "ClickUp API for task management",
      "command": "node",
      "args": ["./mcp-servers/clickup/dist/index.js"],
      "env": {
        "CLICKUP_API_KEY": "${CLICKUP_API_KEY}"
      }
    }
  }
}
```

**Validation Script** (`scripts/validate-mcp-config.sh`):
- Checks all referenced server paths exist
- Validates environment variables are documented
- Ensures no duplicate server names
- Tests server startup (dry-run mode)

**Rationale**: Prevents runtime errors from misconfigured MCP servers.

### 5. Skill Templates System

**Decision**: Template-based skill generation with Singura-specific patterns baked in.

**Templates**:
1. **api-integration-skill**: OAuth 2.0 patterns, rate limiting, error handling
2. **testing-workflow-skill**: Jest setup, coverage requirements, E2E patterns
3. **security-audit-skill**: OWASP checks, credential scanning, vulnerability detection

**Template Structure**:
```
.claude/skills/skill-creator/templates/
├── api-integration/
│   ├── SKILL.md.template
│   ├── references/
│   │   ├── oauth-patterns.md
│   │   └── rate-limiting.md
│   └── scripts/
│       └── validate-api-key.sh
├── testing-workflow/
│   └── ...
└── security-audit/
    └── ...
```

**Generation Process**:
1. User invokes skill-creator with template name
2. Skill-creator prompts for customization (API name, scopes, etc.)
3. Template files copied and placeholders replaced
4. Validation runs automatically
5. Skill added to catalog with metadata

### 6. Skill Validation & Quality

**Decision**: Multi-layer validation before skill deployment.

**Validation Layers**:
```bash
#!/bin/bash
# scripts/validate-skill.sh

SKILL_DIR=$1

# Layer 1: Structure validation
echo "Validating skill structure..."
[[ -f "$SKILL_DIR/SKILL.md" ]] || { echo "Missing SKILL.md"; exit 1; }

# Layer 2: YAML frontmatter validation
echo "Validating YAML frontmatter..."
python scripts/validate-yaml.py "$SKILL_DIR/SKILL.md"

# Layer 3: Naming conventions
echo "Validating naming conventions..."
SKILL_NAME=$(grep "^name:" "$SKILL_DIR/SKILL.md" | cut -d: -f2 | xargs)
[[ "$SKILL_NAME" =~ ^[a-z0-9-]+$ ]] || { echo "Invalid name format"; exit 1; }

# Layer 4: Description completeness
echo "Validating description..."
DESC=$(grep "^description:" "$SKILL_DIR/SKILL.md" | cut -d: -f2- | xargs)
[[ ${#DESC} -ge 20 && ${#DESC} -le 1024 ]] || { echo "Description length invalid"; exit 1; }

# Layer 5: Singura pattern checks
echo "Validating Singura patterns..."
if grep -q "OAuth" "$SKILL_DIR/SKILL.md"; then
  grep -q "RFC 6749" "$SKILL_DIR/SKILL.md" || echo "Warning: OAuth skill missing RFC reference"
fi

echo "✅ Skill validation passed"
```

**CI/CD Integration**:
- Validation runs on pre-commit hook
- Blocks merge if validation fails
- Generates skill documentation automatically

### 7. Skill Discovery & Documentation

**Decision**: Centralized skill catalog with metadata-driven discovery.

**Catalog Structure** (`.claude/skills/README.md`):
```markdown
# Singura Skills Catalog

## Meta Skills (Skill Creation)

### skill-creator
**Description**: Guide for creating effective skills that extend Claude's capabilities
**Triggers**: "create skill", "new skill", "skill template"
**Use Cases**: 
- Creating OAuth integration skills
- Building testing workflow skills
- Developing security audit skills

## Technical Skills (Development)

### mcp-builder
**Description**: Guide for creating high-quality MCP servers to integrate external APIs
**Triggers**: "create MCP server", "integrate API", "build MCP"
**Use Cases**:
- Integrating Supabase for database operations
- Connecting ClickUp for task management
- Adding monitoring APIs (DataDog, Sentry)

### webapp-testing
**Description**: Toolkit for testing local web applications using Playwright
**Triggers**: "test webapp", "browser testing", "E2E test"
**Use Cases**:
- Verifying frontend functionality
- Debugging UI behavior
- Performance profiling

## Integration Matrix

| Need | Use Skill | Then Use Agent |
|------|-----------|----------------|
| Integrate Supabase | mcp-builder → scaffold server | backend-architect → implement queries |
| Create OAuth flow | skill-creator (oauth template) | oauth-integration-specialist → implement |
| Add testing | skill-creator (testing template) | test-suite-manager → write tests |
```

## Trade-offs & Alternatives

### Alternative 1: Hard-coded integrations instead of MCP servers
**Rejected**: Less flexible, requires code changes for each integration, couples external services to codebase

### Alternative 2: Single "integration" skill instead of skill-creator + mcp-builder
**Rejected**: Violates single responsibility, creates confusion about scope

### Alternative 3: No validation, trust manual review
**Rejected**: Doesn't scale, allows errors to reach production

## Migration Strategy

### Phase 1: Soft Launch
- Enhance existing skill-creator
- Add mcp-builder alongside existing tools
- Run in parallel with current workflow

### Phase 2: Team Adoption
- Document 3+ real-world skill creation examples
- Train team on skill vs agent decision matrix
- Collect feedback and iterate

### Phase 3: Ecosystem Growth
- Continuously add skills as patterns emerge
- Deprecate redundant documentation in favor of skills
- Build MCP server library for common integrations

## Security Considerations

1. **MCP Server Sandboxing**: All MCP servers run in isolated Node processes
2. **Secret Management**: Environment variables only, never hardcoded
3. **Input Validation**: Zod schemas for all external inputs
4. **Audit Logging**: All MCP tool calls logged with user context
5. **Review Process**: Mandatory security review for new MCP servers

## Performance Implications

**Expected Impact**:
- Skills add <100 tokens to system prompt (metadata only)
- MCP servers add 50-200ms latency per external API call
- Skill loading on-demand prevents context bloat
- Net effect: Improved velocity outweighs minimal overhead

**Monitoring**:
- Track skill usage frequency
- Measure MCP server response times
- Monitor context window usage trends
