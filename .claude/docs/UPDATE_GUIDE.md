# Update Guide

How to keep your claude-config-template installation up to date.

## Checking for Updates

### Automatic Checks

The template checks for updates once per day automatically when you start working with Claude Code. You'll see a notification if an update is available.

### Manual Check

Run the update check command:

```bash
/check-updates
```

Or directly:

```bash
bash .claude/scripts/check-updates.sh --force
```

## Updating

### One-Command Update

```bash
npx degit darrentmorgan/claude-config-template .claude-temp --force && \
  cd .claude-temp && bash setup.sh --update && \
  cd .. && rm -rf .claude-temp
```

### What Gets Preserved

During updates, these are **never overwritten**:

- ✅ `.claude/settings.local.json` (your permissions and config)
- ✅ `.claude/agents/*.md` (custom markdown agents)
- ✅ `.claude/.version.json` (updated with new version)
- ✅ Any files you've customized

### What Gets Updated

- ✅ Agent JSON configs (`.claude/agents/configs/`)
- ✅ Documentation (`.claude/docs/`)
- ✅ Scripts (`.claude/scripts/`)
- ✅ Hooks (`.claude/hooks/`)
- ✅ Slash commands (`.claude/commands/`)
- ✅ Templates

## Version Tracking

Your installation stores version metadata in `.claude/.version.json`:

```json
{
  "installedVersion": "1.3.0",
  "gitCommitHash": "26594c5",
  "installedDate": "2025-10-09T16:30:00Z",
  "lastChecked": "2025-10-10T09:15:00Z",
  "repository": "darrentmorgan/claude-config-template"
}
```

This file is:
- Created during installation
- Updated when you check for updates
- Updated when you install updates
- Not committed to git (in `.gitignore`)

## Update Frequency

**Recommended:** Check for updates weekly or when you encounter issues.

The template is under active development with frequent improvements:
- New agent capabilities
- Performance optimizations
- Bug fixes
- Documentation updates
- Best practices guides (like Next.js 15)

## Troubleshooting

### "No version file found"

Your installation is missing version tracking. Reinstall:

```bash
npx degit darrentmorgan/claude-config-template .claude-temp --force
cd .claude-temp
bash setup.sh
cd ..
rm -rf .claude-temp
```

### "GitHub API error"

Wait a few minutes and try again. GitHub API has rate limits.

Or check manually: https://github.com/darrentmorgan/claude-config-template/commits/main

### Update Failed

If update fails:

1. **Create backup**:
   ```bash
   cp -r .claude .claude.backup-$(date +%Y%m%d)
   ```

2. **Try clean install**:
   ```bash
   rm -rf .claude
   npx degit darrentmorgan/claude-config-template .claude-temp
   cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp
   ```

3. **Restore settings**:
   ```bash
   cp .claude.backup-*/settings.local.json .claude/
   ```

## Staying Informed

Watch the repository for updates:
- GitHub: https://github.com/darrentmorgan/claude-config-template
- Releases: https://github.com/darrentmorgan/claude-config-template/releases

## Migration Notes

### v1.2.0 → v1.3.0

**Added:**
- Next.js 15 best practices guide
- Autonomous agent tools section in CLAUDE.md
- Memory crash fixes (16GB heap)

**Action required:**
- Update global `~/.claude/CLAUDE.md` (done automatically if you ran setup)
- Reload shell for NODE_OPTIONS changes

### Future Versions

Migration notes for breaking changes will be documented here.
