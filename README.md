# SaaS X-Ray 🔍

**Enterprise Shadow AI & Automation Detection Platform**

SaaS X-Ray automatically discovers and monitors unauthorized AI agents, bots, and automations running across your organization's SaaS applications. Our AI-focused detection engine identifies when employees are connecting ChatGPT, Claude, and other AI services to sensitive business data, giving security teams visibility into shadow AI usage before it becomes a compliance violation.

## 🎯 Problem Statement

Most enterprises have **20-50 unauthorized AI integrations** already running in their SaaS applications without IT knowledge:
- Customer support bots using GPT-4 with access to customer PII
- Financial analysis scripts sending revenue data to Claude
- Meeting transcription bots processing confidential C-suite discussions
- Document analysis workflows exposing HR and legal files to multiple AI providers
- Marketing content generators with unvetted public-facing AI outputs

**The Risk:** GDPR violations, financial data exposure, confidential meeting leaks, and AI-driven security breaches.

## ✨ Key Features

### 🤖 **AI-Powered Discovery**
- Detect AI integrations and bots across Slack, Google Workspace, Microsoft 365, and more
- Identify OpenAI, Anthropic, Cohere, and other AI service connections
- Real-time monitoring of AI API calls and data transmission patterns
- Historical analysis of AI automation usage and risk evolution

### 📊 **AI-Specific Risk Assessment**
- Risk scoring based on AI provider, data sensitivity, and automation permissions
- Identify critical-risk AI automations processing PII, financial, or confidential data
- Track AI data flows and cross-platform correlation chains
- GDPR Article 30 compliance assessment for AI data processing

### 🔗 **Cross-Platform Correlation**
- Map automation sequences across multiple SaaS platforms
- Detect complex workflows spanning Slack → Google Drive → Jira
- Timeline visualization of automated activities

### 📈 **Compliance Ready**
- Generate audit reports for security reviews
- Export evidence for SOC2, ISO 27001 compliance
- Track data processing activities for GDPR Article 30

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### 1. Clone and Install
```bash
git clone https://github.com/your-org/saas-xray.git
cd saas-xray
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your OAuth credentials
```

### 3. Set Up Database
```bash
npm run db:migrate
```

### 4. Start Development (MVP Demo Mode)
```bash
# Backend API with AI-enhanced mock data (port 3001)
cd backend
USE_MOCK_DATA=true ENABLE_DATA_TOGGLE=true node test-data-toggle.js

# Frontend Dashboard (port 3000)
cd frontend
VITE_API_URL=http://localhost:3001/api npm run dev
```

### 5. Access Demo Dashboard
1. Visit http://localhost:3000
2. Login with: admin@example.com / SecurePass123
3. Click "Discover" on Google Workspace to see 5 AI automations with critical security risks

## 📱 Supported Platforms

### Phase 1 (MVP)
- ✅ **Slack** - Bot detection, app inventory, webhook monitoring
- ✅ **Google Workspace** - Service accounts, Apps Script, OAuth apps
- ✅ **Microsoft 365** - Power Platform apps, Graph API activity

### Phase 2 (Coming Soon)
- 🔄 **Jira/Atlassian** - Automation for Jira, app installations
- 🔄 **HubSpot** - Workflow automations, integration activity
- 🔄 **Notion** - Integration monitoring, bot activity

### Phase 3 (Planned)
- 📋 **Trello** - Power-Up detection, automation patterns
- 📋 **Salesforce** - Flow automations, app marketplace
- 📋 **Zendesk** - Ticket automations, app integrations

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Slack API     │    │ Google Workspace│    │ Microsoft Graph │
│                 │    │      API        │    │      API        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
          ┌─────────────────────▼─────────────────────┐
          │          Connector Layer                  │
          │     (OAuth, Webhooks, Polling)           │
          └─────────────────────┬─────────────────────┘
                                │
          ┌─────────────────────▼─────────────────────┐
          │         Detection Engine                  │
          │  (Correlation, Pattern Matching, ML)     │
          └─────────────────────┬─────────────────────┘
                                │
          ┌─────────────────────▼─────────────────────┐
          │        Dashboard & API                    │
          │     (React Frontend, REST API)           │
          └───────────────────────────────────────────┘
```

## 📊 Sample Dashboard

**AI Automation Inventory View:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Discovered AI Automations (Last 30 Days)               │
├─────────────────────────────────────────────────────────────┤
│ AI Customer Support Bot (GPT-4)    │ Critical Risk │ Score: 92 │
│ AI Meeting Intelligence (Whisper)   │ Critical Risk │ Score: 96 │
│ Claude Financial Analyzer          │ Critical Risk │ Score: 88 │
│ Multi-AI Document Pipeline         │ Critical Risk │ Score: 94 │
│ GPT-3.5 Content Generator          │ High Risk     │ Score: 76 │
└─────────────────────────────────────────────────────────────┘
```

**Risk Timeline:**
```
Today    ●───●───●────●──────●─────► Time
         │   │   │    │      │
        Bot  New App  Data   Cross-
       Alert Install Export  Platform
                              Chain
```

## 🎯 Target Users

- **CISOs & Security Teams** - Shadow IT visibility and risk management
- **IT Directors** - Unauthorized app inventory and governance
- **Compliance Officers** - Audit trail and regulatory reporting
- **DevOps Teams** - Automation monitoring and security scanning

## 💰 Business Model

### SaaS Pricing (Per Organization)
- **Starter**: $99/month (up to 100 users, 3 platforms)
- **Professional**: $299/month (up to 500 users, 8 platforms)
- **Enterprise**: $999/month (unlimited users, all platforms)

### On-Premise Licensing
- **Enterprise License**: $50k/year (self-hosted deployment)
- **Professional Services**: Implementation and training

## 🛣️ Roadmap

### ✅ MVP Release (Current Status)
- ✅ AI-focused automation discovery
- ✅ Google Workspace connector with mock data
- ✅ Authentication and dashboard
- ✅ Risk assessment with AI-specific scoring
- ✅ 5 realistic AI automation scenarios for demos

### Month 1: Platform Expansion
- Add Jira, HubSpot, Notion
- Cross-platform correlation
- Risk scoring algorithm

### Month 2: Advanced Features
- Machine learning detection
- Compliance reporting
- SIEM integrations

### Month 3: Enterprise Features
- Multi-tenant architecture
- Advanced analytics
- Custom detection rules

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 Company

Built by [Your Company Name] - Securing enterprise SaaS environments through intelligent automation detection.

**Contact:**
- Website: https://saas-xray.com
- Email: hello@saas-xray.com
- Twitter: @saasxray

---

**⚡ Get started in 60 seconds and discover the hidden automations in your SaaS stack!**