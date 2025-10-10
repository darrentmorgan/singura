# Hook Errors Fix - October 10, 2025

## Problem Summary

Both `adrocketx` and `saas-xray` projects were experiencing hook execution failures with "No such file or directory" errors for:
- `.claude/hooks/agent-depth-guard.sh`
- `.claude/hooks/agent-stack-manager.sh`
- `.claude/hooks/delegation-logger.sh`

## Root Cause

1. **Experimental Task hooks configured but files missing**:
   - `adrocketx` had `PreToolUse:Task` and `PostToolUse:Task` hooks configured in `.claude/settings.local.json`
   - These hooks referenced scripts that were created in an experimental session but never properly deployed
   - The hook scripts existed in backups but were not in the active projects

2. **saas-xray broken symlink**:
   - `.claude/agents/configs` was a symlink pointing to `~/.claude/agents/shared/configs`
   - This global directory was deleted during the global-to-local settings migration
   - The broken symlink prevented Claude Code from loading ANY agent configurations

## Solution Applied

### Phase 1: Fixed saas-xray Agent Configuration
✅ **Removed broken symlink**: Deleted `.claude/agents/configs` symlink
✅ **Created proper configs directory**: Copied all 20+ agent configs from template
✅ **Updated settings**: Synced `.claude/settings.local.json` with template

### Phase 2: Removed Experimental Task Hooks
✅ **Cleaned adrocketx hooks**: Removed `PreToolUse:Task` and `PostToolUse:Task` configurations
✅ **Cleaned saas-xray hooks**: Ensured no Task hooks present
✅ **Replaced with template hooks**: Used stable `PreToolUse:Bash` hooks from template

### Phase 3: Synced Hook Files
✅ **Copied missing hooks to both projects**:
- `tool.bash.block.sh` - Bash command validation
- `post-git-push.sh` - Post-push automation
- `user-prompt-submit.sh` - Pre-request processing
- `plugin-router.sh` - Plugin routing

## Files Changed

### adrocketx
```
Modified:
  .claude/settings.local.json         (removed Task hooks)

Added:
  .claude/hooks/plugin-router.sh
  .claude/hooks/post-git-push.sh
  .claude/hooks/tool.bash.block.sh
  .claude/hooks/user-prompt-submit.sh
```

### saas-xray
```
Deleted:
  .claude/agents/configs              (broken symlink)

Added:
  .claude/agents/configs/             (20+ agent configs)
  .claude/hooks/plugin-router.sh
  .claude/hooks/post-git-push.sh
  .claude/hooks/tool.bash.block.sh
  .claude/hooks/user-prompt-submit.sh

Modified:
  .claude/settings.local.json         (updated permissions & hooks)
```

## Hook Configuration Now (Both Projects)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "command": ".claude/hooks/tool.bash.block.sh \"$COMMAND\"",
          "blockOnFailure": true
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{
          "command": ".claude/hooks/tool-use.sh \"$FILE_PATH\""
        }]
      },
      {
        "matcher": "Write",
        "hooks": [{
          "command": ".claude/hooks/tool-use.sh \"$FILE_PATH\""
        }]
      },
      {
        "matcher": "Bash(git push:*)",
        "hooks": [{
          "command": ".claude/hooks/post-git-push.sh"
        }]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "command": ".claude/hooks/user-prompt-submit.sh \"$USER_MESSAGE\"" },
          { "command": ".claude/hooks/pre-request-router.sh \"$USER_MESSAGE\"" },
          { "command": ".claude/hooks/plugin-router.sh \"$USER_MESSAGE\"" }
        ]
      }
    ]
  }
}
```

## Why Task Hooks Were Removed

The `PreToolUse:Task` and `PostToolUse:Task` hooks were experimental features designed to:
- Track agent delegation depth (prevent infinite recursion)
- Maintain agent call stack
- Log delegation history

**However:**
- They were never fully implemented or tested
- The scripts existed only in backups, not in production
- The template works perfectly without them
- They added complexity without proven benefit
- Delegation works fine using Claude Code's built-in Task tool

## Verification

After applying fixes:

✅ **saas-xray**: Can now load agent configurations
✅ **adrocketx**: No more hook errors
✅ **Both projects**: All hooks reference existing, working scripts
✅ **Template**: Remains the source of truth for hook configurations

## Prevention

To prevent this in the future:

1. **Never add hook configurations without verifying the scripts exist**
2. **Always sync hooks from template, don't create experimental ones**
3. **Test hooks after migration or major changes**
4. **Keep hook scripts in template for easy distribution**
5. **Document any new hooks before deploying**

## Related Documentation

- [Global vs Local Settings](/.claude/docs/GLOBAL_VS_LOCAL_SETTINGS.md)
- [Migration Summary](/MIGRATION_SUMMARY.md)
- [Template Sync Script](/scripts/sync-from-template.sh)

---

**Status**: ✅ Fixed
**Date**: October 10, 2025
**Impact**: Both projects now work without hook errors
