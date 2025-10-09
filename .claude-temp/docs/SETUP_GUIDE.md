# Setup Guide - Installation Walkthrough

## Quick Install

```bash
npx degit darrentmorgan/claude-config-template .claude-temp && \
cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp
```

## Interactive Setup Steps

The setup script will guide you through 11 steps:

### Step 1: Package Manager Detection

Automatically detects:
- `pnpm` (pnpm-lock.yaml)
- `npm` (package-lock.json)
- `yarn` (yarn.lock)
- `bun` (bun.lockb)

If not detected, prompts for manual selection.

### Step 2: Framework Detection

Automatically detects from package.json:
- React
- Next.js
- Vue
- Express
- Generic (fallback)

### Step 3: Configuration Summary

Shows detected settings and asks for confirmation:
```
Project Name: your-project
Package Manager: pnpm
Framework: react
```

### Step 4: File Installation

Copies configuration files to `.claude/` directory:
- ✅ agents/ (routing rules and configs)
- ✅ hooks/ (quality gates)
- ✅ commands/ (slash commands)
- ✅ docs/ (documentation)
- ✅ scripts/ (delegation router, artifact system)

**Update mode** (--update flag):
- Preserves settings.local.json
- Creates timestamped backup
- Updates core files only

### Step 5: Placeholder Replacement

Replaces variables in config files:
- `{{PKG_MANAGER}}` → your package manager
- `{{PROJECT_NAME}}` → your project name
- `{{FRAMEWORK}}` → detected framework

Makes all hooks executable.

### Step 6: Global Agent Sharing (Optional)

**Question**: "Enable global agent sharing?"

**If yes**:
- Creates `~/.claude/agents/shared/`
- Copies agent configs there
- Symlinks `.claude/agents/configs` → global configs

**Benefits**:
- One source of truth
- Updates apply to all projects
- Consistent agent behavior

**If no**:
- Uses local agents only
- Per-project configuration

### Step 7: Log Directories

Creates `.claude/logs/` for:
- Hook execution logs
- Delegation router logs
- Error traces

### Step 8: Git Integration

**Question**: How to handle `.claude/` in git?

**Options**:
1. **Add to .gitignore** (private config)
   - Recommended for personal projects
   - Keep local customizations private

2. **Commit to repository** (shared config)
   - Recommended for team projects
   - Share configuration with team

3. **Skip** (manual git handling)

### Step 9: Global CLAUDE.md Update (Optional)

**Question**: "Update CLAUDE.md with agent reference?"

**If yes**:
- Adds comprehensive agent documentation to `~/.claude/CLAUDE.md`
- Includes routing rules, patterns, examples
- Available in all Claude Code projects

**If no**:
- Can run later: `bash scripts/update-claude-md.sh`

### Step 10: Environment Configuration (Optional) 🆕

**Question**: "Configure execution mode and memory settings?"

#### Options

**1. Sequential mode (default)**:
- 100% stable
- 3x slower than safe parallel
- No configuration needed
- Recommended for: Production, 8GB RAM

**2. Safe Parallel mode**:
- 95% stable
- 30% faster than sequential
- Requires configuration
- Recommended for: Development, 16GB+ RAM

**3. Skip**:
- Can configure manually later

#### Configuration Created (Option 2)

If you select Safe Parallel, you'll be asked:

**"Where would you like to save this configuration?"**

**Option 1: .env file (recommended)**:
```bash
# Creates .env in project root
SAFE_PARALLEL=true
CONCURRENCY_LIMIT=2
MEMORY_THRESHOLD=4096
CLAUDE_MEMORY_LIMIT_MB=6144
```

**Advantages**:
- Per-project configuration
- Easy to override
- Automatically added to .gitignore

**Option 2: Shell profile**:
```bash
# Adds to ~/.zshrc or ~/.bashrc
export SAFE_PARALLEL=true
export CONCURRENCY_LIMIT=2
export MEMORY_THRESHOLD=4096
export CLAUDE_MEMORY_LIMIT_MB=6144
export NODE_OPTIONS="--expose-gc --max-old-space-size=8192"
```

**Advantages**:
- Global default for all projects
- One-time setup
- Includes NODE_OPTIONS

**Requires**: Restart terminal or `source ~/.zshrc`

**Option 3: Both**:
- Creates .env file
- Adds to shell profile
- Belt and suspenders approach

### Step 11: Final Instructions

Shows completion message with:
- Next steps
- Documentation links
- Configuration locations
- Tips for getting started

## Update Existing Installation

```bash
cd your-project
npx degit darrentmorgan/claude-config-template .claude-temp --force && \
cd .claude-temp && bash setup.sh --update && cd .. && rm -rf .claude-temp
```

**What --update does**:
- ✅ Preserves `settings.local.json`
- ✅ Creates backup: `.claude-backup-YYYYMMDD-HHMMSS`
- ✅ Updates core files (router, hooks, docs)
- ✅ Maintains your customizations

## Manual Configuration After Setup

### Enable Safe Parallel (if skipped)

**Option 1: Create .env**:
```bash
cat > .env << 'EOF'
SAFE_PARALLEL=true
CONCURRENCY_LIMIT=2
MEMORY_THRESHOLD=4096
CLAUDE_MEMORY_LIMIT_MB=6144
EOF
```

**Option 2: Export to shell**:
```bash
# Add to ~/.zshrc or ~/.bashrc
export SAFE_PARALLEL=true
export CONCURRENCY_LIMIT=2
export MEMORY_THRESHOLD=4096
export NODE_OPTIONS="--expose-gc --max-old-space-size=8192"

# Apply
source ~/.zshrc
```

### Change Execution Mode

**Switch to Safe Parallel**:
```bash
echo "SAFE_PARALLEL=true" >> .env
```

**Switch back to Sequential**:
```bash
echo "SAFE_PARALLEL=false" >> .env
# Or just remove the line
```

### Verify Configuration

```bash
# Check execution mode
npx tsx .claude/scripts/delegation-router.ts "Add Button" --plan | grep execution_mode

# With SAFE_PARALLEL=false or unset:
# Output: "execution_mode": "sequential"

# With SAFE_PARALLEL=true:
# Output: "execution_mode": "parallel"
```

## Troubleshooting Setup

### Setup fails with "Template files not found"

**Cause**: Running setup.sh from wrong directory

**Fix**:
```bash
cd /path/to/claude-config-template
bash setup.sh
```

### Hooks not executable

**Cause**: Permissions not set

**Fix**:
```bash
chmod +x .claude/hooks/*.sh
```

### Global agents not linked

**Cause**: Symlink failed or skipped

**Fix**:
```bash
rm -rf .claude/agents/configs
ln -s ~/.claude/agents/shared/configs .claude/agents/configs
```

### Environment variables not working

**Cause**: Shell profile not reloaded

**Fix**:
```bash
source ~/.zshrc
# or restart terminal
```

### Can't find .env file

**Cause**: .env not created or in wrong location

**Check**:
```bash
ls -la .env
# Should be in project root, not in .claude/
```

**Fix**:
```bash
# Copy example
cp .claude-temp/.env.example .env

# Or create manually
echo "SAFE_PARALLEL=true" > .env
```

## Uninstall

```bash
# Remove .claude directory
rm -rf .claude

# Remove .env (if created)
rm .env

# Remove from .gitignore
sed -i '' '/.claude/d' .gitignore
sed -i '' '/.env/d' .gitignore

# Remove from shell profile (if added)
# Edit ~/.zshrc or ~/.bashrc and remove the Claude Code section
```

## See Also

- [Safe Parallel Guide](SAFE_PARALLEL_GUIDE.md) - Controlled concurrency
- [Sequential Guide](SEQUENTIAL_EXECUTION_GUIDE.md) - Default mode
- [Artifact System](ARTIFACT_SYSTEM_GUIDE.md) - Context reduction
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
