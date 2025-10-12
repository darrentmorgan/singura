# Phase 1: AI Provider Detection - Testing Guide

## Quick Status Check

**Date**: 2025-10-11
**Branch**: `feat/singura-ai-rebrand`
**Commit**: `42edfbf`

### Servers Running
- ✅ Frontend: http://localhost:4200
- ✅ Backend: http://localhost:4201
- ✅ PostgreSQL: localhost:5433
- ✅ Redis: localhost:6379

---

## 🧪 Testing Methods

### 1. Manual UI Testing (Recommended for Demo)

**Steps**:
1. Open browser: http://localhost:4200
2. Login with Clerk authentication
3. Navigate to **Connections** page
4. Connect a Google Workspace account (if not already connected)
5. Go to **Automations** page
6. Click "Run Discovery" or wait for scheduled scan
7. Watch for real-time updates via Socket.io
8. **Verify Phase 1 Features**:
   - Look for AI provider badges (OpenAI, Anthropic, etc.)
   - Check confidence scores (0-100)
   - View detection methods used
   - See detected models (gpt-4, claude-3-opus, etc.)

**What You Should See**:
- Automations with `detection_metadata` populated
- AI provider icons/labels
- Confidence percentages
- Risk scores reflecting AI usage

---

### 2. API Testing with cURL

#### Test Backend Health
```bash
curl http://localhost:4201/api/health | jq
```

#### Get All Automations (with detection metadata)
```bash
# Replace {orgId} with your organization ID from Clerk
curl -X GET "http://localhost:4201/api/automations?organizationId={orgId}" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" | jq
```

#### Query by AI Provider
```bash
curl -X GET "http://localhost:4201/api/automations?organizationId={orgId}&aiProvider=openai&minConfidence=80" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" | jq
```

#### Get Detection Statistics
```bash
curl -X GET "http://localhost:4201/api/automations/statistics?organizationId={orgId}" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" | jq
```

**Expected Response Structure**:
```json
{
  "id": "uuid",
  "name": "My Automation",
  "detection_metadata": {
    "aiProvider": {
      "provider": "openai",
      "confidence": 95,
      "detectionMethods": ["api_endpoint", "content_signature"],
      "evidence": {
        "matchedEndpoints": ["api.openai.com"],
        "matchedSignatures": ["gpt-4", "sk-proj-"]
      },
      "model": "gpt-4-turbo",
      "detectedAt": "2025-10-11T06:55:00Z"
    },
    "detectionPatterns": [...],
    "lastUpdated": "2025-10-11T06:55:00Z"
  },
  "risk_score_history": [
    {
      "timestamp": "2025-10-11T06:55:00Z",
      "score": 75,
      "level": "high",
      "factors": [...],
      "trigger": "ai_provider_detected"
    }
  ]
}
```

---

### 3. Direct Database Queries

#### Check for AI Provider Detections
```sql
-- Connect to database
psql "postgresql://postgres:password@localhost:5433/saas_xray"

-- View automations with AI provider detection
SELECT
    id,
    name,
    detection_metadata->>'aiProvider' as ai_provider,
    (detection_metadata->'aiProvider'->>'provider') as provider_name,
    (detection_metadata->'aiProvider'->>'confidence')::numeric as confidence,
    (detection_metadata->'aiProvider'->>'model') as model
FROM discovered_automations
WHERE detection_metadata->>'aiProvider' IS NOT NULL
ORDER BY (detection_metadata->'aiProvider'->>'confidence')::numeric DESC
LIMIT 10;
```

#### Query by Specific AI Provider
```sql
SELECT
    name,
    (detection_metadata->'aiProvider'->>'confidence')::numeric as confidence,
    detection_metadata->'aiProvider'->'evidence' as evidence
FROM discovered_automations
WHERE detection_metadata->'aiProvider'->>'provider' = 'openai'
  AND (detection_metadata->'aiProvider'->>'confidence')::numeric >= 80;
```

#### View Risk Score History
```sql
SELECT
    name,
    jsonb_array_length(risk_score_history) as history_entries,
    risk_score_history->-1 as latest_score
FROM discovered_automations
WHERE jsonb_array_length(risk_score_history) > 0
LIMIT 5;
```

#### Detection Statistics
```sql
SELECT
    detection_metadata->'aiProvider'->>'provider' as ai_provider,
    COUNT(*) as count,
    ROUND(AVG((detection_metadata->'aiProvider'->>'confidence')::numeric), 2) as avg_confidence
FROM discovered_automations
WHERE detection_metadata->>'aiProvider' IS NOT NULL
GROUP BY detection_metadata->'aiProvider'->>'provider'
ORDER BY count DESC;
```

---

### 4. Unit Testing (TypeScript)

**Create Test File**: `backend/tests/services/detection/ai-provider-detector.test.ts`

```typescript
import { AIProviderDetectorService } from '../../../src/services/detection/ai-provider-detector.service';
import { GoogleWorkspaceEvent } from '@singura/shared-types';

describe('AIProviderDetectorService', () => {
  let service: AIProviderDetectorService;

  beforeEach(() => {
    service = new AIProviderDetectorService();
  });

  describe('detectAIProviders', () => {
    it('should detect OpenAI from API endpoint', () => {
      const events: GoogleWorkspaceEvent[] = [
        {
          eventId: 'test-1',
          timestamp: new Date(),
          userId: 'user-1',
          userEmail: 'test@example.com',
          eventType: 'script_execution',
          resourceId: 'api.openai.com/v1/chat/completions',
          resourceType: 'script',
          actionDetails: {
            action: 'execute',
            resourceName: 'OpenAI Script',
            additionalMetadata: {}
          },
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla/5.0'
        }
      ];

      const detections = service.detectAIProviders(events);

      expect(detections).toHaveLength(1);
      expect(detections[0].provider).toBe('openai');
      expect(detections[0].confidence).toBeGreaterThan(30);
      expect(detections[0].detectionMethods).toContain('api_endpoint');
    });

    it('should detect Anthropic from content signature', () => {
      const events: GoogleWorkspaceEvent[] = [
        {
          eventId: 'test-2',
          timestamp: new Date(),
          userId: 'user-2',
          userEmail: 'test@example.com',
          eventType: 'script_execution',
          resourceId: 'script-123',
          resourceType: 'script',
          actionDetails: {
            action: 'execute',
            resourceName: 'AI Script',
            additionalMetadata: {
              code: 'const apiKey = "sk-ant-api03-xxxxx"; // Anthropic API key'
            }
          },
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla/5.0'
        }
      ];

      const detections = service.detectAIProviders(events);

      expect(detections).toHaveLength(1);
      expect(detections[0].provider).toBe('anthropic');
      expect(detections[0].detectionMethods).toContain('content_signature');
    });

    it('should extract model name', () => {
      const events: GoogleWorkspaceEvent[] = [
        {
          eventId: 'test-3',
          timestamp: new Date(),
          userId: 'user-3',
          userEmail: 'test@example.com',
          eventType: 'script_execution',
          resourceId: 'script-456',
          resourceType: 'script',
          actionDetails: {
            action: 'execute',
            resourceName: 'GPT-4 Script',
            additionalMetadata: {
              code: 'const model = "gpt-4-turbo";'
            }
          },
          ipAddress: '1.2.3.4',
          userAgent: 'openai-node/1.0'
        }
      ];

      const detections = service.detectAIProviders(events);

      expect(detections[0].model).toBe('gpt-4-turbo');
    });
  });

  describe('getDetectionStatistics', () => {
    it('should calculate statistics correctly', () => {
      const detections = [
        {
          provider: 'openai' as const,
          confidence: 95,
          detectionMethods: ['api_endpoint', 'content_signature'] as any,
          evidence: {},
          detectedAt: new Date()
        },
        {
          provider: 'anthropic' as const,
          confidence: 85,
          detectionMethods: ['user_agent'] as any,
          evidence: {},
          detectedAt: new Date()
        }
      ];

      const stats = service.getDetectionStatistics(detections);

      expect(stats.totalDetections).toBe(2);
      expect(stats.byProvider.openai).toBe(1);
      expect(stats.byProvider.anthropic).toBe(1);
      expect(stats.averageConfidence).toBe(90);
    });
  });
});
```

**Run Tests**:
```bash
cd backend
pnpm test ai-provider-detector.test.ts
```

---

### 5. Integration Testing with Mock Data

**Create Mock Discovery Script**:

```typescript
// backend/scripts/test-ai-detection.ts
import { db } from '../src/database/pool';
import { DetectionEngineService } from '../src/services/detection/detection-engine.service';
import { GoogleWorkspaceEvent } from '@singura/shared-types';

async function testAIDetection() {
  await db.initialize();

  // Mock events simulating AI usage
  const mockEvents: GoogleWorkspaceEvent[] = [
    {
      eventId: 'mock-1',
      timestamp: new Date(),
      userId: 'test-user-1',
      userEmail: 'developer@company.com',
      eventType: 'script_execution',
      resourceId: 'https://api.openai.com/v1/chat/completions',
      resourceType: 'script',
      actionDetails: {
        action: 'execute',
        resourceName: 'ChatGPT Integration Script',
        additionalMetadata: {
          scopes: ['openai.api'],
          code: 'fetch("https://api.openai.com", { headers: { "Authorization": "Bearer sk-proj-xxxxx" }})'
        }
      },
      ipAddress: '104.18.1.1',
      userAgent: 'openai-node/4.0.0'
    },
    {
      eventId: 'mock-2',
      timestamp: new Date(),
      userId: 'test-user-2',
      userEmail: 'ai-team@company.com',
      eventType: 'script_execution',
      resourceId: 'https://api.anthropic.com/v1/messages',
      resourceType: 'script',
      actionDetails: {
        action: 'execute',
        resourceName: 'Claude API Integration',
        additionalMetadata: {
          code: 'const response = await anthropic.messages.create({ model: "claude-3-opus-20240229" })'
        }
      },
      ipAddress: '160.79.104.1',
      userAgent: 'anthropic-sdk-python/0.8.0'
    }
  ];

  // Run detection
  const engine = new DetectionEngineService('test-org-id');
  const result = await engine.detectShadowAI(mockEvents, {
    start: { hour: 9, minute: 0 },
    end: { hour: 17, minute: 0 }
  });

  console.log('🔍 Detection Results:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📊 Activity Patterns:', result.activityPatterns.length);
  console.log('⚠️  Risk Indicators:', result.riskIndicators.length);
  console.log('\n🤖 Detection Metadata:');
  console.log(JSON.stringify(result.detectionMetadata, null, 2));

  if (result.detectionMetadata.aiProvider) {
    console.log('\n✅ AI Provider Detected:');
    console.log(`   Provider: ${result.detectionMetadata.aiProvider.provider}`);
    console.log(`   Confidence: ${result.detectionMetadata.aiProvider.confidence}%`);
    console.log(`   Methods: ${result.detectionMetadata.aiProvider.detectionMethods.join(', ')}`);
    if (result.detectionMetadata.aiProvider.model) {
      console.log(`   Model: ${result.detectionMetadata.aiProvider.model}`);
    }
  }

  await db.close();
}

testAIDetection().catch(console.error);
```

**Run Mock Test**:
```bash
cd backend
ts-node scripts/test-ai-detection.ts
```

---

## 📊 Success Criteria for Phase 1

### ✅ Verified When:

1. **Schema Check**:
   - `detection_metadata` column exists with JSONB type
   - `risk_score_history` column exists with JSONB type
   - 4 GIN indexes created

2. **Detection Working**:
   - AI providers are detected from events
   - Confidence scores calculated (0-100)
   - Detection methods captured
   - Model names extracted when present

3. **Data Storage**:
   - `detection_metadata` JSONB populated with structured data
   - `risk_score_history` array tracks changes over time
   - Repository queries return correct results

4. **API Functionality**:
   - Backend health check returns 200
   - Automations API includes detection metadata
   - Query by AI provider works
   - Statistics endpoint returns aggregated data

5. **UI Display** (if implemented):
   - AI provider badges visible
   - Confidence scores displayed
   - Detection details shown in automation cards

---

## 🐛 Troubleshooting

### Issue: No detections appearing

**Check**:
```sql
-- Verify automations exist
SELECT COUNT(*) FROM discovered_automations;

-- Check if detection metadata is empty
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE detection_metadata != '{}'::jsonb) as with_metadata
FROM discovered_automations;
```

**Solution**: Run discovery manually or verify Google Workspace events contain AI indicators

### Issue: TypeScript compilation errors

**Check**:
```bash
cd backend && pnpm exec tsc --noEmit
cd ../shared-types && pnpm exec tsc --noEmit
```

**Solution**: Both should return 0 errors (already verified ✅)

### Issue: Migration not applied

**Check**:
```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;
```

**Solution**: Should see `006_add_detection_metadata` in the list (already applied ✅)

---

## 📝 Quick Test Checklist

- [ ] Backend health endpoint returns 200
- [ ] Frontend loads without errors
- [ ] Database has `detection_metadata` column
- [ ] Can query automations via API
- [ ] Detection metadata structure is correct
- [ ] Risk score history tracks changes
- [ ] 8 AI providers configured (OpenAI, Anthropic, Google AI, Cohere, HuggingFace, Replicate, Mistral, Together AI)
- [ ] Confidence scoring works (0-100 scale)
- [ ] Detection methods captured in evidence
- [ ] Model extraction works for common models

---

## 🎯 Next Steps After Testing

1. **Write comprehensive tests** (target 85% coverage)
2. **Phase 2**: User feedback system (thumbs up/down)
3. **Phase 3**: Cross-platform correlation
4. **Phase 4**: Detector configuration + history

---

**Generated**: 2025-10-11
**Commit**: 42edfbf
**Documentation**: `.claude/DETECTION_IMPLEMENTATION_TRACKER.md`
