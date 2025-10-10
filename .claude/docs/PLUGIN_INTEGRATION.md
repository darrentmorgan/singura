# Plugin Integration Guide

## 📦 Overview

This project uses **Claude Code Plugins** from the `claude-code-templates` marketplace to extend functionality without duplicating code. Plugins provide pre-built agents, slash commands, and MCP integrations.

**Marketplace**: `davila7/claude-code-templates`
**Location**: `~/.claude/plugins/marketplaces/claude-code-templates/`
**Last Updated**: 2025-10-09

---

## 🔌 Installed Plugins

### 1. **git-workflow**
**Purpose**: Git Flow branching automation
**Commands**:
- `/git-workflow:feature <name>` - Create feature branch
- `/git-workflow:release <version>` - Create release branch
- `/git-workflow:hotfix <name>` - Create hotfix branch
- `/git-workflow:finish` - Merge current branch
- `/git-workflow:flow-status` - Show Git Flow status

**Agent**: `git-flow-manager`
**MCP Servers**: None

**Usage**:
```bash
# Start new feature
/git-workflow:feature user-authentication

# Complete feature and merge to develop
/git-workflow:finish
```

---

### 2. **supabase-toolkit**
**Purpose**: Complete Supabase development workflow
**Commands**:
- `/supabase-toolkit:supabase-migration-assistant` - Create migrations
- `/supabase-toolkit:supabase-schema-sync` - Sync schema changes
- `/supabase-toolkit:supabase-data-explorer` - Query and explore data
- `/supabase-toolkit:supabase-performance-optimizer` - Optimize queries
- `/supabase-toolkit:supabase-backup-manager` - Manage backups

**Agents**: `data-engineer`, `data-scientist`
**MCP Servers**: `supabase`, `postgresql`, `mysql`

**Usage**:
```bash
# Create new migration
/supabase-toolkit:supabase-migration-assistant create user_preferences

# Optimize slow query
/supabase-toolkit:supabase-performance-optimizer
```

---

### 3. **nextjs-vercel-pro**
**Purpose**: Next.js and Vercel deployment toolkit
**Commands**:
- `/nextjs-vercel-pro:nextjs-scaffold <project-name>` - Scaffold new project
- `/nextjs-vercel-pro:nextjs-component-generator <name>` - Generate component
- `/nextjs-vercel-pro:nextjs-api-tester <route>` - Test API routes
- `/nextjs-vercel-pro:nextjs-performance-audit` - Performance analysis
- `/nextjs-vercel-pro:vercel-deploy-optimize` - Deploy with optimization
- `/nextjs-vercel-pro:vercel-edge-function <name>` - Create edge function
- `/nextjs-vercel-pro:vercel-env-sync` - Sync environment variables

**Agents**: `frontend-developer`, `fullstack-developer`
**MCP Servers**: `vercel-mcp`

---

### 4. **testing-suite** ⭐ (Active)
**Purpose**: Comprehensive testing automation
**Commands**:
- `/testing-suite:generate-tests <file>` - Generate test suite
- `/testing-suite:e2e-setup <framework>` - Setup E2E testing
- `/testing-suite:test-coverage` - Analyze coverage
- `/testing-suite:setup-visual-testing` - Setup visual regression
- `/testing-suite:setup-load-testing` - Setup load tests
- `/testing-suite:test-automation-orchestrator` - Orchestrate tests
- `/testing-suite:test-quality-analyzer` - Analyze test quality

**Agents**: `test-engineer` (lightweight, NO MCP)
**MCP Servers**: `playwright-mcp`

**Usage**:
```bash
# Generate unit tests (lightweight, no crashes)
/testing-suite:generate-tests src/services/userService.ts
```

**Note**: We use `test-engineer` plugin for unit/integration tests (NO MCP servers = lightweight). For E2E/browser testing, use local `qa-expert` agent (HAS chrome-devtools & playwright MCP).

---

### 5. **security-pro**
**Purpose**: Security auditing and compliance
**Commands**:
- `/security-pro:security-audit` - Full security audit
- `/security-pro:vulnerability-scan` - Scan for vulnerabilities
- `/security-pro:dependency-audit` - Audit dependencies
- `/security-pro:code-security-review` - Review code security

**Agents**: `security-auditor`, `penetration-tester`, `compliance-specialist`, `incident-responder`
**MCP Servers**: None

---

### 6. **ai-ml-toolkit**
**Purpose**: AI and machine learning development
**Agents**: `ai-engineer`, `ml-engineer`, `nlp-engineer`, `computer-vision-engineer`, `mlops-engineer`
**MCP Servers**: `openai-mcp`

---

### 7. **devops-automation**
**Purpose**: CI/CD and infrastructure automation
**Commands**:
- `/devops-automation:setup-ci-cd-pipeline`
- `/devops-automation:docker-compose-setup`
- `/devops-automation:kubernetes-deploy`
- `/devops-automation:monitoring-setup`
- `/devops-automation:backup-strategy`

**Agents**: `devops-engineer`, `cloud-architect`, `kubernetes-specialist`, `infrastructure-engineer`
**MCP Servers**: `github-integration`, `docker-mcp`

---

### 8. **documentation-generator**
**Purpose**: Automated documentation generation
**Commands**:
- `/documentation-generator:generate-api-docs`
- `/documentation-generator:update-docs`
- `/documentation-generator:create-user-guide`
- `/documentation-generator:setup-docusaurus`
- `/documentation-generator:generate-changelog`

**Agents**: `technical-writer`, `api-documentation-specialist`, `docusaurus-expert`
**MCP Servers**: `filesystem`

---

### 9. **performance-optimizer**
**Purpose**: Performance profiling and optimization
**Commands**:
- `/performance-optimizer:optimize-bundle`
- `/performance-optimizer:performance-audit` - Comprehensive audit
- `/performance-optimizer:add-caching`
- `/performance-optimizer:optimize-images`
- `/performance-optimizer:reduce-bundle-size`
- `/performance-optimizer:add-lazy-loading`

**Agents**: `performance-engineer`, `load-testing-specialist`
**MCP Servers**: None

---

### 10. **project-management-suite**
**Purpose**: Task and project management
**Commands**:
- `/project-management-suite:sprint-planning`
- `/project-management-suite:create-roadmap`
- `/project-management-suite:task-breakdown`
- `/project-management-suite:estimate-project`
- `/project-management-suite:standup-generator`
- `/project-management-suite:retrospective-facilitator`

**Agents**: `product-strategist`, `business-analyst`, `tech-lead`
**MCP Servers**: `notion-integration`, `linear-integration`

---

## 🎯 Plugin vs Local Agent Selection

### When to Use **Plugin Agents**

✅ **Use plugins for**:
- Generic workflows (git, testing, security, docs)
- Standard tooling setup
- Cross-project functionality
- When you don't need project-specific MCP credentials

### When to Use **Local Agents**

✅ **Use local configs for**:
- Project-specific MCP credentials (e.g., your Supabase API keys)
- Custom delegation routing logic
- Project-specific quality gates
- Heavy browser automation (qa-expert with chrome-devtools)

---

## 🔄 Hybrid Workflows

### Example 1: Database-First Feature
```markdown
1. /supabase-toolkit:supabase-migration-assistant → Create schema
2. /build → Generate API/UI code (local workflow)
3. /testing-suite:generate-tests → Generate unit tests
4. /security-pro:security-audit → Security review
```

### Example 2: Full-Stack Feature with Git Flow
```markdown
1. /git-workflow:feature my-feature → Create branch
2. /scout → Discover relevant files (local command)
3. /plan_w_docs → Plan implementation (local command)
4. /build → Implement feature (local command)
5. /testing-suite:test-coverage → Verify 70%+ coverage
6. /performance-optimizer:performance-audit → Check performance
7. /git-workflow:finish → Merge to develop
```

### Example 3: Test Pyramid Implementation
```markdown
# Unit Tests (70%) - Use lightweight plugin
/testing-suite:generate-tests src/services/

# Integration Tests (20%) - Use lightweight plugin
/testing-suite:generate-tests src/api/

# E2E Tests (10%) - Use local qa-expert (has MCP)
Delegate to qa-expert for browser automation
```

---

## 📊 Agent Delegation Matrix

| Task Type | Local Agent | Plugin Agent | Recommendation |
|-----------|-------------|--------------|----------------|
| Database migrations | `backend-architect` | `data-engineer` | **Local** (has your Supabase config) |
| Git Flow operations | N/A | `git-flow-manager` | **Plugin** |
| Unit test generation | N/A | `test-engineer` | **Plugin** (lightweight) |
| E2E testing | `qa-expert` | N/A | **Local** (has chrome-devtools MCP) |
| Performance audits | N/A | `performance-engineer` | **Plugin** |
| Security audits | N/A | `security-auditor` | **Plugin** |
| Next.js development | `frontend-developer` | `fullstack-developer` | **Either** (both work) |

---

## 🛠️ Managing Plugins

### Update Plugins
```bash
# Update all plugins
/plugin update

# Update specific plugin
/plugin update git-workflow
```

### Enable/Disable Plugins
```bash
# Enable plugin
/plugin enable testing-suite

# Disable plugin (reduces context)
/plugin disable ai-ml-toolkit
```

### List Available Plugins
```bash
/plugin list
```

---

## ⚡ Performance Optimizations

### Fast Tool Access

**Problem**: Plugin agents only have `tools: Read, Write, Edit, Bash` which causes them to use **slow bash commands** like:
- `bash grep` instead of fast `Grep` tool (ripgrep)
- `bash find` instead of fast `Glob` tool
- `bash ls` instead of fast `LS` tool

**Solution**: We've created **optimized local overrides** for frequently-used plugin agents:

| Agent | Original | Optimized | Speed Improvement |
|-------|----------|-----------|-------------------|
| `test-engineer` | Plugin (Bash only) | Local (+ Grep, Glob, LS) | **10-100x faster** file searches |
| `data-engineer` | Plugin (Bash only) | Local (+ Grep, Glob, LS) | **10-100x faster** file searches |

**Location**: `.claude/agents/test-engineer.md`, `.claude/agents/data-engineer.md`

**Fast Tools**:
- ✅ `Grep` - Optimized ripgrep search (10-100x faster than bash grep)
- ✅ `Glob` - Fast file pattern matching (10x faster than bash find)
- ✅ `LS` - Directory listing (faster than bash ls)

**Example**:
```bash
# SLOW (plugin agent with Bash only)
Bash("find . -name '*.test.ts'")  # Searches entire directory tree
Bash("grep -r 'describe' tests/") # Slow recursive search

# FAST (optimized local agent)
Glob("**/*.test.ts")               # Optimized pattern matching
Grep("describe", glob="**/*.ts")   # Optimized ripgrep search
```

---

## 💡 Best Practices

### DO ✅
- Use optimized local agents (test-engineer, data-engineer) for speed
- Use plugin commands for generic workflows
- Reference plugin agents in delegation map (don't duplicate)
- Keep local configs for project-specific MCP credentials
- Document which plugins are active for your project
- Update plugins regularly
- Disable unused plugins to reduce context
- Create local overrides with fast tools for frequently-used plugin agents

### DON'T ❌
- Use unoptimized plugin agents for heavy file operations (slow bash commands)
- Enable all 10 plugins at once (causes context bloat)
- Hard-code plugin paths (use symbolic references)
- Modify plugin files directly in `~/.claude/plugins/` (changes will be overwritten)
- Use plugins with MCP servers for simple tasks (use lightweight agents)

---

## 🔍 Troubleshooting

### Plugin Command Not Found
```bash
# Check if plugin is installed
/plugin list

# Reinstall plugin
/plugin install testing-suite
```

### Agent Crashes When Delegated
- Check if agent has too many MCP servers (like old test-automator)
- Use lightweight plugin agents without MCP when possible
- See test-engineer vs qa-expert split for example

### Plugin Version Conflicts
```bash
# Check marketplace
cat ~/.claude/plugins/known_marketplaces.json

# Update marketplace
/plugin marketplace update claude-code-templates
```

---

## 📚 Related Documentation

- [Agent Reference](./AGENT_REFERENCE.md) - Full agent capability matrix
- [Delegation Map](../agents/delegation-map.json) - Agent routing rules
- [MCP Mapping](../agents/mcp-mapping.json) - MCP server assignments
- [Workflows](./WORKFLOWS.md) - Scout→Plan→Build workflows

---

## 🔗 Plugin Resources

- **Marketplace**: https://github.com/davila7/claude-code-templates
- **Documentation**: https://docs.aitmpl.com
- **Browse Templates**: https://aitmpl.com
- **Issues**: https://github.com/davila7/claude-code-templates/issues
