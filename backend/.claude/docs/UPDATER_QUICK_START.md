# CLAUDE.md Intelligent Updater - Quick Start

## The Problem You Wanted Solved

**Before:** Setup scripts would **override** the user's entire `~/.claude/CLAUDE.md` file, losing their custom instructions.

**Now:** The intelligent updater:
- ✅ Detects if our sections already exist
- ✅ Compares line-by-line and only updates if needed
- ✅ **Appends** to existing files, preserving user content
- ✅ Creates automatic backups
- ✅ Shows diffs before updating

## Quick Test

```bash
# 1. Test what would happen (safe)
cd /path/to/claude-config-template
.claude/scripts/update-claude-md.sh --dry-run

# 2. Apply updates (with confirmation)
.claude/scripts/update-claude-md.sh

# 3. Check your CLAUDE.md
cat ~/.claude/CLAUDE.md
```

## What It Does

### Scenario 1: User Has No CLAUDE.md
```bash
$ .claude/scripts/update-claude-md.sh

▶ CLAUDE.md not found
  ❓ Create new CLAUDE.md? (y/n): y
  ✓ Created with our sections

Result: New file created with delegation + autonomy sections
```

### Scenario 2: User Has CLAUDE.md Without Our Sections
```bash
$ .claude/scripts/update-claude-md.sh

▶ Checking DELEGATION section...
  ⚠ Section not found
  ❓ Add section? (y/n): y
  ✓ Section appended (user content preserved!)

▶ Checking AUTONOMY section...
  ⚠ Section not found
  ❓ Add section? (y/n): y
  ✓ Section appended (user content preserved!)

Result: Our sections added to END of their existing file
```

### Scenario 3: User Has Our Sections Already
```bash
$ .claude/scripts/update-claude-md.sh

▶ Checking DELEGATION section...
  ✓ Up-to-date

▶ Checking AUTONOMY section...
  ✓ Up-to-date

Result: No changes (sections match templates)
```

### Scenario 4: User Has Old Version of Our Sections
```bash
$ .claude/scripts/update-claude-md.sh

▶ Checking AUTONOMY section...
  ⚠ Section differs from template

  Diff:
  - Old line 15
  + New line 15

  ❓ Update section? (y/n): y
  ✓ Backup created: CLAUDE.md.backup.20251009_114530
  ✓ Section updated

Result: Only that section replaced, rest of file untouched
```

## How It Works - The Magic

### 1. Section Markers

We wrap our content with markers in CLAUDE.md:

```markdown
# User's custom instructions here
Their own development guidelines...

---

# ⚡ DELEGATION-FIRST PROTOCOL    ← START MARKER
Our delegation instructions...
# ⚡ END DELEGATION-FIRST PROTOCOL  ← END MARKER

## ⚡ AUTONOMOUS EXECUTION MODE    ← START MARKER
Our autonomy instructions...
## ⚡ END AUTONOMOUS EXECUTION MODE  ← END MARKER
```

### 2. Templates

Templates stored in `.claude/templates/`:
- `CLAUDE_MD_DELEGATION.md`
- `CLAUDE_MD_AUTONOMY.md`

These are auto-generated from current CLAUDE.md on first run.

### 3. Smart Comparison

```python
if section_not_found:
    append_to_file()  # Preserve user content
elif section_matches_template:
    skip()  # Already up-to-date
else:
    show_diff()
    ask_confirmation()
    backup_file()
    replace_section_only()  # Leave rest of file alone
```

## Real-World Example

### Your Current CLAUDE.md:
```markdown
# My Company's Development Standards

- Use Python 3.11+
- Always write docstrings
- Test coverage > 80%

# ⚡ DELEGATION-FIRST PROTOCOL
... (old version from 2 weeks ago) ...
# ⚡ END DELEGATION-FIRST PROTOCOL
```

### Run Updater:
```bash
$ .claude/scripts/update-claude-md.sh

▶ Checking DELEGATION section...
  ⚠ Section differs (5 lines changed)
  ❓ Update? (y/n): y
  ✓ Updated
```

### Result:
```markdown
# My Company's Development Standards   ← PRESERVED!

- Use Python 3.11+                     ← PRESERVED!
- Always write docstrings              ← PRESERVED!
- Test coverage > 80%                  ← PRESERVED!

# ⚡ DELEGATION-FIRST PROTOCOL          ← UPDATED!
... (latest version) ...
# ⚡ END DELEGATION-FIRST PROTOCOL      ← UPDATED!
```

## Integration with Setup

Add to `setup.sh`:

```bash
# Update global CLAUDE.md with latest delegation rules
echo "Checking CLAUDE.md configuration..."
.claude/scripts/update-claude-md.sh --force

# Now setup project-specific config...
```

This ensures:
- All team members have latest autonomous execution rules
- User customizations are never lost
- Templates can be version-controlled and shared

## Key Benefits

1. **Never Loses User Content** - Appends, never overwrites
2. **Smart Updates** - Only changes what needs changing
3. **Automatic Backups** - Every change creates timestamped backup
4. **Transparent** - Shows diffs before updating
5. **Safe Testing** - `--dry-run` mode shows what would happen
6. **Version Controlled** - Templates in git for team consistency

## Files Created

```
.claude/
├── scripts/
│   └── update-claude-md.sh          ← The intelligent updater
├── templates/
│   ├── CLAUDE_MD_DELEGATION.md      ← Template: delegation section
│   └── CLAUDE_MD_AUTONOMY.md        ← Template: autonomy section
└── docs/
    ├── CLAUDE_MD_UPDATER.md         ← Full documentation
    └── UPDATER_QUICK_START.md       ← This file
```

## Next Steps

1. **Test it:**
   ```bash
   .claude/scripts/update-claude-md.sh --dry-run
   ```

2. **Apply it:**
   ```bash
   .claude/scripts/update-claude-md.sh
   ```

3. **Customize templates** (optional):
   ```bash
   vim .claude/templates/CLAUDE_MD_AUTONOMY.md
   .claude/scripts/update-claude-md.sh --force
   ```

4. **Commit for team:**
   ```bash
   git add .claude/templates/ .claude/scripts/ .claude/docs/
   git commit -m "feat: add intelligent CLAUDE.md updater"
   ```

---

**Bottom Line:** Your users can now safely run the updater without fear of losing their custom instructions!
