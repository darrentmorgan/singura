# Conductor Parallel Development Workflow Guide

## Overview

This guide provides step-by-step instructions for using Conductor to orchestrate parallel development of the AI Platform Detection feature across 4 isolated workspaces.

**Tool**: [Conductor](https://conductor.build/) by Melty Labs
**Purpose**: Run 4 Claude Code agents simultaneously on separate git worktrees
**Phases**: Gemini, ChatGPT, Claude, GPT-5 (Weeks 2-4)

---

## Prerequisites

### 1. Install Conductor
- **Platform**: Mac only
- **Download**: https://conductor.build/
- **Installation**: Download and install the Mac application

### 2. Ensure Phase 0 is Complete
```bash
# Verify Phase 0 merged to main
git log --oneline -5
# Should show: feat(types): add Phase 0 AI platform detection shared types

# Verify shared-types built
cd shared-types
npm run build
ls -la dist/platforms/ai-platforms.d.ts  # Should exist
```

### 3. Docker Containers Running
```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Verify
docker ps | grep postgres
docker ps | grep redis
```

---

## Conductor Configuration

### conductor.json (Already Created)

Located at repository root: `/Users/darrenmorgan/AI_Projects/saas-xray/conductor.json`

```json
{
  "scripts": {
    "setup": "npm install && cd shared-types && npm install && npm run build && cd ../backend && npm install && npm link @saas-xray/shared-types && cd ../frontend && npm install",
    "run": "cd backend && PORT=$CONDUCTOR_PORT npm run dev",
    "archive": "echo 'Archiving workspace'"
  },
  "runScriptMode": "nonconcurrent"
}
```

**What this does**:
- **Setup**: Installs dependencies, builds shared-types, links to backend
- **Run**: Starts backend dev server on dynamic port (assigned by Conductor)
- **Archive**: Cleanup when workspace is archived

---

## Step-by-Step Workflow

### Step 1: Launch Conductor Application

```bash
# Open Conductor (Mac app)
open -a Conductor
```

### Step 2: Add Repository

In Conductor UI:
1. Click **"Add Repository"**
2. Navigate to: `/Users/darrenmorgan/AI_Projects/saas-xray`
3. Click **"Open"**
4. Conductor will detect `conductor.json` automatically

### Step 3: Create Workspace 1 - Gemini Reporting API

**Configuration**:
- **Workspace Name**: `Phase 1 - Gemini Reporting API`
- **Branch**: `feature/gemini-reporting-api` (Conductor will create)
- **Base Branch**: `main`

**Initial Prompt** (paste into Claude Code when workspace opens):

```markdown
## Phase 1: Gemini Reporting API Integration

**Objective**: Extend GoogleConnector with Gemini audit log collection.

**Reference Documentation**: /docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md (Phase 1 section)

**Types Available** (from @saas-xray/shared-types):
- GeminiAuditEvent
- GeminiReportingAPIQuery
- GeminiReportingAPIResponse
- AIplatformAuditLog
- AIAuditLogResult

**Tasks** (Test-Driven Development):

1. **Write Tests First**:
   Create `backend/src/connectors/__tests__/google-gemini-extension.test.ts`
   - Test: Fetch Gemini audit logs via Admin SDK
   - Test: Normalize Gemini events to AIplatformAuditLog
   - Test: Handle pagination
   - Test: Filter by event types

2. **Implement GeminiReportingAPI Class**:
   Create `backend/src/connectors/extensions/gemini-reporting-api.ts`
   - Method: getGeminiAuditLogs(query: AIAuditLogQuery)
   - Method: normalizeGeminiEvents(events: GeminiAuditEvent[])
   - Method: getUsageMetrics(period: AIDateRange)

3. **Integration**:
   Update `backend/src/connectors/google.ts`:
   - Add GeminiReportingAPI instance
   - Expose getAIAuditLogs() method
   - Test with real Google Workspace account

4. **Validation**:
   Run tests: `npm test -- --testPathPattern=gemini`
   Verify TypeScript: `npm run verify:types`

**Success Criteria**:
- ✅ All tests passing (100% coverage)
- ✅ Real Gemini audit logs retrieved
- ✅ Events normalized correctly
- ✅ TypeScript compilation clean

**Environment**:
Use Docker PostgreSQL (local development)
```

**Actions**:
1. Click **"Create Workspace"** in Conductor
2. Wait for setup script to complete (~2-3 minutes)
3. Conductor opens Claude Code in new workspace
4. Paste the prompt above into Claude Code
5. Let Claude Code execute the tasks

---

### Step 4: Create Workspace 2 - ChatGPT Enterprise

**Configuration**:
- **Workspace Name**: `Phase 2 - ChatGPT Enterprise`
- **Branch**: `feature/chatgpt-enterprise`
- **Base Branch**: `main`

**Initial Prompt**:

```markdown
## Phase 2: ChatGPT Enterprise Connector

**Objective**: Build ChatGPT Enterprise Compliance API connector.

**Reference Documentation**: /docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md (Phase 2 section)

**Types Available** (from @saas-xray/shared-types):
- ChatGPTAuditLogEntry
- ChatGPTAuditLogQuery
- ChatGPTComplianceAPIConfig
- AIPlatformConnector
- AIplatformAuditLog

**Tasks** (Test-Driven Development):

1. **Write Tests First**:
   Create `backend/src/connectors/__tests__/chatgpt-enterprise.test.ts`
   - Test: Authenticate with OpenAI API
   - Test: Fetch audit logs
   - Test: Normalize to AIplatformAuditLog
   - Test: Pagination
   - Test: Usage analytics

2. **Implement ChatGPTEnterpriseConnector**:
   Create `backend/src/connectors/chatgpt-enterprise.ts`
   - Implement AIPlatformConnector interface
   - Method: authenticate(credentials)
   - Method: getAIAuditLogs(query)
   - Method: getUsageAnalytics(period)
   - Method: validateAICredentials()

3. **Integration**:
   Add to backend routes for ChatGPT audit logs

4. **Validation**:
   Run tests: `npm test -- --testPathPattern=chatgpt`

**Success Criteria**:
- ✅ All tests passing
- ✅ Compliance API integration working
- ✅ TypeScript clean

**Environment**:
Use Docker PostgreSQL (local development)
Test with: OPENAI_TEST_API_KEY and OPENAI_TEST_ORG_ID
```

---

### Step 5: Create Workspace 3 - Claude Enterprise

**Configuration**:
- **Workspace Name**: `Phase 3 - Claude Enterprise`
- **Branch**: `feature/claude-enterprise`
- **Base Branch**: `main`

**Initial Prompt**:

```markdown
## Phase 3: Claude Enterprise Connector

**Objective**: Build Claude Enterprise audit log connector.

**Reference Documentation**: /docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md (Phase 3 section)

**Types Available** (from @saas-xray/shared-types):
- ClaudeAuditLogEntry
- ClaudeAuditLogExportRequest
- ClaudeEnterpriseConfig
- AIPlatformConnector
- AIplatformAuditLog

**Tasks** (Test-Driven Development):

1. **Write Tests First**:
   Create `backend/src/connectors/__tests__/claude-enterprise.test.ts`
   - Test: Export audit logs
   - Test: Poll export status
   - Test: Download and parse logs
   - Test: Normalize to AIplatformAuditLog
   - Test: Usage analytics

2. **Implement ClaudeEnterpriseConnector**:
   Create `backend/src/connectors/claude-enterprise.ts`
   - Implement AIPlatformConnector interface
   - Method: requestAuditLogExport()
   - Method: pollExportStatus()
   - Method: downloadAndParseLogs()
   - Method: getAIAuditLogs(query)

3. **Handle 180-day Retention**:
   Implement incremental sync strategy

4. **Validation**:
   Run tests: `npm test -- --testPathPattern=claude`

**Success Criteria**:
- ✅ All tests passing
- ✅ Audit log export working
- ✅ TypeScript clean

**Environment**:
Use Docker PostgreSQL (local development)
Test with: CLAUDE_TEST_API_KEY and CLAUDE_TEST_ORG_ID
```

---

### Step 6: Create Workspace 4 - GPT-5 Analysis

**Configuration**:
- **Workspace Name**: `Phase 4 - GPT-5 Analysis`
- **Branch**: `feature/gpt5-analysis`
- **Base Branch**: `main`

**Initial Prompt**:

```markdown
## Phase 4: GPT-5 Analysis Service

**Objective**: Build GPT-5 intelligent filtering and analysis service.

**Reference Documentation**: /docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md (Phase 4 section)

**Types Available** (from @saas-xray/shared-types):
- GPT5AnalysisRequest
- GPT5AnalysisResponse
- GPT5PromptTemplate
- AnalysisResult
- Alert
- ContextualInsight
- Recommendation

**Tasks** (Test-Driven Development):

1. **Write Tests First**:
   Create `backend/src/services/__tests__/gpt5-analysis.test.ts`
   - Test: Risk assessment analysis
   - Test: Content analysis (sensitive data)
   - Test: Pattern detection
   - Test: Compliance checking
   - Test: Cross-platform correlation
   - Test: Alert generation
   - Test: Recommendation generation

2. **Implement GPT5AnalysisService**:
   Create `backend/src/services/gpt5-analysis.service.ts`
   - Method: analyzeEvents(request)
   - Method: performRiskAssessment()
   - Method: performContentAnalysis()
   - Method: performPatternDetection()
   - Method: generateAlerts()
   - Method: generateRecommendations()

3. **Create Prompt Templates**:
   Create `backend/src/services/prompts/`
   - risk-assessment.ts
   - content-analysis.ts
   - pattern-detection.ts
   - compliance-check.ts

4. **Implement Caching**:
   Add Redis-based caching for cost optimization

5. **Validation**:
   Run tests: `npm test -- --testPathPattern=gpt5`

**Success Criteria**:
- ✅ All tests passing
- ✅ GPT-5 API integration working
- ✅ Accurate risk scoring
- ✅ Cost per analysis < $0.10

**Environment**:
Use Docker PostgreSQL (local development)
Test with: GPT5_TEST_API_KEY
```

---

## Monitoring Parallel Development

### Conductor Dashboard

Conductor provides a visual dashboard showing:
- **All 4 workspaces** with status indicators
- **Git branch** for each workspace
- **Running state** (idle, running, error)
- **Progress tracking**

### Switching Between Workspaces

In Conductor:
1. Click workspace card to switch
2. Claude Code opens in that workspace
3. Each workspace is completely isolated

### Checking Progress

**In Conductor UI**:
- Green = Tests passing
- Yellow = In progress
- Red = Tests failing

**Manually** (from main workspace):
```bash
# Check all worktrees
git worktree list

# Check branch status
git branch -vv

# View logs from specific worktree
cd /Users/darrenmorgan/AI_Projects/saas-xray-worktrees/phase-1-gemini
git log --oneline -5
```

---

## Week 5: Integration & Merge

### Step 1: Review Each Phase

In Conductor, for each workspace:
1. Run full test suite
2. Verify TypeScript compilation
3. Review code quality
4. Check for any TODOs

### Step 2: Sequential Merge

**From main workspace** (NOT in Conductor):

```bash
cd /Users/darrenmorgan/AI_Projects/saas-xray

# Ensure on main branch
git checkout main

# Pull latest
git pull origin main

# Rebuild shared-types (if updated)
cd shared-types && npm run build && cd ..

# Merge Phase 1
git merge feature/gemini-reporting-api --no-ff
npm test
npm run verify:types

# Merge Phase 2
git merge feature/chatgpt-enterprise --no-ff
npm test
npm run verify:types

# Merge Phase 3
git merge feature/claude-enterprise --no-ff
npm test
npm run verify:types

# Merge Phase 4
git merge feature/gpt5-analysis --no-ff
npm test
npm run verify:types

# Final integration test
npm run test:e2e

# Push to main
git push origin main
```

### Step 3: Cleanup Worktrees

**In Conductor**:
1. Archive each workspace (Conductor handles cleanup)

**Manually** (if needed):
```bash
git worktree remove /Users/darrenmorgan/AI_Projects/saas-xray-worktrees/phase-1-gemini
git worktree remove /Users/darrenmorgan/AI_Projects/saas-xray-worktrees/phase-2-chatgpt
git worktree remove /Users/darrenmorgan/AI_Projects/saas-xray-worktrees/phase-3-claude
git worktree remove /Users/darrenmorgan/AI_Projects/saas-xray-worktrees/phase-4-gpt5

# Prune references
git worktree prune
```

---

## Conductor Environment Variables

Available in all scripts:

| Variable | Description | Example |
|----------|-------------|---------|
| `$CONDUCTOR_ROOT_PATH` | Path to main repository | `/Users/.../saas-xray` |
| `$CONDUCTOR_PORT` | Dynamically assigned port | `4201`, `4202`, `4203`, `4204` |
| `$CONDUCTOR_WORKSPACE_NAME` | Workspace name | `phase-1-gemini` |

**Usage Example**:
```json
{
  "scripts": {
    "setup": "cp $CONDUCTOR_ROOT_PATH/.env .env",
    "run": "PORT=$CONDUCTOR_PORT npm run dev"
  }
}
```

---

## Workspace-Specific Prompts

### Workspace 1: Gemini

**File**: `.conductor/prompts/phase-1-gemini.md`

```markdown
# Phase 1: Gemini Reporting API Integration

## Context
You are working in an isolated git worktree for implementing Gemini audit log detection.
Phase 0 (shared types) is complete and available in @saas-xray/shared-types.

## Your Mission
Extend the existing GoogleConnector with Gemini Reporting API capabilities.

## Implementation Plan

### 1. Review Existing Code
- Read: `backend/src/connectors/google.ts` (existing Google connector)
- Read: `shared-types/src/platforms/gemini-workspace.ts` (types you'll use)
- Read: `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md` (your spec)

### 2. Write Tests (TDD Approach)
Create: `backend/src/connectors/__tests__/google-gemini-extension.test.ts`

```typescript
describe('GoogleConnector - Gemini Extension', () => {
  describe('getGeminiAuditLogs', () => {
    it('should fetch Gemini audit logs via Admin SDK', async () => {
      // Test implementation
    });

    it('should normalize Gemini events to AIplatformAuditLog', async () => {
      // Test normalization
    });

    it('should handle pagination with nextPageToken', async () => {
      // Test pagination
    });
  });
});
```

### 3. Implement Connector Extension
Create: `backend/src/connectors/extensions/gemini-reporting-api.ts`

Use types from @saas-xray/shared-types:
```typescript
import {
  GeminiAuditEvent,
  GeminiReportingAPIQuery,
  AIplatformAuditLog,
  AIAuditLogQuery
} from '@saas-xray/shared-types';

export class GeminiReportingAPI {
  async getGeminiAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    // Implementation
  }
}
```

### 4. Run Tests
```bash
npm test -- --testPathPattern=gemini
```

### 5. Integration Testing
Test with real Google Workspace account:
```bash
GOOGLE_TEST_CREDENTIALS=... npm test -- gemini.integration
```

## Success Criteria
- [ ] All unit tests passing (100% coverage)
- [ ] Integration tests passing
- [ ] TypeScript compilation clean
- [ ] Gemini events normalized correctly
- [ ] Real API calls working

## Key Files
- Types: `@saas-xray/shared-types/platforms/gemini-workspace`
- Connector: `backend/src/connectors/extensions/gemini-reporting-api.ts`
- Tests: `backend/src/connectors/__tests__/google-gemini-extension.test.ts`
- Docs: `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md`

## Important Notes
- Docker containers must be running (postgres, redis)
- Port assigned by Conductor: $CONDUCTOR_PORT
- Don't modify shared-types (already frozen from Phase 0)
- Commit frequently with descriptive messages
```

---

### Workspace 2: ChatGPT

**File**: `.conductor/prompts/phase-2-chatgpt.md`

```markdown
# Phase 2: ChatGPT Enterprise Connector

## Context
You are working in an isolated git worktree for implementing ChatGPT Enterprise detection.
Phase 0 (shared types) is complete and available in @saas-xray/shared-types.

## Your Mission
Create a new ChatGPT Enterprise Compliance API connector from scratch.

## Implementation Plan

### 1. Review Documentation
- Read: `shared-types/src/platforms/chatgpt-enterprise.ts` (your types)
- Read: `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md` (Phase 2 section)
- Read: OpenAI Compliance API docs (https://platform.openai.com/docs/api-reference/audit-logs)

### 2. Write Tests (TDD)
Create: `backend/src/connectors/__tests__/chatgpt-enterprise.test.ts`

Focus on:
- Authentication with API key
- Fetching audit logs with date range
- Event type filtering
- Pagination handling
- Normalization to AIplatformAuditLog

### 3. Implement Connector
Create: `backend/src/connectors/chatgpt-enterprise.ts`

```typescript
import {
  AIPlatformConnector,
  ChatGPTComplianceAPIConfig,
  ChatGPTAuditLogEntry,
  AIplatformAuditLog
} from '@saas-xray/shared-types';

export class ChatGPTEnterpriseConnector implements AIPlatformConnector {
  // Implementation
}
```

### 4. API Integration
Endpoint: `https://api.openai.com/v1/organization/audit_logs`
Method: POST
Headers:
- Authorization: Bearer {api_key}
- OpenAI-Organization: {org_id}

### 5. Testing
```bash
npm test -- --testPathPattern=chatgpt
OPENAI_TEST_API_KEY=... npm test -- chatgpt.integration
```

## Success Criteria
- [ ] Connector implements AIPlatformConnector
- [ ] All tests passing (100% coverage)
- [ ] Real API integration working
- [ ] Events normalized correctly

## Environment
- Docker PostgreSQL: localhost:5433
- Test credentials required: OPENAI_TEST_API_KEY
```

---

### Workspace 3: Claude

**File**: `.conductor/prompts/phase-3-claude.md`

```markdown
# Phase 3: Claude Enterprise Connector

## Context
You are working in an isolated git worktree for implementing Claude Enterprise detection.
Phase 0 (shared types) is complete and available in @saas-xray/shared-types.

## Your Mission
Create Claude Enterprise audit log export connector.

## Implementation Plan

### 1. Review Types
- Read: `shared-types/src/platforms/claude-enterprise.ts`
- Read: `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md` (Phase 3)

### 2. Write Tests (TDD)
Create: `backend/src/connectors/__tests__/claude-enterprise.test.ts`

Focus on:
- Export request creation
- Export status polling
- Log download and parsing
- 180-day retention handling

### 3. Implement Connector
Create: `backend/src/connectors/claude-enterprise.ts`

```typescript
import {
  AIPlatformConnector,
  ClaudeEnterpriseConfig,
  ClaudeAuditLogEntry
} from '@saas-xray/shared-types';

export class ClaudeEnterpriseConnector implements AIPlatformConnector {
  // Export-based log retrieval
}
```

### 4. Testing
```bash
npm test -- --testPathPattern=claude
CLAUDE_TEST_API_KEY=... npm test -- claude.integration
```

## Success Criteria
- [ ] Export/download workflow working
- [ ] All tests passing
- [ ] Events normalized
```

---

### Workspace 4: GPT-5

**File**: `.conductor/prompts/phase-4-gpt5.md`

```markdown
# Phase 4: GPT-5 Analysis Service

## Context
You are working in an isolated git worktree for implementing GPT-5 analysis.
Phase 0 (shared types) is complete and available in @saas-xray/shared-types.

## Your Mission
Build intelligent AI-powered analysis service for filtering and prioritizing AI platform events.

## Implementation Plan

### 1. Review Types
- Read: `shared-types/src/ai-analysis/gpt5-analysis.ts`
- Read: `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md` (Phase 4)

### 2. Write Tests (TDD)
Create: `backend/src/services/__tests__/gpt5-analysis.test.ts`

Test scenarios:
- Risk assessment of sensitive data
- Policy violation detection
- Anomaly identification
- Cross-platform correlation
- Alert generation
- Recommendation creation

### 3. Implement Service
Create: `backend/src/services/gpt5-analysis.service.ts`

```typescript
import {
  GPT5AnalysisRequest,
  GPT5AnalysisResponse
} from '@saas-xray/shared-types';

export class GPT5AnalysisService {
  async analyzeEvents(request: GPT5AnalysisRequest): Promise<GPT5AnalysisResponse> {
    // GPT-5 powered analysis
  }
}
```

### 4. Create Prompt Library
Create: `backend/src/services/prompts/`
- risk-assessment.ts
- content-analysis.ts
- pattern-detection.ts

### 5. Testing
```bash
npm test -- --testPathPattern=gpt5
GPT5_TEST_API_KEY=... npm test -- gpt5.integration
```

## Success Criteria
- [ ] All analysis types working
- [ ] Accurate risk scoring
- [ ] Useful insights generated
- [ ] Cost optimized (<$0.10 per analysis)
```

---

## Troubleshooting

### Issue: Setup Script Fails

**Symptom**: Workspace setup stuck or errors
**Solution**:
1. Check Docker containers running
2. Verify npm install works manually
3. Check shared-types builds successfully
4. Review Conductor logs

### Issue: Port Conflicts

**Symptom**: "Port already in use"
**Solution**: Conductor assigns unique ports automatically ($CONDUCTOR_PORT)
Ensure run script uses: `PORT=$CONDUCTOR_PORT npm run dev`

### Issue: Shared-Types Not Found

**Symptom**: "Cannot find module '@saas-xray/shared-types'"
**Solution**:
```bash
# In workspace
cd shared-types
npm run build
cd ../backend
npm link @saas-xray/shared-types
```

### Issue: Tests Failing in One Workspace

**Symptom**: Tests pass locally but fail in Conductor workspace
**Solution**:
- Check DATABASE_URL environment variable
- Ensure Docker containers accessible from worktree
- Verify test database created

---

## Best Practices

### 1. Commit Frequently
Each workspace should commit every significant change:
```bash
git add .
git commit -m "test(gemini): add audit log normalization tests"
```

### 2. Keep Prompts Updated
As Claude Code works, update the workspace prompt with:
- Completed tasks
- Current blockers
- Next steps

### 3. Monitor All Workspaces
Check Conductor dashboard every few hours to ensure all agents are progressing.

### 4. Don't Cross-Contaminate
Each workspace should ONLY work on its assigned phase. No merging between worktrees until Week 5.

### 5. Test Before Merge
Before Week 5 integration:
- Each workspace: `npm test`
- Each workspace: `npm run verify:types`
- Fix all issues before merging

---

## Timeline

| Day | Activity |
|-----|----------|
| **Week 1** | Phase 0 complete (✅ Done!) |
| **Week 2, Day 1** | Create all 4 Conductor workspaces |
| **Week 2, Day 2-5** | Parallel development begins |
| **Week 3** | Continued parallel development |
| **Week 4** | Phase 4 (GPT-5) completion |
| **Week 5, Day 1-2** | Code review all phases |
| **Week 5, Day 3-5** | Sequential merge & integration |

---

## Success Metrics

### Phase Completion Checklist

**Phase 1 (Gemini)**:
- [ ] GeminiReportingAPI class implemented
- [ ] Tests passing (100% coverage)
- [ ] Real API calls working
- [ ] Dashboard integration

**Phase 2 (ChatGPT)**:
- [ ] ChatGPTEnterpriseConnector implemented
- [ ] Tests passing (100% coverage)
- [ ] Compliance API working
- [ ] Dashboard integration

**Phase 3 (Claude)**:
- [ ] ClaudeEnterpriseConnector implemented
- [ ] Tests passing (100% coverage)
- [ ] Audit export working
- [ ] Dashboard integration

**Phase 4 (GPT-5)**:
- [ ] GPT5AnalysisService implemented
- [ ] All analysis types functional
- [ ] Cost optimized
- [ ] Dashboard insights panel

---

## Quick Reference Commands

### Start Conductor
```bash
open -a Conductor
```

### Check Worktrees (from main workspace)
```bash
git worktree list
```

### Run Tests in Specific Workspace
```bash
# Navigate to workspace first
cd /Users/darrenmorgan/AI_Projects/saas-xray-worktrees/phase-1-gemini
npm test -- --testPathPattern=gemini
```

### Check TypeScript Errors
```bash
npm run verify:types
```

### View Conductor Logs
- In Conductor app: Click workspace → View Logs

---

**Document Version**: 1.0
**Last Updated**: 2025-01-02
**Tool**: Conductor by Melty Labs
**Platform**: Mac only
