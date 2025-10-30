# Singura Skills Catalog

This catalog documents all available skills for extending Claude's capabilities within the Singura project. Skills provide procedural knowledge and workflows, while sub-agents handle complex implementation work.

## 📋 Quick Reference: Skills vs Agents

| Need | Use Skill | Then Use Agent |
|------|-----------|----------------|
| Integrate external API | mcp-builder (scaffold server) | backend-architect (implement endpoints) |
| Create new skill | skill-creator (generate structure) | N/A (skills are documentation) |
| Test web application | webapp-testing (Playwright guidance) | qa-expert (write test suites) |
| OAuth integration | skill-creator (oauth template) | oauth-integration-specialist (implement) |

**Rule of Thumb**:
- **Skill** = "How to do X" (procedural knowledge, templates, patterns)
- **Agent** = "Do X" (actual implementation, multi-file changes, complex reasoning)

---

## Meta Skills (Skill Creation & Management)

### skill-creator
**Location**: `.claude/skills/skill-creator/`  
**Description**: Guide for creating effective skills that extend Claude's capabilities with specialized knowledge, workflows, or tool integrations.

**Triggers**: 
- "create skill"
- "new skill"
- "skill template"

**Use Cases**:
- Creating OAuth integration skills
- Building testing workflow skills
- Developing security audit skills
- Generating Singura-specific domain skills

**Key Features**:
- Progressive disclosure pattern (metadata → instructions → resources)
- Template library for common patterns
- Validation workflows
- Documentation generation

**Example Usage**:
```
User: "Create a skill for API integration patterns"
Claude: *loads skill-creator*
Claude: *generates skill with OAuth templates, rate limiting, error handling*
```

---

## Technical Skills (Development & Integration)

### mcp-builder
**Location**: `.claude/skills/mcp-builder/`  
**Description**: Guide for creating high-quality MCP (Model Context Protocol) servers that enable Claude to interact with external services through well-designed tools.

**Triggers**:
- "create MCP server"
- "integrate API"
- "build MCP"
- "connect [service name]"

**Use Cases**:
- Integrating Supabase for database operations
- Connecting ClickUp for task management
- Adding monitoring APIs (DataDog, Sentry)
- Building OAuth-enabled service integrations

**Key Features**:
- Four-phase development process (Research → Implementation → Review → Integration)
- TypeScript strict mode patterns
- Zod validation schemas
- Singura security standards
- Example implementations (Supabase, ClickUp)

**Example Usage**:
```
User: "I need to integrate Supabase for database queries"
Claude: *loads mcp-builder*
Claude: *provides TypeScript scaffold with RLS patterns, Zod schemas, tool registration*
User: *delegates to backend-architect to implement the actual server code*
```

**Singura-Specific Patterns**:
- Multi-tenant data isolation
- Organization-scoped operations
- Environment variable management
- Integration with mcp.json
- Character limiting (100K max response)

### webapp-testing
**Location**: `.claude/skills/webapp-testing/`  
**Description**: Toolkit for interacting with and testing local web applications using Playwright, supporting frontend functionality verification, UI debugging, and performance profiling.

**Triggers**:
- "test webapp"
- "browser testing"
- "E2E test"
- "Playwright"

**Use Cases**:
- Verifying frontend functionality
- Debugging UI behavior  
- Capturing browser screenshots
- Viewing browser logs
- Performance profiling

**Key Features**:
- Chrome DevTools MCP integration
- Screenshot capture on failure
- Network request inspection
- Console message monitoring

**Example Usage**:
```
User: "Test the dashboard login flow"
Claude: *loads webapp-testing*
Claude: *provides Playwright test structure*
User: *delegates to qa-expert to implement test suite*
```

---

## Skills by Category

### 🔐 Security & Authentication
- **skill-creator** (OAuth template): Patterns for OAuth 2.0 integration
- **mcp-builder**: Secure API key management in MCP servers

### 🗄️ Database & Data
- **mcp-builder** (Supabase template): RLS policies, migrations, queries

### 🔄 Integration & APIs
- **mcp-builder**: External service integration (ClickUp, monitoring tools)

### 🧪 Testing & QA
- **webapp-testing**: Playwright-based E2E testing
- **skill-creator** (testing template): Jest patterns, coverage requirements

### 📦 Meta & Development
- **skill-creator**: Skill development and management

---

## Skill Management Workflows

### Creating a New Skill

1. **Use skill-creator**:
   ```
   "Create a skill for [domain/task]"
   ```

2. **Choose template** (if applicable):
   - API integration
   - Testing workflow
   - Security audit
   - Custom (no template)

3. **Validate skill**:
   ```bash
   scripts/validate-skill.sh .claude/skills/[skill-name]
   ```

4. **Add to catalog**: Update this README with new skill details

5. **Document usage**: Add triggers, use cases, examples

### Creating a New MCP Server

1. **Use mcp-builder**:
   ```
   "Create MCP server for [service]"
   ```

2. **Follow four-phase process**:
   - Phase 1: Research API docs, plan tools
   - Phase 2: Implement with TypeScript strict mode
   - Phase 3: Review code quality, security
   - Phase 4: Add to mcp.json, test integration

3. **Delegate implementation**: 
   ```
   "backend-architect: implement this MCP server scaffold"
   ```

4. **Test server**:
   ```bash
   cd mcp-servers/[service]
   npm run build
   echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | node dist/index.js
   ```

5. **Update mcp.json**:
   ```json
   {
     "mcpServers": {
       "service-name": {
         "description": "...",
         "command": "node",
         "args": ["./mcp-servers/service/dist/index.js"],
         "env": { "API_KEY": "${SERVICE_API_KEY}" }
       }
     }
   }
   ```

---

## MCP Server Library

### Active MCP Servers

#### chrome-devtools
**Status**: ✅ Active  
**Location**: External (npx)  
**Purpose**: Browser automation, testing, debugging  
**Tools**: navigate, click, screenshot, evaluate, console, network  
**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "chrome-devtools-mcp@latest", "--isolated"]
}
```

### Planned MCP Servers

#### supabase (Phase 2)
**Status**: 📋 Planned  
**Purpose**: Database operations, migrations, RLS testing  
**Tools**: query_database, create_migration, test_rls_policy, list_tables

#### clickup (Phase 2)
**Status**: 📋 Planned  
**Purpose**: Task management, project tracking  
**Tools**: create_task, update_task_status, list_tasks, add_comment

---

## Skill Development Guidelines

### When to Create a Skill

Create a skill when:
- ✅ Pattern repeats across multiple tasks
- ✅ Domain knowledge needs preservation
- ✅ Procedural workflow is well-defined
- ✅ Progressive disclosure reduces context usage
- ✅ Team needs shared reference material

Do NOT create a skill when:
- ❌ Task requires complex reasoning (use agent instead)
- ❌ Pattern only used once
- ❌ Implementation is simpler than documentation
- ❌ Existing skill or agent already covers it

### Skill Quality Standards

Every skill must have:
- ✅ Valid YAML frontmatter (name, description)
- ✅ Clear triggers and use cases
- ✅ Concrete examples
- ✅ Integration with existing systems
- ✅ Passes validation script

### Singura-Specific Requirements

Skills must follow:
- ✅ TypeScript strict mode patterns
- ✅ OAuth 2.0 security standards
- ✅ Multi-tenant architecture principles
- ✅ Repository pattern where applicable
- ✅ Test-driven development workflows

---

## Troubleshooting

### Skill Not Loading
1. Check YAML frontmatter syntax
2. Verify name follows lowercase-hyphen convention
3. Run validation: `scripts/validate-skill.sh .claude/skills/[name]`
4. Ensure skill directory in `.claude/skills/`

### MCP Server Not Connecting
1. Verify mcp.json syntax
2. Check environment variables set
3. Test server independently: `echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | node dist/index.js`
4. Review logs for connection errors
5. Confirm stdio transport configured

### Skill vs Agent Confusion
- If generating code → use agent
- If providing guidance/patterns → use skill
- If both needed → skill first (guidance), then agent (implementation)

---

## Contributing New Skills

1. **Propose**: Create proposal in `openspec/changes/`
2. **Develop**: Use skill-creator to scaffold
3. **Validate**: Run validation scripts
4. **Document**: Update this catalog
5. **Review**: Team review for quality
6. **Merge**: Add to `.claude/skills/`

See `.claude/skills/skill-creator/` for detailed creation process.

---

## Additional Resources

- **OpenSpec**: `openspec/` - Change management workflows
- **Sub-Agents**: `.claude/agents/` - Specialized implementation agents
- **CLAUDE.md**: Root-level development guide
- **MCP Docs**: https://modelcontextprotocol.io/
- **Anthropic Skills**: https://github.com/anthropics/skills

---

**Last Updated**: 2025-10-30  
**Total Skills**: 3 (skill-creator, mcp-builder, webapp-testing)  
**Total MCP Servers**: 1 active, 2 planned
