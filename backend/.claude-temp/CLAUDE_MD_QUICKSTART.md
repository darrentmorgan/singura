# CLAUDE.md Integration - Quick Start

> **5-Minute Setup**: Get global agent delegation working across all your projects

---

## What You'll Get

✅ 15+ specialized agents available globally
✅ Automatic keyword-based delegation
✅ 74% context reduction (125k → 33k tokens)
✅ Consistent behavior across all projects

---

## Step 1: Install in Your Project (2 minutes)

```bash
cd /path/to/your/project
npx degit darrentmorgan/claude-config-template .claude-temp
.claude-temp/setup.sh
```

**During setup, answer:**
- Package manager: Select yours (npm/pnpm/yarn/bun)
- Framework: Auto-detected or select
- Global agent sharing: **y** (recommended)
- Update CLAUDE.md: **y** (this is the key step!)

**Cleanup:**
```bash
rm -rf .claude-temp
```

---

## Step 2: Verify It Works (1 minute)

Open Claude Code and ask:

```
What agents are available for database work?
```

**Expected Response:**
Claude should list `backend-architect`, `database-optimizer`, and `data-engineer` with their capabilities.

---

## Step 3: Test Automatic Routing (1 minute)

Try a task that should auto-route:

```
Create a migration for adding a posts table with title and content fields
```

**Expected Behavior:**
- Claude detects "migration" and "table" keywords
- Automatically delegates to `backend-architect`
- Creates migration file in `supabase/migrations/`
- Returns summary with file reference

---

## Step 4: Test Quality Gates (1 minute)

Edit a file and commit:

```bash
# Edit any TypeScript file
code src/example.ts

# Make a change, save, then commit
git add .
git commit -m "test commit"
```

**Expected Behavior:**
- Pre-commit hook runs automatically
- `code-reviewer-pro` analyzes changes
- Linting → Type-check → Tests → AI review
- Commit proceeds if score ≥ 80

---

## That's It! 🎉

You now have:
- ✅ Global agent awareness in all projects
- ✅ Automatic delegation based on keywords
- ✅ Quality gates enforced on commits
- ✅ 74% context optimization

---

## Common Use Cases

### Database Migration
```
User: "Create migration for user_preferences with JSON column"
→ Auto-routes to: backend-architect (Supabase MCP)
→ Returns: Migration file path + SQL + RLS policies
```

### E2E Testing
```
User: "Run E2E tests for login flow and take screenshots"
→ Auto-routes to: qa-expert (Playwright + Chrome MCP)
→ Returns: Test results + screenshots + failure analysis
```

### Component Creation
```
User: "Create a dashboard component with charts"
→ Auto-routes to: frontend-developer
→ Returns: React component + hooks + styling
```

### Library Documentation
```
User: "How do I use React useEffect with cleanup?"
→ Auto-routes to: documentation-expert (Context7 MCP)
→ Returns: Docs summary + code examples + reference URL
```

---

## Available Agents (Quick Reference)

| Agent | MCP Servers | Triggers |
|-------|-------------|----------|
| **backend-architect** | Supabase | `migration`, `database`, `schema`, `RPC`, `SQL` |
| **frontend-developer** | None | Files: `*.tsx`, `*.jsx` |
| **typescript-pro** | None | `type error`, `generics`, Files: `contracts.ts` |
| **code-reviewer-pro** | None | Auto-triggered on Edit/Write |
| **test-automator** | Playwright, Chrome | `test`, `playwright`, `test coverage` |
| **qa-expert** | Playwright, Chrome | `E2E test`, `screenshot`, `visual test` |
| **deployment-engineer** | None | `CI/CD`, `deploy`, `docker` |
| **database-optimizer** | Supabase | `optimize query`, `slow query`, `index` |
| **debugger** | None | `debug`, `fix bug`, `error` |
| **documentation-expert** | Context7 | `library docs`, `API reference`, `how to` |
| **general-purpose** | Firecrawl, Context7 | `scrape`, `crawl`, `research` |
| **product-manager** | ClickUp | `clickup`, `create task`, `roadmap` |
| **data-engineer** | Supabase | `ETL`, `data pipeline`, `migration` |

---

## File Structure After Setup

```
~/.claude/
├── CLAUDE.md                    # Global instructions + agent reference
└── agents/shared/               # Shared agent configs (if enabled)

your-project/
└── .claude/
    ├── agents/
    │   ├── configs/ → ~/.claude/agents/shared/configs/  # Symlink
    │   ├── delegation-map.json
    │   └── mcp-mapping.json
    ├── hooks/
    │   ├── pre-commit.sh
    │   ├── post-commit.sh
    │   ├── tool-use.sh
    │   └── test-result.sh
    ├── commands/
    │   ├── create-component.md
    │   ├── generate-api.md
    │   └── deploy.md
    └── docs/
        ├── AGENT_REFERENCE.md
        └── CLAUDE_MD_INTEGRATION.md
```

---

## Customization (Optional)

### Add Custom Routing Rules

Edit `.claude/agents/delegation-map.json`:

```json
{
  "delegation_rules": [
    {
      "name": "My Custom API Routes",
      "pattern": "src/api/custom/**/*.ts",
      "primary_agent": "backend-architect",
      "triggers": ["Edit", "Write"],
      "context": {
        "framework": "Your framework here"
      }
    }
  ]
}
```

### Adjust Quality Gates

Edit `.claude/agents/quality-judge.md` to change thresholds:

```markdown
Pre-commit minimum score: 80 → 70 (more lenient)
Pre-deployment minimum score: 85 → 90 (more strict)
```

---

## Manual CLAUDE.md Update (If Skipped During Setup)

If you skipped the CLAUDE.md update during setup:

```bash
cd /path/to/claude-config-template
bash scripts/update-claude-md.sh
```

Or copy-paste manually:

```bash
# 1. View content
cat docs/CLAUDE_MD_AGENT_SECTION.md

# 2. Copy everything after line 5
tail -n +6 docs/CLAUDE_MD_AGENT_SECTION.md >> ~/.claude/CLAUDE.md

# 3. Verify
grep "Available Specialized Agents" ~/.claude/CLAUDE.md
```

---

## Troubleshooting

### Agent Section Not Found
```bash
# Check if CLAUDE.md exists
ls -la ~/.claude/CLAUDE.md

# Check if agent section was added
grep "Available Specialized Agents" ~/.claude/CLAUDE.md

# If not found, run update script
bash /path/to/claude-config-template/scripts/update-claude-md.sh
```

### Agents Not Auto-Routing
```bash
# Verify delegation map exists
cat .claude/agents/delegation-map.json | jq '.mcp_routing_rules'

# Check routing triggers
cat .claude/agents/delegation-map.json | jq '.mcp_routing_rules.routing_map[].keywords'

# Make sure your prompt contains trigger keywords
```

### Hooks Not Running
```bash
# Check hook permissions
ls -la .claude/hooks/

# Make executable
chmod +x .claude/hooks/*.sh

# Test manually
.claude/hooks/pre-commit.sh
```

---

## Next Steps

1. **Read Full Documentation**:
   - `.claude/docs/AGENT_REFERENCE.md` - Complete agent docs
   - `.claude/docs/CLAUDE_MD_INTEGRATION.md` - Integration guide

2. **Try Slash Commands**:
   ```
   /generate-api createUser POST
   /create-component Button
   /deploy
   /run-qa
   ```

3. **Set Up More Projects**:
   ```bash
   cd /path/to/another/project
   npx degit darrentmorgan/claude-config-template .claude-temp
   .claude-temp/setup.sh
   rm -rf .claude-temp
   ```

4. **Enable Global Sharing** (if not done):
   - Reduces duplication
   - Single source of truth
   - Easy updates

---

## Support

Questions? Check:
- Full docs: `.claude/docs/CLAUDE_MD_INTEGRATION.md`
- Troubleshooting: `.claude/docs/CLAUDE_MD_INTEGRATION.md#troubleshooting`
- GitHub issues: https://github.com/darrentmorgan/claude-config-template/issues

---

**Happy coding with autonomous agents! 🚀**

*Setup time: ~5 minutes | Context savings: 74% | Agents available: 15+*
