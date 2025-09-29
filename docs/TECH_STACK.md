# SaaS X-Ray Technical Stack

## 🖥️ Backend Technology
- **Runtime**: Node.js 20+ with Express.js
- **Language**: TypeScript (100% coverage)
- **Shared Types**: @saas-xray/shared-types package
- **API Framework**: REST + WebSocket (Socket.io)

## 🌐 Frontend Technology
- **Framework**: React 18.2+ with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Charting**: Recharts

## 💾 Database & Caching
- **Primary Database**: PostgreSQL 16
- **ORM/Query Layer**: Custom typed repository pattern
- **Caching**: Redis
- **Job Processing**: Bull Queue

## 🔐 Security & Authentication
- **OAuth**: Google Workspace, Slack
- **Token Management**: Encrypted, auto-refreshing
- **Compliance**: GDPR, enterprise-grade security

## 🚀 Infrastructure
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Deployment**: Containerized microservices
- **Proxy**: nginx reverse proxy

## 📦 Key Packages
- `@saas-xray/shared-types`: 9,000+ lines of centralized type definitions
- `@saas-xray/detection-engine`: Machine learning detection algorithms
- `@saas-xray/oauth-connectors`: Platform-specific OAuth integrations

## 🔬 Development Philosophy
- Type-first development
- Shared-types architecture
- Comprehensive test coverage (80%+)
- Security and compliance by design