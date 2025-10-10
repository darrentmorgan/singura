# Intelligent CLAUDE.md Updater

**Version:** 2.0.0
**Status:** ✅ Active
**Compatibility:** macOS (bash 3.2+), Linux (bash 4+)

## Overview

The intelligent updater safely manages your `~/.claude/CLAUDE.md` configuration file by:

✅ **Preserving your custom instructions**
✅ **Detecting if our sections already exist**
✅ **Comparing line-by-line and updating only if needed**
✅ **Creating automatic backups**
✅ **Never overwriting your content**

## How It Works

### 1. Section Markers

Our managed sections are wrapped with markers:

```markdown
# ⚡ DELEGATION-FIRST PROTOCOL
... content ...
# ⚡ END DELEGATION-FIRST PROTOCOL

## ⚡ AUTONOMOUS EXECUTION MODE
... content ...
## ⚡ END AUTONOMOUS EXECUTION MODE
```

These markers allow the updater to:
- Identify which parts of CLAUDE.md we manage
- Extract and compare sections precisely
- Update only our sections, leaving your content untouched

### 2. Templates

Templates are stored in `.claude/templates/`:
- `CLAUDE_MD_DELEGATION.md` - Delegation protocol
- `CLAUDE_MD_AUTONOMY.md` - Autonomous execution mode

These templates:
- Are auto-generated from your current CLAUDE.md on first run
- Serve as the "source of truth" for what our sections should contain
- Can be edited to customize default behavior for new projects

### 3. Update Logic

```
┌─ Check if CLAUDE.md exists
│
├─ For each managed section:
│  ├─ Extract current section (if exists)
│  ├─ Load template
│  │
│  ├─ Section not found?
│  │  └─ APPEND to preserve user's existing content
│  │
│  ├─ Section matches template?
│  │  └─ SKIP (already up-to-date)
│  │
│  └─ Section differs from template?
│     ├─ Show diff
│     ├─ Ask for confirmation (unless --force)
│     ├─ Create backup
│     └─ REPLACE section with template
│
└─ Done!
```

## Usage

### Basic Update

```bash
# Check what would change (safe - no modifications)
.claude/scripts/update-claude-md.sh --dry-run

# Apply updates (asks for confirmation)
.claude/scripts/update-claude-md.sh

# Apply updates without prompts
.claude/scripts/update-claude-md.sh --force
```

### Options

```
--dry-run    Show what would be done without making changes
--force      Skip confirmation prompts
--help       Show help message
```

## Examples

### Example 1: First Run (Section Missing)

```bash
$ .claude/scripts/update-claude-md.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Claude Code CLAUDE.md Intelligent Updater
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Target: /Users/you/.claude/CLAUDE.md

▶ Checking DELEGATION section...
  ⚠ Section not found in CLAUDE.md
  ❓ Add DELEGATION section? (y/n): y
  ✓ Section added

▶ Checking AUTONOMY section...
  ⚠ Section not found in CLAUDE.md
  ❓ Add AUTONOMY section? (y/n): y
  ✓ Section added

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Update complete

📋 Your CLAUDE.md: /Users/you/.claude/CLAUDE.md
📂 Backups: /Users/you/.claude/CLAUDE.md.backup.*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Result:** Your existing CLAUDE.md content is preserved, and our sections are appended.

### Example 2: Section Already Up-to-Date

```bash
$ .claude/scripts/update-claude-md.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Claude Code CLAUDE.md Intelligent Updater
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Target: /Users/you/.claude/CLAUDE.md

▶ Checking DELEGATION section...
  ✓ Up-to-date

▶ Checking AUTONOMY section...
  ✓ Up-to-date

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Update complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Result:** No changes needed - script exits immediately.

### Example 3: Section Needs Update

```bash
$ .claude/scripts/update-claude-md.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Claude Code CLAUDE.md Intelligent Updater
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Target: /Users/you/.claude/CLAUDE.md

▶ Checking AUTONOMY section...
  ⚠ Section differs from template

  Showing differences (- current, + template):
  --- current
  +++ template
  @@ -10,7 +10,7 @@
   - "Would you like me to proceed with Phase 2?"
  +- "Should I continue to Phase 3?"

  ❓ Update AUTONOMY section? (y/n): y
  ✓ Section updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Update complete

📋 Your CLAUDE.md: /Users/you/.claude/CLAUDE.md
📂 Backups: /Users/you/.claude/CLAUDE.md.backup.20251009_114530
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Result:** Section updated, backup created, your other content untouched.

## Safety Features

### 1. Automatic Backups

Every modification creates a timestamped backup:
```
~/.claude/CLAUDE.md.backup.20251009_114530
~/.claude/CLAUDE.md.backup.20251009_120145
```

### 2. Dry-Run Mode

Always test with `--dry-run` first:
```bash
.claude/scripts/update-claude-md.sh --dry-run
```

Shows exactly what would change without modifying anything.

### 3. Confirmation Prompts

Unless you use `--force`, the script asks before:
- Creating new CLAUDE.md file
- Adding new sections
- Updating existing sections

### 4. Diff Preview

When updating sections, you see the exact changes:
```diff
- Old line
+ New line
```

## Customization

### Customize Template Content

1. Edit templates directly:
   ```bash
   vim .claude/templates/CLAUDE_MD_AUTONOMY.md
   ```

2. Apply to your CLAUDE.md:
   ```bash
   .claude/scripts/update-claude-md.sh --force
   ```

3. Commit templates to share across team:
   ```bash
   git add .claude/templates/
   git commit -m "chore: update CLAUDE.md templates"
   ```

### Add New Managed Sections

Edit `.claude/scripts/update-claude-md.sh`:

```bash
SECTIONS=(
    "DELEGATION|# ⚡ DELEGATION-FIRST PROTOCOL|# ⚡ END DELEGATION-FIRST PROTOCOL"
    "AUTONOMY|## ⚡ AUTONOMOUS EXECUTION MODE|## ⚡ END AUTONOMOUS EXECUTION MODE"
    "MY_SECTION|# ⚡ MY CUSTOM SECTION|# ⚡ END MY CUSTOM SECTION"  # Add this
)
```

Create template:
```bash
cat > .claude/templates/CLAUDE_MD_MY_SECTION.md <<'EOF'
# ⚡ MY CUSTOM SECTION

Your custom instructions here...

# ⚡ END MY CUSTOM SECTION
EOF
```

Run updater:
```bash
.claude/scripts/update-claude-md.sh
```

## Integration with setup.sh

The updater can be called from `setup.sh` during project initialization:

```bash
# In setup.sh
echo "Updating global CLAUDE.md configuration..."
.claude/scripts/update-claude-md.sh --force

echo "CLAUDE.md updated successfully!"
```

This ensures all team members have the latest autonomous execution rules.

## Troubleshooting

### "Section not found in CLAUDE.md"

**Cause:** Your CLAUDE.md doesn't have our managed sections yet.
**Fix:** Say "y" to add them. Your existing content will be preserved.

### "Template not found"

**Cause:** First run - templates don't exist yet.
**Fix:** Script auto-creates templates from your current CLAUDE.md.

### "Showing differences"

**Cause:** Your section content differs from the template.
**Fix:** Review the diff. If acceptable, say "y" to update.

### Restore from Backup

If something goes wrong:
```bash
# List backups
ls -la ~/.claude/CLAUDE.md.backup.*

# Restore from backup
cp ~/.claude/CLAUDE.md.backup.20251009_114530 ~/.claude/CLAUDE.md

# Verify
cat ~/.claude/CLAUDE.md
```

## Best Practices

### 1. Always Test First

```bash
# Dry run before real run
.claude/scripts/update-claude-md.sh --dry-run
.claude/scripts/update-claude-md.sh
```

### 2. Keep Templates Updated

When you improve a section:
```bash
# Edit your CLAUDE.md directly
vim ~/.claude/CLAUDE.md

# Extract updated section to template
sed -n '/# ⚡ DELEGATION/,/# ⚡ END DELEGATION/p' ~/.claude/CLAUDE.md > \
  .claude/templates/CLAUDE_MD_DELEGATION.md

# Commit for team
git add .claude/templates/CLAUDE_MD_DELEGATION.md
git commit -m "docs: update delegation protocol"
```

### 3. Version Control Templates

```bash
# Track templates in git
git add .claude/templates/*.md
git commit -m "feat: add CLAUDE.md template management"
```

This allows:
- Team members to get the same configuration
- Rolling back to previous versions
- Reviewing changes via PR

## FAQ

**Q: Will this overwrite my custom CLAUDE.md instructions?**
A: No! The updater only manages marked sections. Everything else is preserved.

**Q: Can I edit the managed sections manually?**
A: Yes, but next update will revert them. Instead, edit the templates in `.claude/templates/`.

**Q: What if I don't want a managed section?**
A: Remove the section markers from your CLAUDE.md, and the updater will skip it.

**Q: Can I run this on multiple projects?**
A: Yes! Templates are per-project in `.claude/templates/`, but they all update the same global `~/.claude/CLAUDE.md`.

**Q: What's the difference between CLAUDE.md and templates?**
A:
- `~/.claude/CLAUDE.md` - Your global config (all projects)
- `.claude/templates/*.md` - Project-specific "ideal state" for managed sections

## Support

**Documentation:**
- This guide: `.claude/docs/CLAUDE_MD_UPDATER.md`
- Script source: `.claude/scripts/update-claude-md.sh`
- Templates: `.claude/templates/CLAUDE_MD_*.md`

**Logs:**
- Backups: `~/.claude/CLAUDE.md.backup.*`

---

**Remember:** The updater preserves your content while keeping our autonomous execution rules up-to-date. When in doubt, use `--dry-run` first!
