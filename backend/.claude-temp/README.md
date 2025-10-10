# Claude Code Configuration Template

[![GitHub](https://img.shields.io/badge/GitHub-darrentmorgan%2Fclaude--config--template-blue?logo=github)](https://github.com/darrentmorgan/claude-config-template)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A reusable, production-ready configuration system for Claude Code that brings autonomous development workflows to any project.

### 🚀 Quick Install
>
> **Copy and run this command in your project directory:**
>
> ```bash
> npx degit darrentmorgan/claude-config-template .claude-temp && cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp
> ```
>
> ### 🔄 Update Existing Installation
>
> **Copy and run to update:**
>
> ```bash
> npx degit darrentmorgan/claude-config-template .claude-temp --force && cd .claude-temp && bash setup.sh --update && cd .. && rm -rf .claude-temp
> ```

---

## 🔥 **NEW: Safe Parallel v2.3.0** (2025-10-08)

**Controlled Concurrency**: Memory-safe parallel execution (N=2) with p-limit + automatic fallback.

### 🚀 Want Speed Without Crashes?

**Safe Parallel Mode** = Middle ground between sequential (slow, stable) and unlimited parallel (fast, crashes).

**How It Works**:
- Uses p-limit to restrict concurrency to N=2 (not unlimited)
- Checks memory before each batch, falls back to sequential if > 4GB
- Forces GC between batches
- **Opt-in**: Default is sequential (safest)

### Performance Comparison

| Mode | Time (3 agents) | Stability | Memory Peak |
|------|----------------|-----------|-------------|
| Sequential (default) | 90s | 100% | 2GB |
| **Safe Parallel** | 60s | 95% | 3GB |
| Unlimited Parallel | 30s | 0% CRASH | 6GB+ |

**Enable Safe Parallel**:
```bash
export SAFE_PARALLEL=true
export CONCURRENCY_LIMIT=2
```

📚 **See**: [Safe Parallel Guide](docs/SAFE_PARALLEL_GUIDE.md) | [Sequential Guide](docs/SEQUENTIAL_EXECUTION_GUIDE.md)

---

## 🔥 **Sequential Execution v2.2.0** (2025-10-08)

**Default Mode**: Sequential execution (N=1) with forced GC - 100% stable.

- ✅ **100% stable** - never crashes
- ✅ **Forced GC** after every agent
- ✅ **Memory cleanup** between agents
- ⚠️ **3x slower** than safe parallel

📚 **See**: [Sequential Guide](docs/SEQUENTIAL_EXECUTION_GUIDE.md)

---

## 🔥 **Artifact System v2.1.0** (2025-10-08)

**Context Reduction**: Disk-based scratchpads for 90%+ memory savings.

- ✅ **90%+ context reduction** via disk-based scratchpads
- ✅ **50+ task capacity** (was 3-5)
- ✅ **Automatic memory guards** (6GB limit)
- ✅ **Session management** with cleanup

📚 **See**: [Artifact Guide](docs/ARTIFACT_SYSTEM_GUIDE.md)

---

## 🔥 **Fast CLI Tools** (2025-10-09)

**Performance Boost**: 10x faster code search and file navigation with optional superfast CLI tools.

- ✅ **Optional installation** during setup (Step 11)
- ✅ **ripgrep (rg)** - 10x faster than grep for code search
- ✅ **fd** - 10x faster than find for file finding
- ✅ **fzf** - Interactive fuzzy finder
- ✅ **ag/pt** - Alternative fast search tools
- ✅ **zoxide (z)** - Smart directory jumping
- ✅ **Auto-configured** - Claude Code prefers fast tools when available
- ✅ **Fallback support** - Uses standard grep/find if not installed

**Installation:**
```bash
# Automatic during setup
./setup.sh
# Select option 1 in Step 11

# Manual installation
brew install ripgrep fd fzf the_silver_searcher pt zoxide  # macOS
sudo apt-get install ripgrep fd-find fzf silversearcher-ag  # Linux
```

**Performance:**
- Search 200MB codebase: 0.3s (vs 3s with grep)
- Find 50k files: 0.1s (vs 1s with find)
- **10x more searches** in same time = deeper code understanding

📚 **See**: [Fast Tools Guide](docs/FAST_TOOLS_GUIDE.md)

---

## 🔥 **Delegation Fix v2.0.0** (2025-10-08)

**Critical Update**: Fixes context exhaustion issues with automated enforcement system.

- ✅ **70-85% delegation rate improvement** (was <10%, now 70-85%)
- ✅ **60-75% context reduction** (from 95-100% to 20-40% usage)
- ✅ **Automated agent routing** via pre-request hooks
- ✅ **Tool restrictions** create friction before code edits
- ✅ **Updated CLAUDE.md protocol** replaces old agent-organizer phantom

📚 **See**: [Release Notes](DELEGATION_FIX_RELEASE_NOTES.md) | [Implementation Guide](docs/DELEGATION_FIX_GUIDE.md) | [New Delegation Protocol](docs/CLAUDE_MD_DELEGATION_PROTOCOL.md)

---

## 🚀 Features

- ✅ **Fast CLI Tools (NEW)** - Optional installation of ripgrep, fd, fzf, ag, pt, zoxide (10x faster search/navigation)
- ✅ **Sequential Execution** - Forced sequential (N=1) + GC prevents crashes (0% crash rate)
- ✅ **Artifact System** - Disk-based scratchpads with 90%+ context reduction
- ✅ **Memory Protection** - 6GB limit + forced GC between agents
- ✅ **Specialized Agent System** - Pattern-based delegation to 18+ expert agents
- ✅ **Scout → Plan → Build Workflows** - Autonomous multi-phase implementation with TDD enforcement
- ✅ **Automated Quality Gates** - Pre-commit hooks with linting, type-checking, and AI review
- ✅ **MCP Context Optimization** - 74-90% context reduction (~92k+ tokens saved)
- ✅ **CLAUDE.md Integration** - Global agent reference for automatic delegation across all projects
- ✅ **Framework Agnostic** - Auto-detects and configures for React/Vue/Express/Next.js
- ✅ **Global Agent Sharing** - Consistent behavior across all projects
- ✅ **Custom Slash Commands** - `/auto-implement`, `/generate-api`, `/create-component`, `/deploy`, etc.

## 📦 What's Included

```
claude-config-template/
├── agents/                    # Agent configurations
│   ├── configs/              # Agent-specific MCP settings
│   ├── delegation-map.json   # Pattern-based routing rules
│   └── mcp-mapping.json      # MCP server → agent mappings
├── hooks/                     # Quality gate hooks
│   ├── pre-commit.sh         # Linting + type-check + tests + AI review
│   ├── post-commit.sh        # CI/CD triggers
│   ├── tool-use.sh           # Auto-review after Edit/Write
│   └── test-result.sh        # Test analysis and debugging
├── commands/                  # Custom slash commands
│   ├── create-component.md   # Scaffold React components
│   ├── generate-api.md       # Generate Express endpoints
│   ├── deploy.md             # Autonomous deployment
│   ├── run-qa.md             # E2E testing workflow
│   └── workflows/            # Advanced multi-phase workflows
│       ├── scout.md          # Phase 1: Context identification
│       ├── plan.md           # Phase 2: TDD planning
│       ├── build.md          # Phase 3: Implementation
│       └── auto-implement.md # Full autonomous workflow
├── docs/                      # Documentation
│   ├── AGENT_REFERENCE.md     # Complete agent documentation
│   ├── WORKFLOWS.md           # Scout → Plan → Build guide
│   ├── CLAUDE_MD_INTEGRATION.md # Global CLAUDE.md setup guide
│   ├── CLAUDE_MD_AGENT_SECTION.md # Template for CLAUDE.md
│   ├── MCP_DELEGATION_GUIDE.md
│   └── artifacts/            # Example workflow artifacts
│       └── README.md         # Artifacts documentation
├── scripts/                   # Helper scripts
│   └── update-claude-md.sh    # Update global CLAUDE.md with agents
├── setup.sh                   # Interactive installation script
└── README.md                  # This file
```

## 🎯 Quick Start

### Installation

**One-Command Install (Recommended)**

```bash
# Fresh install
npx degit darrentmorgan/claude-config-template .claude-temp && cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp

# Update existing installation
npx degit darrentmorgan/claude-config-template .claude-temp --force && cd .claude-temp && bash setup.sh --update && cd .. && rm -rf .claude-temp
```

**What Gets Installed**

- ✅ **Agent configs with MCP assignments** (`.claude/agents/configs/`)
  - `backend-architect.json` → `supabase`
  - `qa-expert.json` → `chrome-devtools`, `playwright`
  - `documentation-expert.json` → `Context7`
  - And 10 more specialized agents
- ✅ **Parallel execution system** (`.claude/scripts/delegation-router.ts`)
- ✅ **Smart routing hooks** (`.claude/hooks/pre-request-router.sh`)
- ✅ **Delegation rules** (`.claude/agents/delegation-map.json`)
- ✅ **Documentation** (`.claude/docs/`)
- ✅ **Slash commands** (`.claude/commands/`)

**What the Setup Does**

1. **Auto-detects your project**:
   - Package manager (npm/pnpm/yarn/bun)
   - Framework (React/Next.js/Vue/Express)
   - Project name

2. **Installs complete configuration**:
   - Copies all files to `.claude/` directory
   - Configures agent MCP server assignments
   - Replaces placeholders (`{{PKG_MANAGER}}`, `{{PROJECT_NAME}}`)
   - Makes hooks executable

3. **Update mode** (with `--update` flag):
   - Preserves your `settings.local.json`
   - Creates timestamped backup
   - Updates delegation router, hooks, and docs
   - Maintains customizations

4. **Optional global sharing**:
   - Links agent configs to `~/.claude/agents/shared/`
   - Ensures consistency across projects

5. **Git integration**:
   - Add to `.gitignore` (private config)
   - Or commit to repo (team-shared config)

6. **Fast CLI tools** (NEW - Optional):
   - Installs ripgrep (rg), fd, fzf, ag, pt, zoxide
   - 10x faster code search and file navigation
   - Auto-configures Claude Code to prefer fast tools
   - Falls back to standard grep/find if not installed

**Verify Installation**

```bash
# Test router
npx tsx .claude/scripts/delegation-router.ts "Add Button component" --plan

# Check agent MCP assignments
cat .claude/agents/configs/backend-architect.json | jq '.mcp_servers'
# Output: ["supabase"]

# See all agents
ls -la .claude/agents/configs/
```

📚 **[Full Installation Guide](INSTALLATION.md)**

## 🔧 Configuration

### Agent Delegation

Edit `.claude/agents/delegation-map.json` to customize:

```json
{
  "delegation_rules": [
    {
      "name": "React Components",
      "pattern": "**/*.tsx",
      "primary_agent": "frontend-developer",
      "context": {
        "framework": "React 18",
        "styling": "Tailwind CSS"
      }
    }
  ]
}
```

### Hooks

Customize `.claude/hooks/*.sh`:

```bash
# Disable AI judge in pre-commit.sh
# Comment out lines 59-68

# Adjust test command
if $PKG_MANAGER test:unit --run; then  # Changed from 'test'
```

### Commands

Adapt `.claude/commands/*.md` to your stack:

- Update API generation for different frameworks
- Customize component scaffolding
- Add project-specific workflows

### Permissions

Configure `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git add:*)",
      "Bash(pnpm:*)",      // Change to your package manager
      "Task(*:*)"
    ]
  }
}
```

## 🎨 Usage

### Slash Commands

#### Single-Phase Commands (Fast, Focused)
```bash
/generate-api createProject POST    # Generate Express endpoint
/create-component Button            # Scaffold React component
/deploy                             # Autonomous deployment workflow
/run-qa                             # E2E testing with AI review
```

#### Multi-Phase Workflows (Advanced, Autonomous)
```bash
/auto-implement "Add dark mode toggle to Settings"    # Full Scout → Plan → Build
/scout "User profile management"                     # Phase 1: Context identification
/plan                                                 # Phase 2: TDD planning
/build                                                # Phase 3: Implementation
```

**See**: [WORKFLOWS.md](docs/WORKFLOWS.md) for complete workflow guide

### Quality Gates

Hooks run automatically:

- **Pre-commit**: Linting → Type-check → Tests → AI review
- **Post-commit**: CI/CD trigger notifications
- **Tool-use**: Auto-format and quick checks after Edit/Write
- **Test-result**: Analyze failures, suggest fixes

### Agent Delegation

File changes auto-route to appropriate agents:

- `*.tsx` → `frontend-developer`
- `src/server/**` → `backend-architect`
- `*.test.ts` → `test-automator`
- API contracts → `typescript-pro`
- Migrations → `backend-architect`

### CLAUDE.md Integration

The setup script offers to update your global `~/.claude/CLAUDE.md` file with comprehensive agent documentation:

```bash
Step 9: Global CLAUDE.md Update (Optional)
Update CLAUDE.md with agent reference? (y/n): y
```

**What this adds:**
- Complete agent reference (15+ specialized agents)
- Automatic keyword-based routing rules
- Response format standards
- Quality gate configurations
- Best practices and anti-patterns

**Benefits:**
- 🎯 **Global Awareness**: Claude knows about all agents in every project
- 🚀 **Auto-Routing**: Keyword detection automatically delegates tasks
- 📉 **Context Optimization**: 74% reduction in main agent context (125k → 33k tokens)
- 🔒 **MCP Isolation**: Main orchestrator has ZERO MCP servers, all delegated

**Manual Update:**
```bash
cd /path/to/claude-config-template
bash scripts/update-claude-md.sh
```

**Documentation**: See `.claude/docs/CLAUDE_MD_INTEGRATION.md` for complete guide

## 🌍 Global Agent Sharing

### Setup Global Agents

The setup script offers global agent sharing:

```bash
Enable global agent sharing? (y/n): y
```

This creates:
```
~/.claude/agents/shared/
├── configs/              # Shared across all projects
└── mcp-mapping.json
```

Projects link to shared configs:
```bash
.claude/agents/configs → ~/.claude/agents/shared/configs
```

### Benefits

1. **Single source of truth**: Update once, applies everywhere
2. **Consistency**: Same agent behavior across projects
3. **Easy updates**: Pull template, copy to `~/.claude/agents/shared/`

### Update Shared Agents

```bash
cd /path/to/claude-config-template
git pull
cp -r agents/configs/* ~/.claude/agents/shared/configs/
```

## 📊 Context Optimization

This template implements MCP delegation for massive context savings:

| Configuration | Main Agent Context | Savings |
|--------------|-------------------|---------|
| **Before** (all MCP in main) | 125k tokens | - |
| **After** (delegated MCP) | 33k tokens | **74% reduction** |

### How It Works

- Main orchestrator has **zero MCP servers**
- Tasks requiring MCP auto-route to specialized agents
- Agents load MCP only when invoked
- Return summaries, not full responses

See `.claude/docs/MCP_DELEGATION_GUIDE.md` for details.

## 🔄 Updating Template

### For a Single Project

```bash
cd /path/to/claude-config-template
git pull
./setup.sh  # Will prompt before overwriting
```

### For All Projects (via global agents)

```bash
cd /path/to/claude-config-template
git pull
cp -r agents/configs/* ~/.claude/agents/shared/configs/
```

All linked projects get updates immediately.

## 📚 Documentation

- **Fast Tools Guide**: `.claude/docs/FAST_TOOLS_GUIDE.md` - Installation and usage of superfast CLI tools (NEW)
- **Parallel Execution**: `.claude/docs/PARALLEL_EXECUTION_GUIDE.md` - Run agents concurrently (66% faster!)
- **Workflows Guide**: `.claude/docs/WORKFLOWS.md` - Scout → Plan → Build autonomous workflows
- **Agent Reference**: `.claude/docs/AGENT_REFERENCE.md` - Complete agent documentation
- **CLAUDE.md Integration**: `.claude/docs/CLAUDE_MD_INTEGRATION.md` - Global configuration guide
- **Agent System**: `.claude/docs/MCP_DELEGATION_GUIDE.md` - MCP delegation patterns
- **Troubleshooting**: `.claude/docs/TROUBLESHOOTING.md` - Memory issues, delegation problems, performance tips
- **Agent Configs**: `.claude/agents/configs/README.md` - Individual agent documentation
- **Hooks**: `.claude/hooks/README.md` - Hook system reference
- **Commands**: `.claude/commands/*.md` - Slash command documentation
- **Global Config**: `~/.claude/CLAUDE.md` - Global instructions (updated during setup)

## 🤝 Distribution

### As GitHub Template

**Repository**: https://github.com/darrentmorgan/claude-config-template

Users install via:
```bash
npx degit darrentmorgan/claude-config-template .claude-temp
.claude-temp/setup.sh
rm -rf .claude-temp
```

Or use GitHub's "Use this template" feature after [marking as template](https://github.com/darrentmorgan/claude-config-template/settings).

### As NPM Package (Future)

```bash
# Coming soon
npx @darrentmorgan/init-claude-config
```

### As Git Submodule

```bash
# Add to project
git submodule add https://github.com/darrentmorgan/claude-config-template .claude-template
.claude-template/setup.sh

# Update
git submodule update --remote
.claude-template/setup.sh
```

## 🐛 Troubleshooting

**Setup fails with permission error**
```bash
chmod +x setup.sh
./setup.sh
```

**Hooks not triggering**
```bash
chmod +x .claude/hooks/*.sh
cat .claude/settings.local.json  # Verify hook config
```

**Global agents not found**
```bash
ls ~/.claude/agents/shared  # Should exist
# If missing, re-run setup and choose "y" for global sharing
```

**Want to uninstall**
```bash
rm -rf .claude
sed -i '/.claude\//d' .gitignore
```

## 📝 Customization Examples

### Change Package Manager

```bash
# Find and replace in hooks
sed -i 's/pnpm/npm/g' .claude/hooks/*.sh
```

### Adapt for Different Framework

Edit `.claude/agents/delegation-map.json`:

```json
{
  "name": "Vue Components",
  "pattern": "**/*.vue",
  "context": {
    "framework": "Vue 3",
    "styling": "Tailwind CSS"
  }
}
```

### Add Custom Agent

1. Create config: `.claude/agents/configs/my-agent.json`
2. Update delegation rules in `delegation-map.json`
3. Add to MCP routing in `mcp-mapping.json`

## 🚀 Next Steps

After installation:

1. ✅ Review `.claude/settings.local.json` for permissions
2. ✅ Customize `.claude/agents/delegation-map.json` for your project
3. ✅ Try `/generate-api` or `/create-component`
4. ✅ Make a commit (quality gate will run)
5. ✅ Read `.claude/docs/MCP_DELEGATION_GUIDE.md`

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

Built with [Claude Code](https://claude.com/code) - AI-powered development assistant

## 🔗 Links

- **Repository**: https://github.com/darrentmorgan/claude-config-template
- **Issues**: https://github.com/darrentmorgan/claude-config-template/issues
- **Discussions**: https://github.com/darrentmorgan/claude-config-template/discussions

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/darrentmorgan/claude-config-template?style=social)
![GitHub forks](https://img.shields.io/github/forks/darrentmorgan/claude-config-template?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/darrentmorgan/claude-config-template?style=social)

---

**Created by**: [Darren Morgan](https://github.com/darrentmorgan)
**Template Version**: 1.0.0
**Last Updated**: 2025-10-08

⭐ If you find this template useful, please consider giving it a star!
