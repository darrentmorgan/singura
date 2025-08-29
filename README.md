# SaaS X-Ray 🔍

**Enterprise Shadow AI & Automation Detection Platform**

SaaS X-Ray automatically discovers and monitors unauthorized AI agents, bots, and automations running across your organization's SaaS applications. Get visibility into your shadow AI usage before it becomes a security or compliance risk.

## 🎯 Problem Statement

Most enterprises have **20-50 unauthorized AI agents** already running in their SaaS applications without IT knowledge:
- Sales reps using ChatGPT bots in Slack
- Marketing teams with HubSpot workflow automations
- Support teams running Jira ticket bots
- Finance using Google Apps Script automations

**The Risk:** Data leaks, compliance violations, and security vulnerabilities.

## ✨ Key Features

### 🤖 **Automated Discovery**
- Detect bots, automations, and AI agents across Slack, Google Workspace, Microsoft 365, and more
- Real-time monitoring of new installations and activities
- Historical analysis of existing automations

### 📊 **Risk Assessment**
- Risk scoring based on permissions, data access, and activity patterns
- Identify high-risk automations accessing sensitive data
- Track cross-application automation chains

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

### 4. Start Development
```bash
# Backend API (port 3000)
npm run dev:backend

# Frontend Dashboard (port 3001)
npm run dev:frontend
```

### 5. Connect Your First Platform
1. Visit http://localhost:3001
2. Click "Connect Slack" and authorize
3. Watch as SaaS X-Ray discovers your automations

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

**Bot Inventory View:**
```
┌─────────────────────────────────────────────────────┐
│ 🤖 Discovered Automations (Last 30 Days)          │
├─────────────────────────────────────────────────────┤
│ GitBot (Slack)           │ High Risk    │ 247 msgs │
│ HubSpot Workflows        │ Medium Risk  │ 89 leads │
│ Google Apps Script       │ Low Risk     │ 12 runs  │
│ Jira Service Desk Bot    │ Medium Risk  │ 156 tkts │
└─────────────────────────────────────────────────────┘
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

### Week 1: MVP Release
- ✅ Slack, Google, Microsoft connectors
- ✅ Basic bot detection
- ✅ Simple dashboard

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