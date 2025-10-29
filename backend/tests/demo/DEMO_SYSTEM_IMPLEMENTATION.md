# Singura Demo System Implementation Guide

## Purpose
Create a live, interactive demo system that showcases Singura's automation detection capabilities in real-time.

**Target Audience**: Prospects, investors, early customers

**Demo Experience**: User connects test account → Automated traffic generates → Live detections appear on dashboard → Risk scores visualized

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Demo System                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Traffic    │──┬──▶│  Detection   │                    │
│  │  Generator   │  │   │   Engine     │                    │
│  └──────────────┘  │   └──────────────┘                    │
│                     │          │                             │
│  Google Workspace   │          ▼                            │
│  Slack Workspace    │   ┌──────────────┐                   │
│  (Test Accounts)    │   │  Dashboard   │◀─── Live Updates  │
│                     │   │     UI       │                    │
│                     │   └──────────────┘                    │
│                     │                                        │
│                     └─▶ Audit Logs                          │
│                         (Real Platform Data)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Component 1: Traffic Generation Service

### Goal
Generate realistic automation traffic on demand for demonstrations.

### Implementation

**File**: `backend/src/services/demo/traffic-generator.service.ts`

```typescript
import { WebClient } from '@slack/web-api';
import { google } from 'googleapis';

export interface TrafficScenario {
  id: string;
  name: string;
  description: string;
  platform: 'slack' | 'google';
  detectorTypes: string[];
  duration: number; // milliseconds
  expectedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class TrafficGeneratorService {
  private scenarios: Map<string, TrafficScenario> = new Map();

  constructor(
    private slackClient: WebClient,
    private googleAuth: any
  ) {
    this.registerScenarios();
  }

  private registerScenarios(): void {
    // Scenario 1: Velocity Attack
    this.scenarios.set('velocity-attack', {
      id: 'velocity-attack',
      name: 'High-Velocity File Creation',
      description: 'AI bot creates 50 files in 10 seconds',
      platform: 'google',
      detectorTypes: ['velocity', 'ai_provider'],
      duration: 10000,
      expectedRiskLevel: 'high'
    });

    // Scenario 2: ChatGPT Integration
    this.scenarios.set('chatgpt-integration', {
      id: 'chatgpt-integration',
      name: 'OpenAI Integration Detected',
      description: 'Slack bot forwards messages to ChatGPT',
      platform: 'slack',
      detectorTypes: ['ai_provider'],
      duration: 5000,
      expectedRiskLevel: 'high'
    });

    // Scenario 3: Off-Hours Data Access
    this.scenarios.set('off-hours-access', {
      id: 'off-hours-access',
      name: 'Weekend Data Exfiltration',
      description: 'Bot accesses sensitive files on Saturday 2 AM',
      platform: 'google',
      detectorTypes: ['off_hours', 'data_volume'],
      duration: 30000,
      expectedRiskLevel: 'critical'
    });

    // Scenario 4: Batch Operations
    this.scenarios.set('batch-permissions', {
      id: 'batch-permissions',
      name: 'Bulk Permission Changes',
      description: 'Automated sharing of 20 files to external users',
      platform: 'google',
      detectorTypes: ['batch_operation'],
      duration: 15000,
      expectedRiskLevel: 'high'
    });

    // Scenario 5: Cross-Platform Correlation
    this.scenarios.set('cross-platform', {
      id: 'cross-platform',
      name: 'Google-to-Slack Data Flow',
      description: 'Automation chain: Drive files → Slack notifications',
      platform: 'google', // triggers both
      detectorTypes: ['correlation'],
      duration: 20000,
      expectedRiskLevel: 'high'
    });
  }

  async runScenario(scenarioId: string): Promise<TrafficGenerationResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

    console.log(`[Demo] Running scenario: ${scenario.name}`);

    switch (scenarioId) {
      case 'velocity-attack':
        return await this.runVelocityAttack();
      case 'chatgpt-integration':
        return await this.runChatGPTIntegration();
      case 'off-hours-access':
        return await this.runOffHoursAccess();
      case 'batch-permissions':
        return await this.runBatchPermissions();
      case 'cross-platform':
        return await this.runCrossPlatform();
      default:
        throw new Error(`Scenario not implemented: ${scenarioId}`);
    }
  }

  private async runVelocityAttack(): Promise<TrafficGenerationResult> {
    const drive = google.drive({ version: 'v3', auth: this.googleAuth });
    const startTime = Date.now();
    const filesCreated: string[] = [];

    // Create 50 files in ~10 seconds
    for (let i = 0; i < 50; i++) {
      const file = await drive.files.create({
        requestBody: {
          name: `velocity-test-${i}-${Date.now()}.txt`,
          mimeType: 'text/plain'
        },
        media: {
          mimeType: 'text/plain',
          body: `Test file ${i} created by demo traffic generator`
        }
      });

      filesCreated.push(file.data.id!);

      // Small delay to spread over 10 seconds (but still fast)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const duration = Date.now() - startTime;

    return {
      scenarioId: 'velocity-attack',
      success: true,
      duration,
      artifactsCreated: filesCreated.length,
      metadata: {
        filesCreated,
        eventsPerSecond: filesCreated.length / (duration / 1000)
      }
    };
  }

  private async runChatGPTIntegration(): Promise<TrafficGenerationResult> {
    // Post a message that triggers ChatGPT bot
    const result = await this.slackClient.chat.postMessage({
      channel: process.env.DEMO_SLACK_CHANNEL!,
      text: '<@U_CHATGPT_BOT> Summarize our Q1 financial results'
    });

    // Wait for bot response (includes OpenAI API call in audit logs)
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      scenarioId: 'chatgpt-integration',
      success: true,
      duration: 5000,
      artifactsCreated: 2, // original message + bot response
      metadata: {
        messageTs: result.ts,
        channel: result.channel
      }
    };
  }

  private async runOffHoursAccess(): Promise<TrafficGenerationResult> {
    const drive = google.drive({ version: 'v3', auth: this.googleAuth });
    const startTime = Date.now();

    // Access 50 files from "sensitive data" folder
    const folderId = process.env.DEMO_SENSITIVE_FOLDER_ID!;
    const files = await drive.files.list({
      q: `'${folderId}' in parents`,
      pageSize: 50,
      fields: 'files(id, name)'
    });

    const filesAccessed: string[] = [];

    for (const file of files.data.files || []) {
      // Download file metadata (creates audit log entry)
      await drive.files.get({
        fileId: file.id!,
        fields: 'id, name, createdTime, modifiedTime, owners'
      });

      filesAccessed.push(file.id!);
    }

    const duration = Date.now() - startTime;

    return {
      scenarioId: 'off-hours-access',
      success: true,
      duration,
      artifactsCreated: filesAccessed.length,
      metadata: {
        filesAccessed,
        timestamp: new Date().toISOString(),
        // Note: Off-hours detection depends on current time
        // For demo, may need to mock time or use pre-recorded audit logs
      }
    };
  }

  private async runBatchPermissions(): Promise<TrafficGenerationResult> {
    const drive = google.drive({ version: 'v3', auth: this.googleAuth });
    const startTime = Date.now();

    // Get files from demo folder
    const folderId = process.env.DEMO_TEST_FOLDER_ID!;
    const files = await drive.files.list({
      q: `'${folderId}' in parents`,
      pageSize: 20,
      fields: 'files(id, name)'
    });

    const filesShared: string[] = [];
    const externalEmail = 'external-demo-user@example.com';

    for (const file of files.data.files || []) {
      // Share file with external user
      await drive.permissions.create({
        fileId: file.id!,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: externalEmail
        }
      });

      filesShared.push(file.id!);

      // Small delay to simulate batch operation
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Date.now() - startTime;

    return {
      scenarioId: 'batch-permissions',
      success: true,
      duration,
      artifactsCreated: filesShared.length,
      metadata: {
        filesShared,
        externalEmail,
        operationsPerSecond: filesShared.length / (duration / 1000)
      }
    };
  }

  private async runCrossPlatform(): Promise<TrafficGenerationResult> {
    const drive = google.drive({ version: 'v3', auth: this.googleAuth });
    const startTime = Date.now();

    // 1. Create file in Google Drive
    const file = await drive.files.create({
      requestBody: {
        name: `cross-platform-test-${Date.now()}.pdf`,
        mimeType: 'application/pdf'
      },
      media: {
        mimeType: 'application/pdf',
        body: Buffer.from('Demo PDF content')
      }
    });

    // 2. Post notification to Slack with Drive link
    await this.slackClient.chat.postMessage({
      channel: process.env.DEMO_SLACK_CHANNEL!,
      text: `📄 New file created: <https://drive.google.com/file/d/${file.data.id}|${file.data.name}>`
    });

    const duration = Date.now() - startTime;

    return {
      scenarioId: 'cross-platform',
      success: true,
      duration,
      artifactsCreated: 2, // Drive file + Slack message
      metadata: {
        driveFileId: file.data.id,
        correlation: 'google-to-slack'
      }
    };
  }

  getAvailableScenarios(): TrafficScenario[] {
    return Array.from(this.scenarios.values());
  }
}

interface TrafficGenerationResult {
  scenarioId: string;
  success: boolean;
  duration: number;
  artifactsCreated: number;
  metadata: any;
}
```

---

## Component 2: Demo Mode API Endpoints

### Goal
Provide API endpoints for UI to trigger demo scenarios and get real-time status.

**File**: `backend/src/routes/demo.ts`

```typescript
import { Router } from 'express';
import { ClerkAuthRequest } from '../middleware/clerk-auth';
import { trafficGeneratorService } from '../services/demo/traffic-generator.service';
import { discoveryService } from '../services/discovery-service';

const router = Router();

// GET /api/demo/scenarios
// Returns available demo scenarios
router.get('/scenarios', async (req: ClerkAuthRequest, res) => {
  const scenarios = trafficGeneratorService.getAvailableScenarios();

  res.json({
    scenarios: scenarios.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      platform: s.platform,
      expectedDetectors: s.detectorTypes,
      expectedRiskLevel: s.expectedRiskLevel,
      estimatedDuration: s.duration
    }))
  });
});

// POST /api/demo/scenarios/:scenarioId/run
// Triggers a demo scenario
router.post('/scenarios/:scenarioId/run', async (req: ClerkAuthRequest, res) => {
  const { scenarioId } = req.params;
  const { organizationId } = req.auth;

  try {
    // 1. Generate traffic
    const trafficResult = await trafficGeneratorService.runScenario(scenarioId);

    // 2. Wait for audit logs to update (platform-dependent)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Trigger discovery
    const discovery = await discoveryService.runDiscovery({
      organizationId,
      platform: trafficResult.metadata.platform || 'google',
      connectionId: req.body.connectionId // Demo connection ID
    });

    res.json({
      success: true,
      scenarioId,
      trafficResult,
      discoveryRunId: discovery.id,
      message: 'Demo scenario executed successfully. Check dashboard for detections.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/demo/status/:discoveryRunId
// Polls for detection results
router.get('/status/:discoveryRunId', async (req: ClerkAuthRequest, res) => {
  const { discoveryRunId } = req.params;

  const automations = await discoveryService.getAutomations({
    discoveryRunId
  });

  res.json({
    discoveryRunId,
    status: 'completed',
    detectionsCount: automations.length,
    detections: automations.map(a => ({
      id: a.id,
      name: a.name,
      type: a.automationType,
      riskLevel: a.riskLevel,
      riskScore: a.riskScore,
      detectors: a.detectionMetadata?.detectionPatterns?.map(p => p.type) || [],
      aiProvider: a.detectionMetadata?.aiProvider?.provider
    }))
  });
});

export default router;
```

---

## Component 3: Demo Mode UI

### Goal
Create an interactive UI for running demo scenarios and visualizing detections in real-time.

**File**: `frontend/src/pages/Demo/DemoMode.tsx`

```typescript
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  platform: 'slack' | 'google';
  expectedDetectors: string[];
  expectedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
}

export function DemoMode() {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [detections, setDetections] = useState<any[]>([]);

  React.useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const response = await fetch('/api/demo/scenarios');
    const data = await response.json();
    setScenarios(data.scenarios);
  };

  const runScenario = async (scenarioId: string) => {
    setRunningScenario(scenarioId);
    setDetections([]);

    try {
      // 1. Execute scenario
      const response = await fetch(`/api/demo/scenarios/${scenarioId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'demo-connection-id' // From demo environment
        })
      });

      const result = await response.json();

      // 2. Poll for detections
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`/api/demo/status/${result.discoveryRunId}`);
        const statusData = await statusResponse.json();

        if (statusData.detectionsCount > 0) {
          setDetections(statusData.detections);
          clearInterval(pollInterval);
          setRunningScenario(null);
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setRunningScenario(null);
      }, 30000);
    } catch (error) {
      console.error('Failed to run scenario:', error);
      setRunningScenario(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Demo Mode</h1>
          <p className="text-muted-foreground">
            Run live automation scenarios and watch detections in real-time
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          🧪 Demo Environment
        </Badge>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map(scenario => (
          <Card key={scenario.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{scenario.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {scenario.description}
                  </CardDescription>
                </div>
                <Badge variant={
                  scenario.platform === 'google' ? 'default' : 'secondary'
                }>
                  {scenario.platform === 'google' ? 'Google Workspace' : 'Slack'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Expected Detectors */}
              <div>
                <p className="text-sm font-medium mb-2">Triggers:</p>
                <div className="flex flex-wrap gap-2">
                  {scenario.expectedDetectors.map(detector => (
                    <Badge key={detector} variant="outline" className="text-xs">
                      {detector.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Risk Level */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Expected Risk:</p>
                <Badge variant={
                  scenario.expectedRiskLevel === 'critical' ? 'destructive' :
                  scenario.expectedRiskLevel === 'high' ? 'destructive' :
                  scenario.expectedRiskLevel === 'medium' ? 'default' : 'secondary'
                }>
                  {scenario.expectedRiskLevel}
                </Badge>
              </div>

              {/* Run Button */}
              <Button
                onClick={() => runScenario(scenario.id)}
                disabled={runningScenario !== null}
                className="w-full"
              >
                {runningScenario === scenario.id ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Running...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Scenario
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Detections */}
      {detections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Live Detections
            </CardTitle>
            <CardDescription>
              Singura detected {detections.length} automation(s) from the scenario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detections.map(detection => (
                <div
                  key={detection.id}
                  className="p-4 border rounded-lg flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{detection.name}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {detection.type}
                      </Badge>
                      {detection.aiProvider && (
                        <Badge variant="default" className="text-xs">
                          {detection.aiProvider} detected
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {detection.detectors.map((detector: string) => (
                        <Badge key={detector} variant="secondary" className="text-xs">
                          {detector.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      detection.riskLevel === 'critical' ? 'destructive' :
                      detection.riskLevel === 'high' ? 'destructive' :
                      'default'
                    } className="mb-2">
                      {detection.riskLevel}
                    </Badge>
                    <p className="text-2xl font-bold">
                      {detection.riskScore}
                    </p>
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Component 4: Environment Setup

### Test Account Configuration

**File**: `.env.demo`

```bash
# Demo Environment Configuration
NODE_ENV=demo

# Google Workspace Demo Account
DEMO_GOOGLE_CLIENT_ID=your-demo-client-id
DEMO_GOOGLE_CLIENT_SECRET=your-demo-client-secret
DEMO_GOOGLE_REFRESH_TOKEN=your-demo-refresh-token
DEMO_GOOGLE_SERVICE_ACCOUNT_KEY=./config/demo-service-account.json
DEMO_SENSITIVE_FOLDER_ID=folder-id-with-test-data
DEMO_TEST_FOLDER_ID=folder-id-for-test-files

# Slack Demo Workspace
DEMO_SLACK_BOT_TOKEN=xoxb-your-demo-bot-token
DEMO_SLACK_WORKSPACE_ID=T0123456789
DEMO_SLACK_CHANNEL=C9876543210
DEMO_CHATGPT_BOT_USER_ID=U_CHATGPT_BOT

# Database (separate demo database)
DATABASE_URL=postgresql://postgres:password@localhost:5433/singura_demo

# Feature Flags
ENABLE_DEMO_MODE=true
DEMO_MODE_PASSWORD=singura-demo-2025
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Tasks**:
- [ ] Create Google Workspace Developer account
- [ ] Create Slack demo workspace (singura-demo.slack.com)
- [ ] Setup 5 test users on each platform
- [ ] Create service account with domain-wide delegation (Google)
- [ ] Create Slack app with bot token
- [ ] Implement `TrafficGeneratorService` with 5 scenarios
- [ ] Create demo database schema

**Deliverables**:
- ✅ Test environments configured
- ✅ Service accounts provisioned
- ✅ Traffic generator with 5 working scenarios

---

### Phase 2: API & Detection Validation (Week 2)

**Tasks**:
- [ ] Implement demo API endpoints (`/api/demo/*`)
- [ ] Add demo routes to Express server
- [ ] Test each scenario manually
- [ ] Verify detections appear in database
- [ ] Measure detection accuracy (precision/recall)
- [ ] Document any false positives/negatives

**Deliverables**:
- ✅ Demo API endpoints functional
- ✅ All 5 scenarios trigger expected detections
- ✅ Validation report with metrics

---

### Phase 3: UI Implementation (Week 3)

**Tasks**:
- [ ] Create `DemoMode.tsx` component
- [ ] Add demo mode route to frontend
- [ ] Implement scenario cards and run buttons
- [ ] Add real-time detection display
- [ ] Add live updates (polling or WebSocket)
- [ ] Style with TailwindCSS
- [ ] Add demo mode password protection

**Deliverables**:
- ✅ Demo mode UI fully functional
- ✅ Real-time detections visualization
- ✅ Polished, demo-ready interface

---

### Phase 4: Polish & Documentation (Week 4)

**Tasks**:
- [ ] Add loading states and error handling
- [ ] Create demo mode documentation
- [ ] Record demo video walkthrough
- [ ] Add analytics (track which scenarios are run)
- [ ] Performance optimization
- [ ] Security audit (ensure demo can't access prod data)

**Deliverables**:
- ✅ Demo mode ready for prospects
- ✅ Documentation and training materials
- ✅ Demo video for marketing

---

## Security Considerations

1. **Isolation**: Demo environment uses separate database and credentials
2. **Rate Limiting**: Prevent abuse of demo scenarios
3. **Password Protection**: Demo mode requires password (or demo org flag)
4. **Data Cleanup**: Automated cleanup of demo artifacts after 24 hours
5. **No Production Access**: Demo service account cannot access real customer data

---

## Success Metrics

### Technical Validation
- ✅ All 5 scenarios execute successfully
- ✅ Detection precision ≥85%
- ✅ Detection recall ≥90%
- ✅ UI updates within 5 seconds of detection

### Business Validation
- ✅ Demo impresses prospects (qualitative feedback)
- ✅ Conversion rate: Demo viewers → Trial signups
- ✅ Time to demo: <2 minutes from start to first detection

---

## Next Steps

1. **Immediate**: Create Google Workspace Developer account + Slack workspace
2. **Week 1**: Implement traffic generator service
3. **Week 2**: Build demo API endpoints + validate detections
4. **Week 3**: Build demo mode UI
5. **Week 4**: Polish and prepare for first demo

**Timeline**: 4 weeks to fully functional demo system
**Effort**: 1 engineer full-time

---

## Alternative: Pre-Recorded Demo

If live traffic generation is too complex initially, consider:

1. **Record Audit Logs**: Capture real audit log responses from test scenarios
2. **Replay via Fixtures**: Load pre-recorded audit logs into detection engine
3. **Simulate Real-Time**: Add artificial delays to simulate live detection
4. **Pros**: Faster to build, guaranteed to work, no API dependencies
5. **Cons**: Less impressive than truly live demo

**Recommendation**: Start with pre-recorded, upgrade to live later if needed.
