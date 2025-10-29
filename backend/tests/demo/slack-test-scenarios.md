# Slack Detection Test Scenarios

## Purpose
Validate that Singura's detection algorithms correctly identify automation patterns in Slack workspaces.

## Test Environment Setup

### Prerequisites
- Slack workspace (free tier works - singura-demo.slack.com)
- Slack App with bot user token
- 3-5 test user accounts
- Workflow Builder enabled (free tier includes basic workflows)

---

## Scenario 1: Velocity Detection - Message Spam Bot

**Automation**: Slack bot that posts 30 messages in 10 seconds

**Bot Code** (`velocity-spam-bot.ts`):
```typescript
import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function spamMessages() {
  const channel = 'C123456'; // #test-channel

  for (let i = 0; i < 30; i++) {
    await client.chat.postMessage({
      channel,
      text: `Test message ${i + 1}`,
      as_user: true
    });
  }

  console.log('Posted 30 messages in ~10 seconds');
}

spamMessages();
```

**Expected Detection**:
- ✅ Velocity Detector triggers (30 messages / 10 seconds = 3 msg/sec > 2 msg/sec threshold)
- ✅ Bot identified via `users.list()` with `is_bot: true`
- ✅ Risk Score: 65+ (Medium - spam pattern)
- ✅ Detection Pattern: `velocity`

**Validation**:
```typescript
// backend/tests/integration/slack-velocity-detection.test.ts
it('should detect rapid message posting as bot activity', async () => {
  // 1. Deploy and run spam bot
  await runSlackBot('velocity-spam-bot');

  // 2. Trigger discovery
  const discovery = await discoveryService.runDiscovery({
    organizationId: testOrgId,
    platform: 'slack',
    connectionId: testConnectionId
  });

  // 3. Verify detection
  const automations = await discoveryService.getAutomations({ discoveryRunId: discovery.id });
  const velocityBot = automations.find(a =>
    a.automationType === 'bot' &&
    a.detectionMetadata?.detectionPatterns?.some(p => p.type === 'velocity')
  );

  expect(velocityBot).toBeDefined();
  expect(velocityBot.riskScore).toBeGreaterThan(60);
});
```

---

## Scenario 2: AI Provider Detection - ChatGPT Integration Bot

**Automation**: Slack bot that forwards messages to OpenAI API

**Bot Code** (`chatgpt-integration-bot.ts`):
```typescript
import { WebClient } from '@slack/web-api';
import { createServer } from 'http';

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Bot listens for mentions and forwards to ChatGPT
createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/slack/events') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const event = JSON.parse(body);

      if (event.type === 'app_mention') {
        const userMessage = event.text.replace(/<@U\w+>/, '').trim();

        // Call OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: userMessage }]
          })
        });

        const aiReply = await openaiResponse.json();

        // Post AI response back to Slack
        await slackClient.chat.postMessage({
          channel: event.channel,
          text: aiReply.choices[0].message.content
        });
      }

      res.writeHead(200);
      res.end();
    });
  }
}).listen(3000);
```

**Expected Detection**:
- ✅ AI Provider Detector triggers (API endpoint: `api.openai.com`)
- ✅ Provider identified: OpenAI
- ✅ Model detected: gpt-4
- ✅ Confidence: 100 (endpoint match)
- ✅ Risk Score: 85+ (High - AI processes Slack messages)
- ✅ GDPR concerns: Chat data sent to third-party AI

**Validation**:
```typescript
it('should detect OpenAI integration in Slack bot', async () => {
  // 1. Deploy ChatGPT bot
  await deploySlackBot('chatgpt-integration-bot');

  // 2. Trigger bot (mention it in channel)
  await slackClient.chat.postMessage({
    channel: 'C123456',
    text: '<@U_BOT_ID> Hello, how are you?'
  });

  // Wait for bot response and audit log update
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 3. Run discovery
  await discoveryService.runDiscovery({ platform: 'slack', ... });

  // 4. Verify AI provider detection
  const automations = await discoveryService.getAutomations({ ... });
  const aiBot = automations.find(a =>
    a.detectionMetadata?.aiProvider?.provider === 'openai'
  );

  expect(aiBot).toBeDefined();
  expect(aiBot.detectionMetadata.aiProvider.model).toContain('gpt-4');
  expect(aiBot.detectionMetadata.aiProvider.confidence).toBe(100);
  expect(aiBot.riskScore).toBeGreaterThan(80);
  expect(aiBot.riskAssessment.gdprConcerns).toContain('Third-party AI processing');
});
```

---

## Scenario 3: Workflow Builder - Scheduled Announcements

**Automation**: Slack Workflow that posts daily at 9 AM

**Workflow Setup** (via Workflow Builder UI):
```yaml
Name: "Daily Standup Reminder"
Trigger: Scheduled (Every weekday at 9:00 AM)
Steps:
  - Send a message to #general
    Message: "🌅 Good morning! Time for daily standup in 5 minutes."
```

**Expected Detection**:
- ✅ Workflow detected via `admin.workflows.list()` (requires admin token)
- ✅ Automation Type: `workflow`
- ✅ Risk Score: 15-25 (Low - legitimate business automation)
- ✅ Off-Hours Detector: Should NOT trigger (9 AM is business hours)

**Validation**:
```typescript
it('should detect Slack Workflow but mark low risk', async () => {
  // Workflows are detected via Slack API, not deployment
  // This test validates discovery + risk assessment

  await discoveryService.runDiscovery({ platform: 'slack', ... });

  const automations = await discoveryService.getAutomations({ ... });
  const workflow = automations.find(a =>
    a.automationType === 'workflow' &&
    a.name.includes('Daily Standup Reminder')
  );

  expect(workflow).toBeDefined();
  expect(workflow.riskLevel).toBe('low');
  expect(workflow.riskScore).toBeLessThan(30);

  // Should NOT trigger off-hours detector (9 AM is business hours)
  const hasOffHours = workflow.detectionMetadata?.detectionPatterns?.some(p => p.type === 'off_hours');
  expect(hasOffHours).toBeFalsy();
});
```

---

## Scenario 4: Off-Hours Detection - Weekend Bot Activity

**Automation**: Bot that posts on Saturday at 2 AM

**Bot Code** (`weekend-bot.ts`):
```typescript
import { WebClient } from '@slack/web-api';
import cron from 'node-cron';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

// Schedule: Every Saturday at 2:00 AM
cron.schedule('0 2 * * 6', async () => {
  await client.chat.postMessage({
    channel: 'C123456',
    text: '🌙 Weekend processing complete. Data exported to external system.'
  });

  console.log('Weekend message posted at 2 AM Saturday');
});
```

**Expected Detection**:
- ✅ Off-Hours Detector triggers (Saturday 2 AM, 100% outside business hours)
- ✅ Risk Score: 80+ (High - weekend activity suspicious)
- ✅ Risk Level: High

**Validation**:
```typescript
it('should detect weekend bot activity as high risk', async () => {
  // Mock current time as Saturday 2 AM
  jest.useFakeTimers().setSystemTime(new Date('2025-10-25T02:00:00Z')); // Saturday

  await deploySlackBot('weekend-bot');
  await triggerCronJob('weekend-bot');
  await discoveryService.runDiscovery({ platform: 'slack', ... });

  const automations = await discoveryService.getAutomations({ ... });
  const weekendBot = automations.find(a =>
    a.detectionMetadata?.detectionPatterns?.some(p => p.type === 'off_hours')
  );

  expect(weekendBot).toBeDefined();
  expect(weekendBot.riskScore).toBeGreaterThan(75);

  const offHoursPattern = weekendBot.detectionMetadata.detectionPatterns.find(p => p.type === 'off_hours');
  expect(offHoursPattern.details.offHoursPercentage).toBeGreaterThan(0.9); // 90%+ off-hours

  jest.useRealTimers();
});
```

---

## Scenario 5: Batch Operation Detection - Bulk Channel Invites

**Automation**: Bot that adds 20 users to channels simultaneously

**Bot Code** (`bulk-invite-bot.ts`):
```typescript
import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function bulkInviteUsers() {
  const targetChannel = 'C123456';
  const userIds = [
    'U001', 'U002', 'U003', 'U004', 'U005',
    'U006', 'U007', 'U008', 'U009', 'U010',
    'U011', 'U012', 'U013', 'U014', 'U015',
    'U016', 'U017', 'U018', 'U019', 'U020'
  ];

  for (const userId of userIds) {
    await client.conversations.invite({
      channel: targetChannel,
      users: userId
    });
  }

  console.log('Invited 20 users to channel');
}

bulkInviteUsers();
```

**Expected Detection**:
- ✅ Batch Operation Detector triggers (20 similar actions within 1 minute)
- ✅ Pattern: Same action type (channel invite), same channel
- ✅ Risk Score: 60+ (Medium - potential spam or privilege escalation)

**Validation**:
```typescript
it('should detect bulk channel invites as batch operation', async () => {
  await runSlackBot('bulk-invite-bot');
  await discoveryService.runDiscovery({ platform: 'slack', ... });

  const automations = await discoveryService.getAutomations({ ... });
  const batchBot = automations.find(a =>
    a.detectionMetadata?.detectionPatterns?.some(p => p.type === 'batch_operation')
  );

  expect(batchBot).toBeDefined();

  const batchPattern = batchBot.detectionMetadata.detectionPatterns.find(p => p.type === 'batch_operation');
  expect(batchPattern.details.actionCount).toBeGreaterThanOrEqual(20);
  expect(batchPattern.details.similarity).toBeGreaterThan(0.8); // 80%+ similar
});
```

---

## Scenario 6: Webhook Detection - Outgoing Webhook

**Automation**: Outgoing webhook that sends Slack messages to external service

**Webhook Setup** (via Slack Admin):
```yaml
Type: Outgoing Webhook
Trigger Words: "export", "send data"
URL: https://external-service.example.com/slack-webhook
Channels: #general, #data-requests
```

**Expected Detection**:
- ✅ Webhook detected via `admin.apps.approved.list()` or workspace analysis
- ✅ Automation Type: `webhook`
- ✅ Risk Score: 70+ (Medium-High - data leaving Slack)
- ✅ GDPR concerns: Data sent to third-party

**Validation**:
```typescript
it('should detect outgoing webhook and flag GDPR concerns', async () => {
  // Webhooks are detected via Slack API discovery
  await discoveryService.runDiscovery({ platform: 'slack', ... });

  const automations = await discoveryService.getAutomations({ ... });
  const webhook = automations.find(a =>
    a.automationType === 'webhook' &&
    a.platformMetadata?.webhookUrl?.includes('external-service.example.com')
  );

  expect(webhook).toBeDefined();
  expect(webhook.riskScore).toBeGreaterThan(65);
  expect(webhook.riskAssessment.gdprConcerns).toContain('Data sent to external service');
});
```

---

## Scenario 7: Permission Escalation - Bot Self-Promotion

**Automation**: Bot that requests additional scopes after installation

**Detection via Audit Logs**:
```typescript
// Slack audit logs track app permission changes
// Expected audit log entry:
{
  "action": "app_scopes_expansion",
  "actor": {
    "type": "user",
    "user": { "id": "U_ADMIN_ID", "email": "admin@company.com" }
  },
  "entity": {
    "type": "app",
    "app": { "id": "A_BOT_ID", "name": "Demo Bot" }
  },
  "context": {
    "scopes_added": ["channels:write", "files:read", "users:read.email"]
  }
}
```

**Expected Detection**:
- ✅ Permission Escalation Detector triggers (new scopes added)
- ✅ Risk Score: 85+ (High - privilege creep)
- ✅ Alert: Bot gained sensitive permissions

**Validation**:
```typescript
it('should detect bot permission escalation', async () => {
  // Simulate scope expansion via Slack Admin UI
  // (manually grant bot additional scopes)

  await discoveryService.runDiscovery({ platform: 'slack', ... });

  const automations = await discoveryService.getAutomations({ ... });
  const escalatedBot = automations.find(a =>
    a.detectionMetadata?.detectionPatterns?.some(p => p.type === 'permission_escalation')
  );

  expect(escalatedBot).toBeDefined();
  expect(escalatedBot.riskScore).toBeGreaterThan(80);

  const escalationPattern = escalatedBot.detectionMetadata.detectionPatterns.find(
    p => p.type === 'permission_escalation'
  );
  expect(escalationPattern.details.newPermissions).toContain('channels:write');
});
```

---

## Summary: Test Coverage Matrix

| Scenario | Detector(s) Triggered | Risk Level | Validation Status |
|----------|----------------------|------------|-------------------|
| 1. Message Spam Bot | Velocity | Medium | 🔄 Pending |
| 2. ChatGPT Integration | AI Provider | High | 🔄 Pending |
| 3. Daily Standup Workflow | None (legitimate) | Low | 🔄 Pending |
| 4. Weekend Bot Activity | Off-Hours | High | 🔄 Pending |
| 5. Bulk Channel Invites | Batch Operation | Medium | 🔄 Pending |
| 6. Outgoing Webhook | None (webhook type) | Medium-High | 🔄 Pending |
| 7. Bot Scope Expansion | Permission Escalation | High | 🔄 Pending |

**Total Coverage**:
- ✅ 5 detector types validated
- ✅ 7 realistic Slack automation scenarios
- ✅ Risk levels: 0 Critical, 4 High, 2 Medium, 1 Low
- ✅ False positive test (legitimate workflow marked low-risk)

---

## Implementation Checklist

### Phase 1: Environment Setup (Week 1)
- [ ] Create Slack workspace (singura-demo.slack.com)
- [ ] Create Slack App with bot user token
- [ ] Setup test user accounts (5 users)
- [ ] Create test channels (#test-channel, #general, #data-requests)
- [ ] Configure OAuth credentials for Singura backend
- [ ] Enable Workflow Builder
- [ ] Setup outgoing webhook

### Phase 2: Bot Deployment (Week 2)
- [ ] Deploy all 7 test scenarios as separate bots/workflows
- [ ] Configure cron jobs for off-hours scenario
- [ ] Document bot IDs and channel IDs
- [ ] Test each bot manually to verify functionality

### Phase 3: Detection Validation (Week 3)
- [ ] Run each scenario manually
- [ ] Trigger discovery for each scenario
- [ ] Verify detections in database
- [ ] Measure precision/recall against expected results
- [ ] Document any false positives/negatives

### Phase 4: Automated Testing (Week 4)
- [ ] Write integration tests for each scenario
- [ ] Create test runner script
- [ ] Add CI/CD integration
- [ ] Generate test report with metrics

---

## Next Steps

1. **Immediate**: Create Slack workspace (singura-demo.slack.com)
2. **Week 1**: Deploy Scenario 1 (Velocity) + Scenario 2 (ChatGPT)
3. **Week 2**: Validate detection accuracy, measure metrics
4. **Week 3**: Deploy remaining scenarios, full test suite
5. **Week 4**: Automate testing, integrate with CI/CD

**Goal**: Prove Slack detection works with measurable confidence (Precision ≥85%, Recall ≥90%)
