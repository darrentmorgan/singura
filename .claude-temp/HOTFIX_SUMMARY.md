# Critical Hotfix: Setup Script Path Resolution Bug

**Issue ID**: Hotfix-001
**Severity**: Critical
**Fixed In**: commit `b061ebe`
**Date**: 2025-10-08

---

## 🐛 The Bug

The `setup.sh` script was using **relative paths** to copy template files, which caused catastrophic failures when the script couldn't find the files.

### What Happened

When a user ran `setup.sh` in their project:

1. Script detected existing `.claude` directory
2. Asked "Overwrite existing configuration? (y/n)"
3. If yes, deleted `.claude` directory with `rm -rf .claude`
4. Tried to copy files using **relative paths**: `cp -r agents .claude/`
5. **Failed** because `agents` didn't exist in the current directory
6. Result: **`.claude` deleted with no replacement files copied** ❌

### Root Cause

**Lines 108-113 of setup.sh** (original):
```bash
cp -r agents .claude/
cp -r hooks .claude/
cp -r commands .claude/
```

These paths were **relative to pwd (project directory)**, not relative to the script's location.

### Impact

- **User data loss**: Existing `.claude` configurations deleted
- **Failed installation**: No new files copied
- **User experience**: Catastrophic failure on first use

---

## ✅ The Fix

### Changes Made

1. **Added `SCRIPT_DIR` variable** to get script's actual location:
   ```bash
   SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
   ```

2. **Updated all copy commands** to use absolute paths:
   ```bash
   cp -r "$SCRIPT_DIR/agents" .claude/
   cp -r "$SCRIPT_DIR/hooks" .claude/
   cp -r "$SCRIPT_DIR/commands" .claude/
   ```

3. **Added validation** to verify template files exist:
   ```bash
   if [ ! -d "$SCRIPT_DIR/agents" ] || [ ! -d "$SCRIPT_DIR/hooks" ]; then
       echo "❌ Error: Template files not found!"
       exit 1
   fi
   ```

4. **Improved logging** to show template and installation locations:
   ```bash
   echo "Template location: $SCRIPT_DIR"
   echo "Installing to: $CURRENT_DIR"
   ```

### Testing

Verified the fix works correctly:

```bash
# Test 1: Run from template directory into separate project
cd /tmp/test-project
/path/to/claude-config-template/setup.sh
✅ SUCCESS: Files copied correctly

# Test 2: Verify paths are absolute
✅ Shows "Template location: /path/to/claude-config-template"
✅ Shows "Installing to: /tmp/test-project"

# Test 3: Verify all files copied
✅ agents/ directory present
✅ hooks/ directory present
✅ Placeholders replaced correctly
```

---

## 📋 Recovery Steps (For Affected Users)

If your `.claude` directory was deleted, recover it from git:

```bash
# Check if .claude was tracked by git
git status .claude

# If deleted, restore from git
git restore .claude/

# Verify files are back
ls -la .claude/
```

---

## 🚀 Safe Installation (Fixed Version)

The template now works correctly:

```bash
# Download and install (safe now!)
cd /path/to/your/project
npx degit darrentmorgan/claude-config-template .claude-temp
.claude-temp/setup.sh
rm -rf .claude-temp
```

Or pull latest if you already cloned:

```bash
cd claude-config-template
git pull
./setup.sh
```

---

## 🔒 Prevention Measures

**Added safeguards:**

1. ✅ Script validates template files exist before copying
2. ✅ Uses absolute paths (immune to pwd changes)
3. ✅ Shows clear messages about source and destination
4. ✅ Fails fast with helpful error messages

**Best practices enforced:**

- Always use `$SCRIPT_DIR` for script-relative paths
- Validate inputs before destructive operations
- Provide clear error messages with context
- Test script in clean environment before release

---

## 📊 Commit History

```
b061ebe - fix: critical path resolution bug in setup.sh
65ef084 - docs: update README for public release and add LICENSE
3507822 - feat: initial Claude Code configuration template
```

---

## 🙏 Acknowledgments

**Reported by**: User running setup in saas-xray project
**Impact**: Immediate (caught before widespread adoption)
**Fixed by**: Automated fix + testing pipeline

---

## 📝 Lessons Learned

1. **Always test scripts in isolated environments** before release
2. **Never assume current directory** - always use script-relative paths
3. **Add validation** before destructive operations
4. **Provide clear error messages** with actionable context
5. **Test recovery procedures** before users need them

---

**Status**: ✅ Fixed and deployed
**Repository**: https://github.com/darrentmorgan/claude-config-template
**Safe to use**: Yes (v1.0.1+)
