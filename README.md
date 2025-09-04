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
- Node.js 20+
- TypeScript 5.3+
- PostgreSQL 14+
- Docker (optional)
- npm or pnpm package manager

### 1. Clone and Install
```bash
git clone https://github.com/your-org/saas-xray.git
cd saas-xray

# Install shared types first (required for type safety)
cd shared-types && npm install && npm run build

# Install and build backend
cd ../backend && npm install && npm run build

# Install frontend
cd ../frontend && npm install
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

**Full-Stack TypeScript Development:**
```bash
# 1. Build shared types (always do this first)
cd shared-types
npm run build

# 2. Backend API with AI-enhanced mock data (port 3001)
cd ../backend
USE_MOCK_DATA=true ENABLE_DATA_TOGGLE=true npm run dev

# 3. Frontend Dashboard (port 3000)
cd ../frontend
VITE_API_URL=http://localhost:3001/api npm run dev
```

**Development Workflow:**
```bash
# Watch mode for shared types (run in separate terminal)
cd shared-types && npm run dev

# Type checking across the project
npm run verify:types

# Run all tests with type safety
npm run test:ci
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

### System Overview
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
          │   (OAuth, Webhooks, Type-Safe APIs)      │
          └─────────────────────┬─────────────────────┘
                                │
          ┌─────────────────────▼─────────────────────┐
          │         Detection Engine                  │
          │  (Correlation, Pattern Matching, ML)     │
          └─────────────────────┬─────────────────────┘
                                │
          ┌─────────────────────▼─────────────────────┐
          │        Dashboard & API                    │
          │   (React + TypeScript, REST API)         │
          └───────────────────────────────────────────┘
```

### TypeScript-First Architecture

**Type Safety Across the Stack:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend (TS)  │    │  Backend (TS)   │    │ Database Layer  │
│                 │    │                 │    │                 │
│ • React + TS    │◄───► • Express + TS  │◄───► • Type-safe     │
│ • Zustand       │    │ • Repository    │    │   Repositories  │
│ • Type Guards   │    │   Pattern       │    │ • Migration TS  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                 ┌─────────────────▼─────────────────┐
                 │      @saas-xray/shared-types      │
                 │                                   │
                 │ • API Contracts                   │
                 │ • Database Models                 │
                 │ • OAuth Types                     │
                 │ • Validation Schemas              │
                 └───────────────────────────────────┘
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

## 🏗️ Project Structure

```
saas-xray/
├── shared-types/              # 🎯 Shared TypeScript definitions
│   ├── src/
│   │   ├── api/              # API request/response types
│   │   ├── database/         # Database model interfaces
│   │   ├── oauth/            # OAuth flow types
│   │   ├── automation/       # Automation detection types
│   │   ├── validation/       # Runtime validation schemas
│   │   └── index.ts          # Central type exports
│   ├── package.json
│   └── tsconfig.json
├── backend/                   # Node.js + TypeScript API
│   ├── src/
│   │   ├── types/            # Backend-specific types
│   │   ├── services/         # Business logic with types
│   │   ├── repositories/     # Type-safe database access
│   │   ├── routes/           # Express routes with validation
│   │   ├── middleware/       # Type-safe middleware
│   │   └── database/         # Migration and connection
│   ├── tests/                # Comprehensive test suite
│   ├── package.json          # Includes @saas-xray/shared-types
│   └── tsconfig.json
├── frontend/                  # React + TypeScript SPA
│   ├── src/
│   │   ├── types/            # Frontend-specific types
│   │   ├── components/       # Typed React components
│   │   ├── hooks/            # Custom TypeScript hooks
│   │   ├── services/         # API client with types
│   │   └── stores/           # Zustand stores with types
│   ├── package.json          # Includes @saas-xray/shared-types
│   └── tsconfig.json
├── docs/                      # Project documentation
├── docker-compose.yml
└── README.md
```

## 🛠️ Development Tools & Scripts

### Type Safety Commands
```bash
# Verify types across entire project
npm run verify:types          # Quick type check
npm run verify:types-strict   # Strict mode checking
npm run verify:compile        # Full compilation test

# Shared types development
cd shared-types
npm run build                 # Build type definitions
npm run dev                   # Watch mode for development
npm run type-check            # Validate types only

# Backend development
cd backend
npm run dev                   # Development server
npm run build                 # Production build
npm run test:unit            # Unit tests
npm run test:integration     # API integration tests
npm run test:security        # Security-focused tests
npm run verify:types         # Backend type verification
```

### Build Order Requirements
```bash
# CRITICAL: Always build in this order
1. shared-types (npm run build)
2. backend (npm run build)
3. frontend (npm run build)
```

## 🔒 Type Safety Standards

### Mandatory TypeScript Configuration
- **100% TypeScript coverage** for new code
- **Zero `any` types** - use `unknown` with type guards
- **Explicit return types** for all functions
- **Strict compilation** with no warnings
- **Runtime validation** for external data

### Shared Types Integration
```typescript
// ✅ CORRECT: Using shared types
import { 
  CreateAutomationRequest, 
  AutomationResponse,
  OAuthCredentials 
} from '@saas-xray/shared-types';

// Backend route with proper typing
app.post('/api/automations', 
  async (req: Request<{}, AutomationResponse, CreateAutomationRequest>, res) => {
    // Type-safe implementation
  }
);

// Frontend component with shared types
interface AutomationCardProps {
  automation: AutomationResponse;
  onUpdate: (id: string) => void;
}
```

## 🧪 Testing Strategy

### Comprehensive Test Coverage
- **Unit Tests**: Service layer, utilities, type guards
- **Integration Tests**: API endpoints with type validation
- **E2E Tests**: Complete OAuth flows with real types
- **Security Tests**: OAuth token handling, input validation
- **Type Tests**: Compilation tests for type safety

### Test Commands
```bash
# Run all tests with coverage
npm run test:ci               # Full CI test suite
npm run test:coverage         # Coverage reporting
npm run test:security         # Security-focused tests
npm run test:oauth            # OAuth flow testing
```

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