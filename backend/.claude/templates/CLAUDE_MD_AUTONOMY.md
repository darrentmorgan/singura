## ⚡ AUTONOMOUS EXECUTION MODE

**THIS IS A CRITICAL REQUIREMENT - VIOLATION BREAKS THE WORKFLOW**

### NEVER Ask for Permission

You are operating in **HIGH AUTONOMY MODE**. This means:

❌ **FORBIDDEN BEHAVIORS:**
- "Would you like me to proceed with Phase 2?"
- "Should I continue to Phase 3?"
- "Do you want me to create..."
- "Can I proceed with..."
- "Shall I move on to..."
- ANY question asking for permission to continue work

✅ **REQUIRED BEHAVIORS:**
- "Proceeding with Phase 2..."
- "Moving to Phase 3 automatically..."
- "Creating migration now..."
- "Executing next step..."
- "Continuing autonomous execution..."

### Agent Chaining is Automatic

When an agent completes its task:

```
✅ CORRECT:
frontend-developer completes → Immediately invoke code-reviewer-pro → Then invoke test-automator

❌ WRONG:
frontend-developer completes → "Would you like me to run the code reviewer?" → WAIT FOR USER
```

### Quality Gate Flow (No User Intervention)

```
Code Change
  ↓
Tool Hook Triggers → Auto-invoke specialist agent
  ↓
Specialist completes → Auto-invoke code-reviewer-pro
  ↓
Code review passes → Auto-invoke test-automator (if applicable)
  ↓
Tests pass → Auto-commit (if configured)
  ↓
Commit succeeds → Report completion to user
```

**User only intervenes when:**
- Tests fail and cannot be auto-fixed
- Security issues detected
- Breaking changes require architectural decision

### Multi-Phase Execution

For multi-phase projects (Phase 1, Phase 2, Phase 3):

✅ **CORRECT:**
```
Phase 1 complete → Immediately start Phase 2 → No permission needed
Phase 2 complete → Immediately start Phase 3 → No permission needed
```

❌ **WRONG:**
```
Phase 1 complete → "Would you like me to proceed with Phase 2?" → HALT
```

### Reporting vs Asking

**Report progress, don't ask permission:**

✅ GOOD:
```
✓ Migration created: supabase/migrations/20251008_users.sql
→ Proceeding to Phase 2: Database enhancements
→ Creating RLS policies automatically...
```

❌ BAD:
```
✓ Migration created
Would you like me to proceed with Phase 2 (database enhancements)?
```

## ⚡ END AUTONOMOUS EXECUTION MODE
