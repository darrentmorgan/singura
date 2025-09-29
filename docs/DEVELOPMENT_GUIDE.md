# SaaS X-Ray Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker
- PostgreSQL
- Redis
- TypeScript

### Local Setup
```bash
# Clone the repository
git clone https://github.com/saas-xray/platform.git
cd saas-xray

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start local development environment
docker-compose up -d
npm run dev
```

## 🔧 Development Workflow

### Branch Strategy
- `main`: Stable production branch
- `develop`: Active development
- Feature branches: `feature/short-description`

### Commit Standards
- Use conventional commits
- Reference BMAD business context
- Include TypeScript type coverage

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Check type coverage
npx tsc --noEmit
```

## 🌐 Development Servers
- Backend: `localhost:4201`
- Frontend: `localhost:4203`
- Swagger Docs: `localhost:4201/docs`

## 🔐 OAuth Development

### Local OAuth Setup
1. Create developer applications
2. Configure `.env` with OAuth credentials
3. Use ngrok for local webhook testing

### Connector Development
```typescript
// Example platform connector development
class SlackConnector implements PlatformConnector {
  async discoverAutomations(): Promise<AutomationEvent[]> {
    // Implementation with shared types
  }
}
```

## 📦 Package Management

### Shared Types Package
```bash
# Update shared types
cd packages/shared-types
npm run build
npm publish
```

## 🛠️ Recommended Tools
- VS Code
- Docker Desktop
- Postman
- GitHub CLI
- Redis Desktop Manager

## 🔬 Performance Profiling
```bash
# CPU profiling
npm run profile

# Memory analysis
npm run memory:analyze
```

## 📝 Documentation
- Keep `@saas-xray/shared-types` updated
- Document new features in Swagger
- Update README for significant changes

## 🚨 Troubleshooting
- Check Docker containers
- Verify Redis and PostgreSQL connections
- Review OAuth token management
- Validate type definitions

## 🎯 Quality Gates
- 80%+ Test Coverage
- Zero TypeScript Errors
- Passing CI/CD Checks
- BMAD Business Alignment

## 🔮 Contribution Guidelines
1. Fork the repository
2. Create feature branch
3. Implement with shared types
4. Write comprehensive tests
5. Update documentation
6. Submit pull request