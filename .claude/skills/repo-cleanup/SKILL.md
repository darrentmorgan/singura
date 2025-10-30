---
name: repo-cleanup
description: Intelligent repository cleanup - assess root files, extract learnings, update CLAUDE.md, and archive completed work. Use after major features complete or when root directory accumulates documentation files.
---

# Repository Cleanup for Singura

This skill provides a systematic workflow for maintaining a clean repository by identifying completed work, archiving documentation, extracting learnings, and integrating insights into CLAUDE.md.

## When to Use This Skill

Use repo-cleanup when:
- Root folder has accumulated documentation files (>10 MD files)
- Major feature implementation completed (OAuth, detection, dashboard)
- Need to consolidate learnings into CLAUDE.md
- Repository feels cluttered or disorganized
- Want to archive completed work for historical reference
- After sprint/milestone completion

**Do NOT use for**:
- Essential project files (README.md, CLAUDE.md, RUNBOOK.md, AGENTS.md)
- Active OpenSpec change proposals (in `openspec/changes/`)
- Files currently being worked on
- Production documentation (in `docs/` subdirectories)

## Cleanup Categories

### 1. Archive Candidates
**Pattern Match**: Files that indicate completed work
- `*IMPLEMENTATION*COMPLETE*.md` - Completed implementation reports
- `*IMPLEMENTATION*SUMMARY*.md` - Post-completion summaries
- `*STATUS*.md` (with completion dates) - Feature status reports
- `*FIX*SUMMARY*.md` - Bug fix summaries
- `*VALIDATION*REPORT*.md` - Testing validation reports
- `*MIGRATION*.md` (dated/completed) - Migration documentation
- `*CLEANUP*.md` - Cleanup reports

**Action**: Move to `.archive/YYYY-MM/feature-name/` with metadata

### 2. Integration Candidates
**Pattern Match**: Files with new patterns/learnings
- Files mentioning "pattern", "lesson learned", "gotcha"
- Performance optimization reports
- Security audit findings
- Testing strategy documents
- Architecture decisions

**Action**: Extract learnings → Add to CLAUDE.md → Archive

### 3. Relocation Candidates
**Pattern Match**: Files in wrong location
- `*TEST*GUIDE*.md` → `docs/testing/`
- `*API*.md` (API reference) → `docs/api/`
- `*ARCHITECTURE*.md` → `docs/architecture/`
- `*DEMO*.md` → `docs/guides/`
- `*MANUAL*.md` → `docs/guides/`

**Action**: Move to appropriate subdirectory

### 4. Deletion Candidates
**Pattern Match**: Temporary/redundant files
- `*.log` - Log files
- `*.tmp`, `*.temp` - Temporary files
- `*_OLD*.md`, `*_BACKUP*.md` - Backup files
- Duplicate copies (check content similarity)
- Superseded documentation

**Action**: Delete after confirmation

### 5. Essential Files (NEVER TOUCH)
**Patterns**: Core project documentation
- `README.md` - Project overview
- `CLAUDE.md` - AI assistant instructions
- `RUNBOOK.md` - Operations guide
- `AGENTS.md` - Agent configuration reference
- `package.json`, `tsconfig.json`, etc. - Config files

**Action**: Always exclude from cleanup

## Cleanup Workflow

### Step 1: Scan & Categorize Root Files

**Discover non-essential root files**:
```bash
# List all markdown files in root (excluding essentials)
ls -lh *.md | grep -vE "(README|CLAUDE|RUNBOOK|AGENTS).md"

# Show file counts by pattern
ls -1 *IMPLEMENTATION*.md 2>/dev/null | wc -l
ls -1 *SUMMARY*.md 2>/dev/null | wc -l
ls -1 *STATUS*.md 2>/dev/null | wc -l
ls -1 *FIX*.md 2>/dev/null | wc -l
```

**For each file, assess**:
- Last modified date: `stat -f "%Sm" -t "%Y-%m-%d" filename.md`
- Content indicators: `grep -i "complete\|done\|finished" filename.md | head -3`
- File size: `wc -l filename.md`

**Categorize automatically**:
- Contains "COMPLETE" or "DONE" → Archive
- Contains "pattern", "learned", "gotcha" → Integration
- Matches location pattern → Relocate
- Temporary extension or duplicate → Delete
- Essential filename → Exclude

### Step 2: Extract Learnings for Integration

**For each Archive/Integration candidate**:

1. **Read full content** to identify:
   - New patterns discovered
   - Gotchas/pitfalls encountered
   - Performance optimizations
   - Security improvements
   - Testing strategies
   - Architecture decisions

2. **Extract structured insights**:
   ```markdown
   **Pattern**: [Pattern name]
   **Context**: [When this applies]
   **Solution**: [How to implement]
   **Key Insight**: [Why this matters]
   **Performance**: [Metrics if applicable]
   **Compliance**: [Security/regulatory notes]
   **Reference**: [Archive location]
   ```

3. **Identify CLAUDE.md target section**:
   - New coding pattern → "Critical Patterns"
   - Bug/gotcha → "Critical Pitfalls"
   - OAuth insight → "Validated OAuth Patterns"
   - Testing approach → "TDD Workflow" or "Comprehensive Testing"
   - Performance win → Relevant feature section
   - Architecture decision → "Singura Tech Stack" or create new section

### Step 3: Update CLAUDE.md

**Add timestamped entries** to appropriate sections:

**Example Pattern Addition**:
```markdown
## Critical Patterns (Must Follow)

### [N+1]. Vendor Grouping Pattern [2025-10-30]
**Context**: Group OAuth apps by vendor while preserving individual audit trail
**Solution**: View-layer grouping with database vendor extraction columns
**Implementation**:
```typescript
// Extract vendor from app name/description
const vendor = extractVendor(app.name, app.description);
// Group in UI, query individually in database
const grouped = groupByVendor(apps);
```
**Key Insights**:
- Pattern matching achieves 90%+ accuracy for vendor extraction
- Preserves compliance (SOC 2/GDPR) by tracking individual apps
- <10ms API overhead for grouped queries
- Fallback to "Unknown Vendor" for edge cases

**Performance**: Tested with 10K apps, <50ms grouping time
**Reference**: `.archive/2025-10/vendor-grouping/`
```

**Example Pitfall Addition**:
```markdown
## Critical Pitfalls (MUST AVOID)

### 8. Jest Integration Test Imports [2025-10-30]
**Problem**: Pool undefined errors in integration tests, port conflicts
**Root Cause**: Importing from `src/server.ts` starts live server during test setup
**Symptoms**:
- "Pool is not defined" errors
- Port 4201 already in use
- Tests hang waiting for server

**Solution**:
```typescript
// ❌ WRONG - Imports start server
import { app } from '../src/server';

// ✅ CORRECT - Mock or separate exports
import { pool } from '../src/db/pool';
// OR restructure: server.ts exports app, index.ts starts server
```

**Prevention**:
- Separate server initialization from app export
- Use `src/server.ts` for app export only
- Use `src/index.ts` for server startup
- Mock database pool in test setup

**Reference**: `.archive/2025-10/vendor-grouping/IMPLEMENTATION_COMPLETE.md#known-issues`
```

**Maintain section structure**:
- Keep existing numbering/formatting
- Add new entries at end of section
- Include timestamp [YYYY-MM-DD]
- Link to archive location
- Use consistent heading levels

### Step 4: Create Archive Structure

**For each Archive candidate**:

1. **Determine archive folder**:
   ```bash
   # Extract completion date from file or use current date
   ARCHIVE_DATE=$(grep -oE "20[0-9]{2}-[0-9]{2}-[0-9]{2}" filename.md | head -1)
   ARCHIVE_MONTH=$(echo $ARCHIVE_DATE | cut -d'-' -f1,2)  # e.g., "2025-10"

   # Create feature-specific folder
   mkdir -p .archive/$ARCHIVE_MONTH/feature-name
   ```

2. **Move related files**:
   ```bash
   # Move all related documentation
   mv VENDOR_GROUPING_*.md .archive/2025-10/vendor-grouping/
   mv backend/migrations/*vendor*.sql .archive/2025-10/vendor-grouping/migrations/
   ```

3. **Create metadata file** (`.archive/YYYY-MM/feature-name/_metadata.json`):
   ```json
   {
     "archived_date": "2025-10-30",
     "feature": "vendor-grouping",
     "status": "implemented",
     "completion_date": "2025-10-28",
     "commit_hash": "ed4db61",
     "learnings_added_to_claude_md": true,
     "claude_md_sections_updated": [
       "Critical Patterns (Vendor Grouping Pattern)",
       "Critical Pitfalls (Jest Integration Test Imports)"
     ],
     "files_archived": [
       "VENDOR_GROUPING_IMPLEMENTATION_SUMMARY.md",
       "VENDOR_GROUPING_STATUS.md"
     ],
     "key_learnings": [
       "View-layer grouping preserves compliance",
       "Pattern matching achieves 90%+ vendor extraction accuracy",
       "Jest test imports must avoid server startup"
     ],
     "related_commits": [
       "ed4db61 - Vendor grouping implementation",
       "a1b2c3d - Fix integration test setup"
     ],
     "tags": ["oauth", "ui-enhancement", "compliance"]
   }
   ```

4. **Create archive README** (`.archive/YYYY-MM/feature-name/README.md`):
   ```markdown
   # Vendor Grouping - Archived 2025-10-30

   ## Feature Summary
   Implemented view-layer grouping of OAuth apps by vendor while preserving individual audit trail for compliance.

   ## Status
   ✅ Implemented and merged (commit: ed4db61)

   ## Key Files
   - `VENDOR_GROUPING_IMPLEMENTATION_SUMMARY.md` - Complete implementation details
   - `VENDOR_GROUPING_STATUS.md` - Final status report
   - `migrations/` - Database migration files

   ## Learnings Integrated
   See CLAUDE.md sections:
   - Critical Patterns: Vendor Grouping Pattern [2025-10-30]
   - Critical Pitfalls: Jest Integration Test Imports [2025-10-30]

   ## Related PRs
   - PR #123: Vendor grouping implementation
   - PR #124: Integration test fixes

   ## Performance Metrics
   - 90%+ vendor extraction accuracy
   - <10ms API overhead
   - <50ms grouping time for 10K apps

   ## Compliance Notes
   - SOC 2 compliant (individual app tracking)
   - GDPR compliant (audit trail preserved)
   ```

### Step 5: Handle Relocations

**Move files to proper subdirectories**:

```bash
# Testing documentation
mv MANUAL_TEST_GUIDE.md docs/testing/manual-test-guide.md

# Demo/strategy documents
mv DEMO_STRATEGY_RECOMMENDATIONS.md docs/guides/demo-strategy.md

# API documentation
mv API_REFERENCE_UPDATE.md docs/api/updates/$(date +%Y-%m-%d)-update.md

# Architecture decisions
mv ARCHITECTURE_DECISION_*.md docs/architecture/decisions/
```

**Update internal links** if moving referenced files:
```bash
# Search for links to moved file
grep -r "MANUAL_TEST_GUIDE.md" .

# Update links in files that reference it
sed -i '' 's|MANUAL_TEST_GUIDE.md|docs/testing/manual-test-guide.md|g' referencing-file.md
```

### Step 6: Clean Up Temporary Files

**Identify temporary files**:
```bash
# Find log files
find . -maxdepth 1 -name "*.log" -type f

# Find temp files
find . -maxdepth 1 -name "*.tmp" -o -name "*.temp" -type f

# Find backup files
find . -maxdepth 1 -name "*_OLD.md" -o -name "*_BACKUP.md" -type f

# Find duplicate files (manual review required)
ls -1 *SUMMARY*.md | sort
```

**Delete after confirmation**:
```bash
# Show what will be deleted
echo "Files to delete:"
find . -maxdepth 1 \( -name "*.log" -o -name "*.tmp" \) -type f

# Delete (only after user confirms)
find . -maxdepth 1 \( -name "*.log" -o -name "*.tmp" \) -type f -delete
```

### Step 7: Git Integration

**Commit changes in logical groups**:

```bash
# Commit 1: Archive documentation
git add .archive/
git commit -m "docs: archive completed vendor grouping implementation

Archived files:
- VENDOR_GROUPING_IMPLEMENTATION_SUMMARY.md
- VENDOR_GROUPING_STATUS.md

Added metadata and archive README for historical reference.
Reference: .archive/2025-10/vendor-grouping/"

# Commit 2: Update CLAUDE.md with learnings
git add CLAUDE.md
git commit -m "docs: integrate vendor grouping learnings into CLAUDE.md

Added:
- Critical Patterns: Vendor Grouping Pattern [2025-10-30]
- Critical Pitfalls: Jest Integration Test Imports [2025-10-30]

Extracted from archived implementation documentation."

# Commit 3: Relocate files
git add docs/testing/ docs/guides/
git commit -m "docs: relocate testing and guide documentation to proper subdirectories

Moved:
- MANUAL_TEST_GUIDE.md → docs/testing/manual-test-guide.md
- DEMO_STRATEGY_RECOMMENDATIONS.md → docs/guides/demo-strategy.md"

# Commit 4: Delete temporary files
git rm *.log *.tmp
git commit -m "chore: remove temporary files and logs"

# Commit 5: Final cleanup
git status
git commit -m "chore: complete repository cleanup 2025-10-30

Summary:
- Archived 4 completed implementation docs
- Updated CLAUDE.md with 2 new learnings
- Relocated 3 files to proper subdirectories
- Removed 6 temporary files
- Root directory now clean (5 essential files only)"
```

## Safety Guardrails

### Always Preview Before Executing

**Show categorization plan**:
```markdown
🧹 Repository Cleanup Plan

📁 Files Scanned: 24 root-level MD files

📦 Archive (4 files → .archive/2025-10/):
  ├─ VENDOR_GROUPING_IMPLEMENTATION_SUMMARY.md
  ├─ VENDOR_GROUPING_STATUS.md
  ├─ WEBSOCKET_VALIDATION_IMPLEMENTATION_REPORT.md
  └─ PHASE1_IMPLEMENTATION_COMPLETE.md

📝 Integration (Extract learnings → CLAUDE.md):
  ├─ Vendor Grouping Pattern (from VENDOR_GROUPING_*)
  ├─ Jest Integration Test Issue (from IMPLEMENTATION_SUMMARY)
  └─ WebSocket Validation Pattern (from WEBSOCKET_*)

📂 Relocate (3 files → docs/):
  ├─ MANUAL_TEST_GUIDE.md → docs/testing/
  ├─ DEMO_STRATEGY_RECOMMENDATIONS.md → docs/guides/
  └─ DEVELOPMENT_WARNINGS_INVESTIGATION.md → docs/troubleshooting/

🗑️  Delete (6 files - temporary):
  ├─ debug.log
  ├─ test-output.tmp
  ├─ PHASE1_VISUAL_GUIDE_OLD.md
  ├─ BACKUP_CLAUDE_MD.md
  ├─ duplicate-summary.md
  └─ temp-notes.txt

✋ Exclude (5 essential files):
  ├─ README.md
  ├─ CLAUDE.md
  ├─ RUNBOOK.md
  ├─ AGENTS.md
  └─ package.json

Proceed? [y/N]
```

### Dry Run Mode

**Default to showing actions without executing**:
```bash
# Enable dry-run by default
DRY_RUN=true

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would move: $file → $destination"
else
  mv "$file" "$destination"
fi
```

### Confirmation Prompts

**Require user confirmation for**:
- Deleting files (show list, ask confirmation)
- Updating CLAUDE.md (show diff, ask confirmation)
- Moving files that may be referenced elsewhere
- Any action on files modified in last 7 days

**Auto-approve for**:
- Creating archive directories
- Moving files with COMPLETE/DONE status (>30 days old)
- Creating metadata files

### Atomic Operations

**Order operations for safety**:
1. **Create archives first** (safest, recoverable)
2. **Update CLAUDE.md** (reviewable via git diff)
3. **Relocate files** (git mv preserves history)
4. **Delete temporary files last** (after everything else succeeds)

**Rollback on error**:
```bash
# If any step fails, provide rollback instructions
if [ $? -ne 0 ]; then
  echo "❌ Error occurred. To rollback:"
  echo "  git reset --hard HEAD"
  echo "  git clean -fd .archive/"
  exit 1
fi
```

### Content Validation

**Before archiving**:
- Verify file is not empty (`wc -l > 10`)
- Check for completion markers (`grep -i "complete\|done"`)
- Confirm no TODO markers (`! grep -i "TODO\|FIXME"`)
- Validate not referenced in active code (`! grep -r "filename" src/`)

**Before deleting**:
- Verify truly temporary (extension .log, .tmp, .temp)
- Check not referenced elsewhere (`! grep -r "filename" .`)
- Confirm older than 7 days
- Show file size/content preview for manual review

## File Assessment Criteria

### Should Archive
**High Confidence** (auto-categorize):
- `*IMPLEMENTATION*COMPLETE*.md` - Completed implementation reports
- `*IMPLEMENTATION*SUMMARY*.md` - Post-implementation summaries
- `*FIX*SUMMARY*.md` - Bug fix summaries completed
- `*VALIDATION*REPORT*.md` - Testing validation completed
- Contains "Status: ✅ Complete" or "Implementation: Done"
- Last modified >30 days ago + contains "COMPLETE"

**Medium Confidence** (review required):
- `*STATUS*.md` - Check if marked complete
- `*MIGRATION*.md` - Check if migration applied
- Files with completion dates but no "COMPLETE" marker

**Low Confidence** (manual review):
- Generic summaries without completion status
- Recent files (<7 days)
- Files with TODO/FIXME markers

### Should Integrate (Extract Learnings)
**High Value** (always extract):
- Files mentioning "pattern", "learned", "gotcha", "pitfall"
- Performance optimization reports with metrics
- Security findings with solutions
- Architecture decision records

**Medium Value** (extract if unique):
- Testing strategy documents (if not already in CLAUDE.md)
- Bug fix explanations (if novel issue)
- Migration guides (if reusable pattern)

**Low Value** (skip extraction):
- Generic status updates
- Duplicate information already in CLAUDE.md
- Vendor-specific details without broader lessons

### Should Relocate
**Clear Patterns**:
- `*TEST*GUIDE*.md` → `docs/testing/`
- `*API*REFERENCE*.md` → `docs/api/`
- `*ARCHITECTURE*.md` → `docs/architecture/`
- `*DEMO*.md`, `*STRATEGY*.md` → `docs/guides/`
- `*MANUAL*.md` (user guides) → `docs/guides/`
- `*INVESTIGATION*.md`, `*DEBUG*.md` → `docs/troubleshooting/`

**Edge Cases** (manual decision):
- Files matching multiple patterns
- Files with project-wide scope (may stay in root)
- Quick reference cards (evaluate usage frequency)

### Should Delete
**Safe to Delete**:
- `*.log` - Log files (check git status first)
- `*.tmp`, `*.temp` - Temporary files
- `*_OLD*.md`, `*_BACKUP*.md` - Backup files
- `*_DUPLICATE*.md` - Duplicate copies
- Empty files (0 bytes or <10 lines)

**Review Before Deleting**:
- Files without clear temporary marker
- Recently modified files (<7 days)
- Files >100KB (may contain valuable data)
- Anything referenced in git history (last 10 commits)

### Essential Files (NEVER TOUCH)
**Always Exclude**:
- `README.md` - Project overview
- `CLAUDE.md` - AI assistant instructions
- `RUNBOOK.md` - Operations guide
- `AGENTS.md` - Agent configuration
- `package.json`, `package-lock.json` - Dependencies
- `tsconfig.json`, `*.config.js` - Build configs
- `.env*` - Environment files
- `.gitignore`, `.eslintrc*` - Tool configs
- `LICENSE`, `CONTRIBUTING.md` - Legal/community

## Output Format

**Summary Report**:
```markdown
🧹 Repository Cleanup Complete - 2025-10-30

## Scan Results
📁 Files Assessed: 24 root-level markdown files
⏱️  Scan Duration: 2.3 seconds

## Actions Taken

### 📦 Archived (4 files → .archive/2025-10/)
- **vendor-grouping/** (2 files)
  - VENDOR_GROUPING_IMPLEMENTATION_SUMMARY.md (547 lines)
  - VENDOR_GROUPING_STATUS.md (89 lines)
- **websocket-validation/** (1 file)
  - WEBSOCKET_VALIDATION_IMPLEMENTATION_REPORT.md (312 lines)
- **phase1-completion/** (1 file)
  - PHASE1_IMPLEMENTATION_COMPLETE.md (891 lines)

**Total Archived**: 1,839 lines of documentation

### 📝 CLAUDE.md Updates
**Sections Modified**: 2
- ✅ Critical Patterns: +1 entry (Vendor Grouping Pattern)
- ✅ Critical Pitfalls: +1 entry (Jest Integration Test Imports)

**Lines Added**: 47 lines of learnings extracted
**Timestamp**: All entries tagged [2025-10-30]

### 📂 Relocated (3 files → docs/)
- MANUAL_TEST_GUIDE.md → docs/testing/manual-test-guide.md
- DEMO_STRATEGY_RECOMMENDATIONS.md → docs/guides/demo-strategy.md
- DEVELOPMENT_WARNINGS_INVESTIGATION.md → docs/troubleshooting/warnings.md

### 🗑️  Deleted (6 files)
- debug.log (2.3 MB)
- test-output.tmp (145 KB)
- PHASE1_VISUAL_GUIDE_OLD.md (duplicate of version in docs/)
- BACKUP_CLAUDE_MD.md (outdated backup from 2025-08-15)
- duplicate-summary.md (duplicate content)
- temp-notes.txt (empty file)

**Space Freed**: 2.5 MB

### ✋ Preserved (5 essential files)
- README.md
- CLAUDE.md (updated)
- RUNBOOK.md
- AGENTS.md
- package.json

## Git Commits
✅ 5 commits created:
1. docs: archive completed implementation docs
2. docs: integrate learnings into CLAUDE.md
3. docs: relocate files to proper subdirectories
4. chore: remove temporary files
5. chore: complete repository cleanup 2025-10-30

## Repository Status

### Before Cleanup
- 📁 Root directory: 29 markdown files
- 📊 Essential vs documentation: 5 vs 24
- 🔍 Clutter score: HIGH (4.8:1 ratio)

### After Cleanup
- 📁 Root directory: 5 markdown files (essentials only)
- 📊 Essential vs documentation: 5 vs 0
- 🔍 Clutter score: OPTIMAL (1:0 ratio)

### Archive Structure
```
.archive/
└── 2025-10/
    ├── vendor-grouping/
    │   ├── README.md
    │   ├── _metadata.json
    │   ├── VENDOR_GROUPING_IMPLEMENTATION_SUMMARY.md
    │   └── VENDOR_GROUPING_STATUS.md
    ├── websocket-validation/
    │   ├── README.md
    │   ├── _metadata.json
    │   └── WEBSOCKET_VALIDATION_IMPLEMENTATION_REPORT.md
    └── phase1-completion/
        ├── README.md
        ├── _metadata.json
        └── PHASE1_IMPLEMENTATION_COMPLETE.md
```

## Next Steps

### Recommended Actions
- [ ] Review CLAUDE.md updates for accuracy
- [ ] Verify relocated files are accessible from new locations
- [ ] Update any external documentation linking to moved files
- [ ] Push commits to repository

### Future Cleanups
Next cleanup recommended when:
- 10+ new documentation files in root
- Major milestone completed
- 30 days have passed

### Quality Checks
Run these to verify cleanup success:
```bash
# Verify CLAUDE.md syntax
npm run lint:docs

# Check for broken internal links
npm run check:links

# Verify archive metadata is valid JSON
jq . .archive/2025-10/*/_metadata.json
```

## Summary
✅ **Success**: Repository cleaned, learnings integrated, history preserved
📈 **Impact**: Root directory clutter reduced by 83% (24→5 files)
🔒 **Safety**: All changes committed separately, rollback available
📚 **Knowledge**: 2 new patterns/pitfalls documented in CLAUDE.md
🗄️  **Archive**: 1,839 lines of documentation preserved for reference
```

## Common Scenarios

### Scenario 1: After Feature Implementation

**Context**: Just completed vendor grouping feature

**Files in Root**:
- `VENDOR_GROUPING_IMPLEMENTATION_SUMMARY.md` - 547 lines, completion report
- `VENDOR_GROUPING_STATUS.md` - 89 lines, final status
- `openspec/changes/group-automations-by-vendor/` - Active spec (keep)

**Cleanup Actions**:
1. ✅ Extract learnings:
   - Vendor extraction pattern (90%+ accuracy)
   - View-layer grouping preserves compliance
   - Jest integration test import gotcha
2. ✅ Update CLAUDE.md:
   - Add "Vendor Grouping Pattern" to Critical Patterns
   - Add "Jest Test Imports" to Critical Pitfalls
3. ✅ Archive to `.archive/2025-10/vendor-grouping/`
4. ✅ Create metadata + README
5. ✅ Commit: "docs: archive vendor grouping implementation"

**Result**: Root cleaned, knowledge preserved in CLAUDE.md, history in .archive/

### Scenario 2: After Testing Push

**Context**: Completed comprehensive testing suite

**Files in Root**:
- `OPENSPEC_IMPLEMENTATION_COMPLETE.md` - OpenSpec testing complete
- `PHASE1_IMPLEMENTATION_COMPLETE.md` - Phase 1 testing complete
- `QA_VERIFICATION_REPORT.md` - QA verification results
- `MANUAL_TEST_GUIDE.md` - Manual testing procedures

**Cleanup Actions**:
1. ✅ Extract learnings:
   - Mock server patterns (RFC compliant)
   - Ground truth dataset validation
   - Performance benchmarks (638x improvement)
2. ✅ Update CLAUDE.md:
   - Add to "Comprehensive Testing Best Practices"
3. ✅ Archive COMPLETE reports to `.archive/2025-10/testing-suite/`
4. ✅ Relocate MANUAL_TEST_GUIDE.md → `docs/testing/`
5. ✅ Relocate QA_VERIFICATION_REPORT.md → `docs/testing/qa/`

**Result**: Testing knowledge integrated, guides relocated to proper locations

### Scenario 3: Bug Fix Cleanup

**Context**: Fixed critical bugs in OAuth/routing

**Files in Root**:
- `GOOGLE_OAUTH_FIX_SUMMARY.md` - Google OAuth bug fix
- `AUTOMATIONS_REDIRECT_FIX_SUMMARY.md` - Redirect fix
- `BUG_REPORT_AUTOMATIONS_REDIRECT.md` - Original bug report
- `ROUTER_V7_MIGRATION.md` - Migration documentation

**Cleanup Actions**:
1. ✅ Extract learnings:
   - OAuth state management pattern
   - React Router v7 gotchas
   - Redirect handling best practices
2. ✅ Update CLAUDE.md:
   - Add to "Critical Pitfalls" (OAuth state loss)
   - Add to "Validated OAuth Patterns" (state handling)
3. ✅ Archive fixes to `.archive/2025-10/oauth-fixes/`
4. ✅ Keep ROUTER_V7_MIGRATION.md in root (active reference)

**Result**: Bug fix knowledge captured, active migration doc preserved

## Integration with Other Skills

### Before Using Repo-Cleanup

**Prerequisites**:
1. All active development work committed
2. No uncommitted changes in root directory
3. Recent git pull (avoid conflicts)

**Related Skills**:
- Use **skill-creator** to identify reusable patterns before archiving
- Use **dev-server-startup** to verify system still works after cleanup

### After Running Repo-Cleanup

**Follow-up Actions**:
1. Review CLAUDE.md updates for accuracy
2. Run tests to ensure relocations didn't break imports
3. Push git commits to remote
4. Update team on new archive structure

**Related Tasks**:
- Create PR if cleanup is significant (>10 files)
- Update wiki/confluence with archive locations
- Notify team of relocated documentation

## Troubleshooting

### Issue 1: Git Merge Conflicts

**Symptom**: Cleanup conflicts with concurrent work on same files

**Solution**:
```bash
# Abort cleanup
git reset --hard HEAD

# Pull latest changes
git pull origin main

# Re-run cleanup on updated repo
# (Most conflicts will be resolved by pulling first)
```

### Issue 2: Broken Links After Relocation

**Symptom**: Documentation links 404 after moving files

**Solution**:
```bash
# Find all links to relocated file
grep -r "MANUAL_TEST_GUIDE.md" .

# Update links automatically
find . -type f -name "*.md" -exec sed -i '' \
  's|MANUAL_TEST_GUIDE.md|docs/testing/manual-test-guide.md|g' {} +

# Verify no broken links remain
npm run check:links  # (if available)
```

### Issue 3: Accidentally Deleted Important File

**Symptom**: Deleted file that was still needed

**Solution**:
```bash
# Restore from last commit
git checkout HEAD -- filename.md

# Or restore from archive if already committed
cp .archive/2025-10/feature-name/filename.md ./
git add filename.md
git commit -m "chore: restore accidentally archived file"
```

### Issue 4: CLAUDE.md Update Too Large

**Symptom**: CLAUDE.md growing too large with all learnings

**Solution**:
- **Consolidate**: Merge similar patterns/pitfalls
- **Summarize**: Link to archive for full details
- **Split**: Consider creating `docs/PATTERNS.md` for overflow
- **Prune**: Remove outdated entries (>1 year old)

**Example Consolidation**:
```markdown
## Critical Patterns

### OAuth Integration Patterns [2025-10-30]
**Multiple implementations**: Slack, Google, Microsoft
**Common pattern**: State management, token refresh, error handling
**Details**: See `.archive/2025-10/oauth-fixes/PATTERNS.md`
**Quick Reference**:
- Always validate state parameter
- Use refresh tokens proactively (5min before expiry)
- Handle token revocation gracefully
```

## Validation Checklist

After running repo-cleanup, verify:

### Repository Structure
- [ ] Root directory has only essential files (≤10 files)
- [ ] `.archive/YYYY-MM/` folders created for each archived feature
- [ ] Each archive folder has `_metadata.json` + `README.md`
- [ ] Relocated files in proper subdirectories (`docs/testing/`, etc.)
- [ ] No temporary files remaining (*.log, *.tmp)

### Documentation Quality
- [ ] CLAUDE.md updated with learnings (timestamped entries)
- [ ] Archive READMEs contain summary + links to CLAUDE.md sections
- [ ] Metadata files are valid JSON (`jq . .archive/*/_metadata.json`)
- [ ] No broken internal links (`grep -r "](.*ARCHIVED_FILE" .`)
- [ ] Git history preserved for moved files (`git log --follow filename`)

### Git Integration
- [ ] All changes committed in logical groups (5 separate commits)
- [ ] Commit messages follow convention (docs:, chore:, etc.)
- [ ] No uncommitted changes remaining (`git status`)
- [ ] Archive folders added to git (`git ls-files .archive/`)
- [ ] Deletions recorded in git history (`git log --diff-filter=D`)

### Safety Checks
- [ ] Tests still pass after relocations (`npm test`)
- [ ] Build still works (`npm run build`)
- [ ] No import errors from moved files
- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] Development servers start correctly (use dev-server-startup skill)

### Knowledge Transfer
- [ ] New patterns/pitfalls documented in CLAUDE.md
- [ ] Archive locations referenced in CLAUDE.md
- [ ] Team notified of cleanup (if significant changes)
- [ ] Wiki/Confluence updated with archive structure (if applicable)

## Advanced Features

### Automated Cleanup (Future Enhancement)

**Pre-commit hook**:
```bash
#!/bin/bash
# .git/hooks/pre-commit
# Auto-archive files marked COMPLETE

# Find files with COMPLETE marker
COMPLETE_FILES=$(grep -l "Status.*Complete" *.md 2>/dev/null)

if [ -n "$COMPLETE_FILES" ]; then
  echo "⚠️  Found completed documentation files:"
  echo "$COMPLETE_FILES"
  echo ""
  echo "Run 'claude repo-cleanup' to archive these files"
  echo "Or commit with --no-verify to skip this check"
  exit 1
fi
```

### Integration with CI/CD

**GitHub Action** (`.github/workflows/cleanup-check.yml`):
```yaml
name: Cleanup Check

on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly on 1st

jobs:
  check-cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Count root documentation files
        id: count
        run: |
          COUNT=$(ls -1 *.md 2>/dev/null | grep -v -E "(README|CLAUDE|RUNBOOK|AGENTS)" | wc -l)
          echo "count=$COUNT" >> $GITHUB_OUTPUT

      - name: Create cleanup issue
        if: steps.count.outputs.count > 10
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🧹 Repository Cleanup Needed',
              body: `Root directory has ${process.env.COUNT} documentation files.\n\nRun \`claude repo-cleanup\` to archive completed work.`,
              labels: ['maintenance', 'documentation']
            })
```

### Batch Cleanup Script

**For cleaning multiple features at once**:
```bash
#!/bin/bash
# scripts/batch-cleanup.sh

FEATURES=(
  "vendor-grouping:2025-10-28"
  "websocket-validation:2025-10-15"
  "phase1-completion:2025-09-30"
)

for feature_date in "${FEATURES[@]}"; do
  IFS=':' read -r feature date <<< "$feature_date"

  echo "Archiving $feature (completed $date)..."

  # Create archive folder
  month=$(echo $date | cut -d'-' -f1,2)
  mkdir -p .archive/$month/$feature

  # Move files
  mv ${feature^^}_*.md .archive/$month/$feature/ 2>/dev/null

  # Create metadata
  # (generate metadata JSON)

  echo "✅ Archived $feature"
done

echo "Batch cleanup complete!"
```

## Related Documentation

- **CLAUDE.md**: Main development instructions (target for integration)
- **.claude/agents/README.md**: Agent delegation patterns
- **openspec/**: Change management system
- **docs/**: Production documentation (relocation target)

## Best Practices

### Do This ✅
- Run cleanup after major milestone completion
- Always preview before executing changes
- Extract learnings from every archived document
- Timestamp all CLAUDE.md entries
- Create comprehensive archive metadata
- Commit changes in logical groups
- Verify tests pass after relocations

### Avoid This ❌
- Don't delete files without confirmation
- Don't archive active work (check git blame)
- Don't skip metadata creation
- Don't relocate files without updating links
- Don't rush through learning extraction
- Don't commit everything in one massive commit
- Don't archive essential project files

## Metrics & Success Criteria

### Cleanup Quality Metrics
- **Clutter Reduction**: Target 80%+ reduction in root files
- **Knowledge Capture**: 100% of completed work has learnings extracted
- **Discoverability**: All archived work searchable via metadata
- **Safety**: Zero loss of important information

### Before/After Comparison
```
Before Cleanup:
├── Root directory: 24 documentation files
├── Essential files: 5 (README, CLAUDE, RUNBOOK, AGENTS, package.json)
├── Clutter ratio: 4.8:1 (documentation vs essential)
└── CLAUDE.md: Missing recent patterns (last update 2 months ago)

After Cleanup:
├── Root directory: 5 essential files only
├── Clutter ratio: 1:0 (optimal)
├── Archive: 3 feature folders, 1,839 lines preserved
├── CLAUDE.md: Updated with 2 new patterns/pitfalls
└── Relocated: 3 files to proper subdirectories
```

## Future Enhancements

### Planned Features
1. **AI-Powered Learning Extraction**: Use LLM to automatically extract patterns from archived docs
2. **Link Checker**: Automated broken link detection and fixing
3. **Archive Search**: CLI tool to search archived documentation
4. **Cleanup Templates**: Pre-defined cleanup profiles (post-sprint, post-release, etc.)
5. **Integration Metrics**: Track how often archived docs are referenced

### Community Contributions
Open to PRs for:
- Additional cleanup patterns
- Integration with other tools (Notion, Confluence, etc.)
- Archive visualization dashboard
- Automated learning extraction improvements

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-10-30
**Maintainer**: Singura Development Team
**Status**: ✅ Active
