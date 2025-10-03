# TypeScript Errors to Fix

## Overview
This document contains all TypeScript compilation errors that are blocking CI/CD but are **not related** to the Google OAuth AI Platform Detection feature (PR #9). These errors existed before the PR and should be fixed in a separate cleanup effort.

**Generated:** 2025-10-03
**Context:** These errors were discovered while implementing Google OAuth AI Platform Detection
**Total Errors:** ~66 TypeScript errors across multiple files

## Priority 1: Critical Build Blockers

### 1. src/connectors/slack.ts
```typescript
// Lines 1070-1071: Type 'string' is not assignable to type 'Date'
createdAt: automationData.created_at,  // Line 1070
updatedAt: automationData.updated_at   // Line 1071

// Line 1076: Property 'app_id' does not exist on type 'Profile'
appId: member.profile.app_id
```
**Fix:** Convert string dates to Date objects and check Slack API types for profile.

### 2. src/routes/correlation.ts
```typescript
// Line 53: Not all code paths return a value
async function someFunction() { // Line 53

// Line 110: Expected 2 arguments, but got 0
someMethod() // Line 110

// Line 114: Cannot find name 'GoogleApiClientService'
const service = new GoogleApiClientService() // Line 114

// Lines 157, 216, 326: string | undefined not assignable to string
someFunction(possiblyUndefinedParam) // Multiple lines

// Line 391: Type 'string' is not assignable to type 'BusinessImpactAssessment'
businessImpact: 'high' // Line 391
```

## Priority 2: Service Layer Errors

### 3. src/services/connectors/google-correlation-connector.ts
```typescript
// Lines 53, 57: Cannot find name 'GoogleApiClientService'
GoogleApiClientService should be GoogleAPIClientService

// Line 308: Property 'list' does not exist on type 'Resource$Projects'
await script.projects.list()
```

### 4. src/services/connectors/slack-correlation-connector.ts
```typescript
// Line 18: Module has no exported member 'SlackActivityEvent'
import { SlackActivityEvent } from '@saas-xray/shared-types'

// Line 19: No exported member 'AutomationEvent'
import { AutomationEvent } from '@saas-xray/shared-types'
// Should be: AutomationEventData

// Line 81: Property 'getStoredCredentials' does not exist
await slackOAuthService.getStoredCredentials()
```

### 5. src/services/correlation-orchestrator.service.ts
```typescript
// Line 25: Module has no exported member 'SlackActivityEvent'
import { SlackActivityEvent } from '@saas-xray/shared-types'

// Line 400: Property 'overallRisk' does not exist on assessment object
assessment.overallRisk
```

### 6. src/services/detection/cross-platform-correlation.service.ts
```typescript
// Line 30: Module has no exported member 'ChainRiskAssessment'
// Line 33: Module has no exported member 'SlackActivityEvent'
// Line 34: No exported member 'AutomationEvent'

// Lines 103, 144, 187, 210, 243: Method signature incompatibilities
// Methods returning Promise<T> when base class expects T

// Lines 167-169, 379, 441: Object possibly undefined
// Need null checks or type guards

// Line 441: Type 'MultiPlatformEvent | undefined' not assignable
```

### 7. src/services/hybrid-storage.ts
```typescript
// Lines 66, 68: 'existingConnection' is possibly 'undefined'
existingConnection.id // Need null check

// Line 67: Type 'PlatformConnection | undefined' not assignable
// Line 131: Property 'platformSpecific' is missing
// Line 132: Type 'string | undefined' not assignable to 'string | null'
// Line 188, 240: Missing properties from type 'PlatformConnection'
// Missing: webhook_url, webhook_secret_id
```

## Priority 3: Other Service Errors

### 8. src/services/memory-storage.ts
```typescript
// Line 53: Argument type 'string | undefined' not assignable
// Line 276: Element implicitly has 'any' type
// Line 318-319: Object is possibly 'undefined'
```

### 9. src/services/ml-behavioral/*.ts
```typescript
// behavioral-baseline-learning.service.ts
// Line 9: Module has no exported member (AutomationEvent)
// Lines 234, 298: Object is possibly 'undefined'
// Line 528: Parameter 'p' implicitly has 'any' type

// ml-behavioral-inference.service.ts
// Line 9: Module has no exported member
// Line 304: Parameter 'p' implicitly has 'any' type
// Line 463: Cannot find name 'startTime'

// ml-enhanced-detection.service.ts
// Line 9: Module has no exported member 'AutomationEvent'
```

### 10. src/services/oauth-credential-storage-service.ts
```typescript
// Line 123: Argument type 'string' not assignable to 'CredentialType'
// Line 125: Type 'string | null' not assignable to 'string'
// Line 140: Type 'Date | null' not assignable to 'Date | undefined'
```

### 11. src/simple-server.ts
```typescript
// Line 526: Not all code paths return a value
// Lines 635, 647: Argument type 'string | undefined' not assignable
```

### 12. src/test-production-integration.ts
```typescript
// Line 53: Property 'automationsFound' does not exist
// Lines 62-65: 'sample' is possibly 'undefined'
```

## Recommended Fix Strategy

### Phase 1: Critical Fixes (Blocking Build)
1. Fix date type conversions in slack.ts
2. Fix missing return statements in correlation.ts
3. Fix undefined parameter handling

### Phase 2: Import/Export Fixes
1. Update shared-types exports to include missing types
2. Fix import statements to use correct type names
3. Add missing type exports to shared-types package

### Phase 3: Type Safety Improvements
1. Add null checks for possibly undefined objects
2. Fix async/Promise return type mismatches
3. Add missing properties to interfaces

### Phase 4: Clean Up
1. Remove implicit 'any' types
2. Fix service name inconsistencies
3. Add proper type guards

## Quick Fixes for Immediate CI Pass

If you need to get CI passing quickly without proper fixes:

```typescript
// 1. Add to tsconfig.json temporarily:
{
  "compilerOptions": {
    "skipLibCheck": true,
    "allowJs": true,
    "strict": false  // TEMPORARY - remove after fixing
  }
}

// 2. Or add // @ts-ignore comments (NOT RECOMMENDED for production)
```

## Notes for Implementer

- These errors are **not** related to the Google OAuth AI Platform Detection feature
- Most errors fall into categories:
  1. Missing type exports from shared-types
  2. Null/undefined handling
  3. Date string vs Date object conversions
  4. Async/sync method signature mismatches
  5. Missing properties in interfaces

- Consider creating separate PRs for each category of fixes
- Add tests to prevent regression
- Update shared-types package first, then fix consuming code

## Testing After Fixes

Run these commands to verify fixes:
```bash
# Check TypeScript compilation
cd backend && npx tsc --noEmit

# Run all tests
npm test

# Run CI locally
act -j e2e-tests
```

## Related PRs and Issues
- PR #9: Google OAuth AI Platform Detection (blocked by these errors)
- Issue: Create GitHub issue for "TypeScript Technical Debt Cleanup"