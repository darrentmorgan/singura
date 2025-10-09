# Claude Config Template - Quick Start Guide

Get your project set up with autonomous Claude Code workflows in 2 minutes.

## 🚀 Installation

### From This Template Directory

```bash
# Navigate to your project
cd /path/to/your/project

# Run setup script
/path/to/claude-config-template/setup.sh
```

### Using degit (Recommended)

```bash
# Navigate to your project
cd /path/to/your/project

# Install template
npx degit darrentmorgan/claude-config-template .claude-temp
.claude-temp/setup.sh
rm -rf .claude-temp
```

### Using Global Command

```bash
# Navigate to your project
cd /path/to/your/project

# Run init command
/init-claude-config
```

## 🎯 What Happens

The setup script will:

1. ✅ Auto-detect package manager (npm/pnpm/yarn/bun)
2. ✅ Auto-detect framework (React/Vue/Express/Next.js)
3. ✅ Install `.claude/` configuration
4. ✅ Parameterize files with your settings
5. ✅ (Optional) Link to global shared agents
6. ✅ (Optional) Configure git integration

## 📋 Interactive Prompts

You'll be asked:

1. **Confirm auto-detected settings**
   - Package manager: pnpm
   - Framework: react
   - Continue? (y/n)

2. **Overwrite existing .claude?** (if exists)
   - Yes to replace
   - No to cancel

3. **Enable global agent sharing?**
   - Yes (recommended) - Links to `~/.claude/agents/shared/`
   - No - Uses local agents only

4. **Git integration** (if repo exists)
   - Option 1: Add to `.gitignore` (private config)
   - Option 2: Commit to repo (team-shared)
   - Option 3: Skip

## ✅ Verification

After setup, verify installation:

```bash
# 1. Check .claude directory
ls -la .claude

# 2. Verify structure
tree .claude  # or ls -R .claude

# 3. Test hooks are executable
ls -la .claude/hooks/*.sh

# 4. Check settings
cat .claude/settings.local.json

# 5. Try a command
/create-component TestButton
```

## 🎨 First Steps

### 1. Try Slash Commands

```bash
/generate-api createProject POST    # Generate API endpoint
/create-component Button            # Scaffold component
/run-qa                             # Run E2E tests
```

### 2. Test Quality Gates

```bash
# Edit a file (quality hook runs automatically)
# Then commit (pre-commit hook runs):
git add .
git commit -m "test: verify quality gate"
```

### 3. Customize Configuration

```bash
# Edit delegation rules
code .claude/agents/delegation-map.json

# Adjust permissions
code .claude/settings.local.json

# Modify hooks
code .claude/hooks/pre-commit.sh
```

## 🔧 Common Customizations

### Change Package Manager

If auto-detection is wrong:

```bash
# Find and replace in all hooks
find .claude/hooks -name "*.sh" -exec sed -i 's/pnpm/npm/g' {} \;
```

### Adjust Framework Settings

Edit `.claude/agents/delegation-map.json`:

```json
{
  "context": {
    "framework": "Vue 3",        // Change from React
    "styling": "Tailwind CSS"
  }
}
```

### Disable AI Quality Judge

Edit `.claude/hooks/pre-commit.sh`:

```bash
# Comment out lines 59-68 (AI judge section)
```

### Add Custom Agent

1. Create: `.claude/agents/configs/my-agent.json`
2. Update: `.claude/agents/delegation-map.json`
3. (Optional) Share globally: `cp .claude/agents/configs/my-agent.json ~/.claude/agents/shared/configs/`

## 📚 Documentation

- **Full README**: `claude-config-template/README.md`
- **Agent System**: `.claude/docs/MCP_DELEGATION_GUIDE.md`
- **Hooks Guide**: `.claude/hooks/README.md`
- **Commands**: `.claude/commands/*.md`

## 🐛 Troubleshooting

### Setup fails with permission error

```bash
chmod +x /path/to/claude-config-template/setup.sh
./setup.sh
```

### Hooks not triggering

```bash
# Make hooks executable
chmod +x .claude/hooks/*.sh

# Verify settings
cat .claude/settings.local.json
```

### Global agents not found

```bash
# Create global directory
mkdir -p ~/.claude/agents/shared

# Re-run setup
./setup.sh
# Choose "yes" for global sharing
```

### Want to start over

```bash
# Remove .claude
rm -rf .claude

# Re-run setup
/path/to/claude-config-template/setup.sh
```

## 🔄 Updating

### Update Single Project

```bash
cd /path/to/claude-config-template
git pull
./setup.sh  # Will prompt before overwriting
```

### Update All Projects (Global Agents)

```bash
cd /path/to/claude-config-template
git pull
cp -r agents/configs/* ~/.claude/agents/shared/configs/
```

All linked projects get updates immediately!

## 🎯 Next Steps

1. ✅ Review `.claude/settings.local.json`
2. ✅ Customize `.claude/agents/delegation-map.json`
3. ✅ Try `/generate-api` or `/create-component`
4. ✅ Make a commit (quality gate will run)
5. ✅ Read full docs in `.claude/docs/`

---

**Need Help?** Check the full README or open an issue on GitHub.
