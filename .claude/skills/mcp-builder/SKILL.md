---
name: mcp-builder
description: Guide for creating high-quality MCP (Model Context Protocol) servers that enable Claude to interact with external services through well-designed tools. This skill should be used when integrating new external APIs or services into Singura (Supabase, ClickUp, monitoring tools, etc.).
---

# MCP Server Builder for Singura

This skill teaches how to create MCP servers that integrate external services into Singura following our TypeScript strict mode patterns and security standards.

## When to Use This Skill

Use mcp-builder when you need to:
- Integrate external APIs (Supabase, ClickUp, DataDog, Sentry)
- Create tools for database operations or monitoring
- Build OAuth-enabled service integrations
- Add new capabilities that require external service calls

**Do NOT use for**: Direct code implementation (delegate to backend-architect or api-middleware-specialist agents).

## Four-Phase MCP Development Process

### Phase 1: Research and Planning

**1. Review Target API Documentation**
- Study API authentication methods (OAuth 2.0, API keys)
- Identify core operations that map to user workflows
- Document rate limits and quota restrictions
- Note any special error codes or retry logic needed

**2. Design Agent-Centric Tools**
- **Build workflows, not API wrappers**: Consolidate related operations
- **Optimize for context**: Return high-signal information, not raw dumps
- **Natural task subdivision**: Match how humans think about the domain
- **Actionable errors**: Guide correct usage, not just report failures

**3. Plan Tool Structure**
```typescript
// Example: Supabase integration planning
Tools to create:
- query_database: Execute SQL queries with RLS
- create_migration: Generate migration files
- test_rls_policy: Validate row-level security

Shared utilities needed:
- Supabase client initialization
- Error formatting (prettify Postgres errors)
- Response truncation (CHARACTER_LIMIT = 100000)
```

### Phase 2: Implementation

**Project Structure** (follows Singura's monorepo pattern):
```
mcp-servers/<service>/
├── src/
│   ├── index.ts          # Server setup
│   ├── types.ts          # TypeScript interfaces
│   ├── tools/            # Tool implementations
│   ├── services/         # API clients
│   ├── schemas/          # Zod validation
│   └── constants.ts      # Config
├── tsconfig.json         # Strict mode required
├── package.json
└── dist/                 # Build output
```

**Singura TypeScript Standards**:
```typescript
// tsconfig.json MUST include:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// NO @ts-ignore allowed - use proper type guards
// All async functions need explicit Promise<T>
```

**Tool Registration Pattern**:
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const server = new Server({
  name: "singura-<service>-server",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

// Tool with Zod validation
const QuerySchema = z.object({
  sql: z.string().min(1).max(10000),
  params: z.array(z.any()).optional()
}).strict();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "query_database",
    description: "Execute SQL query with RLS",
    inputSchema: zodToJsonSchema(QuerySchema),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const validated = QuerySchema.parse(request.params.arguments);
    const result = await executeQuery(validated);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});
```

**Critical Annotations**:
- `readOnlyHint`: true if tool doesn't modify state
- `destructiveHint`: true if changes are irreversible (DELETE operations)
- `idempotentHint`: true if repeated calls are safe
- `openWorldHint`: true if accessing external systems

**Environment Variables** (never hardcode secrets):
```typescript
// Load from .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing required environment variables");
}
```

### Phase 3: Quality Review

**Code Quality Checklist**:
- ✅ DRY: Extracted common patterns into utilities
- ✅ Composable: Tools work together for complex workflows
- ✅ Consistent: Similar tools follow same patterns
- ✅ Error handling: All failure paths covered
- ✅ Type safety: TypeScript strict mode, no `any`
- ✅ Zod validation: All inputs validated with constraints
- ✅ Character limits: Responses truncated at 100K characters
- ✅ Security: No secrets in code, input sanitization

**Singura-Specific Checks**:
- ✅ Follows repository pattern (if database access)
- ✅ Aligns with OAuth security standards (if auth required)
- ✅ Compatible with multi-tenant architecture
- ✅ Works with organization-scoped data
- ✅ Handles connection pooling properly

### Phase 4: Integration with mcp.json

**Add to project root mcp.json**:
```json
{
  "mcpServers": {
    "supabase": {
      "description": "Supabase database client for RLS and migrations",
      "command": "node",
      "args": ["./mcp-servers/supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

**Test Server Startup**:
```bash
# Build
cd mcp-servers/<service>
npm run build

# Test stdio communication
echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | node dist/index.js
```

## Singura-Specific Examples

### Example 1: Supabase MCP Server

**Tools to Create**:
- `query_database`: Execute SQL with RLS
- `create_migration`: Generate migration file
- `test_rls_policy`: Validate security policies
- `list_tables`: Show schema information

**Key Patterns**:
- Always use service role key (bypasses RLS for admin operations)
- Format Postgres errors into actionable messages
- Return formatted table schemas (column types, constraints)
- Integrate with Singura's migration runner

### Example 2: ClickUp MCP Server

**Tools to Create**:
- `create_task`: Add task with custom fields
- `update_task_status`: Change workflow status
- `list_tasks`: Query with filters
- `add_comment`: Add context to tasks

**Key Patterns**:
- OAuth 2.0 token management
- Workspace/space scoping for multi-tenancy
- Custom field mapping for Singura metadata
- Webhook integration for real-time updates

## Common Patterns

### Error Handling
```typescript
try {
  const result = await apiCall();
  return formatSuccess(result);
} catch (error) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return { content: [{ type: "text", text: "Resource not found. Check ID." }], isError: true };
    }
    if (error.response?.status === 429) {
      return { content: [{ type: "text", text: "Rate limit exceeded. Retry in 60s." }], isError: true };
    }
  }
  return { content: [{ type: "text", text: `Unexpected error: ${error.message}` }], isError: true };
}
```

### Response Formatting
```typescript
function formatResponse(data: any): string {
  // Support both markdown (human-readable) and JSON (programmatic)
  const markdown = `
## Results (${data.length} items)

${data.map(item => `- **${item.name}**: ${item.description}`).join('\n')}
  `.trim();
  
  const json = JSON.stringify(data, null, 2);
  
  // Return both formats
  return `${markdown}\n\n<details><summary>JSON</summary>\n\n\`\`\`json\n${json}\n\`\`\`\n</details>`;
}
```

### Character Limiting
```typescript
const CHARACTER_LIMIT = 100000;

function truncateResponse(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) + `\n\n[Truncated: ${text.length - CHARACTER_LIMIT} characters omitted]`;
}
```

## Reference Documentation

See `reference/` directory for:
- `typescript-implementation.md`: Complete TypeScript/Node.js guide
- `singura-examples.md`: Supabase and ClickUp full implementations
- `testing-guide.md`: How to test MCP servers locally

## Next Steps After Creating Server

1. Add server to `mcp.json` configuration
2. Test with `echo` stdio commands
3. Verify tools load in Claude Code
4. Document environment variables in `.env.example`
5. Add server to team's MCP server catalog
6. Create usage examples for common workflows
