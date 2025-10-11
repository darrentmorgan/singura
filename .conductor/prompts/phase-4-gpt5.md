# Phase 4: GPT-5 Analysis Service

## Workspace Context
- **Branch**: `feature/gpt5-analysis`
- **Duration**: 3 weeks
- **Dependencies**: Phase 0 (shared-types) ✅
- **Optional Enhancement**: Phases 1-3 data (real AI platform events)
- **Environment**: Local Docker (PostgreSQL + Redis)

---

## Mission

Build the GPT-5 powered intelligent analysis service that filters, prioritizes, and provides context for AI platform audit logs. This is the "secret sauce" that differentiates Singura from basic audit log collectors.

---

## Available Types (from @singura/shared-types)

```typescript
import {
  // GPT-5 Analysis
  GPT5AnalysisRequest,
  GPT5AnalysisResponse,
  GPT5PromptTemplate,
  GPT5ServiceConfig,

  // Analysis Components
  AnalysisResult,
  AnalysisContext,
  CategoryAnalysis,
  AnalysisSummary,

  // Outputs
  Alert,
  ContextualInsight,
  Recommendation,

  // User/Org Context
  UserBehaviorProfile,
  OrganizationPolicies,
  BehaviorBaseline,

  // Cross-platform
  CrossPlatformCorrelation,

  // Input
  AIplatformAuditLog
} from '@singura/shared-types';
```

---

## Implementation Steps (TDD)

### Step 1: Understand GPT-5 Analysis Architecture

**Analysis Pipeline**:
```
Raw Events (ChatGPT/Claude/Gemini)
    ↓
Context Enrichment (User profile, org policies, baseline)
    ↓
Parallel GPT-5 Analyses:
    ├─ Risk Assessment
    ├─ Content Analysis
    ├─ Pattern Detection
    └─ Compliance Check
    ↓
Result Synthesis
    ↓
Alert Generation → Insight Generation → Recommendations
    ↓
Dashboard Display
```

---

### Step 2: Write Tests FIRST

Create: `backend/src/services/__tests__/gpt5-analysis.test.ts`

```typescript
import { GPT5AnalysisService } from '../gpt5-analysis.service';
import {
  GPT5AnalysisRequest,
  AIplatformAuditLog,
  AnalysisContext
} from '@singura/shared-types';

describe('GPT5AnalysisService', () => {
  let service: GPT5AnalysisService;

  beforeEach(() => {
    service = new GPT5AnalysisService({
      apiKey: process.env.GPT5_TEST_API_KEY || 'test-key',
      model: 'gpt-5-turbo',
      enableCaching: true
    });
  });

  describe('analyzeEvents', () => {
    it('should analyze events and return comprehensive results', async () => {
      const mockEvents: AIplatformAuditLog[] = [
        {
          id: 'evt-1',
          platform: 'chatgpt',
          timestamp: new Date(),
          userId: 'user-1',
          userEmail: 'user@company.com',
          organizationId: 'org-1',
          activityType: 'file_upload',
          action: 'file.uploaded',
          metadata: {
            files: [{
              fileId: 'file-1',
              fileName: 'financial_report_Q4.xlsx',
              fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              fileSize: 524288,
              uploadedAt: new Date()
            }]
          },
          riskIndicators: []
        }
      ];

      const request: GPT5AnalysisRequest = {
        requestId: 'analysis-test-1',
        timestamp: new Date(),
        context: {
          organizationId: 'org-1',
          timeWindow: {
            start: new Date('2025-01-01'),
            end: new Date('2025-01-31')
          }
        },
        events: mockEvents,
        options: {
          analysisType: ['risk_assessment', 'content_analysis'],
          includeRecommendations: true,
          detailLevel: 'comprehensive',
          prioritizeAlerts: true,
          contextualInsights: true
        }
      };

      const result = await service.analyzeEvents(request);

      expect(result.requestId).toBe('analysis-test-1');
      expect(result.results.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.results.overallRiskScore).toBeLessThanOrEqual(100);
      expect(result.alerts).toBeInstanceOf(Array);
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should detect sensitive data exposure', async () => {
      const sensitiveEvent: AIplatformAuditLog = {
        id: 'evt-sensitive',
        platform: 'claude',
        timestamp: new Date(),
        userId: 'user-2',
        userEmail: 'analyst@company.com',
        organizationId: 'org-1',
        activityType: 'conversation',
        action: 'message.sent',
        metadata: {
          conversationId: 'conv-1',
          messageCount: 1,
          // Simulated message with SSN
          content: 'My SSN is 123-45-6789'
        },
        riskIndicators: []
      };

      const result = await service.analyzeEvents({
        requestId: 'sensitive-test',
        timestamp: new Date(),
        context: { organizationId: 'org-1', timeWindow: { start: new Date(), end: new Date() } },
        events: [sensitiveEvent],
        options: {
          analysisType: ['content_analysis'],
          includeRecommendations: true,
          detailLevel: 'detailed',
          prioritizeAlerts: false,
          contextualInsights: false
        }
      });

      expect(result.results.categories.sensitiveContent.detected).toBe(true);
      expect(result.results.categories.sensitiveContent.confidence).toBeGreaterThan(80);
      expect(result.alerts.some(a => a.category === 'security')).toBe(true);
    });

    it('should identify policy violations', async () => {
      // Test policy violation detection
    });

    it('should detect anomalous activity patterns', async () => {
      // Test anomaly detection
    });

    it('should generate actionable recommendations', async () => {
      // Test recommendation generation
    });
  });

  describe('crossPlatformCorrelation', () => {
    it('should correlate events across ChatGPT, Claude, and Gemini', async () => {
      const events: AIplatformAuditLog[] = [
        // ChatGPT event at 2:00 AM
        { id: '1', platform: 'chatgpt', timestamp: new Date('2025-01-15T02:00:00Z'), /* ... */ },
        // Gemini event at 2:05 AM (same user)
        { id: '2', platform: 'gemini', timestamp: new Date('2025-01-15T02:05:00Z'), /* ... */ },
        // Claude event at 2:10 AM (same user)
        { id: '3', platform: 'claude', timestamp: new Date('2025-01-15T02:10:00Z'), /* ... */ }
      ];

      const result = await service.crossPlatformCorrelation(events, {
        timeProximityThreshold: 600, // 10 minutes
        sameUser: true
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('workflow_chain');
      expect(result[0].platforms).toHaveLength(3);
    });
  });

  describe('caching', () => {
    it('should cache analysis results', async () => {
      const request: GPT5AnalysisRequest = { /* ... */ };

      // First call
      const result1 = await service.analyzeEvents(request);
      const time1 = result1.processingTime;

      // Second call (should be cached)
      const result2 = await service.analyzeEvents(request);
      const time2 = result2.processingTime;

      expect(result2.metadata.cacheHit).toBe(true);
      expect(time2).toBeLessThan(time1); // Cached should be faster
    });
  });

  describe('cost optimization', () => {
    it('should keep cost per analysis under $0.10', async () => {
      const request: GPT5AnalysisRequest = { /* standard analysis */ };

      const result = await service.analyzeEvents(request);

      expect(result.metadata.costEstimate).toBeLessThan(0.10);
    });
  });
});
```

---

### Step 3: Implement GPT5AnalysisService

Create: `backend/src/services/gpt5-analysis.service.ts`

```typescript
import OpenAI from 'openai';
import {
  GPT5AnalysisRequest,
  GPT5AnalysisResponse,
  GPT5ServiceConfig,
  AnalysisResult,
  Alert,
  ContextualInsight,
  Recommendation
} from '@singura/shared-types';

export class GPT5AnalysisService {
  private openai: OpenAI;
  private model: string;
  private cache?: Map<string, any>; // Redis in production

  constructor(config: GPT5ServiceConfig) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;

    if (config.enableCaching) {
      this.cache = new Map();
    }
  }

  async analyzeEvents(
    request: GPT5AnalysisRequest
  ): Promise<GPT5AnalysisResponse> {
    const startTime = Date.now();

    // Check cache
    if (this.cache) {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, metadata: { ...cached.metadata, cacheHit: true } };
      }
    }

    // Run analyses in parallel
    const [
      riskAssessment,
      contentAnalysis,
      patternDetection,
      complianceCheck
    ] = await Promise.all([
      this.performRiskAssessment(request),
      this.performContentAnalysis(request),
      this.performPatternDetection(request),
      this.performComplianceCheck(request)
    ]);

    // Synthesize results
    const results = this.synthesizeResults({
      riskAssessment,
      contentAnalysis,
      patternDetection,
      complianceCheck
    });

    // Generate outputs
    const alerts = this.generateAlerts(results, request);
    const insights = await this.generateInsights(results, request);
    const recommendations = await this.generateRecommendations(alerts, insights, request);

    const response: GPT5AnalysisResponse = {
      requestId: request.requestId,
      analyzedAt: new Date(),
      processingTime: Date.now() - startTime,
      results,
      summary: this.generateSummary(request, results),
      alerts,
      insights,
      recommendations,
      metadata: {
        modelUsed: this.model,
        tokensUsed: { input: 0, output: 0 }, // TODO: Track actual
        analysisVersion: '1.0.0',
        correlationIds: [request.requestId],
        cacheHit: false,
        analysisDuration: Date.now() - startTime
      }
    };

    // Cache result
    if (this.cache) {
      const cacheKey = this.generateCacheKey(request);
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  private async performRiskAssessment(request: GPT5AnalysisRequest): Promise<any> {
    // TODO: GPT-5 risk assessment
  }

  private async performContentAnalysis(request: GPT5AnalysisRequest): Promise<any> {
    // TODO: GPT-5 content analysis
  }

  private async performPatternDetection(request: GPT5AnalysisRequest): Promise<any> {
    // TODO: GPT-5 pattern detection
  }

  private async performComplianceCheck(request: GPT5AnalysisRequest): Promise<any> {
    // TODO: GPT-5 compliance checking
  }

  private synthesizeResults(analyses: any): AnalysisResult {
    // TODO: Combine analyses
  }

  private generateAlerts(results: AnalysisResult, request: GPT5AnalysisRequest): Alert[] {
    // TODO: Generate alerts
  }

  private async generateInsights(results: AnalysisResult, request: GPT5AnalysisRequest): Promise<ContextualInsight[]> {
    // TODO: GPT-5 insights
  }

  private async generateRecommendations(alerts: Alert[], insights: ContextualInsight[], request: GPT5AnalysisRequest): Promise<Recommendation[]> {
    // TODO: GPT-5 recommendations
  }

  private generateSummary(request: GPT5AnalysisRequest, results: AnalysisResult): any {
    // TODO: Executive summary
  }

  private generateCacheKey(request: GPT5AnalysisRequest): string {
    // TODO: Generate deterministic cache key
    return '';
  }
}
```

---

### Step 4: Create Prompt Templates

Create: `backend/src/services/prompts/risk-assessment.ts`

```typescript
import { GPT5PromptTemplate } from '@singura/shared-types';

export const riskAssessmentPrompt: GPT5PromptTemplate = {
  name: 'risk_assessment',
  version: '1.0.0',
  systemPrompt: `You are an enterprise security analyst specializing in AI platform risk assessment.

Your task is to analyze user activity across ChatGPT, Claude, and Gemini to identify:
1. Data exfiltration risks
2. Policy violations
3. Anomalous behavior patterns
4. Sensitive content exposure
5. Compliance risks (GDPR, SOX, HIPAA, PCI, SOC2)

Provide structured JSON output with risk scores (0-100) and confidence levels.
Be conservative - false positives are better than missed risks.`,

  userPromptTemplate: `Analyze the following AI platform usage events:

ORGANIZATION CONTEXT:
{{contextJson}}

EVENTS TO ANALYZE:
{{eventsJson}}

Provide a comprehensive risk assessment in JSON format:
{
  "overallRiskScore": <0-100>,
  "riskLevel": "low|medium|high|critical",
  "confidence": <0-100>,
  "categories": {
    "dataExfiltration": {
      "score": <0-100>,
      "detected": <boolean>,
      "confidence": <0-100>,
      "evidence": [<strings>],
      "affectedEvents": [<event IDs>]
    },
    "policyViolation": { /* same structure */ },
    "anomalousActivity": { /* same structure */ },
    "sensitiveContent": { /* same structure */ },
    "complianceRisk": { /* same structure */ }
  }
}`,

  variables: ['contextJson', 'eventsJson'],
  temperature: 0.3,
  maxTokens: 2000,
  responseFormat: 'json_object'
};
```

Similar templates for:
- `content-analysis.ts`
- `pattern-detection.ts`
- `compliance-check.ts`
- `insight-generation.ts`
- `recommendation-generation.ts`

---

### Step 5: Integration Testing

Create: `backend/src/services/__tests__/gpt5-analysis.integration.test.ts`

Test with REAL GPT-5 API:

```typescript
describe('GPT-5 Analysis Integration', () => {
  it('should analyze real sensitive data scenario', async () => {
    // Use actual GPT-5 API
  });

  it('should generate meaningful recommendations', async () => {
    // Validate recommendation quality
  });
});
```

---

### Step 6: Cost Optimization

Strategies:
1. **Caching**: Cache results for 24 hours (Redis)
2. **Batching**: Analyze multiple events together
3. **Prompt Optimization**: Minimize token usage
4. **Selective Analysis**: Only analyze high-risk events with GPT-5

Target: **< $0.10 per analysis**

---

### Step 7: Dashboard Integration

Create: `frontend/src/components/ai-platforms/GPT5InsightsPanel.tsx`

Display:
- AI-generated insights
- Prioritized alerts
- Actionable recommendations
- Cross-platform correlations

---

## Test Scenarios

### Scenario 1: Sensitive Data Upload
```
Event: User uploads "customer_database.csv" to ChatGPT
Expected: HIGH risk alert, GDPR/PCI compliance flag, recommendation to block
```

### Scenario 2: Legitimate Business Use
```
Event: Sales user uses Gemini "help me write" in Gmail 50 times/day
Expected: LOW risk, contextual insight about sales workflow
```

### Scenario 3: Cross-Platform Data Pipeline
```
Events: Slack bot → Google Apps Script → ChatGPT (sequential, same data)
Expected: CRITICAL alert, correlation detected, workflow chain identified
```

### Scenario 4: Off-Hours Anomaly
```
Event: User logs into Claude at 3 AM (outside normal hours)
Expected: MEDIUM alert, anomaly detected, check for account compromise
```

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Analysis Time | < 5 seconds |
| Cost per Analysis | < $0.10 |
| Cache Hit Rate | > 60% |
| Accuracy (vs manual) | > 95% |
| False Positive Rate | < 10% |

---

## Success Criteria

### Code Quality
- [ ] All tests passing (100% coverage)
- [ ] TypeScript compilation clean
- [ ] No console.log statements
- [ ] Comprehensive error handling

### Functionality
- [ ] Risk assessment working
- [ ] Content analysis detecting PII/PHI/PCI
- [ ] Pattern detection finding anomalies
- [ ] Compliance checks accurate
- [ ] Alerts properly prioritized
- [ ] Insights meaningful and actionable
- [ ] Recommendations specific and helpful

### Performance
- [ ] Analysis time < 5 seconds
- [ ] Cost per analysis < $0.10
- [ ] Caching functional
- [ ] Token usage optimized

### Integration
- [ ] Works with Phases 1-3 connectors
- [ ] Dashboard integration complete
- [ ] API endpoints functional

---

## Environment Variables

```bash
# GPT-5 API
GPT5_API_KEY=sk-proj-your-key
GPT5_MODEL=gpt-5-turbo
GPT5_MAX_TOKENS=2000
GPT5_TEMPERATURE=0.3

# Caching
ENABLE_GPT5_CACHING=true
GPT5_CACHE_TTL=86400

# Cost Limits
GPT5_MAX_COST_PER_ANALYSIS=0.10
```

---

## Resources

- **OpenAI API Docs**: https://platform.openai.com/docs/api-reference
- **Type Definitions**: `shared-types/src/ai-analysis/gpt5-analysis.ts`
- **Implementation Spec**: `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md`
- **Prompt Engineering**: https://platform.openai.com/docs/guides/prompt-engineering

---

**Phase**: 4 of 4
**Component**: GPT-5 Analysis (Core Differentiator)
**Status**: Ready to implement
**Assigned Workspace**: Conductor Workspace #4
